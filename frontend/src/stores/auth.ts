import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '../api/client'
import { errorMessage } from '../lib/errors'
import type { AuthStatus, TokenResponse } from '../api/types'

const TOKEN_KEY = 'croesus-auth-token'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const authEnabled = ref(false)
  const passwordEnabled = ref(false)
  const oidcEnabled = ref(false)
  const oidcDisplayName = ref<string | null>(null)
  const error = ref<string | null>(null)

  async function checkStatus() {
    const status = await api.get<AuthStatus>('/auth/status')
    authEnabled.value = status.auth_enabled
    passwordEnabled.value = status.password_enabled
    oidcEnabled.value = status.oidc_enabled
    oidcDisplayName.value = status.oidc_display_name
    return authEnabled.value
  }

  function setToken(accessToken: string) {
    error.value = null
    token.value = accessToken
    localStorage.setItem(TOKEN_KEY, accessToken)
  }

  function setError(message: string | null) {
    error.value = message
  }

  async function login(username: string, password: string) {
    error.value = null
    try {
      const result = await api.post<TokenResponse>('/auth/login', { username, password })
      setToken(result.access_token)
      return true
    } catch (e) {
      error.value = errorMessage(e, 'Login failed')
      return false
    }
  }

  function logout() {
    token.value = null
    localStorage.removeItem(TOKEN_KEY)
  }

  return {
    token,
    authEnabled,
    passwordEnabled,
    oidcEnabled,
    oidcDisplayName,
    error,
    checkStatus,
    setToken,
    setError,
    login,
    logout,
  }
})
