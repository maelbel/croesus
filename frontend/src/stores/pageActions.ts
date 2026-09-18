import { defineStore } from 'pinia'
import { ref } from 'vue'

export const usePageActionStore = defineStore('pageActions', () => {
  const label = ref<string | null>(null)
  const action = ref<(() => void) | null>(null)
  // A secondary, less prominent button rendered just before the primary one — e.g. the
  // dashboard's "Edit layout"/"Done" toggle next to its "Add widget" primary action.
  const secondaryLabel = ref<string | null>(null)
  const secondaryAction = ref<(() => void) | null>(null)

  function setPrimaryAction(newLabel: string, newAction: () => void) {
    label.value = newLabel
    action.value = newAction
  }

  function clearPrimaryAction() {
    label.value = null
    action.value = null
  }

  function setSecondaryAction(newLabel: string, newAction: () => void) {
    secondaryLabel.value = newLabel
    secondaryAction.value = newAction
  }

  function clearSecondaryAction() {
    secondaryLabel.value = null
    secondaryAction.value = null
  }

  return {
    label,
    action,
    setPrimaryAction,
    clearPrimaryAction,
    secondaryLabel,
    secondaryAction,
    setSecondaryAction,
    clearSecondaryAction,
  }
})
