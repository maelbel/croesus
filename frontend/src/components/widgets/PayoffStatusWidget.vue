<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLiabilitiesStore } from '../../stores/liabilities'
import { useEnvelopesStore } from '../../stores/envelopes'
import { formatCurrency, formatDate } from '../../lib/format'
import { paidRatio } from '../../lib/liabilityMath'

const props = defineProps<{ source?: string }>()

const { t } = useI18n()
const liabilitiesStore = useLiabilitiesStore()
const envelopesStore = useEnvelopesStore()

type Row = { id: number; name: string; pct: number; right: string; color?: string }

const rows = computed<Row[]>(() => {
  if (props.source === 'debt_payoff') {
    // Every bar is accent-colored here — unlike envelope allocation below, the design doesn't
    // single out one liability as "the" bar to highlight.
    return liabilitiesStore.liabilities.map((l) => {
      const pct = paidRatio(l)
      const pctLabel = `${Math.round(pct * 100)}`
      return {
        id: l.id,
        name: l.name,
        pct,
        right: l.end_date
          ? t('dashboardGrid.payoffEndsNote', { pct: pctLabel, date: formatDate(l.end_date) })
          : `${pctLabel}%`,
      }
    })
  }
  if (props.source === 'envelope_allocation') {
    return envelopesStore.envelopes.map((e, idx) => {
      const target = Number(e.target_amount)
      const pct = target > 0 ? Math.min(1, Number(e.current_amount) / target) : 0
      return {
        id: e.id,
        name: e.name,
        pct,
        right: formatCurrency(e.current_amount),
        color: idx === 0 ? undefined : 'var(--ui-text-muted)',
      }
    })
  }
  return []
})

// The furthest-out end date across every liability that has one — the same projection the
// design shows, just derived from each liability's own stored end date rather than an amortized
// guess, since that's real data we already have (see the per-row note above, same field).
const debtFreeNote = computed(() => {
  if (props.source !== 'debt_payoff') return null
  const dates = liabilitiesStore.liabilities.map((l) => l.end_date).filter((d): d is string => !!d)
  if (dates.length === 0) return null
  const latest = dates.reduce((max, d) => (d > max ? d : max))
  return t('dashboardGrid.payoffProjection', { date: formatDate(latest) })
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <div v-for="row in rows" :key="row.id" class="flex flex-col gap-1.5">
      <span class="flex items-center justify-between gap-3 text-[14px]">
        <span class="min-w-0 truncate font-semibold">{{ row.name }}</span>
        <span class="flex-none text-xs text-muted whitespace-nowrap">{{ row.right }}</span>
      </span>
      <span class="stripe-track">
        <span class="stripe-fill" :style="{ width: `${row.pct * 100}%`, '--stripe-color': row.color }" />
      </span>
    </div>
    <span v-if="debtFreeNote" class="mt-auto text-[13px] text-muted [text-wrap:pretty]">{{ debtFreeNote }}</span>
  </div>
</template>
