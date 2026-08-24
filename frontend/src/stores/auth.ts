import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '../api/client'
import type { AuthStatus, TokenResponse } from '../api/types'

const TOKEN_KEY = 'croesus-auth-token'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const authEnabled = ref(false)
  const error = ref<string | null>(null)

  async function checkStatus() {
    const status = await api.get<AuthStatus>('/auth/status')
    authEnabled.value = status.auth_enabled
    return authEnabled.value
  }

  async function login(username: string, password: string) {
    error.value = null
    try {
      const result = await api.post<TokenResponse>('/auth/login', { username, password })
      token.value = result.access_token
      localStorage.setItem(TOKEN_KEY, result.access_token)
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Login failed'
      return false
    }
  }

  function logout() {
    token.value = null
    localStorage.removeItem(TOKEN_KEY)
  }

  return { token, authEnabled, error, checkStatus, login, logout }
})
