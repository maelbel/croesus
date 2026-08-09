<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import { useLiabilitiesStore } from '../stores/liabilities'
import { LIABILITY_TYPE_LABELS, type LiabilityType } from '../api/types'

const liabilitiesStore = useLiabilitiesStore()

const liabilityTypeOptions = Object.entries(LIABILITY_TYPE_LABELS).map(
  ([value, label]) => ({ label, value: value as LiabilityType }),
)

const form = reactive({
  name: '',
  type: 'mortgage' as LiabilityType,
  initial_amount: '',
  remaining_amount: '',
})

onMounted(() => {
  liabilitiesStore.fetchAll()
})

async function handleCreate() {
  if (!form.name || !form.remaining_amount) return
  await liabilitiesStore.create({
    name: form.name,
    type: form.type,
    initial_amount: form.initial_amount || form.remaining_amount,
    remaining_amount: form.remaining_amount,
    monthly_payment: null,
    interest_rate: null,
    start_date: null,
    end_date: null,
  })
  form.name = ''
  form.initial_amount = ''
  form.remaining_amount = ''
}

function formatEuro(value: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(
    Number(value),
  )
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <h2 class="text-xl font-semibold">Liabilities</h2>

    <UCard>
      <template #header> Add a liability </template>
      <form class="flex flex-wrap items-end gap-3" @submit.prevent="handleCreate">
        <UFormField label="Name">
          <UInput v-model="form.name" placeholder="Mortgage" />
        </UFormField>
        <UFormField label="Type">
          <USelect v-model="form.type" :items="liabilityTypeOptions" class="w-48" />
        </UFormField>
        <UFormField label="Initial amount">
          <UInput v-model="form.initial_amount" type="number" placeholder="200000" />
        </UFormField>
        <UFormField label="Remaining balance">
          <UInput v-model="form.remaining_amount" type="number" placeholder="180000" />
        </UFormField>
        <UButton type="submit" label="Add" />
      </form>
    </UCard>

    <UCard>
      <template #header> Liability list </template>
      <p v-if="liabilitiesStore.liabilities.length === 0" class="text-muted">
        No liabilities recorded.
      </p>
      <ul v-else class="flex flex-col gap-2">
        <li
          v-for="liability in liabilitiesStore.liabilities"
          :key="liability.id"
          class="flex items-center justify-between rounded-md border border-default p-3"
        >
          <div>
            <p class="font-medium">{{ liability.name }}</p>
            <p class="text-sm text-muted">
              {{ LIABILITY_TYPE_LABELS[liability.type] }} ·
              {{ formatEuro(liability.remaining_amount) }} remaining
            </p>
          </div>
          <UButton
            color="error"
            variant="ghost"
            icon="i-lucide-trash-2"
            @click="liabilitiesStore.remove(liability.id)"
          />
        </li>
      </ul>
    </UCard>
  </div>
</template>
