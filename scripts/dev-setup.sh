#!/usr/bin/env bash
# One-shot local dev setup: installs everything needed to run the backend,
# frontend, and the desktop (Tauri) shell. Safe to re-run.
set -euo pipefail
cd "$(dirname "$0")/.."

require() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required tool: $1 — see README.md -> Prerequisites." >&2
    exit 1
  fi
}

require uv
require pnpm
require cargo

echo "==> backend: uv sync"
(cd backend && uv sync)

echo "==> backend: building desktop sidecar"
(cd backend && bash build-sidecar.sh)

echo "==> frontend: pnpm install"
(cd frontend && pnpm install)

echo "==> root: pnpm install (Tauri CLI)"
pnpm install

cat <<'EOF'

Done. Next:
  Backend only:  cd backend && uv run uvicorn app.main:app --reload
  Frontend only: cd frontend && pnpm dev
  Desktop app:   pnpm tauri dev
EOF
