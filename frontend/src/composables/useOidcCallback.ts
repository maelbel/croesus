import { useAuthStore } from '../stores/auth'

export function useOidcCallback() {
  function consume() {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const token = hash.get('token')
    const error = hash.get('error')
    if (!token && !error) return

    const authStore = useAuthStore()
    if (token) authStore.setToken(token)
    else if (error) authStore.setError(error)
    history.replaceState(null, '', window.location.pathname + window.location.search)
  }

  return { consume }
}
