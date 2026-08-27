<script setup lang="ts">
import { computed } from 'vue'
import { useLiabilitiesStore } from '../stores/liabilities'
import { useCrudForm } from '../composables/useCrudForm'
import { LIABILITY_TYPE_LABELS, type Liability, type LiabilityCreate, type LiabilityType } from '../api/types'
import { formatCurrency, formatRate, formatDate } from '../lib/format'
import StatCard from '../components/StatCard.vue'
import StatCardRow from '../components/StatCardRow.vue'
import EntityFormModal from '../components/EntityFormModal.vue'

const liabilitiesStore = useLiabilitiesStore()

const liabilityTypeOptions = Object.entries(LIABILITY_TYPE_LABELS).map(([value, label]) => ({
  label,
  value: value as LiabilityType,
}))

const totalRemaining = computed(() =>
  liabilitiesStore.liabilities.reduce((sum, l) => sum + Number(l.remaining_amount), 0),
)
const totalMonthly = computed(() =>
  liabilitiesStore.liabilities.reduce((sum, l) => sum + Number(l.monthly_payment ?? 0), 0),
)
const weightedRate = computed(() => {
  const withRate = liabilitiesStore.liabilities.filter((l) => l.interest_rate !== null)
  const base = withRate.reduce((sum, l) => sum + Number(l.remaining_amount), 0)
  if (base === 0) return null
  const weighted = withRate.reduce(
    (sum, l) => sum + Number(l.interest_rate) * Number(l.remaining_amount),
    0,
  )
  return weighted / base
})
const lastPayoff = computed(() => {
  const dates = liabilitiesStore.liabilities.map((l) => l.end_date).filter((d): d is string => !!d)
  if (dates.length === 0) return null
  return dates.reduce((latest, d) => (d > latest ? d : latest))
})

function paidRatio(liability: Liability) {
  const initial = Number(liability.initial_amount)
  if (initial <= 0) return 0
  return Math.min(1, Math.max(0, (initial - Number(liability.remaining_amount)) / initial))
}

function liabilityFormDefaults(): LiabilityCreate {
  return {
    name: '',
    type: 'mortgage',
    initial_amount: '',
    remaining_amount: '',
    monthly_payment: null,
    interest_rate: null,
    start_date: null,
    end_date: null,
  }
}

const liabilityForm = useCrudForm<Liability, LiabilityCreate>({
  entityLabel: 'liability',
  createDefaults: liabilityFormDefaults,
  toFormValues: (liability) => ({
    name: liability.name,
    type: liability.type,
    initial_amount: liability.initial_amount,
    remaining_amount: liability.remaining_amount,
    monthly_payment: liability.monthly_payment,
    interest_rate: liability.interest_rate,
    start_date: liability.start_date,
    end_date: liability.end_date,
  }),
  create: (payload) => liabilitiesStore.create(payload),
  update: (id, payload) => liabilitiesStore.update(id, payload),
})

async function removeLiability(liability: Liability) {
  if (!window.confirm(`Delete "${liability.name}"?`)) return
  await liabilitiesStore.remove(liability.id)
}
</script>

