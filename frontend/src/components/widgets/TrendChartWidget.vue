<script setup lang="ts">
import { computed } from 'vue'
import { trendPoints } from '../../lib/widgetSources'
import { formatCurrency, formatSignedCurrency, formatDate, deltaColorClass } from '../../lib/format'

const props = defineProps<{ source?: string }>()

const W = 760
const TOP = 8
const BASE = 130
const MAX_X_LABELS = 6

const points = computed(() => (props.source ? trendPoints(props.source) : []))

const chart = computed(() => {
  const list = points.value
  const n = list.length
  if (n < 2) return null

  const values = list.map((p) => p.value)
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const span = Math.max(max - min, 1)

  const x = (i: number) => (i * W) / (n - 1)
  const y = (v: number) => BASE - ((v - min) / span) * (BASE - TOP)

  const line = list.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')
  const area = `0,${BASE} ${line} ${W},${BASE}`

  const labelStep = Math.max(1, Math.ceil(n / MAX_X_LABELS))
  const xLabels = list.map((p, i) => ({ x: x(i), label: formatDate(p.date) })).filter((_, i) => i % labelStep === 0 || i === n - 1)

  const latest = values[n - 1]
  const delta = latest - values[0]

  return { line, area, xLabels, latest, delta }
})
</script>

<template>
  <div v-if="chart" class="flex flex-col gap-4">
    <div class="flex flex-col gap-0.5">
      <span class="font-heading text-[22px] leading-none font-extrabold tracking-tight">{{ formatCurrency(chart.latest) }}</span>
      <span class="text-xs font-semibold" :class="deltaColorClass(chart.delta)">{{ formatSignedCurrency(chart.delta) }}</span>
    </div>
    <svg viewBox="0 0 760 140" width="100%" class="block">
      <polygon :points="chart.area" fill="var(--band-4)" />
      <polyline :points="chart.line" fill="none" stroke="var(--ui-primary)" stroke-width="2.5" />
    </svg>
    <div class="flex justify-between gap-1">
      <span v-for="(l, i) in chart.xLabels" :key="i" class="text-[10px] text-muted">{{ l.label }}</span>
    </div>
  </div>
</template>
