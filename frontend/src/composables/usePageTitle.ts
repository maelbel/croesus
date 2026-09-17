import { watchEffect } from 'vue'
import { usePageTitleStore } from '../stores/pageTitle'

/** `kicker`/`title` may be getters so they stay in sync with a reactive
 * source (e.g. an account's name) instead of being fixed at mount time.
 *
 * Deliberately doesn't clear on unmount — see usePageAction.ts for why an
 * unmount-time clear races the next page's own call during a route change.
 * The router clears it up front instead (see router/index.ts's `beforeEach`).
 */
export function usePageTitle(kicker: string | (() => string), title: string | (() => string)) {
  const pageTitleStore = usePageTitleStore()
  const resolveKicker = typeof kicker === 'function' ? kicker : () => kicker
  const resolveTitle = typeof title === 'function' ? title : () => title
  watchEffect(() => pageTitleStore.setTitle(resolveKicker(), resolveTitle()))
}
