use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, RunEvent};
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let app = tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_process::init())
    .invoke_handler(tauri::generate_handler![
      get_connection_config,
      save_connection_config,
      get_sidecar_log
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
