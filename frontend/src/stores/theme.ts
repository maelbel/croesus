import { defineStore } from 'pinia'
import { ref, watchEffect } from 'vue'
import { getCookie, setCookie } from '../lib/cookies'

export type Mode = 'dark' | 'light'

const MODE_KEY = 'croesus-theme'

// One-time upgrade path from the localStorage-based version of this
// setting — a cookie lets index.html's pre-mount theme bootstrap script
// (which must run synchronously, before any JS module/store exists) read the
// same value a plain <script> tag would otherwise need localStorage for.
function migrateFromLocalStorage(key: string): string | null {
  const legacy = localStorage.getItem(key)
  if (legacy !== null) localStorage.removeItem(key)
  return legacy
}

function readStoredMode(): Mode {
  const value = getCookie(MODE_KEY) ?? migrateFromLocalStorage(MODE_KEY)
  return value === 'light' ? 'light' : 'dark'
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<Mode>(readStoredMode())

  watchEffect(() => {
    document.documentElement.classList.toggle('dark', mode.value === 'dark')
    document.documentElement.classList.toggle('light', mode.value === 'light')
    setCookie(MODE_KEY, mode.value)
  })

  function setMode(value: Mode) {
    mode.value = value
  }

  function toggle() {
    mode.value = mode.value === 'dark' ? 'light' : 'dark'
  }

  return { mode, setMode, toggle }
})
