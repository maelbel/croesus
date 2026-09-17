<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TableColumn, TableRow } from '@nuxt/ui'
import { useNetWorthStore } from '../../stores/networth'
import { type NetWorthHistoryPoint } from '../../api/types'
import { formatCurrency, formatSignedCurrency, formatDate, deltaColorClass } from '../../lib/format'

const { t } = useI18n()
const netWorthStore = useNetWorthStore()

const recentHistory = computed(() =>
  [...netWorthStore.history]
    .reverse()
    .slice(0, 8)
    .map((point, index, arr) => {
      const previous = arr[index + 1]
      return {
        ...point,
        change: previous ? point.net_worth - previous.net_worth : null,
      }
    }),
)

type HistoryRow = NetWorthHistoryPoint & { change: number | null }

const historyColumns = computed<TableColumn<HistoryRow>[]>(() => [
  { accessorKey: 'date', header: t('dashboard.columnDate') },
  { accessorKey: 'total_assets', header: t('dashboard.columnAssets'), meta: { class: { th: 'text-right', td: 'text-right whitespace-nowrap' } } },
  { accessorKey: 'total_liabilities', header: t('dashboard.columnLiabilities'), meta: { class: { th: 'text-right', td: 'text-right whitespace-nowrap' } } },
  { accessorKey: 'net_worth', header: t('dashboard.columnNetWorth'), meta: { class: { th: 'text-right', td: 'text-right whitespace-nowrap' } } },
  { accessorKey: 'change', header: t('dashboard.columnChange'), meta: { class: { th: 'text-right', td: 'text-right whitespace-nowrap' } } },
])
</script>

<template>
  <UTable :data="recentHistory" :columns="historyColumns">
    <template #date-cell="{ row }: { row: TableRow<HistoryRow> }">
      <span class="text-[15.5px] whitespace-nowrap">{{ formatDate(row.original.date) }}</span>
    </template>
    <template #total_assets-cell="{ row }: { row: TableRow<HistoryRow> }">
      <span class="text-[15.5px] whitespace-nowrap">{{ formatCurrency(row.original.total_assets) }}</span>
    </template>
    <template #total_liabilities-cell="{ row }: { row: TableRow<HistoryRow> }">
      <span class="text-[15.5px] whitespace-nowrap text-rust">{{ formatCurrency(row.original.total_liabilities) }}</span>
    </template>
    <template #net_worth-cell="{ row }: { row: TableRow<HistoryRow> }">
      <span class="font-heading text-[15.5px] font-extrabold whitespace-nowrap">{{ formatCurrency(row.original.net_worth) }}</span>
    </template>
    <template #change-cell="{ row }: { row: TableRow<HistoryRow> }">
      <span class="text-[15.5px] whitespace-nowrap" :class="deltaColorClass(row.original.change)">
        {{ row.original.change === null ? '—' : formatSignedCurrency(row.original.change) }}
      </span>
    </template>
  </UTable>
</template>
