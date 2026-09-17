<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useLiabilitiesStore } from '../stores/liabilities'
import { useCurrencyStore } from '../stores/currency'
import { useCrudForm } from '../composables/useCrudForm'
import { useDeleteAction } from '../composables/useDeleteAction'
import { usePageTitle } from '../composables/usePageTitle'
import {
  CURRENCIES,
  LIABILITY_TYPES,
  liabilityTypeLabel,
  type Liability,
  type LiabilityCreate,
} from '../api/types'
import { formatCurrency, formatDate, formatRate } from '../lib/format'
import { paidRatio, paymentsLeft } from '../lib/liabilityMath'
import PageLoadingSkeleton from '../components/PageLoadingSkeleton.vue'

const props = defineProps<{ id: string }>()

const { t } = useI18n()
const router = useRouter()
const liabilitiesStore = useLiabilitiesStore()
const currencyStore = useCurrencyStore()

const liability = computed<Liability | null>(
  () => liabilitiesStore.liabilities.find((l) => l.id === Number(props.id)) ?? null,
)

// Covers both a bad id in the URL and a liability deleted (from another tab,
// or via this page's own delete button) while its page is still open.
watch(
  () => [liability.value, liabilitiesStore.loading] as const,
  ([found, loading]) => {
    if (!found && !loading) router.replace('/liabilities')
  },
  { immediate: true },
)

usePageTitle(
  () => (liability.value ? liabilityTypeLabel(liability.value.type) : ''),
  () => liability.value?.name ?? '',
)

const liabilityTypeOptions = computed(() =>
  LIABILITY_TYPES.map((value) => ({ label: liabilityTypeLabel(value), value })),
)
const currencyOptions = computed(() => CURRENCIES.map((value) => ({ label: value, value })))

// Editable directly on the page (no modal) — kept in sync with whichever
// liability this route currently points at.
const liabilityForm = useCrudForm<Liability, LiabilityCreate>({
  entityKey: 'liability',
  createDefaults: () => ({
    name: '',
    type: 'mortgage',
    currency: currencyStore.referenceCurrency,
    initial_amount: '',
    remaining_amount: '',
    monthly_payment: null,
    interest_rate: null,
    start_date: null,
    end_date: null,
  }),
  toFormValues: (l) => ({
    name: l.name,
    type: l.type,
    currency: l.currency,
    initial_amount: l.initial_amount,
    remaining_amount: l.remaining_amount,
    monthly_payment: l.monthly_payment,
    interest_rate: l.interest_rate,
    start_date: l.start_date,
    end_date: l.end_date,
  }),
  create: (payload) => liabilitiesStore.create(payload),
  update: (id, payload) => liabilitiesStore.update(id, payload),
})

watch(
  liability,
  (l) => {
    if (l) liabilityForm.openEdit(l)
  },
  { immediate: true },
)

// Starts collapsed to a read-only summary, same rationale as AccountPage.vue:
// most visits are to check the balance, not to change the liability's fields.
const editingDetails = ref(false)

async function saveLiabilityDetails() {
  if (await liabilityForm.submit()) editingDetails.value = false
}

function cancelEditDetails() {
  if (liability.value) liabilityForm.openEdit(liability.value)
  editingDetails.value = false
}

const deleteLiability = useDeleteAction('liability')

async function removeLiability() {
  if (!liability.value) return
  await deleteLiability(t('liabilities.deleteConfirm', { name: liability.value.name }), async () => {
    await liabilitiesStore.remove(liability.value!.id)
    router.push('/liabilities')
  })
}

// A fresh id in the route (navigating from one liability's page straight to
// another's) shouldn't leave the previous one's page stuck in edit mode.
watch(
  () => props.id,
  () => {
    editingDetails.value = false
  },
)
</script>

