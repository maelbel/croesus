# Roadmap — Croesus

**Open-source** net worth tracking application: a consolidated view of all
assets (financial, real estate) and liabilities (debts), with fine-grained
modeling of French tax-advantaged accounts, an emergency fund, and YNAB-style
budget envelopes.

Two target usage modes:
- **Self-hosted**: deployed with Docker, accessible from a browser,
  multi-device.
- **Standalone desktop** (Windows/Linux/macOS): either with an embedded local
  database, or connected to a remote self-hosted instance.

## Tech stack

- **Backend**: Python — **FastAPI** (REST API + Pydantic validation),
  **SQLAlchemy + Alembic** (ORM + migrations, compatible with both PostgreSQL
  *and* SQLite from the same models — key for the local desktop mode),
  **numpy-financial / pandas** for advanced financial calculations (XIRR, IRR,
  loan amortization, projections)
- **Frontend**: **Vue 3 + Vite** (SPA) + **Nuxt UI** (works in plain Vue,
  outside of Nuxt) + Tailwind CSS
- **Desktop**: **Tauri** — wraps the Vue frontend; on first launch, choose
  between:
  - *Local*: Tauri starts a compiled FastAPI sidecar (PyInstaller) backed by a
    local SQLite database
  - *Remote*: the app points directly at an existing self-hosted instance,
    with authentication
- **Self-hosted**: Docker Compose (FastAPI + Postgres); reverse proxy
  (Traefik, Caddy, nginx...) is up to the deployer — see
  [docs/REVERSE_PROXY.md](./docs/REVERSE_PROXY.md)
- **Auth**: OIDC SSO support, once v1 is stable, plus classic login for
  desktop's remote mode
- **Package management**: `uv` (Python), `pnpm` (JS/TS)

## Key concepts

- **Account**: a tax wrapper or asset container (PEA, life insurance, French
  regulated savings accounts, brokerage account, checking account, real
  estate, SCPI, crypto...). Has one or more valuations over time.
- **Asset**: a line item inside a brokerage account (stock, ETF, crypto...)
  with quantity and cost basis. Optional — an account can be valued directly
  without line-item detail (e.g. a euro-denominated life insurance fund).
- **Liability**: a debt (mortgage, consumer loan...) that is deducted from net
  worth.
- **Emergency fund**: a target goal attached to an account, with progress
  tracking.
