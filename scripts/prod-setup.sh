#!/usr/bin/env bash
# Interactive setup for a self-hosted (Docker Compose) deployment: creates
# .env from .env.example if missing, fills in secrets you haven't set
# yourself, and optionally starts the stack. Safe to re-run — it never
# overwrites a value already present in .env.
set -euo pipefail
cd "$(dirname "$0")/.."

require() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required tool: $1 — see README.md -> Prerequisites." >&2
    exit 1
  fi
}

require docker
require openssl

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose plugin not found (try: docker compose version)." >&2
  exit 1
fi

ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
  cp .env.example "$ENV_FILE"
  echo "Created $ENV_FILE from .env.example"
fi

# Reads a key's value whether it's set or still commented out in .env.
get_env() {
  grep -E "^#? ?$1=" "$ENV_FILE" 2>/dev/null | tail -1 | cut -d= -f2-
}

# Sets/uncomments a key, appending it if it isn't in the file at all.
set_env() {
  local key="$1" value="$2"
  if grep -qE "^#? ?$key=" "$ENV_FILE"; then
    sed -i.bak -E "s|^#? ?$key=.*|$key=$value|" "$ENV_FILE" && rm -f "$ENV_FILE.bak"
  else
    echo "$key=$value" >>"$ENV_FILE"
  fi
}

if [ -z "$(get_env POSTGRES_PASSWORD)" ]; then
  set_env POSTGRES_PASSWORD "$(openssl rand -hex 24)"
  echo "Generated POSTGRES_PASSWORD"
fi

echo
read -rp "Require login on this instance? Needed to use it from the desktop app's remote mode. [y/N] " enable_auth
if [[ "$enable_auth" =~ ^[Yy]$ ]]; then
  read -rp "Admin username [admin]: " admin_user
  set_env ADMIN_USERNAME "${admin_user:-admin}"

  if [ -z "$(get_env ADMIN_PASSWORD)" ]; then
    admin_pass=$(openssl rand -hex 12)
    set_env ADMIN_PASSWORD "$admin_pass"
    echo "Generated ADMIN_PASSWORD: $admin_pass"
    echo "Save this now — it won't be shown again (change it any time by editing $ENV_FILE and restarting)."
  fi

  if [ -z "$(get_env JWT_SECRET)" ]; then
    set_env JWT_SECRET "$(openssl rand -hex 32)"
    echo "Generated JWT_SECRET"
  fi
fi

echo
read -rp "Will you connect to this instance from the desktop app's remote mode? [y/N] " remote_mode
if [[ "$remote_mode" =~ ^[Yy]$ ]]; then
  read -rp "Web frontend origin, if you also serve one (e.g. https://croesus.example.com; leave blank to skip): " web_origin
  origins="\"tauri://localhost\",\"http://tauri.localhost\""
  [ -n "$web_origin" ] && origins="\"$web_origin\",$origins"
  set_env CORS_ORIGINS "[$origins]"
  echo "Set CORS_ORIGINS=[$origins]"
  echo "Note: this deliberately excludes http://localhost:5173 (pnpm tauri dev)."
  echo "Test remote mode in dev against a disposable local backend instead of this one."
fi

echo
read -rp "Run 'docker compose up -d --build' now? [Y/n] " run_now
if [[ ! "$run_now" =~ ^[Nn]$ ]]; then
  docker compose up -d --build
else
  echo "Skipped. Run 'docker compose up -d --build' whenever you're ready."
fi
