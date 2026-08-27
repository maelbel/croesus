<script setup lang="ts">
import { computed } from 'vue'
import { useAccountsStore } from '../stores/accounts'
import { useValuationsStore } from '../stores/valuations'
import { useNetWorthStore } from '../stores/networth'
import { ACCOUNT_TYPE_LABELS } from '../api/types'
import { formatCurrency, formatDate } from '../lib/format'

const accountsStore = useAccountsStore()
const valuationsStore = useValuationsStore()
const netWorthStore = useNetWorthStore()

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

  const typeOrder = [...new Set(accountsStore.accounts.map((a) => a.type))].sort(
    (a, b) => accountsForType(b) - accountsForType(a),
  )
  function accountsForType(type: string) {
    return accountsStore.accounts
      .filter((a) => a.type === type)
      .reduce((sum, a) => sum + valueAsOf(a.id, dates[n - 1]), 0)
  }

  const totalsByDate = dates.map((date) =>
    typeOrder.reduce(
      (byType, type) => {
        byType[type] = accountsStore.accounts
          .filter((a) => a.type === type)
          .reduce((sum, a) => sum + valueAsOf(a.id, date), 0)
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
    const polygon = { label: ACCOUNT_TYPE_LABELS[type as keyof typeof ACCOUNT_TYPE_LABELS], points, fill }
    lower = upper
    return polygon
  })

  const liabLine = dates
    .map((_, i) => `${x(i)},${y(netWorthStore.history[i].total_liabilities)}`)
    .join(' ')

  const gridLines = [0.25, 0.5, 0.75, 1].map((f) => ({
    y: y(maxTotal * f),
    top: `${(y(maxTotal * f) / VIEW_HEIGHT) * 100}%`,
    label: formatCurrency(Math.round((maxTotal * f) / 1000) * 1000),
  }))

  const labelStep = Math.max(1, Math.ceil(n / MAX_X_LABELS))
  const xLabels = dates
    .map((date, i) => ({ x: x(i), label: formatDate(date) }))
    .filter((_, i) => i % labelStep === 0 || i === n - 1)

  return { polygons, liabLine, gridLines, xLabels }
})
</script>

<template>
  <div v-if="chart" class="flex flex-col gap-7">
    <div class="relative">
      <svg viewBox="0 0 760 210" width="100%" class="block">
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
      </svg>
      <span
        v-for="(g, i) in chart.gridLines"
        :key="i"
        class="absolute left-0 bg-default pr-1.5 text-[10px] text-muted"
        :style="{ top: g.top, transform: 'translateY(-100%)' }"
      >
        {{ g.label }}
      </span>
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
        Liabilities
      </span>
    </div>
  </div>
</template>
