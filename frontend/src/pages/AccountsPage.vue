<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import { useAccountsStore } from '../stores/accounts'
import { ACCOUNT_TYPE_LABELS, type AccountType } from '../api/types'

const accountsStore = useAccountsStore()

const accountTypeOptions = Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => ({
  label,
  value: value as AccountType,
}))

const form = reactive({
  name: '',
  type: 'checking' as AccountType,
  institution: '',
})

onMounted(() => {
  accountsStore.fetchAll()
})

async function handleCreate() {
  if (!form.name) return
  await accountsStore.create({
    name: form.name,
    type: form.type,
    institution: form.institution || null,
    opened_at: null,
    is_emergency_fund: false,
    emergency_fund_target: null,
    notes: null,
  })
  form.name = ''
  form.institution = ''
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <h2 class="text-xl font-semibold">Accounts</h2>

    <UCard>
      <template #header> Add an account </template>
      <form class="flex flex-wrap items-end gap-3" @submit.prevent="handleCreate">
        <UFormField label="Name">
          <UInput v-model="form.name" placeholder="Savings account" />
        </UFormField>
        <UFormField label="Type">
          <USelect v-model="form.type" :items="accountTypeOptions" class="w-48" />
        </UFormField>
        <UFormField label="Institution">
          <UInput v-model="form.institution" placeholder="Bank name" />
        </UFormField>
        <UButton type="submit" label="Add" />
      </form>
    </UCard>

    <UCard>
      <template #header> Account list </template>
      <p v-if="accountsStore.accounts.length === 0" class="text-muted">
        No accounts yet.
      </p>
      <ul v-else class="flex flex-col gap-2">
        <li
          v-for="account in accountsStore.accounts"
          :key="account.id"
          class="flex items-center justify-between rounded-md border border-default p-3"
        >
          <div>
            <p class="font-medium">{{ account.name }}</p>
            <p class="text-sm text-muted">
              {{ ACCOUNT_TYPE_LABELS[account.type] }}
              <span v-if="account.institution"> · {{ account.institution }}</span>
            </p>
          </div>
          <UButton
            color="error"
            variant="ghost"
            icon="i-lucide-trash-2"
            @click="accountsStore.remove(account.id)"
          />
        </li>
      </ul>
    </UCard>
  </div>
</template>
