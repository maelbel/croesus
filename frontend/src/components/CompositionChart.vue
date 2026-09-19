<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAccountsStore } from '../stores/accounts'
import { useValuationsStore } from '../stores/valuations'
import { useNetWorthStore } from '../stores/networth'
import { useFxRatesStore } from '../stores/fxRates'
import { accountTypeLabel, type AccountType } from '../api/types'
import { formatCurrencyRounded, formatDate } from '../lib/format'

const { t } = useI18n()
const accountsStore = useAccountsStore()
const valuationsStore = useValuationsStore()
const netWorthStore = useNetWorthStore()
const fxRatesStore = useFxRatesStore()

const W = 760
const TOP = 12
const BASE = 196
const VIEW_HEIGHT = 210
const MAX_X_LABELS = 10

/** Forward-filled value of one account as of `date` — the same convention the
 * backend's own net-worth history uses (last known valuation, carried forward). */
function valueAsOf(accountId: number, date: string): number {
  const list = valuationsStore.byAccount.get(accountId)
  if (!list) return 0
  let value = 0
  for (const valuation of list) {
    if (valuation.date <= date) value = Number(valuation.value)
    else break
  }
  return value
}

const chart = computed(() => {
  const dates = netWorthStore.history.map((h) => h.date)
  const n = dates.length
  if (n < 2) return null

  // valueAsOf() is in the account's own currency — convert before summing across accounts, same
  // as AccountsPage.vue/LiabilitiesPage.vue, or a foreign-currency account throws off both the
  // stacked totals here and their comparison against the (correctly converted) liabilities line.
  function accountsForType(type: string) {
    return accountsStore.accounts
      .filter((a) => a.type === type)
      .reduce((sum, a) => sum + fxRatesStore.convert(valueAsOf(a.id, dates[n - 1]), a.currency), 0)
  }
  // Compute each type's total once and sort off that, rather than calling
  // accountsForType() (an O(accounts) scan) from inside the comparator,
  // where it'd rerun on every comparison.
  const typesPresent = [...new Set(accountsStore.accounts.map((a) => a.type))]
  const latestTotalByType = new Map(typesPresent.map((type) => [type, accountsForType(type)]))
  const typeOrder = [...typesPresent].sort(
    (a, b) => latestTotalByType.get(b)! - latestTotalByType.get(a)!,
  )

  const totalsByDate = dates.map((date) =>
    typeOrder.reduce(
      (byType, type) => {
        byType[type] = accountsStore.accounts
          .filter((a) => a.type === type)
          .reduce((sum, a) => sum + fxRatesStore.convert(valueAsOf(a.id, date), a.currency), 0)
        return byType
      },
      {} as Record<string, number>,
    ),
  )

  const maxTotal =
    Math.max(
      ...totalsByDate.map((byType) => Object.values(byType).reduce((a, b) => a + b, 0)),
      1,
    ) * 1.02

  const x = (i: number) => (i * W) / Math.max(n - 1, 1)
  const y = (v: number) => BASE - (v / maxTotal) * (BASE - TOP)

  let lower = dates.map(() => 0)
  const polygons = typeOrder.map((type, idx) => {
    const upper = totalsByDate.map((byType, i) => lower[i] + (byType[type] ?? 0))
    const forward = upper.map((v, i) => `${x(i)},${y(v)}`)
    const backward = lower.map((v, i) => `${x(i)},${y(v)}`).reverse()
    const points = forward.concat(backward).join(' ')
    const fill = `var(--band-${(idx % 6) + 1})`
    const polygon = { label: accountTypeLabel(type as AccountType), points, fill }
    lower = upper
    return polygon
  })

  const liabLine = dates
    .map((_, i) => `${x(i)},${y(netWorthStore.history[i].total_liabilities)}`)
    .join(' ')

  const gridLines = [0.25, 0.5, 0.75, 1].map((f) => ({
    y: y(maxTotal * f),
    top: `${(y(maxTotal * f) / VIEW_HEIGHT) * 100}%`,
    label: formatCurrencyRounded(Math.round((maxTotal * f) / 1000) * 1000),
  }))

  const labelStep = Math.max(1, Math.ceil(n / MAX_X_LABELS))
  const xLabels = dates
    .map((date, i) => ({ x: x(i), label: formatDate(date) }))
    .filter((_, i) => i % labelStep === 0 || i === n - 1)

  // Per-date breakdown for the hover tooltip below — same series/order as the polygons above, plus
  // each date's total and liabilities figure (the latter already correctly converted server-side).
  const series = typeOrder.map((type, idx) => ({
    label: polygons[idx].label,
    fill: polygons[idx].fill,
    values: totalsByDate.map((byType) => byType[type] ?? 0),
  }))
  const totals = totalsByDate.map((byType) => Object.values(byType).reduce((a, b) => a + b, 0))
  const liabilities = dates.map((_, i) => netWorthStore.history[i].total_liabilities)
  const xPositions = dates.map((_, i) => x(i))

  return { polygons, liabLine, gridLines, xLabels, dates, series, totals, liabilities, xPositions }
})

