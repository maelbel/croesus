import { useI18n } from 'vue-i18n'
import { useToast } from '@nuxt/ui/composables'
import { errorMessage } from '../lib/errors'
import { useConfirm } from './useConfirm'

/**
 * Shared confirm-then-delete flow: confirms with the user, runs the delete,
 * and surfaces a failure via toast instead of leaving it an unhandled
 * rejection with no feedback (see useCrudForm.ts's create/update path,
 * which this mirrors for delete).
 *
 * `entityKey` is a key into the `entities` locale namespace, e.g. "account".
 */
export function useDeleteAction(entityKey: string) {
  const toast = useToast()
  const confirm = useConfirm()
  const { t } = useI18n()

  return async function remove(confirmMessage: string, action: () => Promise<void>) {
    if (!(await confirm(confirmMessage, { confirmLabel: t('common.delete'), confirmColor: 'rust' }))) return
    try {
      await action()
    } catch (error) {
      toast.add({
        title: t(`entities.${entityKey}.deleteError`),
        description: errorMessage(error),
        color: 'rust',
      })
    }
  }
}
