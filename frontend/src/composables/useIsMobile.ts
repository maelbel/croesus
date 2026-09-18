import { onMounted, onUnmounted, ref, type Ref } from 'vue'

// Matches the app's existing (implicit) breakpoint convention — Tailwind's default `sm`, used
// throughout via the `sm:` prefix (see App.vue) — rather than inventing a second one.
const QUERY = '(max-width: 639.98px)'

/** Tracks whether the viewport is currently below the app's mobile breakpoint. Used by
 * WidgetGrid.vue to fall back to a stacked, view-only layout — a plain `@media` rule can't do
 * this alone since each widget's grid position is a computed inline style, not CSS. */
export function useIsMobile(): Ref<boolean> {
  const isMobile = ref(false)
  let mql: MediaQueryList | null = null

  function onChange(e: MediaQueryListEvent | MediaQueryList) {
    isMobile.value = e.matches
  }

  onMounted(() => {
    mql = window.matchMedia(QUERY)
    onChange(mql)
    mql.addEventListener('change', onChange)
  })

  onUnmounted(() => {
    mql?.removeEventListener('change', onChange)
  })

  return isMobile
}
