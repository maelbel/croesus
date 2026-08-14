"""Entrypoint for the PyInstaller-packaged desktop sidecar.

Sets DATABASE_URL to a per-OS user data directory *before* importing
anything that reads settings, runs migrations against the bundled Alembic
scripts, then serves the API on localhost.
"""

import os
import sys
from pathlib import Path

from platformdirs import user_data_dir


def main() -> None:
    data_dir = Path(user_data_dir("croesus"))
    data_dir.mkdir(parents=True, exist_ok=True)
    os.environ["DATABASE_URL"] = f"sqlite:///{data_dir / 'croesus.db'}"

    from alembic.config import Config

    from alembic import command

    resource_root = Path(getattr(sys, "_MEIPASS", Path(__file__).parent.parent))
    alembic_cfg = Config(str(resource_root / "alembic.ini"))
    alembic_cfg.set_main_option("script_location", str(resource_root / "alembic"))
    command.upgrade(alembic_cfg, "head")

    import uvicorn

    from app.main import app

    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")


if __name__ == "__main__":
    main()
