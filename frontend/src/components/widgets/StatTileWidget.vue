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
// short one a medium one, and a narrow tile has no room for either the note or the sparkline.
const numSize = computed(() => (props.h > 1 ? '42px' : props.w >= 6 ? '34px' : props.w >= 4 ? '26px' : '21px'))
const showSpark = computed(() => props.w >= 6 || props.h > 1)
const showNote = computed(() => props.w >= 6)

// The arrow always follows the real sign of the change; only the color flips for a "downGood"
// metric like debt, where a decrease is the good direction.
const colorValue = computed(() => {
  if (!data.value || data.value.deltaRatio === null) return null
  return data.value.downGood ? -data.value.deltaRatio : data.value.deltaRatio
})

const SPARK_W = 60
const SPARK_H = 24

const sparkline = computed(() => {
  const spark = data.value?.spark
  if (!spark) return null
  return buildLineChart(spark, { width: SPARK_W, top: 0, base: SPARK_H, includeZeroBaseline: false })
})
</script>

<template>
  <div v-if="data" class="flex h-full items-end justify-between gap-3 p-5">
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
      v-if="sparkline && showSpark"
      :viewBox="`0 0 ${SPARK_W} ${SPARK_H}`"
      width="60"
      height="24"
      class="flex-none"
      role="img"
      :aria-label="t('dashboardGrid.sparklineAriaLabel')"
    >
      <title>{{ t('dashboardGrid.sparklineAriaLabel') }}</title>
      <polyline
        :points="sparkline.line"
        fill="none"
        :stroke="colorValue === null ? 'var(--ui-text-muted)' : colorValue >= 0 ? 'var(--ui-primary)' : 'var(--ui-rust)'"
        stroke-width="1.5"
      />
    </svg>
  </div>
</template>
