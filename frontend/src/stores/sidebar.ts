import { defineStore } from 'pinia'
import { ref, watchEffect } from 'vue'

const OPEN_KEY = 'croesus-sidebar-open'

// An explicit prior choice (any device) always wins. With no stored
// preference yet, default to collapsed on a narrow viewport instead of
// unconditionally open — the sidebar is 248px wide open, which is most of a
// phone-width screen.
function readStoredOpen(): boolean {
  const stored = localStorage.getItem(OPEN_KEY)
  if (stored !== null) return stored !== 'false'
  return window.innerWidth >= 640
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
