<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TableColumn, TableRow } from '@nuxt/ui'
import { useLiabilitiesStore } from '../stores/liabilities'
import { useCrudForm } from '../composables/useCrudForm'
import { useDeleteAction } from '../composables/useDeleteAction'
import { usePageAction } from '../composables/usePageAction'
import { LIABILITY_TYPES, liabilityTypeLabel, type Liability, type LiabilityCreate, type LiabilityType } from '../api/types'
import { formatCurrency, formatRate, formatDate } from '../lib/format'
import StatCard from '../components/StatCard.vue'
import StatCardRow from '../components/StatCardRow.vue'
import EntityFormModal from '../components/EntityFormModal.vue'
import EllipsisMenu from '../components/EllipsisMenu.vue'
import PageLoadingSkeleton from '../components/PageLoadingSkeleton.vue'

const { t } = useI18n()
const liabilitiesStore = useLiabilitiesStore()

// Only while the very first fetch is still in flight — once any liabilities
// exist, later refetches (after a create/update/remove) don't re-show this.
const initialLoading = computed(() => liabilitiesStore.loading && liabilitiesStore.liabilities.length === 0)

const liabilityTypeOptions = computed(() =>
  LIABILITY_TYPES.map((value) => ({ label: liabilityTypeLabel(value), value })),
)

const filters = reactive({
  search: '',
  type: null as LiabilityType | null,
})

const filteredLiabilities = computed(() => {
  const search = filters.search.trim().toLowerCase()
  return liabilitiesStore.liabilities.filter((liability) => {
    if (filters.type && liability.type !== filters.type) return false
    if (!search) return true
    return liability.name.toLowerCase().includes(search)
  })
})

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
  entityKey: 'liability',
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

usePageAction(() => t('liabilities.addTitle'), () => liabilityForm.openCreate())

const deleteLiability = useDeleteAction('liability')

async function removeLiability(liability: Liability) {
  await deleteLiability(t('liabilities.deleteConfirm', { name: liability.name }), () => liabilitiesStore.remove(liability.id))
}

function liabilityMenuItems(liability: Liability) {
  return [
    { label: t('common.edit'), icon: 'i-lucide-pencil', onSelect: () => liabilityForm.openEdit(liability) },
    { label: t('common.delete'), icon: 'i-lucide-trash-2', color: 'rust' as const, onSelect: () => removeLiability(liability) },
  ]
}

const liabilityColumns = computed<TableColumn<Liability>[]>(() => [
  { accessorKey: 'name', header: t('liabilities.columnLiability') },
  { accessorKey: 'remaining_amount', header: t('liabilities.columnRemaining'), meta: { class: { th: 'text-right', td: 'text-right whitespace-nowrap' } } },
  { accessorKey: 'monthly_payment', header: t('liabilities.columnMonthly'), meta: { class: { th: 'text-right', td: 'text-right whitespace-nowrap' } } },
  { id: 'paidOff', header: t('liabilities.columnPaidOff'), meta: { class: { th: 'w-[150px] pl-6' } } },
  { id: 'actions', header: '', meta: { class: { td: 'text-right whitespace-nowrap' } } },
])
</script>

