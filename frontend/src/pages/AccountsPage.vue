<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TableColumn, TableRow } from '@nuxt/ui'
import { useAccountsStore } from '../stores/accounts'
import { useCurrencyStore } from '../stores/currency'
import { useFxRatesStore } from '../stores/fxRates'
import { useValuationsStore, type ValuationChange } from '../stores/valuations'
import { useCrudForm } from '../composables/useCrudForm'
import { useDeleteAction } from '../composables/useDeleteAction'
import { usePageAction } from '../composables/usePageAction'
import {
  ACCOUNT_TYPES,
  accountTypeLabel,
  CURRENCIES,
  type Account,
  type AccountCreate,
  type AccountType,
} from '../api/types'
import { formatCurrency, formatPercent, formatDate, formatSignedCurrency, deltaColorClass } from '../lib/format'
import EntityFormModal from '../components/EntityFormModal.vue'
import AccountDetailPanel from '../components/AccountDetailPanel.vue'
import EllipsisMenu from '../components/EllipsisMenu.vue'
import PageLoadingSkeleton from '../components/PageLoadingSkeleton.vue'
import StatCard from '../components/StatCard.vue'
import StatCardRow from '../components/StatCardRow.vue'

const { t } = useI18n()
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

const filters = reactive({
  search: '',
  type: null as AccountType | null,
})

const filteredAccounts = computed(() => {
  const search = filters.search.trim().toLowerCase()
  return accountsStore.accounts.filter((account) => {
    if (filters.type && account.type !== filters.type) return false
    if (!search) return true
    return (
      account.name.toLowerCase().includes(search) ||
      (account.institution ?? '').toLowerCase().includes(search)
    )
  })
})

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

const filteredAccountRows = computed(() =>
  filteredAccounts.value
    .map((account) => ({
      account,
      change: valuationsStore.changeOverDays(account.id, 30),
    }))
    .sort((a, b) => a.account.name.localeCompare(b.account.name)),
)

function updatedLabel(account: Account) {
  const latest = valuationsStore.latest(account.id)
  return latest ? formatDate(latest.date) : '—'
}

const emergencyAccounts = computed(() => accountsStore.accounts.filter((a) => a.is_emergency_fund))
const efCurrent = computed(() =>
  emergencyAccounts.value.reduce(
    (sum, a) => sum + fxRatesStore.convert(valuationsStore.currentValue(a.id), a.currency),
    0,
  ),
)
const efTarget = computed(() =>
  emergencyAccounts.value.reduce(
    (sum, a) => sum + fxRatesStore.convert(Number(a.emergency_fund_target ?? 0), a.currency),
    0,
  ),
)
const efRatio = computed(() => (efTarget.value > 0 ? Math.min(1, efCurrent.value / efTarget.value) : 0))

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

const deleteAccount = useDeleteAction('account')

async function removeAccount(account: Account) {
  await deleteAccount(
    t('accounts.deleteConfirm', { name: account.name }),
    () => accountsStore.remove(account.id),
  )
}

function accountMenuItems(account: Account) {
  return [
    { label: t('common.edit'), icon: 'i-lucide-pencil', onSelect: () => accountForm.openEdit(account) },
    { label: t('common.delete'), icon: 'i-lucide-trash-2', color: 'rust' as const, onSelect: () => removeAccount(account) },
  ]
}

// Store the id, not the account object — createCrudStore's update() replaces
// the array element with a new object, so holding the object itself would go
// stale (still showing pre-edit values) if this account is edited while its
// detail panel is open.
const detailAccountId = ref<number | null>(null)
const detailAccount = computed(
  () => accountsStore.accounts.find((account) => account.id === detailAccountId.value) ?? null,
)

type AccountRow = { account: Account; change: ValuationChange | null }

