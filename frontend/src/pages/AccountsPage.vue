<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAccountsStore } from '../stores/accounts'
import { useCurrencyStore } from '../stores/currency'
import { useFxRatesStore } from '../stores/fxRates'
import { useValuationsStore } from '../stores/valuations'
import { useCrudForm } from '../composables/useCrudForm'
import { usePageAction } from '../composables/usePageAction'
import { ACCOUNT_TYPES, accountTypeLabel, CURRENCIES, type Account, type AccountCreate, type AccountType } from '../api/types'
import { formatCurrency, formatSignedCurrency, deltaColorClass } from '../lib/format'
import EntityFormModal from '../components/EntityFormModal.vue'
import PageLoadingSkeleton from '../components/PageLoadingSkeleton.vue'

const { t } = useI18n()
const router = useRouter()
const accountsStore = useAccountsStore()
const currencyStore = useCurrencyStore()
const fxRatesStore = useFxRatesStore()
const valuationsStore = useValuationsStore()

// Only while the very first fetch is still in flight — once any accounts
// exist, later refetches (after a create/update/remove) don't re-show this.
const initialLoading = computed(() => accountsStore.loading && accountsStore.accounts.length === 0)

const accountTypeOptions = computed(() =>
  ACCOUNT_TYPES.map((value) => ({ label: accountTypeLabel(value), value })),
)
const currencyOptions = computed(() => CURRENCIES.map((value) => ({ label: value, value })))

// Accounts can each hold a different currency — every cross-account sum on
// this page converts into the reference currency first (fxRatesStore),
// while individual rows below keep showing each account's own currency.
const totalValue = computed(() =>
  accountsStore.accounts.reduce(
    (sum, a) => sum + fxRatesStore.convert(valuationsStore.currentValue(a.id), a.currency),
    0,
  ),
)

// Aggregated the same way as each row's own 30 d column (delta vs. the value
// ~30 days ago), just summed across every account rather than one at a time.
const totalChange30d = computed(() => {
  let deltaSum = 0
  let referenceSum = 0
  for (const account of accountsStore.accounts) {
    const change = valuationsStore.changeOverDays(account.id, 30)
    if (!change) continue
    const delta = fxRatesStore.convert(change.delta, account.currency)
    deltaSum += delta
    referenceSum += fxRatesStore.convert(valuationsStore.currentValue(account.id), account.currency) - delta
  }
  if (referenceSum === 0) return null
  return { delta: deltaSum, ratio: deltaSum / referenceSum }
})

// Groups accounts the same way the design's own sample data does (Checking /
// Savings / Investment / Other) — our schema has no separate "Cash" type, so
// that group is dropped rather than mapped to something always-empty.
type GroupKey = 'checking' | 'savings' | 'investment' | 'other'
const GROUP_ORDER: { key: GroupKey; labelKey: string }[] = [
  { key: 'checking', labelKey: 'accounts.groupChecking' },
  { key: 'savings', labelKey: 'accounts.groupSavings' },
  { key: 'investment', labelKey: 'accounts.groupInvestment' },
  { key: 'other', labelKey: 'accounts.groupOther' },
]
const TYPE_GROUP: Record<AccountType, GroupKey> = {
  checking: 'checking',
  regulated_savings: 'savings',
  pea: 'investment',
  life_insurance: 'investment',
  brokerage: 'investment',
  crypto: 'other',
  real_estate: 'other',
  scpi: 'investment',
  other: 'other',
}

// Collapsed groups, keyed by group key — absent (the default) means open,
// matching the design's own per-group `open` toggle state.
const collapsedGroups = reactive<Partial<Record<GroupKey, boolean>>>({})
function toggleGroup(key: GroupKey) {
  collapsedGroups[key] = !collapsedGroups[key]
}

const groupedAccounts = computed(() =>
  GROUP_ORDER.map(({ key, labelKey }) => {
    const accounts = accountsStore.accounts
      .filter((a) => TYPE_GROUP[a.type] === key)
      .sort((a, b) => a.name.localeCompare(b.name))
    const total = accounts.reduce(
      (sum, a) => sum + fxRatesStore.convert(valuationsStore.currentValue(a.id), a.currency),
      0,
    )
    return { key, label: t(labelKey), accounts, total, open: !collapsedGroups[key] }
  }).filter((group) => group.accounts.length > 0),
)

function accountFormDefaults(): AccountCreate {
  return {
    name: '',
    type: 'checking',
    currency: currencyStore.referenceCurrency,
    institution: null,
    opened_at: null,
    is_emergency_fund: false,
    emergency_fund_target: null,
    notes: null,
  }
}

const accountForm = useCrudForm<Account, AccountCreate>({
  entityKey: 'account',
  createDefaults: accountFormDefaults,
  toFormValues: (account) => ({
    name: account.name,
    type: account.type,
    currency: account.currency,
    institution: account.institution,
    opened_at: account.opened_at,
    is_emergency_fund: account.is_emergency_fund,
    emergency_fund_target: account.emergency_fund_target,
    notes: account.notes,
  }),
  create: (payload) => accountsStore.create(payload),
  update: (id, payload) => accountsStore.update(id, payload),
})

usePageAction(() => t('accounts.addTitle'), () => accountForm.openCreate())

function openAccount(account: Account) {
  router.push({ name: 'account', params: { id: account.id } })
}
</script>

