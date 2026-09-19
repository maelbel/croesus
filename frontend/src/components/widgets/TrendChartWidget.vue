<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { trendPoints, type TrendPoint } from '../../lib/widgetSources'
import { useTrendPeriod, type Period } from '../../lib/trendPeriod'
import { buildLineChart } from '../../lib/svgChart'
import { formatCurrency, formatPercent, formatDate, deltaColorClass } from '../../lib/format'
import ChartTooltip from '../charts/ChartTooltip.vue'

const props = defineProps<{ source?: string; widgetId: string }>()

const { t } = useI18n()

const W = 760
const TOP = 8
const BASE = 130
// Keeps the line's first/last point, its rounded stroke cap, and the hover dot fully inside the
// SVG's own bounds — an SVG clips to its viewBox by default, and a point sitting exactly on x=0 or
// x=W would otherwise get its cap/dot cut off at the edge.
const PAD_X = 6
const MAX_X_LABELS = 6

const period = useTrendPeriod(props.widgetId)

function cutoffDate(p: Period, latest: Date): Date | null {
  const d = new Date(latest)
  switch (p) {
    case '1D':
      d.setDate(d.getDate() - 1)
      return d
    case '1W':
      d.setDate(d.getDate() - 7)
      return d
    case '1M':
      d.setMonth(d.getMonth() - 1)
      return d
    case 'YTD':
      return new Date(latest.getFullYear(), 0, 1)
    case '1Y':
      d.setFullYear(d.getFullYear() - 1)
      return d
    case 'MAX':
      return null
  }
}

const points = computed(() => (props.source ? trendPoints(props.source) : []))

// Real valuation history, not authored daily/weekly data — a period like 1D or 1W often has
// fewer than 2 points to draw a line from, which the chart below already handles by hiding
// itself rather than showing something misleading.
const filteredPoints = computed<TrendPoint[]>(() => {
  const list = points.value
  if (list.length === 0) return []
  const cutoff = cutoffDate(period.value, new Date(list[list.length - 1].date))
  if (!cutoff) return list
  return list.filter((p) => new Date(p.date) >= cutoff)
})

const chart = computed(() => {
  const list = filteredPoints.value
  const n = list.length
  if (n < 2) return null

  const built = buildLineChart(
    list.map((p) => p.value),
    { width: W, top: TOP, base: BASE, padX: PAD_X },
  )
  if (!built) return null

  const labelStep = Math.max(1, Math.ceil(n / MAX_X_LABELS))
  const xLabels = built.points.map((pt, i) => ({ x: pt.x, label: formatDate(list[i].date) })).filter((_, i) => i % labelStep === 0 || i === n - 1)

  const latest = built.points[n - 1].value
  const first = built.points[0].value
  // A percent change is only meaningful against a strictly positive baseline — net worth can
  // legitimately be zero or negative early in its history (before enough assets exist to offset
  // a liability, e.g. right after taking out a loan), and dividing by that baseline produces a
  // sign-flipped, wildly oversized ratio (e.g. "-234%") rather than anything a reader could use.
  const ratio = first > 0 ? (latest - first) / first : null

  return { ...built, dates: list.map((p) => p.date), xLabels, latest, ratio }
})

// Hover-scrub: tracks the nearest data point to the pointer across the whole chart width and
// shows a crosshair + floating tooltip, since these are real valuation histories a user may want
// exact figures from, not just the shape of the line.
const hoverIndex = ref<number | null>(null)

function onPointerMove(event: PointerEvent) {
  const pts = chart.value?.points
  if (!pts || pts.length === 0) return
  const svg = event.currentTarget as SVGSVGElement
  const rect = svg.getBoundingClientRect()
  const localX = ((event.clientX - rect.left) / rect.width) * W
  let nearest = 0
  let nearestDist = Infinity
  for (let i = 0; i < pts.length; i++) {
    const dist = Math.abs(pts[i].x - localX)
    if (dist < nearestDist) {
      nearestDist = dist
      nearest = i
    }
  }
  hoverIndex.value = nearest
}

function onPointerLeave() {
  hoverIndex.value = null
}

const hoverPoint = computed(() => (hoverIndex.value !== null ? (chart.value?.points[hoverIndex.value] ?? null) : null))
const hoverDate = computed(() => (hoverIndex.value !== null ? (chart.value?.dates[hoverIndex.value] ?? null) : null))

// The tooltip centers on the hovered point by default — for the first/last point (always right at
// the chart's own edge) that overflows the widget card's bounds and gets clipped, so anchor it to
// whichever side stays inside instead.
const hoverTooltipAlign = computed<'left' | 'center' | 'right'>(() => {
  const points = chart.value?.points
  if (hoverIndex.value === null || !points) return 'center'
  if (hoverIndex.value === 0) return 'left'
  if (hoverIndex.value === points.length - 1) return 'right'
  return 'center'
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-baseline gap-2.5">
      <span class="font-heading text-[30px] leading-none font-extrabold tracking-tight">{{ formatCurrency(chart?.latest ?? 0) }}</span>
      <span v-if="chart?.ratio != null" class="text-[13.5px] font-semibold" :class="deltaColorClass(chart.ratio)">{{ formatPercent(chart.ratio) }}</span>
    </div>
    <template v-if="chart">
      <div class="relative">
        <svg
          viewBox="0 0 760 140"
          width="100%"
          class="block"
          role="img"
          :aria-label="t('dashboardGrid.trendChartAriaLabel')"
          @pointermove="onPointerMove"
          @pointerleave="onPointerLeave"
        >
          <title>{{ t('dashboardGrid.trendChartAriaLabel') }}</title>
          <defs>
            <linearGradient :id="`trend-grad-${widgetId}`" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="var(--ui-primary)" stop-opacity="0.26" />
              <stop offset="100%" stop-color="var(--ui-primary)" stop-opacity="0" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" :width="W" height="140" fill="transparent" />
          <polygon :points="chart.area" :fill="`url(#trend-grad-${widgetId})`" />
          <polyline :points="chart.line" fill="none" stroke="var(--ui-primary)" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" />
          <g v-if="hoverPoint">
            <line :x1="hoverPoint.x" :x2="hoverPoint.x" :y1="TOP" :y2="BASE" stroke="var(--ui-border)" stroke-width="1" stroke-dasharray="3 3" />
            <circle :cx="hoverPoint.x" :cy="hoverPoint.y" r="3.5" fill="var(--ui-primary)" />
          </g>
        </svg>
        <ChartTooltip
          v-if="hoverPoint && hoverDate"
          :x="(hoverPoint.x / W) * 100"
          :y="(hoverPoint.y / 140) * 100"
          :value="formatCurrency(hoverPoint.value)"
          :label="formatDate(hoverDate)"
          :align="hoverTooltipAlign"
        />
      </div>
      <div class="flex justify-between gap-1">
        <span v-for="(l, i) in chart.xLabels" :key="i" class="text-[10px] text-muted">{{ l.label }}</span>
      </div>
    </template>
  </div>
</template>
