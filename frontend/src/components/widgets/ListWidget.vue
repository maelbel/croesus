<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAccountsStore } from '../../stores/accounts'
import { useLiabilitiesStore } from '../../stores/liabilities'
import { useEnvelopesStore } from '../../stores/envelopes'
import { useValuationsStore } from '../../stores/valuations'
import { accountTypeLabel, liabilityTypeLabel, type Currency } from '../../api/types'
import { formatCurrency, formatSignedCurrency, deltaColorClass } from '../../lib/format'
import { paidRatio } from '../../lib/liabilityMath'

const props = defineProps<{ source?: string }>()

const router = useRouter()
const accountsStore = useAccountsStore()
const liabilitiesStore = useLiabilitiesStore()
const envelopesStore = useEnvelopesStore()
const valuationsStore = useValuationsStore()

type Row = {
  id: number
  name: string
  sub: string
  amount: number
  currency?: Currency
  delta: number | null
  go: () => void
}

const rows = computed<Row[]>(() => {
  if (props.source === 'accounts') {
    return accountsStore.accounts.map((a) => ({
      id: a.id,
      name: a.name,
      sub: accountTypeLabel(a.type),
      amount: valuationsStore.currentValue(a.id),
      currency: a.currency,
      delta: valuationsStore.changeOverDays(a.id, 30)?.delta ?? null,
      go: () => router.push({ name: 'account', params: { id: a.id } }),
    }))
  }
  if (props.source === 'liabilities') {
    return liabilitiesStore.liabilities.map((l) => ({
      id: l.id,
      name: l.name,
      sub: `${liabilityTypeLabel(l.type)} · ${Math.round(paidRatio(l) * 100)}%`,
      amount: Number(l.remaining_amount),
      currency: l.currency,
      delta: null,
      go: () => router.push({ name: 'liability', params: { id: l.id } }),
    }))
  }
  if (props.source === 'envelopes') {
    return envelopesStore.envelopes.map((e) => {
      const target = Number(e.target_amount)
      const pct = target > 0 ? Math.min(1, Number(e.current_amount) / target) : 0
      return {
        id: e.id,
        name: e.name,
        sub: `${Math.round(pct * 100)}%`,
        amount: Number(e.current_amount),
        delta: null,
        go: () => router.push({ name: 'envelope', params: { id: e.id } }),
      }
    })
  }
  return []
})
</script>

<template>
  <div class="flex flex-col">
    <div
      v-for="row in rows"
      :key="row.id"
      role="button"
      tabindex="0"
      class="flex cursor-pointer items-center gap-3 border-t border-default py-2.5 first:border-t-0"
      @click="row.go"
      @keydown.enter="row.go"
    >
      <span class="flex min-w-0 flex-1 flex-col gap-0.5">
        <span class="truncate text-[14px] font-semibold">{{ row.name }}</span>
        <span class="text-xs text-muted">{{ row.sub }}</span>
      </span>
      <span class="flex flex-none flex-col items-end gap-0.5">
        <span class="text-[14px] font-bold whitespace-nowrap">{{ formatCurrency(row.amount, row.currency) }}</span>
        <span v-if="row.delta !== null" class="text-xs whitespace-nowrap" :class="deltaColorClass(row.delta)">
          {{ formatSignedCurrency(row.delta, row.currency) }}
        </span>
      </span>
    </div>
  </div>
</template>
