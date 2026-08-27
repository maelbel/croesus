use std::fs;
use std::io::{BufRead, BufReader, Write};
use std::net::{TcpListener, TcpStream};
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{Duration, Instant};

use percent_encoding::{utf8_percent_encode, AsciiSet, NON_ALPHANUMERIC};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, RunEvent};
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;
use uuid::Uuid;

struct SidecarProcess(Mutex<Option<CommandChild>>);

// Ring buffer of the sidecar's recent stdout/stderr, so the frontend can show
// *why* the backend didn't come up instead of just "couldn't reach it" —
// there's no console visible in a packaged app to see this otherwise.
const SIDECAR_LOG_CAPACITY: usize = 200;
struct SidecarLog(Mutex<Vec<String>>);

fn push_sidecar_log(log: &SidecarLog, line: String) {
  let mut lines = log.0.lock().unwrap();
  lines.push(line);
  let excess = lines.len().saturating_sub(SIDECAR_LOG_CAPACITY);
  if excess > 0 {
    lines.drain(0..excess);
  }
}

fn handle_sidecar_line(log_handle: &AppHandle, level: log::Level, line: Vec<u8>) {
  let text = String::from_utf8_lossy(&line).into_owned();
  log::log!(level, "[croesus-backend] {}", text);
  if let Some(state) = log_handle.try_state::<SidecarLog>() {
    push_sidecar_log(&state, text);
  }
}

#[tauri::command]
fn get_sidecar_log(app: AppHandle) -> Vec<String> {
  match app.try_state::<SidecarLog>() {
    Some(state) => state.0.lock().unwrap().clone(),
    // Remote mode never spawns a sidecar — nothing to report.
    None => Vec::new(),
  }
}

#[derive(Serialize, Deserialize, Clone, Copy, PartialEq, Default)]
#[serde(rename_all = "lowercase")]
enum ConnectionMode {
  #[default]
  Local,
  Remote,
}

#[derive(Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
struct ConnectionConfig {
  mode: ConnectionMode,
  server_url: Option<String>,
  // False until the user has been through the onboarding screen once (or
  // used Settings). Lets the frontend tell "never configured, show
  // onboarding" apart from "explicitly left on local mode".
  #[serde(default)]
  configured: bool,
}

fn connection_config_path(app: &AppHandle) -> Result<PathBuf, String> {
  let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
  fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
  Ok(dir.join("connection.json"))
}

fn read_connection_config(app: &AppHandle) -> ConnectionConfig {
  connection_config_path(app)
    .ok()
    .and_then(|path| fs::read_to_string(path).ok())
    .and_then(|contents| serde_json::from_str(&contents).ok())
    .unwrap_or_default()
}

#[tauri::command]
fn get_connection_config(app: AppHandle) -> ConnectionConfig {
  read_connection_config(&app)
}

#[tauri::command]
fn save_connection_config(app: AppHandle, config: ConnectionConfig) -> Result<(), String> {
  let path = connection_config_path(&app)?;
  let contents = serde_json::to_string(&config).map_err(|e| e.to_string())?;
  fs::write(path, contents).map_err(|e| e.to_string())
}

const QUERY_ENCODE_SET: &AsciiSet = &NON_ALPHANUMERIC.remove(b'-').remove(b'_').remove(b'.').remove(b'~');

fn percent_encode(input: &str) -> String {
  utf8_percent_encode(input, QUERY_ENCODE_SET).to_string()
}

fn percent_decode(input: &str) -> String {
  percent_encoding::percent_decode_str(&input.replace('+', " "))
    .decode_utf8_lossy()
    .into_owned()
}

// Parses a query param out of a raw HTTP request line, e.g.
// "GET /callback?token=abc HTTP/1.1" -> Some("abc") for key "token".
fn parse_query_param(request_line: &str, key: &str) -> Option<String> {
  let path_and_query = request_line.split_whitespace().nth(1)?;
  let query = path_and_query.split_once('?')?.1;
  for pair in query.split('&') {
    let (k, v) = pair.split_once('=').unwrap_or((pair, ""));
    if k == key {
      return Some(percent_decode(v));
    }
  }
  None
}

