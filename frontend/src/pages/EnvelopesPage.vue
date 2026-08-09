<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import { useEnvelopesStore } from '../stores/envelopes'

const envelopesStore = useEnvelopesStore()

const form = reactive({
  name: '',
  target_amount: '',
})

onMounted(() => {
  envelopesStore.fetchAll()
})

async function handleCreate() {
  if (!form.name) return
  await envelopesStore.create({
    name: form.name,
    target_amount: form.target_amount || null,
    current_amount: '0',
    color: null,
    icon: null,
  })
  form.name = ''
  form.target_amount = ''
}

function formatEuro(value: string | null) {
  if (value === null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(
    Number(value),
  )
}

function progress(current: string, target: string | null) {
  if (!target || Number(target) === 0) return 0
  return Math.min(100, (Number(current) / Number(target)) * 100)
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <h2 class="text-xl font-semibold">Budget envelopes</h2>

    <UCard>
      <template #header> Add an envelope </template>
      <form class="flex flex-wrap items-end gap-3" @submit.prevent="handleCreate">
        <UFormField label="Name">
          <UInput v-model="form.name" placeholder="Vacation" />
        </UFormField>
        <UFormField label="Target">
          <UInput v-model="form.target_amount" type="number" placeholder="2000" />
        </UFormField>
        <UButton type="submit" label="Add" />
      </form>
    </UCard>

    <UCard>
      <template #header> Envelope list </template>
      <p v-if="envelopesStore.envelopes.length === 0" class="text-muted">
        No envelopes yet.
      </p>
      <ul v-else class="flex flex-col gap-3">
        <li
          v-for="envelope in envelopesStore.envelopes"
          :key="envelope.id"
          class="rounded-md border border-default p-3"
        >
          <div class="flex items-center justify-between">
            <p class="font-medium">{{ envelope.name }}</p>
            <UButton
              color="error"
              variant="ghost"
              icon="i-lucide-trash-2"
              @click="envelopesStore.remove(envelope.id)"
            />
          </div>
          <p class="mb-2 text-sm text-muted">
            {{ formatEuro(envelope.current_amount) }} / {{ formatEuro(envelope.target_amount) }}
          </p>
          <UProgress :model-value="progress(envelope.current_amount, envelope.target_amount)" />
        </li>
      </ul>
    </UCard>
  </div>
</template>
