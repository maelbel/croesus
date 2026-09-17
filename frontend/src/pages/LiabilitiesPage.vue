<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useLiabilitiesStore } from '../stores/liabilities'
import { useCurrencyStore } from '../stores/currency'
import { useFxRatesStore } from '../stores/fxRates'
import { useNetWorthStore } from '../stores/networth'
import { useCrudForm } from '../composables/useCrudForm'
import { usePageAction } from '../composables/usePageAction'
import {
  CURRENCIES,
  LIABILITY_TYPES,
  liabilityTypeLabel,
  type Liability,
  type LiabilityCreate,
} from '../api/types'
import { formatCurrency, formatSignedCurrency, formatRate, formatDate, deltaColorClass } from '../lib/format'
import { paidRatio, paymentsLeft } from '../lib/liabilityMath'
import EntityFormModal from '../components/EntityFormModal.vue'
import PageLoadingSkeleton from '../components/PageLoadingSkeleton.vue'

const { t } = useI18n()
const router = useRouter()
const liabilitiesStore = useLiabilitiesStore()
const currencyStore = useCurrencyStore()
const fxRatesStore = useFxRatesStore()
const netWorthStore = useNetWorthStore()

// Only while the very first fetch is still in flight — once any liabilities
// exist, later refetches (after a create/update/remove) don't re-show this.
const initialLoading = computed(() => liabilitiesStore.loading && liabilitiesStore.liabilities.length === 0)

const liabilityTypeOptions = computed(() =>
  LIABILITY_TYPES.map((value) => ({ label: liabilityTypeLabel(value), value })),
)
const currencyOptions = computed(() => CURRENCIES.map((value) => ({ label: value, value })))

const sortedLiabilities = computed(() =>
  [...liabilitiesStore.liabilities].sort((a, b) => a.name.localeCompare(b.name)),
)

// Liabilities can each hold a different currency — every cross-liability sum
// on this page converts into the reference currency first (fxRatesStore),
// while individual rows below keep showing each liability's own currency.
const totalRemaining = computed(() =>
  liabilitiesStore.liabilities.reduce(
    (sum, l) => sum + fxRatesStore.convert(Number(l.remaining_amount), l.currency),
    0,
  ),
)
const totalMonthly = computed(() =>
  liabilitiesStore.liabilities.reduce(
    (sum, l) => sum + fxRatesStore.convert(Number(l.monthly_payment ?? 0), l.currency),
    0,
  ),
)
// A decrease in total debt is the "good" direction, unlike every other
// delta in the app — so this is deliberately the negated sign.
const totalDelta30d = computed(() =>
  netWorthStore.liabilitiesDelta30d === null ? null : -netWorthStore.liabilitiesDelta30d,
)

