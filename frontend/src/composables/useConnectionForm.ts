import { ref } from 'vue'
import { relaunch } from '@tauri-apps/plugin-process'
import { checkServerReachable } from '../api/client'
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
      testOk.value = await checkServerReachable(url, '/auth/status')
      if (!testOk.value) testError.value = "Couldn't reach that server. Check the URL and that it's running."
    } finally {
      testing.value = false
    }
  }

  return { mode, serverUrl, testing, testError, testOk, testConnection, resetTest }
}

// Shared by Settings (relaunch either way — an existing local/remote choice
// is being changed) and onboarding (relaunch only for remote; picking local
// for the first time has no prior sidecar session to restart, so it just
// continues via onLocalWithoutRelaunch instead).
export function useApplyConnection(options?: { onLocalWithoutRelaunch?: () => void }) {
  const connectionStore = useConnectionStore()
  const applying = ref(false)

  async function apply(mode: ConnectionMode, serverUrl: string, testOk: boolean) {
    if (mode === 'remote' && !testOk) return

    applying.value = true
    try {
      await connectionStore.save(mode, mode === 'remote' ? normalizeUrl(serverUrl) : null)
      if (mode === 'local' && options?.onLocalWithoutRelaunch) {
        options.onLocalWithoutRelaunch()
      } else {
        // New server URL (or a local->remote/remote->local switch) only takes effect from a clean process start.
        await relaunch()
      }
    } finally {
      applying.value = false
    }
  }

  return { applying, apply }
}
