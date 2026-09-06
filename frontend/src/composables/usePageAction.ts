import { onMounted, onUnmounted } from 'vue'
import { usePageActionStore } from '../stores/pageActions'

export function usePageAction(label: string, action: () => void) {
  const pageActionStore = usePageActionStore()
  onMounted(() => pageActionStore.setPrimaryAction(label, action))
  onUnmounted(() => pageActionStore.clearPrimaryAction())
}