- **Budget envelope**: a named allocation bucket (e.g. "Vacation", "Home
  renovation"), independent of account type — a distinct concept from tax
  wrappers.

## Phase 0 — Foundations (done)

- [x] Tech stack decision
- [x] Backend scaffold (FastAPI + SQLAlchemy + Alembic), Dockerfile — full
      CRUD for Accounts/Valuations/Assets/Liabilities/Envelopes + a net worth
      endpoint (computed with pandas)
- [x] Frontend scaffold (Vue + Vite + Nuxt UI), base structure — Dashboard/
      Accounts/Liabilities/Envelopes pages, Pinia stores, API client
- [x] Desktop scaffold (Tauri), minimal shell pointing at the frontend —
      `cargo check` validated on Linux ARM64
- [x] Self-hosted Docker Compose (backend + postgres + frontend), deployed
      and tested end to end
- [x] v1 data model (Account, Valuation, Asset, Liability, Envelope)

## Phase 1 — v1: manual entry + dashboard

- [x] Account CRUD (all types: Checking, Regulated savings, PEA, Life
      insurance, Brokerage, Crypto, Real estate, SCPI, Other)
- [x] Asset CRUD (portfolio line items) inside brokerage accounts — managed
      per-account from the account detail panel
- [x] Manual entry of periodic valuations → historical tracking over time —
      add/edit/delete from the account detail panel
- [x] Liability CRUD (loans, credit) with monthly payment and remaining
      balance
- [x] Emergency fund: special account + target goal + progress bar
- [x] Budget envelopes: CRUD buckets + allocated/used amount
- [x] Dashboard: current net worth (assets − liabilities), evolution curve
      over time, breakdown by account type / asset class — refreshes
      automatically after any edit, no manual reload needed
- [x] Local desktop mode: FastAPI sidecar + embedded SQLite, packaged with
      PyInstaller
- [x] Remote desktop mode: server URL configuration + authentication — a
      Settings → Connection toggle points the desktop app at an existing
      self-hosted instance instead of the local sidecar; classic
      username/password login (single admin account, opt-in via
      `ADMIN_USERNAME`/`ADMIN_PASSWORD` on the self-hosted side)
- [x] Generic OIDC SSO support (self-hosted + remote desktop mode) — works
      with any provider (Authentik, Keycloak, etc.)
- [x] Docs: reverse proxy setup guide (Traefik, Caddy, nginx examples via
      `docker-compose.override.yml`)

## Phase 2 — Automated pricing (done)

- [x] Automatic price fetching for assets with a symbol set: Yahoo Finance's
      unofficial chart endpoint (stocks/ETFs/funds) + CoinGecko (crypto,
      mapped ticker → CoinGecko id) — both keyless, no signup required.
      Background refresh (APScheduler, configurable interval) plus a manual
      "Refresh prices" action
- [x] Automatic brokerage account valuation from positions + prices — any
      account with at least one asset gets its current valuation derived
      automatically (Σ quantity × current price, falling back to cost basis)
      on every asset change or price refresh, instead of manual entry
- [x] Local price history cache (avoid hammering the external API) — a
      PriceCache table (source, symbol, price, fetched_at) dedupes external
      calls across assets sharing a symbol and across refreshes close in time

## Phase 3 — Internationalization

- [x] UI language support (i18n) — externalize frontend strings, start with
      French + English
- [x] Multi-currency — per-account currency, conversion to a reference
      currency for the consolidated net worth view (supersedes the earlier
      "EUR only" non-goal)

## Phase 4 — Customizable dashboard

- [x] Drag-and-resize widget grid (12-column, snap-to-cell) replacing the
      current fixed dashboard layout — add, remove, rearrange and resize
      widgets, with an edit mode and a persisted per-instance layout
- [ ] Widget catalog: stat tile, trend chart, breakdown donut, list, and a
      debt/envelope payoff-status widget — each bound to a choice of data
      source (net worth, total debt, envelopes remaining, emergency fund,
      a specific account/liability balance, assets-by-class...) and a size
      preset
- [ ] Empty-dashboard state prompting the first widget to be added

## Phase 5 — Advanced analytics

All grouped under a new top-level **Insights** page.

- [ ] Performance against market — compare portfolio return (XIRR) against a
      benchmark index (CAC 40, S&P 500, MSCI World...) over the same period,
      with the ability to add a custom benchmark (symbol + expected annual
      return) alongside the built-in ones
- [ ] Contribution vs. performance decomposition — split net worth growth
      into money contributed vs. market/valuation effect
- [ ] Simple net worth projections — linear/compound projection from
      existing valuation history (e.g. "at this savings rate, when do I
      reach €X") — kept deliberately simple; see non-goals
- [ ] Tax-wrapper limit tracking — flag accounts approaching or at their
      contribution ceiling (PEA €150k, Livret A, LEP, PER deductible envelope,
      etc.), *and* flag wrappers the user is eligible for but hasn't opened
      (e.g. an unused LEP)
- [ ] Debt payoff projections — debt-free date, remaining interest at the
      current rate, and "what if I paid €X more/month" scenarios on a
      liability's detail view
- [ ] Automated practice checks — a ranked feed of rule-based nudges derived
      from existing data (no external advice/AI), graded alert / warning /
      hint: tax wrapper at cap or left unused, envelope overspent, a single
      holding over ~a third of total assets, stale valuations, underperforming
      a benchmark, an oversized emergency fund, mortgage-rate-vs-investing
      guidance. Stays within the "no automated financial advice" non-goal —
      these are data-derived observations, not recommendations to act on

## Phase 6 — Household sharing (optional)

- [ ] Shared/household net worth — multiple users on one instance, with
      some accounts shared and others kept private (supersedes the earlier
      single-user non-goal). Per-account shared/private toggle, an invite
      flow to add a household member, and a "mine" vs "household" net worth
      scope switch usable throughout the app (dashboard, accounts, insights)

## Phase 7 — Data portability & reliability

- [ ] Import from spreadsheet/CSV or XLSX (bootstrapping from an existing
      manual tracker) — column mapping step (date, value, currency columns)
      rather than a fixed schema
- [ ] Export — CSV of every table, and/or a PDF net worth report (with or
      without charts)
- [ ] Per-widget/per-chart sharing — download or share any single dashboard
      widget or insights chart as a PNG/PDF snapshot, with a "hide amounts"
      toggle that redacts figures (shapes/percentages stay) for safe sharing
- [ ] Encrypted backup export (passphrase-protected, AES-256), restorable
      independently of the running instance
- [ ] Notifications — a weekly net worth summary, envelope-overspend
      alerts, and a reminder when an account hasn't had a valuation
      recorded in a while, with a configurable staleness threshold
      (30/60/90 days) (supersedes the earlier "valuation staleness
      reminders" wording — same idea, folded into a broader notifications
      feature)
- [ ] Account security — two-factor authentication (authenticator app +
      recovery codes) and visibility/revocation of active sessions,
      alongside the existing password/OIDC login

## Phase 8 — Bank aggregation

- [ ] Powens (formerly Budget Insight) or Bridge API integration for
      automatic sync of French bank accounts
- [ ] Bank connection token management, refresh, error handling
- ⚠️ Notable complexity: PSD2 accreditation for aggregators, API cost
      depending on provider, handling user reconnection

## Non-goals (for now)

- Automated financial advice (projections stay simple — see Phase 5)
- Automated cross-platform builds (will come via CI/CD — GitHub Actions —
  rather than locally from the Pi, which can't natively compile Windows/macOS
  binaries)
