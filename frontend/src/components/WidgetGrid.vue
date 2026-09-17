<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CatalogWidgetType, LegacyWidgetType, Widget } from '../api/types'
import { CATALOG_WIDGET_TYPES, LEGACY_WIDGET_TYPES } from '../api/types'
import { WIDGET_CATALOG } from '../lib/widgetCatalog'
import { availableSources } from '../lib/widgetSources'
import { GRID_COLS, clampSize, findSpot, nextPresetSize, settle } from '../lib/widgetGrid'
import EllipsisMenu from './EllipsisMenu.vue'
import AddCatalogWidgetModal from './AddCatalogWidgetModal.vue'

const props = defineProps<{ widgets: Widget[] }>()
const emit = defineEmits<{ 'update:widgets': [widgets: Widget[]] }>()

const { t } = useI18n()

// Starts already in edit mode when the board is empty — otherwise the only
// way to discover "Add widget" would be to find "Edit layout" first, with
// nothing on screen hinting that's the next step.
const editMode = ref(props.widgets.length === 0)

// Fixed row pitch (px) — every widget's height is always a whole multiple of
// this, same as its width is always a whole number of the 12 columns.
const ROW_HEIGHT = 110
const GAP = 16

const gridRef = ref<HTMLElement | null>(null)

type DragMode = 'move' | 'resize'
type DragGhost = { id: string; x: number; y: number; w: number; h: number }
const dragGhost = ref<DragGhost | null>(null)

// What actually gets rendered: the committed layout, except the widget
// currently being dragged/resized shows its live (already-snapped) position
// instead — nothing is emitted upstream until the gesture ends.
const displayWidgets = computed(() =>
  props.widgets.map((w) => (dragGhost.value?.id === w.id ? { ...w, ...dragGhost.value } : w)),
)

function gridArea(w: Widget) {
  return `${w.y + 1} / ${w.x + 1} / span ${w.h} / span ${w.w}`
}

function beginDrag(mode: DragMode, widget: Widget, event: PointerEvent) {
  if (!editMode.value) return
  event.preventDefault()
  const rect = gridRef.value!.getBoundingClientRect()
  const startX = event.clientX
  const startY = event.clientY
  const orig = { x: widget.x, y: widget.y, w: widget.w, h: widget.h }
  const pitchX = (rect.width + GAP) / GRID_COLS
  const pitchY = ROW_HEIGHT + GAP

  function onMove(e: PointerEvent) {
    const dx = e.clientX - startX
    const dy = e.clientY - startY
    if (mode === 'move') {
      const x = Math.min(GRID_COLS - orig.w, Math.max(0, orig.x + Math.round(dx / pitchX)))
      const y = Math.max(0, orig.y + Math.round(dy / pitchY))
      dragGhost.value = { id: widget.id, x, y, w: orig.w, h: orig.h }
    } else {
      // Only rendered for legacy widgets (see the template's resize handle) — catalog widgets
      // resize by cycling their size presets instead (see cycleSize below).
      const rawW = orig.w + Math.round(dx / pitchX)
      const rawH = orig.h + Math.round(dy / pitchY)
      const clamped = clampSize(widget.type as LegacyWidgetType, rawW, rawH)
      const w = Math.min(clamped.w, GRID_COLS - orig.x)
      dragGhost.value = { id: widget.id, x: orig.x, y: orig.y, w, h: clamped.h }
    }
  }

  function onUp() {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    const ghost = dragGhost.value
    dragGhost.value = null
    if (!ghost) return
    const updated = props.widgets.map((w) => (w.id === ghost.id ? { ...w, x: ghost.x, y: ghost.y, w: ghost.w, h: ghost.h } : w))
    emit('update:widgets', settle(updated, ghost.id))
  }

  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp, { once: true })
}

function removeWidget(widget: Widget) {
  emit('update:widgets', settle(props.widgets.filter((w) => w.id !== widget.id)))
}

// Catalog widgets resize by cycling their preset `sizes` list instead of free-dragging (see the
// roadmap's own "size preset" wording) — this is the ellipsis-menu equivalent of the free-drag
// resize handle legacy widgets get.
function cycleSize(widget: Widget) {
  const sizes = WIDGET_CATALOG[widget.type].sizes
  if (!sizes) return
  const next = nextPresetSize(sizes, widget)
  const updated = props.widgets.map((w) => (w.id === widget.id ? { ...w, w: next.w, h: next.h } : w))
  emit('update:widgets', settle(updated, widget.id))
}

function widgetMenuItems(widget: Widget) {
  const items = []
  if (WIDGET_CATALOG[widget.type].sizes) {
    items.push({ label: t('dashboardGrid.resizeWidget'), icon: 'i-lucide-scaling', onSelect: () => cycleSize(widget) })
  }
  items.push({ label: t('dashboardGrid.removeWidget'), icon: 'i-lucide-trash-2', color: 'rust' as const, onSelect: () => removeWidget(widget) })
  return items
}

const availableLegacyTypes = computed<LegacyWidgetType[]>(() =>
  LEGACY_WIDGET_TYPES.filter((type) => !props.widgets.some((w) => w.type === type)),
)

// Catalog kinds with at least one not-yet-used source left to add.
const availableCatalogKinds = computed<CatalogWidgetType[]>(() =>
  CATALOG_WIDGET_TYPES.filter((type) =>
    availableSources(type).some((opt) => !props.widgets.some((w) => w.type === type && w.source === opt.value)),
  ),
)