function liabilityFormDefaults(): LiabilityCreate {
  return {
    name: '',
    type: 'mortgage',
    currency: currencyStore.referenceCurrency,
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
    currency: liability.currency,
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

function openLiability(liability: Liability) {
  router.push({ name: 'liability', params: { id: liability.id } })
}
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
      <UFormField :label="t('liabilities.fieldName')" class="sm:col-span-2">
        <UInput v-model="liabilityForm.state.form.name" :placeholder="t('liabilities.fieldNamePlaceholder')" class="w-full" />
      </UFormField>
      <UFormField :label="t('liabilities.fieldType')">
        <USelect v-model="liabilityForm.state.form.type" :items="liabilityTypeOptions" class="w-full" />
      </UFormField>
      <UFormField :label="t('liabilities.fieldCurrency')">
        <USelect v-model="liabilityForm.state.form.currency" :items="currencyOptions" class="w-full" />
      </UFormField>
      <UFormField :label="t('liabilities.fieldInitialAmount')">
        <UInput v-model="liabilityForm.state.form.initial_amount" type="number" :placeholder="t('liabilities.fieldInitialAmountPlaceholder')" class="w-full" />
      </UFormField>
      <UFormField :label="t('liabilities.fieldRemainingBalance')">
        <UInput v-model="liabilityForm.state.form.remaining_amount" type="number" :placeholder="t('liabilities.fieldRemainingBalancePlaceholder')" class="w-full" />
      </UFormField>
      <UFormField :label="t('liabilities.fieldMonthlyPayment')">
        <UInput v-model="liabilityForm.state.form.monthly_payment" type="number" :placeholder="t('liabilities.fieldMonthlyPaymentPlaceholder')" class="w-full" />
      </UFormField>
      <UFormField :label="t('liabilities.fieldInterestRate')">
        <UInput v-model="liabilityForm.state.form.interest_rate" type="number" step="0.01" :placeholder="t('liabilities.fieldInterestRatePlaceholder')" class="w-full" />
      </UFormField>
      <UFormField :label="t('liabilities.fieldStartDate')">
        <UInput v-model="liabilityForm.state.form.start_date" type="date" class="w-full" />
      </UFormField>
      <UFormField :label="t('liabilities.fieldEndDate')">
        <UInput v-model="liabilityForm.state.form.end_date" type="date" class="w-full" />
      </UFormField>
    </EntityFormModal>

    <PageLoadingSkeleton v-if="initialLoading" />

    <template v-else-if="liabilitiesStore.liabilities.length > 0">
      <div class="flex flex-col gap-2">
        <span class="text-xs tracking-wide text-muted uppercase">{{ t('liabilities.heroKicker') }}</span>
        <span class="font-heading text-[clamp(38px,5vw,60px)] leading-none font-extrabold tracking-tight">{{ formatCurrency(totalRemaining) }}</span>
        <span class="text-[14.5px] font-semibold">
          <template v-if="totalDelta30d !== null"><span :class="deltaColorClass(totalDelta30d)">{{ formatSignedCurrency(totalDelta30d) }}</span> <span class="font-medium text-muted">{{ t('liabilities.heroNoteWithDelta', { monthly: formatCurrency(totalMonthly) }) }}</span></template>
          <span v-else class="font-medium text-muted">{{ t('liabilities.heroNote', { monthly: formatCurrency(totalMonthly) }) }}</span>
        </span>
      </div>

      <div class="flex flex-col gap-2.5">
        <div
          v-for="liability in sortedLiabilities"
          :key="liability.id"
          role="button"
          tabindex="0"
          class="neu-surface flex cursor-pointer flex-col gap-3.5 bg-default p-5"
          @click="openLiability(liability)"
          @keydown.enter="openLiability(liability)"
        >
          <span class="flex items-start justify-between gap-4">
            <span class="flex min-w-0 flex-col gap-0.5">
              <span class="text-[16px] font-bold tracking-tight">{{ liability.name }}</span>
              <span class="text-[13px] text-muted">
                {{ liabilityTypeLabel(liability.type) }}
                <template v-if="liability.interest_rate"> · {{ formatRate(Number(liability.interest_rate)) }}</template>
                <template v-if="liability.end_date"> · {{ t('liabilities.endsNote', { date: formatDate(liability.end_date) }) }}</template>
              </span>
            </span>
            <span class="flex flex-none flex-col items-end gap-0.5">
              <span class="text-[20px] font-extrabold tracking-tight whitespace-nowrap">{{ formatCurrency(liability.remaining_amount, liability.currency) }}</span>
              <span class="text-[12.5px] whitespace-nowrap text-muted">
                {{ liability.monthly_payment ? t('liabilities.perMonth', { amount: formatCurrency(liability.monthly_payment, liability.currency) }) : '—' }}
              </span>
            </span>
          </span>
          <span class="flex flex-col gap-1.5">
            <span class="stripe-track">
              <span class="stripe-fill" :style="{ width: `${paidRatio(liability) * 100}%` }" />
            </span>
            <span class="flex items-center justify-between gap-4 text-[12.5px] text-muted">
              <span>{{ t('liabilities.paidOffPct', { pct: Math.round(paidRatio(liability) * 100) }) }}</span>
              <span v-if="paymentsLeft(liability) !== null">{{ t('liabilities.paymentsLeft', paymentsLeft(liability)!) }}</span>
            </span>
          </span>
        </div>
      </div>
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