<template>
  <div class="flex flex-col gap-7">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">Liabilities</h2>
      <UButton icon="i-lucide-plus" label="Add a liability" @click="liabilityForm.openCreate()" />
    </div>

    <EntityFormModal
      :open="liabilityForm.state.open"
      :title="liabilityForm.state.isEditing ? 'Edit liability' : 'Add a liability'"
      :loading="liabilityForm.state.submitting"
      @update:open="liabilityForm.state.open = $event"
      @submit="liabilityForm.submit()"
    >
      <UFormField label="Name">
        <UInput v-model="liabilityForm.state.form.name" placeholder="Mortgage" />
      </UFormField>
      <UFormField label="Type">
        <USelect v-model="liabilityForm.state.form.type" :items="liabilityTypeOptions" class="w-full" />
      </UFormField>
      <UFormField label="Initial amount">
        <UInput v-model="liabilityForm.state.form.initial_amount" type="number" placeholder="200000" />
      </UFormField>
      <UFormField label="Remaining balance">
        <UInput v-model="liabilityForm.state.form.remaining_amount" type="number" placeholder="180000" />
      </UFormField>
      <UFormField label="Monthly payment">
        <UInput v-model="liabilityForm.state.form.monthly_payment" type="number" placeholder="950" />
      </UFormField>
      <UFormField label="Interest rate (%)">
        <UInput v-model="liabilityForm.state.form.interest_rate" type="number" step="0.01" placeholder="3.45" />
      </UFormField>
      <UFormField label="Start date">
        <UInput v-model="liabilityForm.state.form.start_date" type="date" />
      </UFormField>
      <UFormField label="End date">
        <UInput v-model="liabilityForm.state.form.end_date" type="date" />
      </UFormField>
    </EntityFormModal>

    <template v-if="liabilitiesStore.liabilities.length > 0">
      <StatCardRow>
        <StatCard label="Remaining debt" :value="formatCurrency(totalRemaining)" value-color="negative" />
        <StatCard
          label="Monthly payments"
          :value="formatCurrency(totalMonthly)"
          :note="`Across ${liabilitiesStore.liabilities.length} liabilities`"
        />
        <StatCard
          label="Weighted rate"
          :value="weightedRate === null ? '—' : formatRate(weightedRate)"
          :note="lastPayoff ? `Last payoff ${formatDate(lastPayoff)}` : undefined"
        />
      </StatCardRow>

      <table class="w-full border-collapse">
        <thead>
          <tr>
            <th class="border-b-2 border-default pb-2.5 text-left text-xs font-semibold text-muted">Liability</th>
            <th class="border-b-2 border-default pb-2.5 pl-3 text-right text-xs font-semibold text-muted">Remaining</th>
            <th class="border-b-2 border-default pb-2.5 pl-3 text-right text-xs font-semibold text-muted">Monthly</th>
            <th class="w-[150px] border-b-2 border-default pb-2.5 pl-6 text-left text-xs font-semibold text-muted">Paid off</th>
            <th class="border-b-2 border-default pb-2.5 pl-3 text-right text-xs font-semibold text-muted" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="liability in liabilitiesStore.liabilities" :key="liability.id" class="border-b border-default">
            <td class="py-3.5 pr-3">
              <div class="flex flex-col gap-0.5">
                <span class="text-[15.5px] font-semibold whitespace-nowrap">{{ liability.name }}</span>
                <span class="text-sm whitespace-nowrap text-muted">
                  {{ LIABILITY_TYPE_LABELS[liability.type] }}
                  <template v-if="liability.interest_rate"> · {{ formatRate(Number(liability.interest_rate)) }}</template>
                  <template v-if="liability.end_date"> · ends {{ formatDate(liability.end_date) }}</template>
                </span>
              </div>
            </td>
            <td class="py-3.5 pl-3 text-right font-heading text-[15.5px] font-extrabold whitespace-nowrap text-rust">
              {{ formatCurrency(liability.remaining_amount) }}
            </td>
            <td class="py-3.5 pl-3 text-right text-[15px] whitespace-nowrap">
              {{ liability.monthly_payment ? formatCurrency(liability.monthly_payment) : '—' }}
            </td>
            <td class="py-3.5 pl-6">
              <span class="flex items-center gap-2.5">
                <span class="stripe-track flex-1">
                  <span class="stripe-fill paid-off-fill" :style="{ width: `${paidRatio(liability) * 100}%` }" />
                </span>
                <span class="min-w-[34px] text-right text-sm text-muted">{{ Math.round(paidRatio(liability) * 100) }}%</span>
              </span>
            </td>
            <td class="py-3.5 pl-3 text-right whitespace-nowrap">
              <UButton
                variant="ghost"
                color="neutral"
                icon="i-lucide-pencil"
                size="sm"
                title="Edit liability"
                @click="liabilityForm.openEdit(liability)"
              />
              <UButton
                color="error"
                variant="ghost"
                icon="i-lucide-trash-2"
                size="sm"
                title="Delete liability"
                @click="removeLiability(liability)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </template>

    <UEmpty
      v-else
      icon="i-lucide-landmark"
      title="No liabilities recorded"
      description="Nothing owed is a fine place to be. If you carry a mortgage or a loan, record it here so net worth stays accurate."
      class="neu-inset"
    />
  </div>
</template>
