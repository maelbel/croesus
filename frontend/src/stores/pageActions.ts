import { defineStore } from 'pinia'
import { ref } from 'vue'

export const usePageActionStore = defineStore('pageActions', () => {
  const label = ref<string | null>(null)
  const action = ref<(() => void) | null>(null)

  function setPrimaryAction(newLabel: string, newAction: () => void) {
    label.value = newLabel
    action.value = newAction
  }

  function clearPrimaryAction() {
    label.value = null
    action.value = null
  }

  return { label, action, setPrimaryAction, clearPrimaryAction }
})
