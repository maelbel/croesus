<script setup lang="ts">
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Widget } from '../api/types'
import { WIDGET_CATALOG } from '../lib/widgetCatalog'
import { WIDGET_GRID_CONTEXT } from '../lib/widgetGridContext'
import WidgetHeader from './widgets/WidgetHeader.vue'

// Rendered two ways by WidgetGrid.vue: as the mobile stacked list's items directly, and as the
// Vue component GridStack itself instantiates for each grid child (see gridOptions.children's
// `component: 'WidgetCard'`) — GridStack only carries a plain `{ widgetId }` prop per node (its own
// per-node `props` aren't reactive after creation), so everything that needs to stay reactive
// (which widget this is, edit mode, remove action) comes from the WidgetGrid-provided context.
const props = defineProps<{ widgetId: string }>()

const { t } = useI18n()
const ctx = inject(WIDGET_GRID_CONTEXT)
if (!ctx) throw new Error('WidgetCard must be rendered inside WidgetGrid')

const widget = computed(() => ctx.widgets.value.find((w) => w.id === props.widgetId))
const variant = computed(() => (widget.value ? WIDGET_CATALOG[widget.value.type].variant : null))

// Each body component only gets what it actually needs: `source` for every catalog kind, plus
// `w`/`h`/`label` for the stat tile (its number/note/sparkline all scale with the tile's own size —
// see the design's own `numSize`/`showNote`/`showSpark` rules — and its label comes from the same
// WIDGET_CATALOG.title() every other widget's header uses, since a compact tile has no room for
// the shared header row WidgetHeader.vue renders) and `widgetId` for the trend chart (shared with
// its header period tabs, which live in a sibling render — see lib/trendPeriod.ts).
function widgetProps(widget: Widget): Record<string, unknown> {
  const bound: Record<string, unknown> = {}
  if (widget.source) bound.source = widget.source
  if (widget.type === 'statTile') {
    bound.w = widget.w
    bound.h = widget.h
    bound.label = WIDGET_CATALOG[widget.type].title(widget)
  }
  if (widget.type === 'trendChart') bound.widgetId = widget.id
  return bound
}
</script>

<template>
  <div
    v-if="widget"
    class="neu-surface relative flex h-full flex-col overflow-hidden bg-default"
    :class="[variant === 'compact' ? '' : 'gap-4 p-5', ctx.editMode.value ? 'cursor-grab touch-none active:cursor-grabbing' : '']"
  >
    <div v-if="variant !== 'compact'" class="flex items-start justify-between gap-4">
      <div class="flex min-w-0 flex-col gap-1">
        <WidgetHeader :widget="widget" />
      </div>
      <div class="flex flex-none items-center gap-2">
        <component :is="WIDGET_CATALOG[widget.type].headerExtra" v-if="WIDGET_CATALOG[widget.type].headerExtra" :widget-id="widget.id" />
        <UButton
          v-if="ctx.editMode.value"
          :aria-label="t('dashboardGrid.removeWidget')"
          icon="i-lucide-trash-2"
          color="rust"
          variant="ghost"
          size="xs"
          @click="ctx.removeWidget(widget)"
        />
      </div>
    </div>

    <!-- A compact tile has no header row to put this in, so it floats over the content instead —
         top-5/right-5 matches the p-5 every other widget's header sits inset by, and no background
         chip, so it reads as the same bare icon rather than a different control. -->
    <div v-if="ctx.editMode.value && variant === 'compact'" class="absolute top-5 right-5 z-[1]">
      <UButton
        :aria-label="t('dashboardGrid.removeWidget')"
        icon="i-lucide-trash-2"
        color="rust"
        variant="ghost"
        size="xs"
        @click="ctx.removeWidget(widget)"
      />
    </div>

    <!-- scrollbar-gutter reserves the scrollbar's track space up front (only where the platform's
         scrollbar actually takes layout space — a no-op on overlay-scrollbar systems), so a widget's
         height doesn't reflow when it crosses from fitting to overflowing. The gutter alone only
         stops content overlapping the scrollbar though — pr-2 is what actually keeps text from
         butting up against it. -->
    <div class="min-h-0 flex-1 overflow-auto pr-2 [scrollbar-gutter:stable]">
      <component :is="WIDGET_CATALOG[widget.type].component" v-bind="widgetProps(widget)" />
    </div>
  </div>
</template>
