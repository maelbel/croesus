<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Widget, WidgetType } from '../api/types'
import { WIDGET_TYPES } from '../api/types'
import { WIDGET_CATALOG } from '../lib/widgetCatalog'
import { GRID_COLS, clampSize, findSpot, settle } from '../lib/widgetGrid'
import EllipsisMenu from './EllipsisMenu.vue'

const props = defineProps<{ widgets: Widget[] }>()
const emit = defineEmits<{ 'update:widgets': [widgets: Widget[]] }>()

const { t } = useI18n()

const editMode = ref(false)

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
      const rawW = orig.w + Math.round(dx / pitchX)
      const rawH = orig.h + Math.round(dy / pitchY)
      const clamped = clampSize(widget.type, rawW, rawH)
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

function widgetMenuItems(widget: Widget) {
  return [{ label: t('dashboardGrid.removeWidget'), icon: 'i-lucide-trash-2', color: 'rust' as const, onSelect: () => removeWidget(widget) }]
}

const availableTypes = computed<WidgetType[]>(() =>
  WIDGET_TYPES.filter((type) => !props.widgets.some((w) => w.type === type)),
)

function addWidgetItems() {
  return availableTypes.value.map((type) => {
    const catalog = WIDGET_CATALOG[type]
    return {
      label: t(catalog.addLabelKey),
      onSelect: () => addWidget(type),
    }
  })
}

function addWidget(type: WidgetType) {
  const catalog = WIDGET_CATALOG[type]
  const w = Math.min(12, catalog.maxW)
  const h = Math.max(catalog.minH, Math.min(catalog.maxH, 3))
  const spot = findSpot(props.widgets, w, h)
  emit('update:widgets', [...props.widgets, { id: type, type, w, h, ...spot }])
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <div class="flex items-center justify-end gap-2.5">
      <UDropdownMenu v-if="editMode && availableTypes.length > 0" :items="addWidgetItems()" :content="{ side: 'bottom', align: 'end' }">
        <UButton variant="outline" color="neutral" size="sm" icon="i-lucide-plus">
          {{ t('dashboardGrid.addWidget') }}
        </UButton>
      </UDropdownMenu>
      <UButton variant="outline" color="neutral" size="sm" @click="editMode = !editMode">
        {{ editMode ? t('dashboardGrid.doneEditing') : t('dashboardGrid.editLayout') }}
      </UButton>
    </div>

    <div
      ref="gridRef"
      class="grid grid-cols-12 gap-4"
      :class="editMode ? 'edit-grid-bg' : ''"
      :style="{ gridAutoRows: `${ROW_HEIGHT}px` }"
    >
      <div
        v-for="widget in displayWidgets"
        :key="widget.id"
        class="neu-surface relative flex flex-col gap-4 overflow-hidden bg-default p-5"
        :class="dragGhost?.id === widget.id ? 'z-[5] shadow-lg' : ''"
        :style="{ gridArea: gridArea(widget) }"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="flex flex-col gap-1">
            <span class="text-sm text-muted">{{ t(WIDGET_CATALOG[widget.type].kickerKey) }}</span>
            <h2 class="text-[22px]">{{ t(WIDGET_CATALOG[widget.type].titleKey) }}</h2>
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

        <div class="min-h-0 flex-1 overflow-auto">
          <component :is="WIDGET_CATALOG[widget.type].component" />
        </div>

        <button
          v-if="editMode"
          type="button"
          class="absolute right-0 bottom-0 size-4 cursor-[nwse-resize] touch-none"
          @pointerdown="beginDrag('resize', widget, $event)"
        >
          <UIcon name="i-lucide-move-diagonal-2" class="size-3.5 text-muted" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.edit-grid-bg {
  background-image: radial-gradient(circle, var(--ui-border) 1px, transparent 1px);
  background-size: calc((100% + 16px) / 12) 126px;
}
</style>
