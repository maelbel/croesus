import type { ComputedRef, InjectionKey } from 'vue'
import type { Widget } from '../api/types'

// Widget geometry/component assignment goes through GridStack's own (non-reactive, apply-once)
// `component`/`props` mechanism — see WidgetGrid.vue's gridOptions.children — so anything that
// actually needs to change reactively (which widget is which, edit mode, remove action) is
// threaded through provide/inject instead, independent of GridStack's update cycle.
export interface WidgetGridContext {
  widgets: ComputedRef<Widget[]>
  editMode: ComputedRef<boolean>
  removeWidget: (widget: Widget) => void
}

export const WIDGET_GRID_CONTEXT: InjectionKey<WidgetGridContext> = Symbol('widget-grid-context')
