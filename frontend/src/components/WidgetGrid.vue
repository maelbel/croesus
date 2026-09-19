<script setup lang="ts">
import { computed, provide, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { GridStack as GridStackCore } from 'gridstack'
import { GridStack, type GridStackOptions, type GridStackWidget } from 'gridstack/dist/vue'
import 'gridstack/dist/gridstack.css'
import type { Widget, WidgetType } from '../api/types'
import { CATALOG_WIDGET_TYPES, WIDGET_TYPES } from '../api/types'
import { WIDGET_CATALOG } from '../lib/widgetCatalog'
import { availableSources } from '../lib/widgetSources'
import { clearTrendPeriod } from '../lib/trendPeriod'
import { useIsMobile } from '../composables/useIsMobile'
import { WIDGET_GRID_CONTEXT } from '../lib/widgetGridContext'
import AddWidgetSlideover from './AddWidgetSlideover.vue'
import WidgetCard from './WidgetCard.vue'

const props = defineProps<{ widgets: Widget[] }>()
const emit = defineEmits<{ 'update:widgets': [widgets: Widget[]] }>()

const { t } = useI18n()

// Starts already in edit mode when the board is empty — otherwise the only
// way to discover "Add widget" would be to find "Edit layout" first, with
// nothing on screen hinting that's the next step.
const editMode = ref(props.widgets.length === 0)
const slideoverOpen = ref(false)

// Below the app's breakpoint the grid falls back to a stacked, view-only layout (see the template)
// — dragging/resizing a 12-column grid doesn't translate to a phone screen, so editing is hidden
// entirely there rather than made to (badly) work. GridStack itself isn't even mounted on mobile.
const isMobile = useIsMobile()

// Whether there's still at least one type (legacy) or (type, source) pair (catalog) left to add —
// hides the "Add widget" button entirely once the board has one of everything.
const hasAnythingToAdd = computed(() =>
  WIDGET_TYPES.some((type) =>
    (CATALOG_WIDGET_TYPES as readonly string[]).includes(type)
      ? availableSources(type as (typeof CATALOG_WIDGET_TYPES)[number]).some(
          (opt) => !props.widgets.some((w) => w.type === type && w.source === opt.value),
        )
      : !props.widgets.some((w) => w.type === type),
  ),
)

// Lets the shared page header's own actions (see DashboardPage.vue) drive edit mode and the
// add-widget slideover instead of duplicating either at the page level or rendering a second,
// redundant toolbar here.
defineExpose({
  editMode,
  hasAnythingToAdd,
  isMobile,
  toggleEdit: () => {
    editMode.value = !editMode.value
  },
  openAddMenu: () => {
    editMode.value = true
    slideoverOpen.value = true
  },
})

const GRID_COLS = 12
const ROW_HEIGHT = 110
const GAP = 16

// Row-then-column order — irrelevant to the desktop grid (GridStack positions each item by its
// own x/y regardless of source order) but exactly the order the mobile fallback stacks widgets in.
const orderedWidgets = computed(() => [...props.widgets].sort((a, b) => a.y - b.y || a.x - b.x))

// WidgetCard (rendered both directly for mobile and by GridStack for desktop — see the template)
// reads everything reactive through this instead of GridStack's own non-reactive per-node props.
provide(WIDGET_GRID_CONTEXT, {
  widgets: computed(() => props.widgets),
  editMode: computed(() => editMode.value && !isMobile.value),
  removeWidget,
})

interface GridStackRef {
  getGrid: () => GridStackCore | null
}
const gridRef = ref<GridStackRef | null>(null)

// Every widget resizes by free continuous drag within its catalog entry's minW/maxW/minH/maxH,
// enforced natively by GridStack. GridStack reads these directly off each node at resize-start
// time (defaulting to minW/minH: 1, maxW/maxH: Infinity when absent) — there's no grid-wide
// fallback, so every place a node is created (the initial `children` snapshot below, and
// addWidget()) must supply them itself.
function sizeBounds(type: WidgetType) {
  const { minW, maxW, minH, maxH } = WIDGET_CATALOG[type]
  return { minW, maxW, minH, maxH }
}

function itemOptions(widget: Widget) {
  return { x: widget.x, y: widget.y, w: widget.w, h: widget.h, ...sizeBounds(widget.type) }
}

// GridStack.init() only reads `options` (including `children`, the initial widget snapshot) once
// at mount — later adds/removes/resizes go through the imperative grid API below instead of
// round-tripping through this object, which is why it's a plain const, not reactive.
const gridOptions: GridStackOptions = {
  column: GRID_COLS,
  cellHeight: ROW_HEIGHT + GAP,
  margin: GAP / 2,
  float: false,
  staticGrid: !editMode.value,
  // GridStack's own drag-time auto-scroll (scroll:true, the default) miscomputes its scroll
  // boundary when the page itself is the scroll container (no nested overflow:auto ancestor,
  // which is our whole layout): it reads document.documentElement's own getBoundingClientRect(),
  // whose top/bottom drift by -scrollY as the page scrolls, instead of treating it as the fixed
  // viewport — so the "have we hit the bottom edge" check gets further wrong the more it scrolls,
  // a runaway feedback loop that scrolls the page down while dragging up. GridStack's own resize
  // auto-scroll (Utils.updateScrollResize) has an explicit fix for this exact documentElement case;
  // its drag counterpart (_getClipping/_autoScrollTick) doesn't, so drag-time auto-scroll is
  // disabled here rather than fought — resizing still auto-scrolls normally near an edge.
  // The whole card is now the drag handle (no more dedicated grip icon); ListWidget's clickable
  // rows use role="button" divs rather than real <button>s, so they'd otherwise be caught by
  // GridStack's own drag-start detection (which only exempts genuine form/button elements).
  draggable: { scroll: false, cancel: '[role="button"]' },
  resizable: { handles: 'se' },
  // Matches the old custom resize handle, always visible in edit mode rather than requiring a
  // hover to discover it (this — not resizable.autoHide — is what actually controls that; GridStack
  // derives resizable.autoHide from this option itself, overriding whatever's set there directly).
  alwaysShowResizeHandle: true,
  children: props.widgets.map((widget) => ({
    ...itemOptions(widget),
    id: widget.id,
    component: 'WidgetCard',
    props: { widgetId: widget.id },
  })),
}
const gridComponents = { WidgetCard }

watch(editMode, (on) => {
  gridRef.value?.getGrid()?.setStatic(!on)
})

// The one place that turns GridStack's own live layout back into our Widget[] — called after
// every drag/resize/add/removal settles, since GridStack (not our own props) is the source of
// truth for x/y/w/h while the grid is mounted (float:false compaction can move widgets we didn't
// directly touch).
function syncFromGrid() {
  const grid = gridRef.value?.getGrid()
  if (!grid) return
  // Read the live engine nodes, not grid.save() — save() is an export format that deliberately
  // *deletes* w/h whenever they equal what it considers a default (w === minW, or h === 1, see
  // GridStack's Utils.removeInternalForSave), so a widget resized down to exactly its minW or a
  // 1-row height would silently come back with w/h missing here and fall through to the stale
  // `?? w.w`/`?? w.h` prop value below — i.e. the resize would visibly apply, then get reverted
  // right back on save. engine.nodes always holds the real, unstripped numbers.
  const byId = new Map(grid.engine.nodes.filter((n) => n.id != null).map((n) => [n.id as string, n]))
  const updated = props.widgets
    .filter((w) => byId.has(w.id))
    .map((w) => {
      const n = byId.get(w.id)!
      return { ...w, x: n.x ?? w.x, y: n.y ?? w.y, w: n.w ?? w.w, h: n.h ?? w.h }
    })
  emit('update:widgets', updated)
}

function onSettled() {
  syncFromGrid()
}

function removeWidget(widget: Widget) {
  clearTrendPeriod(widget.id)
  const grid = gridRef.value?.getGrid()
  const node = grid?.engine.nodes.find((n) => n.id === widget.id)
  if (grid && node?.el) grid.removeWidget(node.el, true, true)
  syncFromGrid()
}

function addWidget({ type, source, w, h }: { type: WidgetType; source?: string; w: number; h: number }) {
  const id = source ? `${type}:${source}` : type
  const grid = gridRef.value?.getGrid()
  const newWidget: GridStackWidget = {
    id,
    x: 0,
    y: 0,
    w,
    h,
    autoPosition: true,
    component: 'WidgetCard',
    props: { widgetId: id },
    ...sizeBounds(type),
  }
  const el = grid?.addWidget(newWidget)
  const node = el?.gridstackNode
  emit('update:widgets', [...props.widgets, { id, type, source, x: node?.x ?? 0, y: node?.y ?? 0, w: node?.w ?? w, h: node?.h ?? h }])
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <UEmpty
      v-if="widgets.length === 0"
      icon="i-lucide-layout-dashboard"
      :title="t('dashboardGrid.emptyTitle')"
      :description="t('dashboardGrid.emptyDescription')"
      :actions="[{ label: t('dashboardGrid.emptyAction'), onClick: () => (editMode = true) }]"
      class="neu-inset"
    />

    <div v-else-if="isMobile" class="flex flex-col gap-4">
      <WidgetCard v-for="widget in orderedWidgets" :key="widget.id" :widget-id="widget.id" />
    </div>

    <GridStack v-else ref="gridRef" :options="gridOptions" :components="gridComponents" @dragstop="onSettled" @resizestop="onSettled" />

    <AddWidgetSlideover :open="slideoverOpen" :widgets="widgets" @update:open="slideoverOpen = $event" @add="addWidget" />
  </div>
</template>

<style scoped>
:global(.grid-stack-placeholder > .placeholder-content) {
  background: color-mix(in srgb, var(--ui-primary) 12%, transparent);
  border: 1.5px dashed var(--ui-primary);
  border-radius: 14px;
}

/* Swap GridStack's default diagonal-arrow resize icon for a grip-dot pattern, consistent with
   the grip-vertical drag handle in WidgetCard.vue — and cancel its baked-in -45deg rotation,
   which was meant for that arrow glyph, not this one. */
:global(.grid-stack-item > .ui-resizable-se) {
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><circle cx="14" cy="6" r="1.3" fill="%23666"/><circle cx="10" cy="10" r="1.3" fill="%23666"/><circle cx="14" cy="10" r="1.3" fill="%23666"/><circle cx="6" cy="14" r="1.3" fill="%23666"/><circle cx="10" cy="14" r="1.3" fill="%23666"/><circle cx="14" cy="14" r="1.3" fill="%23666"/></svg>');
  transform: none;
}
</style>
