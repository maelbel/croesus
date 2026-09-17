import { defineStore } from 'pinia'
import { ref } from 'vue'

/** Lets a page override the header's kicker/title beyond the route's static
 * `meta.kicker`/`meta.title` — used by pages whose title is data-driven
 * (e.g. an account's own name) rather than a fixed translated string. */
export const usePageTitleStore = defineStore('pageTitle', () => {
  const kicker = ref<string | null>(null)
  const title = ref<string | null>(null)

  function setTitle(newKicker: string, newTitle: string) {
    kicker.value = newKicker
    title.value = newTitle
  }

  function clearTitle() {
    kicker.value = null
    title.value = null
  }

  return { kicker, title, setTitle, clearTitle }
})
