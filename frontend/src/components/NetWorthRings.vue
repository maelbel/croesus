<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TableColumn, TableRow } from '@nuxt/ui'
import { useNetWorthStore } from '../stores/networth'
import { formatCurrency, formatSignedCurrency, deltaColorClass } from '../lib/format'

const { t } = useI18n()
const netWorthStore = useNetWorthStore()

// Hovering a table row highlights its matching ring (and dims the rest) — the one visual link
// between the two panes, same idea as BreakdownDonutWidget's slice/legend hover pairing.
const hoveredYear = ref<string | null>(null)

/** One point per calendar year — the last known net worth recorded in that year. */
const yearlyNetWorth = computed(() => {
  const byYear = new Map<string, number>()
  for (const point of netWorthStore.history) {
    byYear.set(point.date.slice(0, 4), point.net_worth)
  }
  return [...byYear.entries()].map(([year, netWorth]) => ({ year, netWorth }))
})

/** Radius by area (sqrt of value) so ring size reads as magnitude, not raw radius;
 * stroke width by that year's growth relative to the largest single-year move. */
const rings = computed(() => {
  const years = yearlyNetWorth.value
  if (years.length === 0) return { items: [], rows: [], gain: null }

  const values = years.map((y) => y.netWorth)
  const vMax = Math.max(...values, 1)
  const growth = values.map((v, i) => (i === 0 ? v : v - values[i - 1]))
  const gMax = Math.max(...growth.map((g) => Math.abs(g)), 1)
  const n = years.length

  const items = years.map((y, i) => {
    const isLatest = i === n - 1
    const fadePct = n > 1 ? Math.round(38 + 44 * (i / (n - 1))) : 0
    return {
      year: y.year,
      r: 22 + 158 * Math.sqrt(Math.max(y.netWorth, 0) / vMax),
      w: Number((1.1 + 5.2 * (Math.abs(growth[i]) / gMax)).toFixed(2)),
      stroke: isLatest ? 'var(--ui-primary)' : `color-mix(in srgb, var(--ui-text) ${fadePct}%, transparent)`,
    }
  })

  const rows = years
    .map((y, i) => ({
      year: y.year,
      netWorth: y.netWorth,
      growth: growth[i],
      isLatest: i === n - 1,
    }))
    .reverse()

  return { items, rows, gain: values[n - 1] - values[0] }
})

type RingRow = { year: string; netWorth: number; growth: number; isLatest: boolean }

const ringsColumns = computed<TableColumn<RingRow>[]>(() => [
  { accessorKey: 'year', header: t('netWorthRings.columnYear') },
  { accessorKey: 'netWorth', header: t('netWorthRings.columnNetWorth'), meta: { class: { th: 'text-right', td: 'text-right' } } },
  { accessorKey: 'growth', header: t('netWorthRings.columnGrowth'), meta: { class: { th: 'text-right', td: 'text-right' } } },
])

// The latest year's row gets a permanent tint so the table's own "current" marker doesn't
// depend on hover — it also matches the primary-colored latest ring in the chart.
const rowsMeta = {
  class: { tr: (row: TableRow<RingRow>) => (row.original.isLatest ? 'bg-elevated/60' : undefined) },
}

function onRowHover(_e: Event, row: TableRow<RingRow> | null) {
  hoveredYear.value = row ? row.original.year : null
}
</script>

<template>
  <div v-if="rings.items.length > 0" class="flex h-full min-h-0 flex-col gap-6 sm:flex-row sm:gap-8">
    <div class="flex flex-none flex-col items-start gap-4 sm:w-1/2 sm:flex-row sm:items-center sm:gap-6 sm:self-center">
      <svg viewBox="0 0 380 380" style="width: 150px" class="block flex-none">
        <circle
          v-for="ring in rings.items"
          :key="ring.year"
          cx="190"
          cy="190"
          :r="ring.r"
          fill="none"
          :stroke="ring.stroke"
          :stroke-width="ring.w"
          :opacity="hoveredYear && hoveredYear !== ring.year ? 0.3 : 1"
          class="transition-opacity"
        >
          <title>{{ ring.year }}</title>
        </circle>
        <circle cx="190" cy="190" r="4" fill="var(--ui-primary)" />
      </svg>

      <div class="flex min-w-0 flex-col gap-2">
        <span
          v-if="rings.gain !== null"
          class="font-heading text-[clamp(22px,2.6vw,30px)] leading-[1.1] font-extrabold tracking-tight"
          :class="deltaColorClass(rings.gain)"
        >
          {{ formatSignedCurrency(rings.gain) }}
        </span>
        <span class="max-w-[32ch] text-[13.5px] leading-snug text-muted">
          {{
            rings.items.length > 1
              ? t('netWorthRings.multiYear', rings.items.length)
              : t('netWorthRings.singleYear')
          }}
        </span>
      </div>
    </div>

    <div class="min-h-0 overflow-x-auto overflow-y-auto sm:w-1/2 sm:flex-1 sm:self-stretch">
      <UTable :data="rings.rows" :columns="ringsColumns" :meta="rowsMeta" :on-hover="onRowHover">
        <template #year-cell="{ row }: { row: TableRow<RingRow> }">
          <span class="inline-flex items-center gap-2 whitespace-nowrap">
            <span class="size-1.5 flex-none rounded-full" :class="row.original.isLatest ? 'bg-primary' : 'bg-transparent'" />
            <span :class="row.original.isLatest ? 'font-semibold' : undefined">{{ row.original.year }}</span>
          </span>
        </template>
        <template #netWorth-cell="{ row }: { row: TableRow<RingRow> }">
          <span class="font-heading text-[16.5px] font-extrabold whitespace-nowrap">{{ formatCurrency(row.original.netWorth) }}</span>
        </template>
        <template #growth-cell="{ row }: { row: TableRow<RingRow> }">
          <span class="whitespace-nowrap" :class="deltaColorClass(row.original.growth)">{{ formatSignedCurrency(row.original.growth) }}</span>
        </template>
      </UTable>
    </div>
  </div>
</template>
