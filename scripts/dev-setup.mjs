#!/usr/bin/env node
// One-shot local dev setup: installs everything needed to run the backend,
// frontend, and the desktop (Tauri) shell. Safe to re-run.
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import * as p from '@clack/prompts'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function commandExists(cmd) {
  const result = spawnSync(cmd, ['--version'], { stdio: 'ignore' })
  return result.error === undefined || result.error.code !== 'ENOENT'
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

p.outro(
  [
    'Done. Next:',
    '  Backend only:  cd backend && uv run uvicorn app.main:app --reload',
    '  Frontend only: cd frontend && pnpm dev',
    '  Desktop app:   pnpm tauri dev',
  ].join('\n'),
)
