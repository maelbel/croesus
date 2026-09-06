import { defineStore } from 'pinia'
import { ref, watchEffect } from 'vue'

const OPEN_KEY = 'croesus-sidebar-open'

function readStoredOpen(): boolean {
  return localStorage.getItem(OPEN_KEY) !== 'false'
}

export const useSidebarStore = defineStore('sidebar', () => {
  const open = ref(readStoredOpen())

  watchEffect(() => {
    localStorage.setItem(OPEN_KEY, String(open.value))
  })

  function toggle() {
    open.value = !open.value
  }

  return { open, toggle }
})
