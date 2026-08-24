import { useConnectionStore } from '../stores/connection'
import { useAuthStore } from '../stores/auth'

// Local desktop mode and self-hosted/browser mode both resolve here. Remote
// desktop mode instead points at whatever server URL the user configured in
// Settings — see stores/connection.ts.
function resolveBaseUrl(): string {
  const connection = useConnectionStore()
  if (connection.mode === 'remote' && connection.serverUrl) return connection.serverUrl
  return import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const auth = useAuthStore()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (auth.token) headers.Authorization = `Bearer ${auth.token}`

  const response = await fetch(`${resolveBaseUrl()}${path}`, {
    headers,
    ...options,
  })

  // A previously valid token expired or was revoked server-side — drop it so
  // the UI falls back to the login screen instead of looping on 401s.
  if (response.status === 401) auth.logout()

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new ApiError(response.status, body.detail ?? response.statusText)
  }

  if (response.status === 204) return undefined as T

  return response.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

// Desktop mode starts the backend as a PyInstaller sidecar, which can take a
// couple of seconds to unpack and boot — poll until it responds instead of
// firing the dashboard's first requests against a backend that isn't up yet.
// Resolves near-instantly for self-hosted/dev, where the backend is already running.
export async function waitForBackend(timeoutMs = 15000, intervalMs = 300): Promise<boolean> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${resolveBaseUrl()}/health`)
      if (response.ok) return true
    } catch {
      // backend not up yet, keep polling
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }

  return false
}
