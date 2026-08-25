#!/usr/bin/env node
// Interactive setup for a self-hosted (Docker Compose) deployment: creates
// .env from .env.example if missing, fills in secrets you haven't set
// yourself, and optionally starts the stack. Safe to re-run — it never
// overwrites a value already present in .env.
import { randomBytes } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import * as p from '@clack/prompts'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const envPath = path.join(repoRoot, '.env')

function commandExists(cmd, args = ['--version']) {
  const result = spawnSync(cmd, args, { stdio: 'ignore' })
  return result.error === undefined || result.error.code !== 'ENOENT'
}

function readEnv() {
  return existsSync(envPath) ? readFileSync(envPath, 'utf8') : ''
}

// Reads a key's value whether it's set or still commented out in .env.
function getEnv(content, key) {
  const matches = [...content.matchAll(new RegExp(`^#? ?${key}=(.*)$`, 'gm'))]
  return matches.length ? matches[matches.length - 1][1] : ''
}

// Sets/uncomments a key, appending it if it isn't in the file at all.
function setEnv(content, key, value) {
  const pattern = new RegExp(`^#? ?${key}=.*$`, 'gm')
  if (pattern.test(content)) {
    return content.replace(pattern, `${key}=${value}`)
  }
  return `${content}${content.endsWith('\n') || content === '' ? '' : '\n'}${key}=${value}\n`
}

function cancelIfNeeded(value) {
  if (p.isCancel(value)) {
    p.cancel('Setup cancelled.')
    process.exit(1)
  }
  return value
}

p.intro('Croesus self-hosted setup')

if (!commandExists('docker')) {
  p.log.error('Missing required tool: docker — see README.md -> Prerequisites.')
  process.exit(1)
}
if (!commandExists('docker', ['compose', 'version'])) {
  p.log.error("Docker Compose plugin not found (try: docker compose version).")
  process.exit(1)
}

let env = readEnv()
if (!existsSync(envPath)) {
  copyFileSync(path.join(repoRoot, '.env.example'), envPath)
  env = readEnv()
  p.log.info('Created .env from .env.example')
}

if (!getEnv(env, 'POSTGRES_PASSWORD')) {
  env = setEnv(env, 'POSTGRES_PASSWORD', randomBytes(24).toString('hex'))
  writeFileSync(envPath, env)
  p.log.info('Generated POSTGRES_PASSWORD')
}

const enableAuth = cancelIfNeeded(
  await p.confirm({
    message: "Require login on this instance? Needed to use it from the desktop app's remote mode.",
    initialValue: true,
  }),
)

if (enableAuth) {
  const adminUser = cancelIfNeeded(
    await p.text({ message: 'Admin username', defaultValue: 'admin', placeholder: 'admin' }),
  )
  env = setEnv(env, 'ADMIN_USERNAME', adminUser || 'admin')
  writeFileSync(envPath, env)

  if (!getEnv(env, 'ADMIN_PASSWORD')) {
    const adminPass = randomBytes(12).toString('hex')
    env = setEnv(env, 'ADMIN_PASSWORD', adminPass)
    writeFileSync(envPath, env)
    p.log.info(`Generated ADMIN_PASSWORD: ${adminPass}`)
    p.log.warn("Save this now — it won't be shown again (change it any time by editing .env and restarting).")
  }

  if (!getEnv(env, 'JWT_SECRET')) {
    env = setEnv(env, 'JWT_SECRET', randomBytes(32).toString('hex'))
    writeFileSync(envPath, env)
    p.log.info('Generated JWT_SECRET')
  }
}

const remoteMode = cancelIfNeeded(
  await p.confirm({
    message: "Will you connect to this instance from the desktop app's remote mode?",
    initialValue: false,
  }),
)

if (remoteMode) {
  const webOrigin = cancelIfNeeded(
    await p.text({
      message: "Web frontend origin, if you also serve one (e.g. https://croesus.example.com)",
      placeholder: 'leave blank to skip',
    }),
  )
  const origins = ['tauri://localhost', 'http://tauri.localhost']
  if (webOrigin) origins.unshift(webOrigin)
  const corsValue = JSON.stringify(origins)
  env = setEnv(env, 'CORS_ORIGINS', corsValue)
  writeFileSync(envPath, env)
  p.log.info(`Set CORS_ORIGINS=${corsValue}`)
  p.log.info(
    [
      'Note: this deliberately excludes http://localhost:5173 (pnpm tauri dev).',
      'Test remote mode in dev against a disposable local backend instead of this one.',
    ].join('\n'),
  )
}

const runNow = cancelIfNeeded(
  await p.confirm({ message: "Run 'docker compose up -d --build' now?", initialValue: true }),
)

if (runNow) {
  const result = spawnSync('docker', ['compose', 'up', '-d', '--build'], { cwd: repoRoot, stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status ?? 1)
  p.outro('Stack is up.')
} else {
  p.outro("Skipped. Run 'docker compose up -d --build' whenever you're ready.")
}