// Shown in the system browser tab after the loopback listener catches the
// OIDC redirect — the only UI this flow has outside the app itself, so it's
// worth matching Croesus's own look (fonts/palette mirror frontend/src/style.css)
// rather than leaving it as unstyled text.
fn callback_page(success: bool) -> String {
  let (heading, message, accent_dark, accent_light) = if success {
    ("Signed in", "You can close this tab and return to Croesus.", "#9dbe6a", "#4e6b2c")
  } else {
    ("Sign-in failed", "Close this tab and try again from Croesus.", "#d4694a", "#9a3a1b")
  };
  let mark = if success { "&#10003;" } else { "&#10005;" };

  format!(
    r#"<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Croesus</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Bitter:wght@800&family=Archivo:wght@400;600&display=swap" rel="stylesheet">
<style>
  :root {{
    --bg: #16110e; --text: #f2eadd; --muted: #cbbaa6;
    --border: rgba(242, 234, 221, 0.28); --accent: {accent_dark};
  }}
  @media (prefers-color-scheme: light) {{
    :root {{
      --bg: #f4eee3; --text: #1e1711; --muted: #4a3c2e;
      --border: rgba(30, 23, 17, 0.26); --accent: {accent_light};
    }}
  }}
  * {{ box-sizing: border-box; }}
  html, body {{ height: 100%; margin: 0; }}
  body {{
    display: flex; align-items: center; justify-content: center;
    background: var(--bg); color: var(--text);
    font-family: 'Archivo', system-ui, sans-serif;
  }}
  .card {{
    width: 320px; padding: 2rem; text-align: center;
    border: 1px solid var(--border);
  }}
  .wordmark {{
    font-family: 'Bitter', Georgia, serif; font-weight: 800;
    letter-spacing: -0.01em; font-size: 1.25rem; margin-bottom: 1.5rem;
  }}
  .mark {{
    width: 48px; height: 48px; margin: 0 auto 1.25rem; border: 2px solid var(--accent);
    color: var(--accent); font-size: 1.25rem; line-height: 44px;
  }}
  h1 {{
    font-family: 'Bitter', Georgia, serif; font-weight: 800;
    font-size: 1.1rem; margin: 0 0 0.5rem;
  }}
  p {{ margin: 0; color: var(--muted); font-size: 0.9rem; line-height: 1.5; }}
</style>
</head>
<body>
  <div class="card">
    <div class="wordmark">CROESUS</div>
    <div class="mark">{mark}</div>
    <h1>{heading}</h1>
    <p>{message}</p>
  </div>
</body>
</html>"#
  )
}

fn write_callback_response(stream: &mut TcpStream, success: bool) {
  let body = callback_page(success);
  let response = format!(
    "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
    body.len(),
    body
  );
  let _ = stream.write_all(response.as_bytes());
  let _ = stream.flush();
}

fn wait_for_callback(
  listener: &TcpListener,
  attempt_token: &str,
  deadline: Instant,
) -> Result<(Option<String>, Option<String>), String> {
  loop {
    if Instant::now() >= deadline {
      return Err("Timed out waiting for sign-in".into());
    }

    let mut stream = match listener.accept() {
      Ok((stream, _)) => stream,
      Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
        std::thread::sleep(Duration::from_millis(200));
        continue;
      }
      Err(e) => return Err(e.to_string()),
    };

    if stream.set_nonblocking(false).is_err() {
      continue;
    }
    stream.set_read_timeout(Some(Duration::from_secs(10))).ok();

    let mut request_line = String::new();
    let read_ok = stream
      .try_clone()
      .map(|clone| BufReader::new(clone).read_line(&mut request_line))
      .is_ok_and(|result| result.is_ok());

    if !read_ok || parse_query_param(&request_line, "attempt").as_deref() != Some(attempt_token) {
      continue;
    }

    let token = parse_query_param(&request_line, "token");
    let error = parse_query_param(&request_line, "error");
    write_callback_response(&mut stream, token.is_some());
    return Ok((token, error));
  }
}

