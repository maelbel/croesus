<div align="center">

# Croesus

**Open-source net worth tracking, without giving your financial data to anyone else.**

[![Release](https://img.shields.io/github/v/release/maelbel/croesus?include_prereleases)](https://github.com/maelbel/croesus/releases)
[![Downloads](https://img.shields.io/github/downloads/maelbel/croesus/total)](https://github.com/maelbel/croesus/releases)
[![CI](https://github.com/maelbel/croesus/actions/workflows/ci.yml/badge.svg)](https://github.com/maelbel/croesus/actions/workflows/ci.yml)
[![License: AGPL v3](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](./LICENSE)


Self-hosted · Desktop (Windows/macOS/Linux) · Your data, your server

</div>

---

Croesus consolidates your full financial picture — bank accounts, brokerage
accounts, French tax wrappers (PEA, life insurance, regulated savings), real
estate, SCPI, crypto — and your debts, into a single net worth view over
time. Run it as a self-hosted web app, or as a standalone desktop app with a
local database. See [ROADMAP.md](./ROADMAP.md) for the full vision and where
the project currently stands.

## Why "Croesus"?

**Croesus** was the king of Lydia in the 6th century BC, famed across the
ancient world for his immense wealth — so much so that his name outlived his
kingdom. English still uses the idiom *"rich as Croesus"* today, over 2,500
years later.

A net worth tracker doesn't need a cute mascot name. It needs a name that
means exactly one thing: **wealth, tracked over the long run.**

## Features

- 📊 **Net worth over time** — a single number, built from valuation history
  across every account, with the maths handled by `pandas`.
- 🇫🇷 **French tax wrappers modeled properly** — PEA, assurance-vie, Livret A
  and friends aren't shoehorned into generic "brokerage" or "savings" buckets.
- 🏠 **Beyond the stock market** — real estate and SCPI sit alongside your
  brokerage accounts, not bolted on as an afterthought.
- 🆘 **Emergency fund tracking** — a target goal with a progress bar, not
  just another line in a spreadsheet.
- ✉️ **Budget envelopes** — YNAB-style allocation buckets, kept distinct from
  account/tax-wrapper types.
- 🖥️ **Self-hosted or desktop** — run it on your own server behind Docker, or
  as a native Windows/macOS/Linux app with a local database. Same codebase,
  your choice.
- 🔓 **AGPL-3.0** — if someone runs a modified version of Croesus as a
  service, they owe the community those modifications back.

## Project structure

| Path                 | What's there                                                    |
|-----------------------|------------------------------------------------------------------|
| `backend/`            | FastAPI API, SQLAlchemy/Alembic models & migrations, financial calculations (`pandas`, `numpy-financial`) |
| `frontend/`           | Vue 3 + Vite + Nuxt UI single-page app                          |
| `src-tauri/`          | Desktop shell (Tauri) — Windows/Linux/macOS                     |
| `docker-compose.yml`  | Self-hosted deployment (backend + Postgres + frontend)          |

## Local development

### Backend

```bash
cd backend
cp .env.example .env        # defaults to SQLite, nothing to change to get started
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

API available at http://localhost:8000 (interactive docs at `/docs`).

### Frontend

```bash
cd frontend
cp .env.example .env
pnpm install
pnpm dev
```

App available at http://localhost:5173.

### Desktop (Tauri)

```bash
cd backend && uv sync && bash build-sidecar.sh && cd ..  # package the FastAPI backend as a sidecar binary
pnpm install                # from the repo root, installs @tauri-apps/cli
pnpm tauri dev               # launches the frontend + a native window
```

The desktop app runs fully standalone: the sidecar binary embeds the backend
and serves it on `localhost:8000` against a SQLite database in the OS's
per-user app data directory — no Docker/Postgres required. Re-run
`build-sidecar.sh` after backend code changes; it needs to be run once
before the first `pnpm tauri dev` or `pnpm tauri build`.

Linux prerequisites: `libwebkit2gtk-4.1-dev`, `libssl-dev`, `librsvg2-dev`,
`libgtk-3-dev`, `libayatana-appindicator3-dev`, `patchelf`, `libdbus-1-dev`,
`pkg-config`. To build Windows/
macOS binaries, use a CI (GitHub Actions) rather than building locally — there
is no reliable cross-compilation path from Linux ARM.

## Self-hosted deployment (Docker)

```bash
cp .env.example .env         # set a real POSTGRES_PASSWORD
docker compose up -d --build
```

By default this publishes the frontend on port `8080` and the API on port
`8000` directly — no reverse proxy required to get started.

Running behind a reverse proxy (Traefik, Caddy, nginx...) instead? Edit
`docker-compose.yml` directly to add your proxy's labels/config. A dedicated
guide for this is planned — see [ROADMAP.md](./ROADMAP.md).

## Stack

FastAPI · SQLAlchemy · Alembic · pandas / numpy-financial · Vue 3 · Vite ·
Nuxt UI · Pinia · Tauri · PostgreSQL · Docker

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md) for the
workflow and commit message conventions. Releases are fully automated; see
[docs/RELEASING.md](./docs/RELEASING.md) if you're a maintainer.

## License

[AGPL-3.0-or-later](./LICENSE)
