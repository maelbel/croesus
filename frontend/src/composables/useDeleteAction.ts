import { useToast } from '@nuxt/ui/composables'
import { errorMessage } from '../lib/errors'
import { useConfirm } from './useConfirm'

/**
 * Shared confirm-then-delete flow: confirms with the user, runs the delete,
 * and surfaces a failure via toast instead of leaving it an unhandled
 * rejection with no feedback (see useCrudForm.ts's create/update path,
 * which this mirrors for delete).
 */
export function useDeleteAction(entityLabel: string) {
  const toast = useToast()
  const confirm = useConfirm()

  return async function remove(confirmMessage: string, action: () => Promise<void>) {
    if (!(await confirm(confirmMessage, { confirmLabel: 'Delete', confirmColor: 'rust' }))) return
    try {
      await action()
    } catch (error) {
      toast.add({
        title: `Couldn't delete ${entityLabel}`,
        description: errorMessage(error),
        color: 'rust',
      })
    }
  }
}
