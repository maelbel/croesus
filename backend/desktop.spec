# -*- mode: python ; coding: utf-8 -*-
# Build with: uv run pyinstaller desktop.spec --clean
# (see build-sidecar.sh, which also renames the output for Tauri's sidecar
# naming convention)

a = Analysis(
    ["app/desktop_main.py"],
    pathex=[],
    binaries=[],
    datas=[
        ("alembic/env.py", "alembic"),
        ("alembic/versions", "alembic/versions"),
        ("alembic.ini", "."),
    ],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="croesus-backend",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
