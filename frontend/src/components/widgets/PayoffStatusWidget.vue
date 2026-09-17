<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLiabilitiesStore } from '../../stores/liabilities'
import { useEnvelopesStore } from '../../stores/envelopes'
import { formatCurrency } from '../../lib/format'
import { paidRatio, paymentsLeft } from '../../lib/liabilityMath'

const props = defineProps<{ source?: string }>()

const { t } = useI18n()
const liabilitiesStore = useLiabilitiesStore()
const envelopesStore = useEnvelopesStore()

type Row = { id: number; name: string; pct: number; right: string }

const rows = computed<Row[]>(() => {
  if (props.source === 'debt_payoff') {
    return liabilitiesStore.liabilities.map((l) => {
      const pct = paidRatio(l)
      const left = paymentsLeft(l)
      return {
        id: l.id,
        name: l.name,
        pct,
        right: left !== null ? t('liabilities.paymentsLeft', left) : `${Math.round(pct * 100)}%`,
      }
    })
  }
  if (props.source === 'envelope_allocation') {
    return envelopesStore.envelopes.map((e) => {
      const target = Number(e.target_amount)
      const pct = target > 0 ? Math.min(1, Number(e.current_amount) / target) : 0
      return { id: e.id, name: e.name, pct, right: formatCurrency(e.current_amount) }
    })
  }
  return []
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
        <span class="stripe-fill" :style="{ width: `${row.pct * 100}%` }" />
      </span>
    </div>
  </div>
</template>