<template>
  <div v-if="liability" class="flex flex-col gap-8">
    <RouterLink to="/liabilities" class="inline-flex w-fit items-center gap-1 text-sm text-muted hover:text-toned">
      <UIcon name="i-lucide-chevron-left" class="size-3.5" />
      {{ t('liabilityDetail.backToLiabilities') }}
    </RouterLink>

    <section class="neu-surface flex flex-col gap-4 p-5">
      <div class="flex flex-col gap-1">
        <span class="text-xs tracking-wide text-muted uppercase">{{ t('liabilities.fieldRemainingBalance') }}</span>
        <span class="font-heading text-[40px] leading-none font-extrabold">{{ formatCurrency(liability.remaining_amount, liability.currency) }}</span>
        <span v-if="liability.monthly_payment" class="text-sm text-muted">{{ t('liabilities.perMonth', { amount: formatCurrency(liability.monthly_payment, liability.currency) }) }}</span>
      </div>

      <div class="flex flex-col gap-1.5">
        <span class="stripe-track">
          <span class="stripe-fill" :style="{ width: `${paidRatio(liability) * 100}%` }" />
        </span>
        <span class="flex items-center justify-between gap-4 text-sm text-muted">
          <span>{{ t('liabilities.paidOffPct', { pct: Math.round(paidRatio(liability) * 100) }) }}</span>
          <span v-if="paymentsLeft(liability) !== null">{{ t('liabilities.paymentsLeft', paymentsLeft(liability)!) }}</span>
        </span>
      </div>
    </section>

    <section class="flex flex-col gap-4">
      <div class="flex items-center justify-between gap-4">
        <span class="text-xs tracking-wide text-muted uppercase">{{ t('liabilityDetail.detailsHeading') }}</span>
        <UButton
          v-if="!editingDetails"
          variant="ghost"
          color="neutral"
          size="xs"
          icon="i-lucide-pencil"
          @click="editingDetails = true"
        >
          {{ t('common.edit') }}
        </UButton>
      </div>

      <div class="neu-surface flex flex-col gap-4 p-5">
        <template v-if="!editingDetails">
          <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="flex flex-col gap-0.5">
              <dt class="text-xs text-muted">{{ t('liabilities.fieldType') }}</dt>
              <dd class="text-[15px]">{{ liabilityTypeLabel(liability.type) }}</dd>
            </div>
            <div class="flex flex-col gap-0.5">
              <dt class="text-xs text-muted">{{ t('liabilities.fieldCurrency') }}</dt>
              <dd class="text-[15px]">{{ liability.currency }}</dd>
            </div>
            <div class="flex flex-col gap-0.5">
              <dt class="text-xs text-muted">{{ t('liabilities.fieldInitialAmount') }}</dt>
              <dd class="text-[15px]">{{ formatCurrency(liability.initial_amount, liability.currency) }}</dd>
            </div>
            <div v-if="liability.interest_rate" class="flex flex-col gap-0.5">
              <dt class="text-xs text-muted">{{ t('liabilities.fieldInterestRate') }}</dt>
              <dd class="text-[15px]">{{ formatRate(Number(liability.interest_rate)) }}</dd>
            </div>
            <div v-if="liability.start_date" class="flex flex-col gap-0.5">
              <dt class="text-xs text-muted">{{ t('liabilities.fieldStartDate') }}</dt>
              <dd class="text-[15px]">{{ formatDate(liability.start_date) }}</dd>
            </div>
            <div v-if="liability.end_date" class="flex flex-col gap-0.5">
              <dt class="text-xs text-muted">{{ t('liabilities.fieldEndDate') }}</dt>
              <dd class="text-[15px]">{{ formatDate(liability.end_date) }}</dd>
            </div>
          </dl>
        </template>

        <template v-else>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          </div>
          <div class="flex items-center gap-2.5">
            <UButton :loading="liabilityForm.state.submitting" @click="saveLiabilityDetails">
              {{ t('common.save') }}
            </UButton>
            <UButton variant="ghost" color="neutral" :disabled="liabilityForm.state.submitting" @click="cancelEditDetails">
              {{ t('common.cancel') }}
            </UButton>
          </div>
        </template>

        <div class="flex flex-wrap items-center justify-between gap-3 border-t border-default pt-4">
          <span class="text-sm text-muted">{{ t('liabilityDetail.deleteLiabilityHint') }}</span>
          <UButton color="rust" variant="outline" size="sm" class="flex-none" @click="removeLiability">
            {{ t('liabilityDetail.deleteLiability') }}
          </UButton>
        </div>
      </div>
    </section>
  </div>

  <PageLoadingSkeleton v-else />
</template>
