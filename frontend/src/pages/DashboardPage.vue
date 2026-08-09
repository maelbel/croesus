<script setup lang="ts">
import { onMounted } from 'vue'
import { useNetWorthStore } from '../stores/networth'

const netWorthStore = useNetWorthStore()

onMounted(() => {
  netWorthStore.fetchAll()
})

function formatEuro(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(
    value,
  )
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <h2 class="text-xl font-semibold">Dashboard</h2>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <UCard>
        <template #header> Assets </template>
        <p class="text-2xl font-semibold">
          {{ formatEuro(netWorthStore.current?.total_assets ?? 0) }}
        </p>
      </UCard>
      <UCard>
        <template #header> Liabilities </template>
        <p class="text-2xl font-semibold text-error">
          {{ formatEuro(netWorthStore.current?.total_liabilities ?? 0) }}
        </p>
      </UCard>
      <UCard>
        <template #header> Net worth </template>
        <p class="text-2xl font-semibold text-primary">
          {{ formatEuro(netWorthStore.current?.net_worth ?? 0) }}
        </p>
      </UCard>
    </div>

    <UCard>
      <template #header> Net worth over time </template>
      <p v-if="netWorthStore.history.length === 0" class="text-muted">
        No valuations recorded yet.
      </p>
      <UTable
        v-else
        :data="netWorthStore.history"
        :columns="[
          { accessorKey: 'date', header: 'Date' },
          { accessorKey: 'total_assets', header: 'Assets' },
          { accessorKey: 'total_liabilities', header: 'Liabilities' },
          { accessorKey: 'net_worth', header: 'Net worth' },
        ]"
      />
    </UCard>
  </div>
</template>
