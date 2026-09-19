#!/usr/bin/env node
// One-shot local dev setup: installs everything needed to run the backend,
// frontend, and the desktop (Tauri) shell, applies migrations, and seeds
// sample data into a brand-new local database. Safe to re-run — an existing
// local database (the common re-run case) is left untouched.
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'
import * as p from '@clack/prompts'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function commandExists(cmd) {
  const result = spawnSync(cmd, ['--version'], { stdio: 'ignore' })
  return result.error === undefined || result.error.code !== 'ENOENT'
}

// backend/app/core/config.py's own default when no .env (or no DATABASE_URL line in it) exists.
const DEFAULT_DATABASE_URL = 'sqlite:///./croesus.db'

function backendDatabaseUrl() {
  const envPath = path.join(repoRoot, 'backend', '.env')
  if (!fs.existsSync(envPath)) return DEFAULT_DATABASE_URL
  const match = fs.readFileSync(envPath, 'utf8').match(/^DATABASE_URL=(.*)$/m)
  return match ? match[1].trim() : DEFAULT_DATABASE_URL
}

// Resolves a `sqlite:///<path>` URL to an absolute path (relative to backend/, matching how `uv
// run` — and SQLAlchemy's own cwd-relative resolution — sees it from there), or null for anything
// else (a real Postgres/MySQL URL, which this script has no business touching automatically).
function sqliteFilePath(databaseUrl) {
  if (!databaseUrl.startsWith('sqlite:///')) return null
  return path.join(repoRoot, 'backend', databaseUrl.slice('sqlite:///'.length))
}

function run(cmd, args, cwd) {
  const result = spawnSync(cmd, args, { cwd: path.join(repoRoot, cwd ?? '.'), stdio: 'inherit' })
  if (result.status !== 0) {
    p.log.error(`\`${cmd} ${args.join(' ')}\` failed${cwd ? ` in ${cwd}` : ''}.`)
    process.exit(result.status ?? 1)
  }
}

p.intro('Croesus local dev setup')

for (const tool of ['uv', 'pnpm', 'cargo']) {
  if (!commandExists(tool)) {
    p.log.error(`Missing required tool: ${tool} — see README.md -> Prerequisites.`)
    process.exit(1)
  }
}

p.log.step('backend: uv sync')
run('uv', ['sync'], 'backend')

p.log.step('backend: building desktop sidecar')
run('bash', ['build-sidecar.sh'], 'backend')

p.log.step('frontend: pnpm install')
run('pnpm', ['install'], 'frontend')

p.log.step('root: pnpm install (Tauri CLI)')
run('pnpm', ['install'], '.')

// Checked before migrations run, since `alembic upgrade head` itself creates the SQLite file —
// its absence beforehand is what actually distinguishes a brand-new setup from a re-run over an
// existing local database full of real data.
const databaseUrl = backendDatabaseUrl()
const sqlitePath = sqliteFilePath(databaseUrl)
const isFreshSqlite = sqlitePath !== null && !fs.existsSync(sqlitePath)

p.log.step('backend: uv run alembic upgrade head')
run('uv', ['run', 'alembic', 'upgrade', 'head'], 'backend')

if (isFreshSqlite) {
  p.log.step('backend: seeding sample data (fresh database)')
  run('uv', ['run', 'python', 'scripts/seed.py', '--yes'], 'backend')
} else if (sqlitePath) {
  p.log.info('Local database already exists — skipping seed (run `cd backend && uv run python scripts/seed.py --yes` to reset it with sample data).')
} else {
  p.log.info(`DATABASE_URL (${databaseUrl}) isn't the default local SQLite file — skipping auto-seed.`)
}

p.outro(
  [
    'Done. Next:',
    '  Backend only:  cd backend && uv run uvicorn app.main:app --reload',
    '  Frontend only: cd frontend && pnpm dev',
    '  Desktop app:   pnpm tauri dev',
  ].join('\n'),
)