<template>
  <div class="flex flex-col gap-7">
    <EntityFormModal
      :open="accountForm.state.open"
      :title="accountForm.state.isEditing ? t('accounts.editTitle') : t('accounts.addTitle')"
      :loading="accountForm.state.submitting"
      @update:open="accountForm.state.open = $event"
      @submit="accountForm.submit()"
    >
      <UFormField :label="t('accounts.fieldName')" class="sm:col-span-2">
        <UInput v-model="accountForm.state.form.name" :placeholder="t('accounts.fieldNamePlaceholder')" class="w-full" />
      </UFormField>
      <UFormField :label="t('accounts.fieldType')">
        <USelect v-model="accountForm.state.form.type" :items="accountTypeOptions" class="w-full" />
      </UFormField>
      <UFormField :label="t('accounts.fieldCurrency')">
        <USelect v-model="accountForm.state.form.currency" :items="currencyOptions" class="w-full" />
      </UFormField>
      <UFormField :label="t('accounts.fieldInstitution')">
        <UInput v-model="accountForm.state.form.institution" :placeholder="t('accounts.fieldInstitutionPlaceholder')" class="w-full" />
      </UFormField>
      <UFormField :label="t('accounts.fieldOpenedOn')">
        <UInput v-model="accountForm.state.form.opened_at" type="date" class="w-full" />
      </UFormField>
      <UCheckbox v-model="accountForm.state.form.is_emergency_fund" :label="t('accounts.emergencyFundCheckbox')" class="sm:col-span-2" />
      <UFormField v-if="accountForm.state.form.is_emergency_fund" :label="t('accounts.fieldEmergencyTarget')" class="sm:col-span-2">
        <UInput v-model="accountForm.state.form.emergency_fund_target" type="number" :placeholder="t('accounts.fieldEmergencyTargetPlaceholder')" class="w-full" />
      </UFormField>
      <UFormField :label="t('accounts.fieldNotes')" class="sm:col-span-2">
        <UTextarea v-model="accountForm.state.form.notes" :placeholder="t('accounts.fieldNotesPlaceholder')" class="w-full" />
      </UFormField>
    </EntityFormModal>

    <PageLoadingSkeleton v-if="initialLoading" />

    <template v-else-if="accountsStore.accounts.length > 0">
      <div class="flex flex-col gap-2">
        <span class="text-xs tracking-wide text-muted uppercase">{{ t('accounts.heroKicker') }}</span>
        <span class="font-heading text-[clamp(38px,5vw,60px)] leading-none font-extrabold tracking-tight">{{ formatCurrency(totalValue) }}</span>
        <span class="text-[14.5px] font-semibold">
          <template v-if="totalChange30d"><span :class="deltaColorClass(totalChange30d.delta)">{{ formatSignedCurrency(totalChange30d.delta) }}</span> <span class="font-medium text-muted">{{ t('accounts.heroNoteWithDelta', accountsStore.accounts.length) }}</span></template>
          <span v-else class="font-medium text-muted">{{ t('accounts.heroNote', accountsStore.accounts.length) }}</span>
        </span>
      </div>

      <div class="flex flex-col gap-2.5">
        <div v-for="group in groupedAccounts" :key="group.key" class="neu-surface overflow-hidden bg-default">
          <button
            type="button"
            class="flex w-full items-center gap-3 px-5 py-4 text-left"
            @click="toggleGroup(group.key)"
          >
            <UIcon
              name="i-lucide-chevron-down"
              class="size-3.5 flex-none text-muted transition-transform"
              :class="group.open ? '' : '-rotate-90'"
            />
            <span class="text-[14.5px] font-bold tracking-tight">{{ group.label }}</span>
            <span class="text-[13px] text-muted">{{ t('accounts.groupCount', group.accounts.length) }}</span>
            <span class="flex-1" />
            <span class="text-[15px] font-bold">{{ formatCurrency(group.total) }}</span>
          </button>
          <div v-if="group.open" class="flex flex-col px-5 pb-1.5">
            <div
              v-for="account in group.accounts"
              :key="account.id"
              role="button"
              tabindex="0"
              class="flex cursor-pointer items-center gap-3.5 border-t border-default py-3.5 text-left"
              @click="openAccount(account)"
              @keydown.enter="openAccount(account)"
            >
              <span class="flex min-w-0 flex-1 flex-col gap-0.5">
                <span class="truncate text-[15px] font-semibold">{{ account.name }}</span>
                <span class="text-[12.5px] text-muted">
                  {{ accountTypeLabel(account.type) }}
                  <template v-if="account.institution"> · {{ account.institution }}</template>
                  <template v-if="account.is_emergency_fund"> · {{ t('accounts.emergencyFundBadge').toLowerCase() }}</template>
                </span>
              </span>
              <span class="flex flex-none flex-col items-end gap-0.5">
                <span class="text-[15.5px] font-bold whitespace-nowrap">{{ formatCurrency(valuationsStore.currentValue(account.id), account.currency) }}</span>
                <span class="text-[12.5px] font-bold whitespace-nowrap" :class="deltaColorClass(valuationsStore.changeOverDays(account.id, 30)?.ratio ?? null)">
                  {{ valuationsStore.changeOverDays(account.id, 30)?.ratio == null ? '—' : formatSignedCurrency(valuationsStore.changeOverDays(account.id, 30)!.delta, account.currency) }}
                </span>
              </span>
              <UIcon name="i-lucide-chevron-right" class="size-3.5 flex-none text-muted" />
            </div>
          </div>
        </div>
      </div>
    </template>

    <UEmpty
      v-else
      icon="i-lucide-wallet"
      :title="t('accounts.emptyTitle')"
      :description="t('accounts.emptyDescription')"
      class="neu-inset"
    />
  </div>
</template>
