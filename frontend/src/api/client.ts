const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

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
      const response = await fetch(`${API_BASE_URL}/health`)
      if (response.ok) return true
    } catch {
      // backend not up yet, keep polling
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }

  return false
}
