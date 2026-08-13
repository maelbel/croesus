<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useAccountsStore } from '../stores/accounts'
import { useValuationsStore } from '../stores/valuations'
import { useCrudForm } from '../composables/useCrudForm'
import { ACCOUNT_TYPE_LABELS, type Account, type AccountCreate, type AccountType } from '../api/types'
import { formatCurrency, formatPercent, formatDate, deltaColorClass } from '../lib/format'
import EntityFormModal from '../components/EntityFormModal.vue'
import AccountDetailPanel from '../components/AccountDetailPanel.vue'

const accountsStore = useAccountsStore()
const valuationsStore = useValuationsStore()

const accountTypeOptions = Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => ({
  label,
  value: value as AccountType,
}))

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

const totalValue = computed(() =>
  accountsStore.accounts.reduce((sum, a) => sum + valuationsStore.currentValue(a.id), 0),
)

function accountChange(account: Account) {
  return valuationsStore.changeOverDays(account.id, 30)
}

function updatedLabel(account: Account) {
  const latest = valuationsStore.latest(account.id)
  return latest ? formatDate(latest.date) : '—'
}

const emergencyAccounts = computed(() => accountsStore.accounts.filter((a) => a.is_emergency_fund))
const efCurrent = computed(() =>
  emergencyAccounts.value.reduce((sum, a) => sum + valuationsStore.currentValue(a.id), 0),
)
const efTarget = computed(() =>
  emergencyAccounts.value.reduce((sum, a) => sum + Number(a.emergency_fund_target ?? 0), 0),
)
const efRatio = computed(() => (efTarget.value > 0 ? Math.min(1, efCurrent.value / efTarget.value) : 0))

function accountFormDefaults(): AccountCreate {
  return {
    name: '',
    type: 'checking',
    institution: null,
    opened_at: null,
    is_emergency_fund: false,
    emergency_fund_target: null,
    notes: null,
  }
}

const accountForm = useCrudForm<Account, AccountCreate>({
  entityLabel: 'account',
  createDefaults: accountFormDefaults,
  toFormValues: (account) => ({
    name: account.name,
    type: account.type,
    institution: account.institution,
    opened_at: account.opened_at,
    is_emergency_fund: account.is_emergency_fund,
    emergency_fund_target: account.emergency_fund_target,
    notes: account.notes,
  }),
  create: (payload) => accountsStore.create(payload),
  update: (id, payload) => accountsStore.update(id, payload),
})

async function removeAccount(account: Account) {
  if (!window.confirm(`Delete "${account.name}"? This also deletes its valuation history.`)) return
  await accountsStore.remove(account.id)
}

const detailAccount = ref<Account | null>(null)
</script>

