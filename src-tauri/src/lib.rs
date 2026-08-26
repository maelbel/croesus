use std::fs;
use std::io::{BufRead, BufReader, Write};
use std::net::TcpListener;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, RunEvent};
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

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

#[tauri::command]
fn get_sidecar_log(app: AppHandle) -> Vec<String> {
  match app.try_state::<SidecarLog>() {
    Some(state) => state.0.lock().unwrap().clone(),
    // Remote mode never spawns a sidecar — nothing to report.
    None => Vec::new(),
  }
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ConnectionConfig {
  mode: String,
  server_url: Option<String>,
  // False until the user has been through the onboarding screen once (or
  // used Settings). Lets the frontend tell "never configured, show
  // onboarding" apart from "explicitly left on local mode".
  #[serde(default)]
  configured: bool,
}

impl Default for ConnectionConfig {
  fn default() -> Self {
    ConnectionConfig {
      mode: "local".into(),
      server_url: None,
      configured: false,
    }
  }
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

fn percent_encode(input: &str) -> String {
  let mut out = String::with_capacity(input.len());
  for byte in input.bytes() {
    match byte {
      b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => out.push(byte as char),
      _ => out.push_str(&format!("%{:02X}", byte)),
    }
  }
  out
}

fn percent_decode(input: &str) -> String {
  let bytes = input.as_bytes();
  let mut out = Vec::with_capacity(bytes.len());
  let mut i = 0;
  while i < bytes.len() {
    if bytes[i] == b'%' && i + 2 < bytes.len() {
      if let Ok(byte) = u8::from_str_radix(&input[i + 1..i + 3], 16) {
        out.push(byte);
        i += 3;
        continue;
      }
    }
    out.push(if bytes[i] == b'+' { b' ' } else { bytes[i] });
    i += 1;
  }
  String::from_utf8_lossy(&out).into_owned()
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

// Native-app OAuth (RFC 8252): open the sign-in flow in the system browser
// rather than an embedded webview (many IdPs refuse to authenticate inside
// one), and catch the redirect back on a one-shot local HTTP listener
// instead of a registered custom URL scheme — simpler to set up per-IdP,
// and the backend already knows how to target a loopback redirect_uri (see
// core/oidc.py on the backend). The listener only ever accepts a single
// connection, from the OS's own loopback interface, for one login attempt.
#[tauri::command]
async fn start_oidc_login(app: AppHandle, server_url: String) -> Result<String, String> {
  let listener = TcpListener::bind("127.0.0.1:0").map_err(|e| e.to_string())?;
  let port = listener.local_addr().map_err(|e| e.to_string())?.port();

  let redirect_uri = percent_encode(&format!("http://127.0.0.1:{port}/callback"));
  let login_url = format!("{}/auth/oidc/login?redirect_uri={}", server_url.trim_end_matches('/'), redirect_uri);

  app
    .opener()
    .open_url(login_url, None::<&str>)
    .map_err(|e| e.to_string())?;

  tauri::async_runtime::spawn_blocking(move || -> Result<String, String> {
    listener.set_nonblocking(true).map_err(|e| e.to_string())?;
    let deadline = Instant::now() + Duration::from_secs(300);

    let mut stream = loop {
      match listener.accept() {
        Ok((stream, _)) => break stream,
        Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
          if Instant::now() >= deadline {
            return Err("Timed out waiting for sign-in".into());
          }
          std::thread::sleep(Duration::from_millis(200));
        }
        Err(e) => return Err(e.to_string()),
      }
    };
    stream.set_nonblocking(false).map_err(|e| e.to_string())?;
    stream.set_read_timeout(Some(Duration::from_secs(10))).ok();

    let mut request_line = String::new();
    BufReader::new(stream.try_clone().map_err(|e| e.to_string())?)
      .read_line(&mut request_line)
      .map_err(|e| e.to_string())?;

    let token = parse_query_param(&request_line, "token");
    let error = parse_query_param(&request_line, "error");

    let body = callback_page(token.is_some());
    let response = format!(
      "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
      body.len(),
      body
    );
    let _ = stream.write_all(response.as_bytes());
    let _ = stream.flush();

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
      if config.mode == "local" {
        let (mut rx, child) = app.shell().sidecar("croesus-backend")?.spawn()?;
        app.manage(SidecarProcess(Mutex::new(Some(child))));
        app.manage(SidecarLog(Mutex::new(Vec::new())));

        let log_handle = app.handle().clone();
        tauri::async_runtime::spawn(async move {
          while let Some(event) = rx.recv().await {
            match event {
              CommandEvent::Stdout(line) => {
                let text = String::from_utf8_lossy(&line).into_owned();
                log::info!("[croesus-backend] {}", text);
                if let Some(state) = log_handle.try_state::<SidecarLog>() {
                  push_sidecar_log(&state, text);
                }
              }
              CommandEvent::Stderr(line) => {
                let text = String::from_utf8_lossy(&line).into_owned();
                log::error!("[croesus-backend] {}", text);
                if let Some(state) = log_handle.try_state::<SidecarLog>() {
                  push_sidecar_log(&state, text);
                }
              }
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
