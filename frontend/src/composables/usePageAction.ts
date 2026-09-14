import { onUnmounted, watchEffect } from 'vue'
import { usePageActionStore } from '../stores/pageActions'

/** `label` may be a getter so the button text stays in sync with a reactive
 * source (e.g. a translated string) instead of being fixed at mount time. */
export function usePageAction(label: string | (() => string), action: () => void) {
  const pageActionStore = usePageActionStore()
  const resolveLabel = typeof label === 'function' ? label : () => label
  watchEffect(() => pageActionStore.setPrimaryAction(resolveLabel(), action))
  onUnmounted(() => pageActionStore.clearPrimaryAction())
}
