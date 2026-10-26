# Plan — Cash flow monitoring & interconnected apps

> Status: **approved design, not built yet** — [ROADMAP.md](../../ROADMAP.md) Phase 5. One GitHub
> issue per step. Phase numbers below refer to the roadmap after this phase was inserted (Insights
> is Phase 6, Household sharing Phase 7, Data portability Phase 8, Bank aggregation Phase 9).

## Why

Croesus tracks *stocks*: what each account is worth at points in time. It doesn't know how money
*moves* — what came in, what went out, where it went. That gap is why several existing features are
still manual or blocked:

- Envelopes' `current_amount` is typed by hand.
- Liabilities' `remaining_amount` is typed by hand.
- Phase 6's contribution-vs-performance split, savings-rate projections and PEA ceiling tracking
  all need *contributions*, which Croesus doesn't record (the PEA €150k ceiling applies to money paid
  in, not to the current value).
- The emergency fund target is a fixed number, not "N months of what I actually spend".

The goal is to add a **transactions ledger** and make it the shared data the other apps link to,
the way mail is in Havre: each app keeps its own job, but they read from and react to each other.

## Principles

1. **Each step ships something usable** and leaves the app working (same rule as Havre's roadmap).
2. **Valuations stay the source of truth for investments.** Transactions drive cash accounts
   (checking, regulated savings) and record contributions; they never recompute a PEA or brokerage
   value — holdings + prices keep doing that.
3. **Derived values never overwrite the user's own numbers.** Reuse the pattern already in
   `holdings_valuation.py`: only touch entries Croesus created itself (tagged), leave manual ones
   alone.
4. **Observations, not advice.** Anything shown in Pulse or Insights stays within the existing
   "no automated financial advice" non-goal.
5. **No dependency on bank aggregation.** Import from files first; Phase 9 (Powens/Bridge) plugs
   into the same ledger later as another import source.
6. **Works in both modes.** Every model and migration must run on PostgreSQL (self-hosted) and
   SQLite (desktop sidecar).

## Architecture

### Modules instead of a flat layout

Today `app/api/routes`, `app/models`, `app/services` are organized by layer. As apps are added,
group by app so each one has clear boundaries:

```text
backend/app/
  core/                 # unchanged: config, database, auth, security
  platform/             # new: app registry, links, events
  modules/
    wealth/             # accounts, valuations, assets, liabilities, pricing, fx, networth (moved)
    cashflow/           # transactions, imports, payees, categories, rules, recurring
    budget/             # envelopes (moved), fed by cashflow
    pulse/              # the home feed
    insights/           # Phase 6
```

Existing code moves into `modules/` in step 0 as a pure refactor: no behaviour change, tests
passing before and after, in its own PR before any new feature.

### App manifests

Borrowed from Havre's step 5. Each module declares a small manifest:

```python
AppManifest(
    id="cashflow",
    name="Cash flow",
    icon="i-lucide-arrow-left-right",
    route="/cashflow",
    provides=["transactions", "payees", "recurring"],
    uses=["accounts"],
)
```

The frontend builds its navigation from `GET /api/apps` instead of a hard-coded list, and apps can
be hidden in Settings (someone who only wants net worth can turn Cash flow off).

### Links

One table for cross-app references, instead of a foreign key per pair of apps:

| column        | example                |
|---------------|------------------------|
| `source_type` | `transaction`          |
| `source_id`   | `412`                  |
| `target_type` | `liability`            |
| `target_id`   | `3`                    |
| `kind`        | `repayment`            |
| `origin`      | `rule` / `auto` / `user` |

Core relationships that are always there (transaction → account, transaction → category) stay
real foreign keys. `links` is for the optional, cross-app ones.

### Events

A small in-process dispatcher (no broker) so modules react to each other without importing each
other:

- `transactions.imported(account_id, ids)`
- `transaction.categorized(id)`
- `valuation.recorded(account_id)`
- `prices.refreshed()`

Handlers run inside the same DB transaction as the change that triggered them — the same guarantee
`make_crud_router`'s `after_write` gives today. The existing `after_write` hooks and the
APScheduler price job become the first publishers.

## Steps

### Step 0 · Groundwork

- Move existing code into `modules/wealth` and `modules/budget` (refactor only).
- `platform/`: app manifests, `GET /api/apps`, navigation built from it, hide/show in Settings.
- `links` table and event dispatcher, with tests; wire the existing `after_write` hooks to publish.
- **Ownership:** a non-null `user_id` on every user-data table (accounts, valuations, assets,
  liabilities, envelopes, dashboard layouts, and every new table). The migration assigns existing
  rows to the current owner (the seeded admin, or the single OIDC user). Every query goes through
  one scoped helper / dependency (`current_user` → filtered session or repository), and
  `make_crud_router` filters and checks ownership on list, get, update and delete — another
  owner's id returns 404, not 403, so ids can't be probed. Desktop local mode gets one implicit
  local user. Caches shared by design (`price_cache`, `fx_rate_cache`) stay global.
- Tests: two owners on one instance can never read, edit or delete each other's rows, through
  every endpoint.

*Done when:* the app looks and works exactly as before for an existing install, navigation comes
from the server, every row has an owner, all tests pass.

### Step 1 · Transactions ledger and import

- `Transaction` model: `account_id`, `date`, `amount` (signed, account currency), `label`
  (raw bank text), `label_clean`, `payee_id` (nullable, step 3), `category_id` (nullable, step 2),
  `note`, `import_id`, `dedup_key` (unique per account), `created_at`.
- `Import` model: `account_id`, file name, format, row counts (new / duplicate / rejected),
  `imported_at`. Raw files are **not** kept.
- Formats:
  - **OFX / QFX** — use `FITID` as the dedup key when present.
  - **CSV** — column-mapping step (date, amount or debit/credit, label, optional balance), date
    and decimal format chosen by the user (French exports use `,` and `dd/mm/yyyy`), mapping
    remembered per account.
  - Dedup fallback: hash of (account, date, amount, normalized label, occurrence index on that
    day) so two identical coffees on the same day aren't merged.
- Preview before commit: the user sees what will be added and what is a duplicate, then confirms.
- Transactions list on the account page (cash accounts only), with search and date filters;
  manual add / edit / delete.
- **Balance link:** a cash account's valuation can be derived from its transactions, tagged like
  `AUTO_VALUATION_NOTE`. If the file carries a balance (OFX `LEDGERBAL`, a CSV balance column) and
  it disagrees with the ledger, show a reconciliation warning instead of silently fixing it.

*Done when:* you can import a real bank export twice without duplicates, and the checking account's
curve follows the ledger.

### Step 2 · Categories, rules, envelopes

- `Category` (two levels, e.g. Food › Groceries), seeded with a sensible default set in FR + EN,
  editable.
- `Rule`: condition on label (contains / regex), amount range, account → set category, payee,
  envelope or link. Applied on import and on demand ("apply to past transactions"); manual
  categorization always wins over a rule.
- **Envelope link:** envelopes get an optional category mapping; spending in those categories fills
  the envelope. `current_amount` becomes derived for linked envelopes and stays manual for others
  (no breaking change).
- Uncategorized inbox: a view of transactions with no category, keyboard-friendly to clear fast.

*Done when:* a month of imported transactions can be fully categorized in a few minutes, and a
linked envelope updates itself.

### Step 3 · Payees, transfers, repayments

- **Payees** built automatically from cleaned labels (strip card numbers, dates, `CB`, `PRLV SEPA`
  prefixes…); merge and rename. A page per payee: transactions, total per month, category, linked
  recurring.
- **Transfers:** a debit on one account and a matching credit on another (same amount, ±3 days)
  are paired, shown once, and excluded from income/expense totals.
- **Contributions:** a transfer into a PEA / life insurance / PER account is recorded as a
  contribution (`links.kind = contribution`) — the data Phase 6 needs.
- **Repayments:** debits matching a liability's `monthly_payment` (rule or confirmation) are linked
  to it; `remaining_amount` becomes derivable from start amount, rate and repayments, with the
  manual value still allowed.

*Done when:* moving money between your own accounts no longer looks like spending, and a loan's
remaining balance follows its repayments.

### Step 4 · Recurring and upcoming

- Detection of recurring transactions (same payee, similar amount, regular interval: weekly,
  monthly, yearly), proposed to the user, never applied silently.
- `Recurring` model: payee, expected amount, interval, next date, account; marked as income or
  expense.
- Upcoming list: next 30 days of expected bills and income per account, and a projected balance
  ("lowest point before next income").
- Subscriptions view: everything recurring, yearly cost, last price change.

*Done when:* the app tells you what's due before payday and flags a subscription whose price went
up.

### Step 5 · Pulse (home) and cross-app UI

The equivalent of Havre's *Today*. A feed built from every app's events, ranked:

- Upcoming bills and income (cashflow), projected low balance.
- Envelopes overspent or close to their target (budget).
- Uncategorized transactions waiting (cashflow).
- Stale valuations, unpriced holdings, large price moves since last visit (wealth).
- Reconciliation warnings (step 1).

Cross-app panels, so each page shows what the other apps know:

- Account page: transactions, contributions, recurring on that account.
- Envelope page: the transactions that filled it.
- Liability page: repayments and payoff curve.
- Payee page: everything linked to that payee.

New dashboard widget sources: monthly spending, income vs expenses, savings rate, top categories,
upcoming bills.

*Done when:* opening Croesus answers "anything I need to deal with?" without visiting each page.

### Step 6 · Feeding Phase 6 Insights

The ledger unblocks items already in the roadmap; this step wires them to real data:

- Contribution vs performance, using contributions from step 3.
- Savings rate (income − expenses over income, transfers excluded) feeding the projections.
- Tax-wrapper ceilings on contributions (PEA €150k, Livret A, LDDS, LEP…).
- Emergency fund target expressed in months of actual expenses (rolling average).
- Debt payoff projections using real repayments.

### Step 7 · Croesus ↔ Havre (later)

- A read-only API scope (token in Settings, like Havre's MCP tokens) exposing Pulse items and
  upcoming bills.
- Havre side: upcoming bills in Agenda / Tasks, a Croesus line in the morning brief.
- Croesus side: an MCP endpoint (read-only) so AI tools can answer "how much did I spend on food
  last month?" — with the same "propose, never act" rule as Havre.
- Optional: attach an invoice from Havre Mail to a transaction.

## Data model summary

```text
Account 1─* Transaction *─1 Category
               │  *─1 Payee 1─* Recurring
               │  *─1 Import
               └── links ──> Liability (repayment) / Account (transfer, contribution)
                                  Envelope (via Category mapping)
Rule ──applies to──> Transaction
```

## Security & privacy

Transaction data is more revealing than balances; treat it accordingly.

- **Parsing:** OFX 2.x is XML — parse with `defusedxml`; SGML OFX 1.x with a strict parser. Cap
  upload size and row count; reject files that don't match the declared format.
- **No raw file retention:** parse, show the preview, store rows, discard the file.
- **Untrusted text:** labels and payee names come from banks and are rendered in the UI and later
  passed to AI tools — escape in the UI, never interpret as instructions (Havre's prompt-injection
  rule applies to step 7).
- **CSV export injection:** when exports (Phase 8) include labels, prefix cells starting with
  `= + - @` so they don't run as spreadsheet formulas.
- **Ownership:** every table gets a `user_id` in step 0, before any transaction is stored, and all
  access goes through one scoped path so a forgotten filter can't leak another owner's data.
  Phase 7 (household sharing) then only adds *sharing* on top, not isolation.
- **Rate limiting** on import endpoints, reusing `core/rate_limit.py`.
- **Desktop mode:** the SQLite file now holds transaction history; document that and consider
  encryption at rest alongside Phase 8's encrypted backups.

## Testing

- Parser tests with fixture files from several French banks (anonymized), both OFX versions and
  CSV variants (`;` separator, `,` decimals, debit/credit columns).
- Dedup: importing the same file twice, overlapping date ranges, identical same-day transactions.
- Derived values: envelope, liability and cash-account valuation stay correct after edits, deletes
  and re-categorization; manual values are never overwritten.
- Transfer pairing and recurring detection on synthetic series, including edge cases (31st of the
  month, February, amount drift).
- Every migration run against both PostgreSQL and SQLite in CI.

## Decisions

1. **Roadmap placement:** new *Phase 5 — Cash flow & connected apps*; later phases renumbered
   (Insights → 6, Household sharing → 7, Data portability → 8, Bank aggregation → 9).
2. **Ownership:** `user_id` on every table now, in step 0.
3. **Module refactor:** existing code moves into `modules/` in step 0, as its own refactor PR.
4. **Naming:** the app is **Cash flow** — it covers more than a list of transactions (transfers,
   recurring, upcoming), and it's the term the French UI translates cleanly (*Flux de trésorerie*,
   shortened to *Trésorerie*). The home feed is **Pulse** — *Today* fits Havre's day-shaped
   content, but Croesus's items span weeks (bills due in 30 days, stale valuations), and *Home*
   would clash with the existing Dashboard.
5. **Bank aggregation:** unchanged (Powens/Bridge), now Phase 9, plugging into the ledger as one
   more import source.
