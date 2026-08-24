import { ref } from 'vue'
import { useConnectionStore, type ConnectionMode } from '../stores/connection'

export function normalizeUrl(url: string) {
  return url.trim().replace(/\/+$/, '')
}

// Shared by Settings (change an existing connection) and the onboarding
// screen (pick one for the first time) — same mode/URL/test-the-server flow.
export function useConnectionForm() {
  const connectionStore = useConnectionStore()

  const mode = ref<ConnectionMode>(connectionStore.mode)
  const serverUrl = ref(connectionStore.serverUrl ?? '')
  const testing = ref(false)
  const testError = ref<string | null>(null)
  const testOk = ref(false)

  function resetTest() {
    testOk.value = false
    testError.value = null
  }

  async function testConnection() {
    testError.value = null
    testOk.value = false
    const url = normalizeUrl(serverUrl.value)
    if (!url) {
      testError.value = 'Enter a server URL first.'
      return
    }

    testing.value = true
    try {
      const response = await fetch(`${url}/auth/status`)
      if (!response.ok) throw new Error(`Server responded with ${response.status}`)
      testOk.value = true
    } catch {
      testError.value = "Couldn't reach that server. Check the URL and that it's running."
    } finally {
      testing.value = false
    }
  }

  return { mode, serverUrl, testing, testError, testOk, testConnection, resetTest }
}