function addWidgetItems() {
  const legacyItems = availableLegacyTypes.value.map((type) => ({
    label: t(WIDGET_CATALOG[type].addLabelKey!),
    onSelect: () => addLegacyWidget(type),
  }))
  const catalogItems = availableCatalogKinds.value.map((type) => ({
    label: t(WIDGET_CATALOG[type].kickerKey),
    onSelect: () => openCatalogModal(type),
  }))
  return [...legacyItems, ...catalogItems]
}

function addLegacyWidget(type: LegacyWidgetType) {
  const catalog = WIDGET_CATALOG[type]
  const w = Math.min(12, catalog.maxW!)
  const h = Math.max(catalog.minH!, Math.min(catalog.maxH!, 3))
  const spot = findSpot(props.widgets, w, h)
  emit('update:widgets', [...props.widgets, { id: type, type, w, h, ...spot }])
}

const catalogModalOpen = ref(false)
const catalogModalKind = ref<CatalogWidgetType | null>(null)

function openCatalogModal(kind: CatalogWidgetType | null = null) {
  catalogModalKind.value = kind
  catalogModalOpen.value = true
}

function addCatalogWidget({ type, source, w, h }: { type: CatalogWidgetType; source: string; w: number; h: number }) {
  const spot = findSpot(props.widgets, w, h)
  const id = `${type}:${source}`
  emit('update:widgets', [...props.widgets, { id, type, source, w, h, ...spot }])
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <div class="flex items-center justify-end gap-2.5">
      <UDropdownMenu v-if="editMode && addWidgetItems().length > 0" :items="addWidgetItems()" :content="{ side: 'bottom', align: 'end' }">
        <UButton variant="outline" color="neutral" size="sm" icon="i-lucide-plus">
          {{ t('dashboardGrid.addWidget') }}
        </UButton>
      </UDropdownMenu>
      <UButton variant="outline" color="neutral" size="sm" @click="editMode = !editMode">
        {{ editMode ? t('dashboardGrid.doneEditing') : t('dashboardGrid.editLayout') }}
      </UButton>
    </div>

    <UEmpty
      v-if="widgets.length === 0"
      icon="i-lucide-layout-dashboard"
      :title="t('dashboardGrid.emptyTitle')"
      :description="t('dashboardGrid.emptyDescription')"
      :actions="[{ label: t('dashboardGrid.emptyAction'), onClick: () => (editMode = true) }]"
      class="neu-inset"
    />

    <div
      v-else
      ref="gridRef"
      class="grid grid-cols-12 gap-4"
      :class="editMode ? 'edit-grid-bg' : ''"
      :style="{ gridAutoRows: `${ROW_HEIGHT}px` }"
    >
      <div
        v-for="widget in displayWidgets"
        :key="widget.id"
        class="neu-surface relative flex flex-col overflow-hidden bg-default"
        :class="[WIDGET_CATALOG[widget.type].compact ? '' : 'gap-4 p-5', dragGhost?.id === widget.id ? 'z-[5] shadow-lg' : '']"
        :style="{ gridArea: gridArea(widget) }"
      >
        <div v-if="!WIDGET_CATALOG[widget.type].compact" class="flex items-start justify-between gap-4">
          <div class="flex flex-col gap-1">
            <span class="text-sm text-muted">{{ t(WIDGET_CATALOG[widget.type].kickerKey) }}</span>
            <h2 class="text-[22px]">{{ WIDGET_CATALOG[widget.type].title(widget) }}</h2>
          </div>
          <div v-if="editMode" class="flex flex-none items-center gap-1">
            <button
              type="button"
              class="cursor-grab touch-none rounded p-1.5 text-muted hover:bg-elevated"
              @pointerdown="beginDrag('move', widget, $event)"
            >
              <UIcon name="i-lucide-grip-vertical" class="size-4" />
            </button>
            <EllipsisMenu :items="widgetMenuItems(widget)" size="xs" />
          </div>
        </div>

        <div v-if="editMode && WIDGET_CATALOG[widget.type].compact" class="absolute top-1 right-1 z-[1] flex items-center gap-0.5 rounded bg-default/80">
          <button
            type="button"
            class="cursor-grab touch-none rounded p-1 text-muted hover:bg-elevated"
            @pointerdown="beginDrag('move', widget, $event)"
          >
            <UIcon name="i-lucide-grip-vertical" class="size-3.5" />
          </button>
          <EllipsisMenu :items="widgetMenuItems(widget)" size="xs" />
        </div>

        <div class="min-h-0 flex-1 overflow-auto">
          <component :is="WIDGET_CATALOG[widget.type].component" v-bind="widget.source ? { source: widget.source } : {}" />
        </div>

        <button
          v-if="editMode && !WIDGET_CATALOG[widget.type].sizes"
          type="button"
          class="absolute right-0 bottom-0 size-4 cursor-[nwse-resize] touch-none"
          @pointerdown="beginDrag('resize', widget, $event)"
        >
          <UIcon name="i-lucide-move-diagonal-2" class="size-3.5 text-muted" />
        </button>
      </div>
    </div>

    <AddCatalogWidgetModal
      :open="catalogModalOpen"
      :widgets="widgets"
      :initial-kind="catalogModalKind"
      @update:open="catalogModalOpen = $event"
      @add="addCatalogWidget"
    />
  </div>
</template>

<style scoped>
.edit-grid-bg {
  background-image: radial-gradient(circle, var(--ui-border) 1px, transparent 1px);
  background-size: calc((100% + 16px) / 12) 126px;
}
</style>
