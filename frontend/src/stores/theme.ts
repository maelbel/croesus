import { defineStore } from 'pinia'
import { ref, watchEffect } from 'vue'

export type Mode = 'dark' | 'light'
export type Skin = 'ledger' | 'neumorphic'

const MODE_KEY = 'croesus-theme'
const SKIN_KEY = 'croesus-skin'

export const SKINS: { value: Skin; label: string; description: string }[] = [
  { value: 'ledger', label: 'Ledger', description: 'Flat, bordered, editorial — the original look.' },
  { value: 'neumorphic', label: 'Neumorphic', description: 'Soft extruded surfaces, no borders.' },
]

function readStoredMode(): Mode {
  return localStorage.getItem(MODE_KEY) === 'light' ? 'light' : 'dark'
}

function readStoredSkin(): Skin {
  return localStorage.getItem(SKIN_KEY) === 'neumorphic' ? 'neumorphic' : 'ledger'
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<Mode>(readStoredMode())
  const skin = ref<Skin>(readStoredSkin())

  watchEffect(() => {
    document.documentElement.classList.toggle('dark', mode.value === 'dark')
    document.documentElement.classList.toggle('light', mode.value === 'light')
    localStorage.setItem(MODE_KEY, mode.value)
  })

  watchEffect(() => {
    document.documentElement.dataset.skin = skin.value
    localStorage.setItem(SKIN_KEY, skin.value)
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
