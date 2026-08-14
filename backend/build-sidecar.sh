#!/usr/bin/env bash
# Builds the desktop sidecar binary and places it under src-tauri/binaries/
# with the target-triple suffix Tauri's externalBin mechanism expects.
# Used both for local `pnpm tauri dev`/`pnpm tauri build` and in CI
# (.github/workflows/publish.yml).
set -euo pipefail

cd "$(dirname "$0")"

uv run pyinstaller desktop.spec --clean --noconfirm

triple=$(rustc -Vv | grep host | cut -d' ' -f2)
dest_dir="../src-tauri/binaries"
mkdir -p "$dest_dir"

if [ -f "dist/croesus-backend.exe" ]; then
  dest="$dest_dir/croesus-backend-$triple.exe"
  cp "dist/croesus-backend.exe" "$dest"
else
  dest="$dest_dir/croesus-backend-$triple"
  cp "dist/croesus-backend" "$dest"
fi

echo "Sidecar built: $dest"
