<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { assetsByClassBreakdown, type BreakdownSlice } from '../../lib/widgetSources'
import { donutSegments } from '../../lib/svgChart'

const MAX_SLICES = 6

const props = defineProps<{ source?: string }>()

const { t } = useI18n()

const R = 42

// Accent for the largest slice, a descending grayscale for the rest — matches the design's own
// PALETTE (['ACCENT', 62%, 46%, 33%, 23%, 15%]) rather than the fully-neutral band scale the
// legacy assetsByClassWidget bars/table use (that one wants every category, uncapped).
const PALETTE = [
  'var(--ui-primary)',
  'color-mix(in srgb, var(--ui-text) 62%, transparent)',
  'color-mix(in srgb, var(--ui-text) 46%, transparent)',
  'color-mix(in srgb, var(--ui-text) 33%, transparent)',
  'color-mix(in srgb, var(--ui-text) 23%, transparent)',
  'color-mix(in srgb, var(--ui-text) 15%, transparent)',
]

const breakdown = computed(() => (props.source === 'assets_by_class' ? assetsByClassBreakdown() : []))

// Beyond MAX_SLICES classes, folding the tail into one "Other" bucket keeps the ring and legend
// percentages summing to 100% — silently dropping them past the 6th (the previous behavior) left
// their share missing from the ring with nothing to show for it.
const items = computed<BreakdownSlice[]>(() => {
  const all = breakdown.value
  if (all.length <= MAX_SLICES) return all
  const top = all.slice(0, MAX_SLICES - 1)
  const rest = all.slice(MAX_SLICES - 1)
  const other: BreakdownSlice = {
    label: t('dashboardGrid.breakdownDonutOtherLabel'),
    value: rest.reduce((sum, s) => sum + s.value, 0),
    pct: rest.reduce((sum, s) => sum + s.pct, 0),
    fill: '',
  }
  return [...top, other]
})

const slices = computed(() => {
  const segments = donutSegments(
    items.value.map((s) => s.pct),
    R,
  )
  return items.value.map((slice, idx) => ({ ...slice, fill: PALETTE[idx], ...segments[idx] }))
})

// Hovering a slice or its legend row highlights both — the legend already carries every label
// visibly, so this is a bonus link between the two rather than the only way to read a value.
const hoveredLabel = ref<string | null>(null)
</script>

<template>
  <div class="flex items-center gap-5" role="img" :aria-label="t('dashboardGrid.breakdownDonutAriaLabel')">
    <svg viewBox="0 0 100 100" width="118" height="118" class="flex-none -rotate-90">
      <circle
        v-for="slice in slices"
        :key="slice.label"
        cx="50"
        cy="50"
        :r="R"
        fill="none"
        :stroke="slice.fill"
        stroke-width="12"
        :stroke-dasharray="`${slice.dash} ${slice.gap}`"
        :stroke-dashoffset="slice.offset"
        :opacity="hoveredLabel && hoveredLabel !== slice.label ? 0.35 : 1"
        class="cursor-default transition-opacity"
        @pointerenter="hoveredLabel = slice.label"
        @pointerleave="hoveredLabel = null"
      >
        <title>{{ slice.label }}: {{ Math.round(slice.pct * 100) }}%</title>
      </circle>
    </svg>
    <div class="flex min-w-0 flex-1 flex-col gap-2.5">
      <span
        v-for="slice in slices"
        :key="slice.label"
        class="flex items-center gap-2.5 text-[13.5px] transition-opacity"
        :style="{ opacity: hoveredLabel && hoveredLabel !== slice.label ? 0.35 : 1 }"
        @pointerenter="hoveredLabel = slice.label"
        @pointerleave="hoveredLabel = null"
      >
        <span class="size-2.5 flex-none rounded-full" :style="{ background: slice.fill }" />
        <span class="min-w-0 flex-1 truncate text-muted">{{ slice.label }}</span>
        <span class="flex-none font-bold">{{ Math.round(slice.pct * 100) }}%</span>
      </span>
    </div>
  </div>
</template>