const accountColumns = computed<TableColumn<AccountRow>[]>(() => [
  { id: 'name', header: t('accounts.columnAccount') },
  { id: 'value', header: t('accounts.columnValue'), meta: { class: { th: 'text-right', td: 'text-right whitespace-nowrap' } } },
  { id: 'change', header: t('accounts.column30d'), meta: { class: { th: 'text-right', td: 'text-right whitespace-nowrap' } } },
  { id: 'updated', header: t('accounts.columnUpdated'), meta: { class: { th: 'text-right', td: 'text-right whitespace-nowrap' } } },
  { id: 'actions', header: '', meta: { class: { td: 'text-right whitespace-nowrap' } } },
])
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
      <UFormField :label="t('accounts.fieldName')">
        <UInput v-model="accountForm.state.form.name" :placeholder="t('accounts.fieldNamePlaceholder')" />
      </UFormField>
      <UFormField :label="t('accounts.fieldType')">
        <USelect v-model="accountForm.state.form.type" :items="accountTypeOptions" class="w-full" />
      </UFormField>
      <UFormField :label="t('accounts.fieldCurrency')">
        <USelect v-model="accountForm.state.form.currency" :items="currencyOptions" class="w-full" />
      </UFormField>
      <UFormField :label="t('accounts.fieldInstitution')">
        <UInput v-model="accountForm.state.form.institution" :placeholder="t('accounts.fieldInstitutionPlaceholder')" />
      </UFormField>
      <UFormField :label="t('accounts.fieldOpenedOn')">
        <UInput v-model="accountForm.state.form.opened_at" type="date" />
      </UFormField>
      <UCheckbox v-model="accountForm.state.form.is_emergency_fund" :label="t('accounts.emergencyFundCheckbox')" />
      <UFormField v-if="accountForm.state.form.is_emergency_fund" :label="t('accounts.fieldEmergencyTarget')">
        <UInput v-model="accountForm.state.form.emergency_fund_target" type="number" :placeholder="t('accounts.fieldEmergencyTargetPlaceholder')" />
      </UFormField>
      <UFormField :label="t('accounts.fieldNotes')">
        <UTextarea v-model="accountForm.state.form.notes" :placeholder="t('accounts.fieldNotesPlaceholder')" />
      </UFormField>
    </EntityFormModal>

    <AccountDetailPanel
      :open="detailAccount !== null"
      :account="detailAccount"
      @update:open="(value) => { if (!value) detailAccountId = null }"
    />

    <PageLoadingSkeleton v-if="initialLoading" />

    <template v-else-if="accountsStore.accounts.length > 0">
      <StatCardRow>
        <StatCard
          :label="t('accounts.totalValue')"
          :value="formatCurrency(totalValue)"
          :note="t('accounts.totalValueNote', accountsStore.accounts.length)"
        />
        <StatCard
          :label="t('accounts.change30d')"
          :value="totalChange30d?.ratio == null ? '—' : formatPercent(totalChange30d.ratio)"
          :value-color="totalChange30d?.delta == null ? 'default' : totalChange30d.delta >= 0 ? 'positive' : 'negative'"
          :note="totalChange30d ? formatSignedCurrency(totalChange30d.delta) : undefined"
          :note-color="totalChange30d?.delta == null ? 'muted' : totalChange30d.delta >= 0 ? 'positive' : 'negative'"
        />
        <StatCard
          :label="t('accounts.emergencyFund')"
          :value="emergencyAccounts.length > 0 ? formatCurrency(efCurrent) : '—'"
          :note="emergencyAccounts.length > 0 ? t('accounts.emergencyFundNote', { pct: Math.round(efRatio * 100), target: formatCurrency(efTarget) }) : t('accounts.emergencyFundNoneSetUp')"
        />
      </StatCardRow>

      <div class="flex flex-wrap items-end gap-4">
        <UFormField :label="t('accounts.searchLabel')" class="w-64">
          <UInput v-model="filters.search" :placeholder="t('accounts.searchPlaceholder')" />
        </UFormField>
        <UFormField :label="t('accounts.fieldType')" class="w-48">
          <USelect
            v-model="filters.type"
            :items="[{ label: t('common.allTypes'), value: null }, ...accountTypeOptions]"
            :placeholder="t('accounts.typeFilterPlaceholder')"
          />
        </UFormField>
      </div>

      <UTable
        :data="filteredAccountRows"
        :columns="accountColumns"
        @select="(_e: Event, row: TableRow<AccountRow>) => (detailAccountId = row.original.account.id)"
      >
        <template #name-cell="{ row }: { row: TableRow<AccountRow> }">
          <div class="flex flex-col gap-0.5">
            <span class="flex items-center gap-2">
              <span class="text-[15.5px] font-semibold whitespace-nowrap">{{ row.original.account.name }}</span>
              <UBadge v-if="row.original.account.is_emergency_fund" variant="outline" size="sm">{{ t('accounts.emergencyFundBadge') }}</UBadge>
            </span>
            <span class="text-sm text-muted">
              {{ accountTypeLabel(row.original.account.type) }}
              <template v-if="row.original.account.institution"> · {{ row.original.account.institution }}</template>
            </span>
          </div>
        </template>
        <template #value-cell="{ row }: { row: TableRow<AccountRow> }">
          <span class="font-heading text-[15.5px] font-extrabold whitespace-nowrap">
            {{ formatCurrency(valuationsStore.currentValue(row.original.account.id), row.original.account.currency) }}
          </span>
        </template>
        <template #change-cell="{ row }: { row: TableRow<AccountRow> }">
          <span class="whitespace-nowrap" :class="deltaColorClass(row.original.change?.ratio ?? null)">
            {{ row.original.change?.ratio == null ? '—' : formatPercent(row.original.change.ratio) }}
          </span>
        </template>
        <template #updated-cell="{ row }: { row: TableRow<AccountRow> }">
          <span class="whitespace-nowrap text-muted">{{ updatedLabel(row.original.account) }}</span>
        </template>
        <template #actions-cell="{ row }: { row: TableRow<AccountRow> }">
          <EllipsisMenu :items="accountMenuItems(row.original.account)" />
        </template>
      </UTable>
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
