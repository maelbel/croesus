import { watchEffect } from 'vue'
import { usePageActionStore } from '../stores/pageActions'

/** `label` may be a getter so the button text stays in sync with a reactive
 * source (e.g. a translated string) instead of being fixed at mount time.
 *
 * Deliberately doesn't clear the action on unmount: during a route change,
 * the outgoing page's unmount and the incoming page's setup (which calls
 * this again) can fire in either order, so an unmount-time clear can run
 * *after* the new page has already set its own action, wiping it back to
 * nothing. The router clears it up front, before the swap starts (see
 * `router/index.ts`'s `beforeEach`), which doesn't race the next page's own
 * `usePageAction` call.
 */
export function usePageAction(label: string | (() => string), action: () => void) {
  const pageActionStore = usePageActionStore()
  const resolveLabel = typeof label === 'function' ? label : () => label
  watchEffect(() => pageActionStore.setPrimaryAction(resolveLabel(), action))
}

/** A secondary button rendered just before the primary one (see `usePageAction`) — e.g. the
 * dashboard's "Edit layout"/"Done" toggle next to its "Add widget" primary action. */
export function useSecondaryPageAction(label: string | (() => string), action: () => void) {
  const pageActionStore = usePageActionStore()
  const resolveLabel = typeof label === 'function' ? label : () => label
  watchEffect(() => pageActionStore.setSecondaryAction(resolveLabel(), action))
}
