#!/usr/bin/env node
// Fills the dev Docker stack's database (docker-compose.dev.yml) with
// realistic sample net worth data. Wipes existing accounts, assets,
// valuations, liabilities, and envelopes in that database first.
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import * as p from '@clack/prompts'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const autoYes = process.argv.includes('--yes') || process.argv.includes('-y')

p.intro('Croesus dev database seed')

const warning =
  'This wipes all accounts, assets, valuations, liabilities, and envelopes ' +
  'in the DEV database and replaces them with sample data.'

if (autoYes) {
  p.log.warn(`${warning} Continuing (--yes passed).`)
} else if (!process.stdin.isTTY) {
  p.cancel('No interactive terminal to confirm on — rerun with --yes to skip the prompt.')
  process.exit(1)
} else {
  const confirmed = await p.confirm({
    message: `${warning} Continue?`,
    initialValue: false,
  })

  if (p.isCancel(confirmed) || !confirmed) {
    p.cancel('Aborted.')
    process.exit(1)
  }
}

p.log.step('Running scripts/seed.py in croesus-dev-backend...')
const result = spawnSync(
  'docker',
  [
    'compose',
    '-f',
    'docker-compose.dev.yml',
    'exec',
    '-T',
    'backend',
    'uv',
    'run',
    'python',
    'scripts/seed.py',
    '--yes',
  ],
  { cwd: repoRoot, stdio: 'inherit' },
)

if (result.error) {
  p.log.error(`Failed to run docker compose: ${result.error.message}`)
  process.exit(1)
}
if (result.status !== 0) {
  p.log.error('Seed script failed — see output above.')
  process.exit(result.status ?? 1)
}

p.outro('Dev database seeded.')