<template>
  <div class="flex flex-col gap-7">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">Accounts</h2>
      <UButton icon="i-lucide-plus" label="Add an account" @click="accountForm.openCreate()" />
    </div>

    <EntityFormModal
      :open="accountForm.state.open"
      :title="accountForm.state.isEditing ? 'Edit account' : 'Add an account'"
      :loading="accountForm.state.submitting"
      @update:open="accountForm.state.open = $event"
      @submit="accountForm.submit()"
    >
      <UFormField label="Name">
        <UInput v-model="accountForm.state.form.name" placeholder="Savings account" />
      </UFormField>
      <UFormField label="Type">
        <USelect v-model="accountForm.state.form.type" :items="accountTypeOptions" class="w-full" />
      </UFormField>
      <UFormField label="Institution">
        <UInput v-model="accountForm.state.form.institution" placeholder="Bank name" />
      </UFormField>
      <UFormField label="Opened on">
        <UInput v-model="accountForm.state.form.opened_at" type="date" />
      </UFormField>
      <UCheckbox v-model="accountForm.state.form.is_emergency_fund" label="This is an emergency fund" />
      <UFormField v-if="accountForm.state.form.is_emergency_fund" label="Emergency fund target">
        <UInput v-model="accountForm.state.form.emergency_fund_target" type="number" placeholder="10000" />
      </UFormField>
      <UFormField label="Notes">
        <UTextarea v-model="accountForm.state.form.notes" placeholder="Anything worth remembering about this account" />
      </UFormField>
    </EntityFormModal>

    <AccountDetailPanel
      :open="detailAccount !== null"
      :account="detailAccount"
      @update:open="(value) => { if (!value) detailAccount = null }"
    />

    <div class="flex flex-wrap items-end gap-4">
      <UFormField label="Search" class="w-64">
        <UInput v-model="filters.search" placeholder="Account or institution" />
      </UFormField>
      <UFormField label="Type" class="w-48">
        <USelect
          v-model="filters.type"
          :items="[{ label: 'All types', value: null }, ...accountTypeOptions]"
          placeholder="All types"
        />
      </UFormField>
      <span class="flex-1" />
      <span class="pb-2 text-sm text-muted">
        {{ accountsStore.accounts.length }} accounts · {{ formatCurrency(totalValue) }}
      </span>
    </div>

    <template v-if="accountsStore.accounts.length > 0">
      <table class="w-full border-collapse">
        <thead>
          <tr>
            <th class="border-b-2 border-default pb-2.5 text-left text-xs font-semibold text-muted">Account</th>
            <th class="border-b-2 border-default pb-2.5 pl-3 text-right text-xs font-semibold text-muted">Value</th>
            <th class="border-b-2 border-default pb-2.5 pl-3 text-right text-xs font-semibold text-muted">30 d</th>
            <th class="border-b-2 border-default pb-2.5 pl-3 text-right text-xs font-semibold text-muted">Updated</th>
            <th class="border-b-2 border-default pb-2.5 pl-3 text-right text-xs font-semibold text-muted" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="account in filteredAccounts" :key="account.id" class="border-b border-default">
            <td class="py-3.5 pr-3">
              <div class="flex flex-col gap-0.5">
                <span class="flex items-center gap-2">
                  <span class="text-[15.5px] font-semibold whitespace-nowrap">{{ account.name }}</span>
                  <UBadge v-if="account.is_emergency_fund" variant="outline" size="sm">Emergency fund</UBadge>
                </span>
                <span class="text-sm text-muted">
                  {{ ACCOUNT_TYPE_LABELS[account.type] }}
                  <template v-if="account.institution"> · {{ account.institution }}</template>
                </span>
              </div>
            </td>
            <td class="py-3.5 pl-3 text-right font-heading text-[15.5px] font-extrabold whitespace-nowrap">
              {{ formatCurrency(valuationsStore.currentValue(account.id)) }}
            </td>
            <td class="py-3.5 pl-3 text-right text-[15px] whitespace-nowrap" :class="deltaColorClass(accountChange(account)?.ratio ?? null)">
              {{ accountChange(account)?.ratio == null ? '—' : formatPercent(accountChange(account)!.ratio!) }}
            </td>
            <td class="py-3.5 pl-3 text-right text-[15px] whitespace-nowrap text-muted">{{ updatedLabel(account) }}</td>
            <td class="py-3.5 pl-3 text-right whitespace-nowrap">
              <UButton
                variant="ghost"
                color="neutral"
                icon="i-lucide-line-chart"
                size="sm"
                title="Valuation history & holdings"
                @click="detailAccount = account"
              />
              <UButton
                variant="ghost"
                color="neutral"
                icon="i-lucide-pencil"
                size="sm"
                title="Edit account"
                @click="accountForm.openEdit(account)"
              />
              <UButton
                color="error"
                variant="ghost"
                icon="i-lucide-trash-2"
                size="sm"
                title="Delete account"
                @click="removeAccount(account)"
              />
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="emergencyAccounts.length > 0" class="neu-surface bg-default flex max-w-[520px] flex-col gap-3.5 border-2 border-default p-6">
        <span class="text-sm text-muted">Emergency fund</span>
        <div class="flex items-baseline gap-2.5">
          <span class="font-heading text-[30px] leading-none font-extrabold">{{ formatCurrency(efCurrent) }}</span>
          <span class="text-[15.5px] text-muted">of {{ formatCurrency(efTarget) }}</span>
        </div>
        <span class="stripe-track">
          <span class="stripe-fill" :style="{ width: `${efRatio * 100}%` }" />
        </span>
      </div>
    </template>

    <UEmpty
      v-else
      icon="i-lucide-wallet"
      title="No accounts yet"
      description="Accounts are where value lives. Add a checking account, a Livret A, a PEA — anything you want counted in your net worth."
      class="neu-inset"
    />
  </div>
</template>