// Native-app OAuth (RFC 8252): open the sign-in flow in the system browser
// rather than an embedded webview (many IdPs refuse to authenticate inside
// one), and catch the redirect back on a local HTTP listener instead of a
// registered custom URL scheme — simpler to set up per-IdP, and the backend
// already knows how to target a loopback redirect_uri (see core/oidc.py on
// the backend).
#[tauri::command]
async fn start_oidc_login(app: AppHandle, server_url: String) -> Result<String, String> {
  let listener = TcpListener::bind("127.0.0.1:0").map_err(|e| e.to_string())?;
  let port = listener.local_addr().map_err(|e| e.to_string())?.port();
  listener.set_nonblocking(true).map_err(|e| e.to_string())?;

  let attempt_token = Uuid::new_v4().to_string();
  let redirect_uri = percent_encode(&format!("http://127.0.0.1:{port}/callback?attempt={attempt_token}"));
  let login_url = format!("{}/auth/oidc/login?redirect_uri={}", server_url.trim_end_matches('/'), redirect_uri);

  app
    .opener()
    .open_url(login_url, None::<&str>)
    .map_err(|e| e.to_string())?;

  let deadline = Instant::now() + Duration::from_secs(300);
  tauri::async_runtime::spawn_blocking(move || -> Result<String, String> {
    let (token, error) = wait_for_callback(&listener, &attempt_token, deadline)?;
    token.ok_or_else(|| error.unwrap_or_else(|| "SSO sign-in failed".into()))
  })
  .await
  .map_err(|e| e.to_string())?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let app = tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_opener::init())
    .invoke_handler(tauri::generate_handler![
      get_connection_config,
      save_connection_config,
      get_sidecar_log,
      start_oidc_login
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // Remote mode points the frontend at an existing self-hosted instance
      // instead — skip spawning the local backend/SQLite entirely.
      let config = read_connection_config(app.handle());
      if config.mode == ConnectionMode::Local {
        let (mut rx, child) = app.shell().sidecar("croesus-backend")?.spawn()?;
        app.manage(SidecarProcess(Mutex::new(Some(child))));
        app.manage(SidecarLog(Mutex::new(Vec::new())));

        let log_handle = app.handle().clone();
        tauri::async_runtime::spawn(async move {
          while let Some(event) = rx.recv().await {
            match event {
              CommandEvent::Stdout(line) => handle_sidecar_line(&log_handle, log::Level::Info, line),
              CommandEvent::Stderr(line) => handle_sidecar_line(&log_handle, log::Level::Error, line),
              _ => {}
            }
          }
        });
      }

      Ok(())
    })
    .build(tauri::generate_context!())
    .expect("error while building tauri application");

  app.run(|app_handle, event| {
    if let RunEvent::ExitRequested { .. } = event {
      if let Some(state) = app_handle.try_state::<SidecarProcess>() {
        if let Some(child) = state.0.lock().unwrap().take() {
          let _ = child.kill();
        }
      }
    }
  });
}

#[cfg(test)]
mod tests {
  use super::*;
  use std::io::Read;

  #[test]
  fn percent_round_trip_handles_multibyte() {
    let input = "hello €/wörld?x=1";
    assert_eq!(percent_decode(&percent_encode(input)), input);
  }

  #[test]
  fn percent_decode_does_not_panic_on_split_multibyte_escape() {
    assert_eq!(percent_decode("%€"), "%€");
  }

  #[test]
  fn parse_query_param_extracts_value() {
    let line = "GET /callback?token=abc&foo=bar HTTP/1.1";
    assert_eq!(parse_query_param(line, "token"), Some("abc".to_string()));
    assert_eq!(parse_query_param(line, "foo"), Some("bar".to_string()));
    assert_eq!(parse_query_param(line, "missing"), None);
  }

  #[test]
  fn wait_for_callback_ignores_connections_with_wrong_attempt_token() {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    listener.set_nonblocking(true).unwrap();
    let port = listener.local_addr().unwrap().port();

    std::thread::spawn(move || {
      if let Ok(mut stream) = TcpStream::connect(("127.0.0.1", port)) {
        let _ = stream.write_all(b"GET /callback?attempt=wrong&token=stolen HTTP/1.1\r\n\r\n");
      }
      std::thread::sleep(Duration::from_millis(100));
      if let Ok(mut stream) = TcpStream::connect(("127.0.0.1", port)) {
        let _ = stream.write_all(b"GET /callback?attempt=right&token=abc123 HTTP/1.1\r\n\r\n");
        let mut buf = [0u8; 4096];
        let _ = stream.read(&mut buf);
      }
    });

    let deadline = Instant::now() + Duration::from_secs(5);
    let (token, error) = wait_for_callback(&listener, "right", deadline).unwrap();
    assert_eq!(token, Some("abc123".to_string()));
    assert_eq!(error, None);
  }

  #[test]
  fn wait_for_callback_times_out_with_no_connection() {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    listener.set_nonblocking(true).unwrap();
    let result = wait_for_callback(&listener, "whatever", Instant::now());
    assert!(result.is_err());
  }

  #[test]
  fn wait_for_callback_times_out_despite_a_stream_of_non_matching_connections() {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    listener.set_nonblocking(true).unwrap();
    let port = listener.local_addr().unwrap().port();
    let deadline = Instant::now() + Duration::from_millis(300);

    let keep_spamming = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(true));
    let spammer_flag = keep_spamming.clone();
    let spammer = std::thread::spawn(move || {
      while spammer_flag.load(std::sync::atomic::Ordering::Relaxed) {
        if let Ok(mut stream) = TcpStream::connect(("127.0.0.1", port)) {
          let _ = stream.write_all(b"GET /callback?attempt=wrong&token=stolen HTTP/1.1\r\n\r\n");
        }
      }
    });

    let started = Instant::now();
    let result = wait_for_callback(&listener, "right", deadline);
    keep_spamming.store(false, std::sync::atomic::Ordering::Relaxed);
    spammer.join().unwrap();

    assert!(result.is_err());
    assert!(started.elapsed() < Duration::from_secs(2), "deadline was not honored: took {:?}", started.elapsed());
  }
}