const hoverIndex = ref<number | null>(null)

function onHover(event: MouseEvent) {
  if (!chart.value) return
  const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect()
  const xInViewBox = ((event.clientX - rect.left) / rect.width) * W
  let nearest = 0
  let nearestDist = Infinity
  chart.value.xPositions.forEach((xp, i) => {
    const dist = Math.abs(xp - xInViewBox)
    if (dist < nearestDist) {
      nearestDist = dist
      nearest = i
    }
  })
  hoverIndex.value = nearest
}

function clearHover() {
  hoverIndex.value = null
}

const tooltip = computed(() => {
  if (hoverIndex.value === null || !chart.value) return null
  const i = hoverIndex.value
  return {
    date: formatDate(chart.value.dates[i]),
    x: chart.value.xPositions[i],
    total: chart.value.totals[i],
    liabilities: chart.value.liabilities[i],
    // Richest-to-thinnest band reads top-to-bottom in the tooltip, matching the stack itself.
    rows: [...chart.value.series].reverse().map((s) => ({ label: s.label, fill: s.fill, value: s.values[i] })),
  }
})
</script>

<template>
  <div v-if="chart" class="flex flex-col gap-7">
    <div class="relative">
      <svg
        viewBox="0 0 760 210"
        width="100%"
        class="block"
        @mousemove="onHover"
        @mouseleave="clearHover"
      >
        <polygon v-for="p in chart.polygons" :key="p.label" :points="p.points" :fill="p.fill" />
        <line
          v-for="(g, i) in chart.gridLines"
          :key="i"
          x1="0"
          :y1="g.y"
          x2="760"
          :y2="g.y"
          stroke="var(--ui-border)"
          stroke-width="1"
        />
        <polyline :points="chart.liabLine" fill="none" stroke="var(--ui-bg)" stroke-width="6" />
        <polyline :points="chart.liabLine" fill="none" stroke="var(--ui-rust)" stroke-width="2.5" />
        <line v-if="tooltip" :x1="tooltip.x" :y1="TOP" :x2="tooltip.x" :y2="BASE" stroke="var(--ui-text)" stroke-width="1" stroke-dasharray="3 3" opacity="0.35" />
      </svg>
      <span
        v-for="(g, i) in chart.gridLines"
        :key="i"
        class="absolute left-0 bg-default pr-1.5 text-[10px] text-muted"
        :style="{ top: g.top, transform: 'translateY(-100%)' }"
      >
        {{ g.label }}
      </span>
      <!-- Pinned to a corner instead of following the cursor's x position — a value that tracks
           the hovered date (like the guideline above) risks the box itself overhanging the
           chart's edges on a narrow widget; a fixed spot never does. -->
      <div
        v-if="tooltip"
        class="pointer-events-none absolute top-0 right-0 z-[1] flex w-max max-w-[85%] flex-col gap-1.5 rounded-2xl border border-default bg-default p-6 text-[12.5px] shadow-lg"
      >
        <span class="font-heading text-[13px] font-extrabold">{{ tooltip.date }}</span>
        <span v-for="row in tooltip.rows" :key="row.label" class="flex items-center justify-between gap-4">
          <span class="flex min-w-0 items-center gap-1.5 text-muted">
            <span class="block h-2.5 w-2.5 flex-none" :style="{ background: row.fill }" />
            <span class="truncate">{{ row.label }}</span>
          </span>
          <span class="flex-none font-semibold">{{ formatCurrencyRounded(row.value) }}</span>
        </span>
        <span class="flex items-center justify-between gap-4 border-t border-default pt-1.5 text-muted">
          <span class="flex items-center gap-1.5">
            <span class="block h-[2.5px] w-2.5 flex-none" style="background: var(--ui-rust)" />
            {{ t('compositionChart.liabilitiesLegend') }}
          </span>
          <span class="font-semibold">{{ formatCurrencyRounded(tooltip.liabilities) }}</span>
        </span>
        <span class="flex items-center justify-between gap-4 font-bold">
          <span>{{ t('compositionChart.totalLabel') }}</span>
          <span>{{ formatCurrencyRounded(tooltip.total) }}</span>
        </span>
      </div>
    </div>
    <div class="flex justify-between gap-1">
      <span v-for="(l, i) in chart.xLabels" :key="i" class="text-[10px] text-muted">{{ l.label }}</span>
    </div>
    <div class="flex flex-wrap gap-4.5 text-[13.5px] text-muted">
      <span v-for="p in chart.polygons" :key="p.label" class="flex items-center gap-1.5">
        <span class="block h-2.5 w-2.5" :style="{ background: p.fill }" />
        {{ p.label }}
      </span>
      <span class="flex items-center gap-1.5">
        <span class="block h-[2.5px] w-4.5" style="background: var(--ui-rust)" />
        {{ t('compositionChart.liabilitiesLegend') }}
      </span>
    </div>
  </div>
  <div v-else class="flex h-full min-h-[150px] items-center justify-center text-center text-[13.5px] text-muted">
    {{ t('compositionChart.insufficientData') }}
  </div>
</template>
