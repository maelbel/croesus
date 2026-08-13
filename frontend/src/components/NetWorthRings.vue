<script setup lang="ts">
import { computed } from 'vue'
import { useNetWorthStore } from '../stores/networth'
import { formatCurrency, formatSignedCurrency, deltaColorClass } from '../lib/format'

const netWorthStore = useNetWorthStore()

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
</script>

<template>
  <div v-if="rings.items.length > 0" class="flex flex-col gap-7">
    <div class="flex flex-wrap items-center gap-8">
      <svg viewBox="0 0 380 380" style="width: 220px" class="block flex-none">
        <circle
          v-for="(ring, i) in rings.items"
          :key="i"
          cx="190"
          cy="190"
          :r="ring.r"
          fill="none"
          :stroke="ring.stroke"
          :stroke-width="ring.w"
        />
        <circle cx="190" cy="190" r="4" fill="var(--ui-primary)" />
      </svg>
      <div class="flex min-w-[240px] flex-1 flex-col gap-2.5">
        <span
          v-if="rings.gain !== null"
          class="font-heading text-[clamp(24px,2.6vw,32px)] leading-[1.1] font-extrabold tracking-tight"
          :class="deltaColorClass(rings.gain)"
        >
          {{ formatSignedCurrency(rings.gain) }}
        </span>
        <span class="max-w-[40ch] text-[15px] text-muted">
          {{
            rings.items.length > 1
              ? `grown across ${rings.items.length} years on record. Each ring is one year, and a wider gap between rings is a year that grew more.`
              : 'One year on record so far — more rings will appear as history builds up.'
          }}
        </span>
      </div>
    </div>

    <table class="w-full border-collapse">
      <thead>
        <tr>
          <th class="border-b-2 border-default pb-2.5 text-left text-xs font-semibold text-muted">Year</th>
          <th class="border-b-2 border-default pb-2.5 pl-3 text-right text-xs font-semibold text-muted">Net worth</th>
          <th class="border-b-2 border-default pb-2.5 pl-3 text-right text-xs font-semibold text-muted">Growth</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rings.rows" :key="row.year" class="border-b border-default">
          <td class="py-2.5 pr-3 text-[15px]">{{ row.year }}</td>
          <td class="py-2.5 pl-3 text-right font-heading text-[16.5px] font-extrabold whitespace-nowrap">
            {{ formatCurrency(row.netWorth) }}
          </td>
          <td class="py-2.5 pl-3 text-right text-[15px] whitespace-nowrap" :class="deltaColorClass(row.growth)">
            {{ formatSignedCurrency(row.growth) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
