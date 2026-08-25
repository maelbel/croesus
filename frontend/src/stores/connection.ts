import { defineStore } from 'pinia'
import { ref } from 'vue'
import { isTauri, invoke } from '@tauri-apps/api/core'

export type ConnectionMode = 'local' | 'remote'

interface ConnectionConfig {
  mode: ConnectionMode
  serverUrl: string | null
  configured: boolean
}

// Only the Tauri desktop shell has a "local sidecar vs. remote server" choice —
// self-hosted/browser mode always just talks to VITE_API_URL.
export const useConnectionStore = defineStore('connection', () => {
  const mode = ref<ConnectionMode>('local')
  const serverUrl = ref<string | null>(null)
  // Stays false until the user has been through onboarding (or Settings)
  // once — App.vue uses this to decide whether to show onboarding.
  const configured = ref(false)
  const loaded = ref(false)

  async function load() {
    if (isTauri()) {
      const config = await invoke<ConnectionConfig>('get_connection_config')
      mode.value = config.mode
      serverUrl.value = config.serverUrl
      configured.value = config.configured
    }
    loaded.value = true
  }

  async function save(nextMode: ConnectionMode, nextServerUrl: string | null) {
    await invoke('save_connection_config', {
      config: { mode: nextMode, serverUrl: nextServerUrl, configured: true },
    })
    mode.value = nextMode
    serverUrl.value = nextServerUrl
    configured.value = true
  }

  return { mode, serverUrl, configured, loaded, load, save }
})