<template>
  <div class="flex flex-col gap-7">
    <EntityFormModal
      :open="liabilityForm.state.open"
      :title="liabilityForm.state.isEditing ? t('liabilities.editTitle') : t('liabilities.addTitle')"
      :loading="liabilityForm.state.submitting"
      @update:open="liabilityForm.state.open = $event"
      @submit="liabilityForm.submit()"
    >
      <UFormField :label="t('liabilities.fieldName')">
        <UInput v-model="liabilityForm.state.form.name" :placeholder="t('liabilities.fieldNamePlaceholder')" />
      </UFormField>
      <UFormField :label="t('liabilities.fieldType')">
        <USelect v-model="liabilityForm.state.form.type" :items="liabilityTypeOptions" class="w-full" />
      </UFormField>
      <UFormField :label="t('liabilities.fieldInitialAmount')">
        <UInput v-model="liabilityForm.state.form.initial_amount" type="number" :placeholder="t('liabilities.fieldInitialAmountPlaceholder')" />
      </UFormField>
      <UFormField :label="t('liabilities.fieldRemainingBalance')">
        <UInput v-model="liabilityForm.state.form.remaining_amount" type="number" :placeholder="t('liabilities.fieldRemainingBalancePlaceholder')" />
      </UFormField>
      <UFormField :label="t('liabilities.fieldMonthlyPayment')">
        <UInput v-model="liabilityForm.state.form.monthly_payment" type="number" :placeholder="t('liabilities.fieldMonthlyPaymentPlaceholder')" />
      </UFormField>
      <UFormField :label="t('liabilities.fieldInterestRate')">
        <UInput v-model="liabilityForm.state.form.interest_rate" type="number" step="0.01" :placeholder="t('liabilities.fieldInterestRatePlaceholder')" />
      </UFormField>
      <UFormField :label="t('liabilities.fieldStartDate')">
        <UInput v-model="liabilityForm.state.form.start_date" type="date" />
      </UFormField>
      <UFormField :label="t('liabilities.fieldEndDate')">
        <UInput v-model="liabilityForm.state.form.end_date" type="date" />
      </UFormField>
    </EntityFormModal>

    <PageLoadingSkeleton v-if="initialLoading" />

    <template v-else-if="liabilitiesStore.liabilities.length > 0">
      <StatCardRow>
        <StatCard :label="t('liabilities.remainingDebt')" :value="formatCurrency(totalRemaining)" value-color="negative" />
        <StatCard
          :label="t('liabilities.monthlyPayments')"
          :value="formatCurrency(totalMonthly)"
          :note="t('liabilities.monthlyPaymentsNote', liabilitiesStore.liabilities.length)"
        />
        <StatCard
          :label="t('liabilities.weightedRate')"
          :value="weightedRate === null ? '—' : formatRate(weightedRate)"
          :note="lastPayoff ? t('liabilities.lastPayoffNote', { date: formatDate(lastPayoff) }) : undefined"
        />
      </StatCardRow>

      <div class="flex flex-wrap items-end gap-4">
        <UFormField :label="t('liabilities.searchLabel')" class="w-64">
          <UInput v-model="filters.search" :placeholder="t('liabilities.searchPlaceholder')" />
        </UFormField>
        <UFormField :label="t('liabilities.fieldType')" class="w-48">
          <USelect
            v-model="filters.type"
            :items="[{ label: t('common.allTypes'), value: null }, ...liabilityTypeOptions]"
            :placeholder="t('liabilities.typeFilterPlaceholder')"
          />
        </UFormField>
      </div>

      <UTable :data="filteredLiabilities" :columns="liabilityColumns">
        <template #name-cell="{ row }: { row: TableRow<Liability> }">
          <div class="flex flex-col gap-0.5">
            <span class="text-[15.5px] font-semibold whitespace-nowrap">{{ row.original.name }}</span>
            <span class="text-sm whitespace-nowrap text-muted">
              {{ liabilityTypeLabel(row.original.type) }}
              <template v-if="row.original.interest_rate"> · {{ formatRate(Number(row.original.interest_rate)) }}</template>
              <template v-if="row.original.end_date"> · {{ t('liabilities.endsNote', { date: formatDate(row.original.end_date) }) }}</template>
            </span>
          </div>
        </template>
        <template #remaining_amount-cell="{ row }: { row: TableRow<Liability> }">
          <span class="font-heading text-[15.5px] font-extrabold whitespace-nowrap text-rust">{{ formatCurrency(row.original.remaining_amount) }}</span>
        </template>
        <template #monthly_payment-cell="{ row }: { row: TableRow<Liability> }">
          <span class="text-[15px]">{{ row.original.monthly_payment ? formatCurrency(row.original.monthly_payment) : '—' }}</span>
        </template>
        <template #paidOff-cell="{ row }: { row: TableRow<Liability> }">
          <span class="flex items-center gap-2.5">
            <span class="stripe-track flex-1">
              <span class="stripe-fill paid-off-fill" :style="{ width: `${paidRatio(row.original) * 100}%` }" />
            </span>
            <span class="min-w-[34px] text-right text-sm text-muted">{{ Math.round(paidRatio(row.original) * 100) }}%</span>
          </span>
        </template>
        <template #actions-cell="{ row }: { row: TableRow<Liability> }">
          <EllipsisMenu :items="liabilityMenuItems(row.original)" />
        </template>
      </UTable>
    </template>

    <UEmpty
      v-else
      icon="i-lucide-landmark"
      :title="t('liabilities.emptyTitle')"
      :description="t('liabilities.emptyDescription')"
      class="neu-inset"
    />
  </div>
</template>
