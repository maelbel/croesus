import { useOverlay } from '@nuxt/ui/composables'
import ConfirmDialog from '../components/ConfirmDialog.vue'

export interface ConfirmOptions {
  title?: string
  confirmLabel?: string
  confirmColor?: 'primary' | 'rust'
}

// Registered once and reused — useOverlay().create() adds a permanent entry
// to its shared overlay list, so calling it fresh on every useConfirm() call
// would leak one per caller instead of sharing a single dialog instance.
let dialog: ReturnType<ReturnType<typeof useOverlay>['create']> | undefined

/** A UModal-based replacement for window.confirm() — resolves to whether the
 * user confirmed. */
export function useConfirm() {
  dialog ??= useOverlay().create(ConfirmDialog)

  return function confirm(message: string, options?: ConfirmOptions): Promise<boolean> {
    return dialog!.open({ message, ...options }).result as Promise<boolean>
  }
}
