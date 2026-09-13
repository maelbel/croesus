import { defineStore } from 'pinia'
import { ref, watchEffect } from 'vue'
import { getCookie, setCookie } from '../lib/cookies'

export type Mode = 'dark' | 'light'
export type Skin = 'ledger' | 'neumorphic'

const MODE_KEY = 'croesus-theme'
const SKIN_KEY = 'croesus-skin'

export const SKINS: { value: Skin; label: string; description: string }[] = [
  { value: 'ledger', label: 'Ledger', description: 'Flat, bordered, editorial — the original look.' },
  { value: 'neumorphic', label: 'Neumorphic', description: 'Soft extruded surfaces, no borders.' },
]

// One-time upgrade path from the localStorage-based version of these
// settings — a cookie lets index.html's pre-mount theme bootstrap script
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

function readStoredSkin(): Skin {
  const value = getCookie(SKIN_KEY) ?? migrateFromLocalStorage(SKIN_KEY)
  return value === 'neumorphic' ? 'neumorphic' : 'ledger'
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<Mode>(readStoredMode())
  const skin = ref<Skin>(readStoredSkin())

  watchEffect(() => {
    document.documentElement.classList.toggle('dark', mode.value === 'dark')
    document.documentElement.classList.toggle('light', mode.value === 'light')
    setCookie(MODE_KEY, mode.value)
  })

  watchEffect(() => {
    document.documentElement.dataset.skin = skin.value
    setCookie(SKIN_KEY, skin.value)
  })

  function setMode(value: Mode) {
    mode.value = value
  }

  function toggle() {
    mode.value = mode.value === 'dark' ? 'light' : 'dark'
  }

  function setSkin(value: Skin) {
    skin.value = value
  }

  return { mode, skin, setMode, toggle, setSkin }
})
