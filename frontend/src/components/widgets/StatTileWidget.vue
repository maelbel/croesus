<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { statTileData } from '../../lib/widgetSources'
import { buildLineChart } from '../../lib/svgChart'
import { formatCurrency, formatPercent, deltaColorClass } from '../../lib/format'

const { t } = useI18n()

const props = withDefaults(defineProps<{ source?: string; w?: number; h?: number; label?: string }>(), { source: undefined, w: 6, h: 1, label: '' })

const data = computed(() => (props.source ? statTileData(props.source) : null))

// Mirrors the design's own kpi() sizing rules: a taller tile gets the biggest number, a wide-but-
// short one a medium one, and a narrow tile has no room for the note.
const numSize = computed(() => (props.h > 1 ? '42px' : props.w >= 6 ? '34px' : props.w >= 4 ? '26px' : '21px'))
const showNote = computed(() => props.w >= 6)

// The arrow always follows the real sign of the change; only the color flips for a "downGood"
// metric like debt, where a decrease is the good direction.
const colorValue = computed(() => {
  if (!data.value || data.value.deltaRatio === null) return null
  return data.value.downGood ? -data.value.deltaRatio : data.value.deltaRatio
})

// Only a coordinate system for buildLineChart's math, not the rendered pixel size — the svg itself
// stretches to fill whatever box the flex layout below gives it (see sparkHeightClass and
// preserveAspectRatio="none" on the element), so a wider tile just gets a wider chart for free.
const SPARK_W = 100
const SPARK_H = computed(() => (props.h > 1 ? 64 : 40))
// Keeps the line's rounded stroke cap from getting clipped at the viewBox's own left/right edge —
// same reasoning as TrendChartWidget's PAD_X, just a smaller value for a much smaller chart.
const SPARK_PAD_X = 1.5
const sparkHeightClass = computed(() => (props.h > 1 ? 'h-16' : 'h-10'))

const sparkline = computed(() => {
  const spark = data.value?.spark
  if (!spark) return null
  return buildLineChart(spark, { width: SPARK_W, top: 1, base: SPARK_H.value - 1, includeZeroBaseline: false, padX: SPARK_PAD_X })
})

const sparkColor = computed(() => (colorValue.value === null ? 'var(--ui-text-muted)' : colorValue.value >= 0 ? 'var(--ui-primary)' : 'var(--ui-rust)'))
</script>

<template>
  <div v-if="data" class="flex h-full items-end gap-3 p-5">
    <div class="flex min-w-0 flex-col justify-center gap-1">
      <span class="truncate text-xs tracking-wide text-muted uppercase">{{ label }}</span>
      <span class="font-heading leading-none font-extrabold tracking-tight" :style="{ fontSize: numSize }">
        {{ formatCurrency(data.value, data.currency) }}
      </span>
      <span v-if="data.deltaRatio !== null" class="flex items-center gap-1 text-xs font-semibold" :class="deltaColorClass(colorValue)">
        <UIcon :name="data.deltaRatio >= 0 ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="size-3.5" />
        {{ formatPercent(data.deltaRatio) }}
        <span v-if="data.note && showNote" class="font-normal text-muted">{{ data.note }}</span>
      </span>
      <span v-else-if="data.note && showNote" class="truncate text-xs text-muted">{{ data.note }}</span>
    </div>
    <svg
      v-if="sparkline"
      :viewBox="`0 0 ${SPARK_W} ${SPARK_H}`"
      preserveAspectRatio="none"
      :class="['min-w-0 flex-1', sparkHeightClass]"
      role="img"
      :aria-label="t('dashboardGrid.sparklineAriaLabel')"
    >
      <title>{{ t('dashboardGrid.sparklineAriaLabel') }}</title>
      <defs>
        <linearGradient :id="`spark-grad-${source}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="sparkColor" stop-opacity="0.3" />
          <stop offset="100%" :stop-color="sparkColor" stop-opacity="0" />
        </linearGradient>
      </defs>
      <polygon :points="sparkline.area" :fill="`url(#spark-grad-${source})`" />
      <polyline :points="sparkline.line" fill="none" :stroke="sparkColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  </div>
</template>
