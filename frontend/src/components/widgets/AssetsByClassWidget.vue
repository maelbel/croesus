<script setup lang="ts">
import { computed } from 'vue'
import type { TableColumn, TableRow } from '@nuxt/ui'
import { assetsByClassBreakdown, type BreakdownSlice } from '../../lib/widgetSources'
import { formatCurrency } from '../../lib/format'

const assetsByClass = computed(() =>
  assetsByClassBreakdown().map((c) => ({ ...c, flex: Math.round(c.pct * 1000) })),
)

const cairnClasses = computed(() => [...assetsByClass.value].reverse())

type AssetClassRow = BreakdownSlice & { flex: number }

const assetClassColumns: TableColumn<AssetClassRow>[] = [
  { accessorKey: 'fill', header: '', meta: { class: { td: 'w-3.5' } } },
  { accessorKey: 'label', header: '' },
  { accessorKey: 'value', header: '', meta: { class: { td: 'text-right whitespace-nowrap' } } },
  { accessorKey: 'pct', header: '', meta: { class: { td: 'text-right whitespace-nowrap' } } },
]
</script>

<template>
  <div class="flex items-start gap-7">
    <div class="flex h-[340px] w-[104px] flex-none flex-col gap-1">
      <span
        v-for="c in cairnClasses"
        :key="c.label"
        class="figure-rounded min-h-1.5"
        :style="{ flexGrow: c.flex, background: c.fill }"
      />
    </div>
    <div class="min-w-0 flex-1">
      <UTable :data="assetsByClass" :columns="assetClassColumns" :ui="{ thead: 'hidden' }">
        <template #fill-cell="{ row }: { row: TableRow<AssetClassRow> }">
          <span class="block h-3 w-3" :style="{ background: row.original.fill }" />
        </template>
        <template #label-cell="{ row }: { row: TableRow<AssetClassRow> }">
          <span class="text-[15px]">{{ row.original.label }}</span>
        </template>
        <template #value-cell="{ row }: { row: TableRow<AssetClassRow> }">
          <span class="font-heading text-[15px] font-extrabold">{{ formatCurrency(row.original.value) }}</span>
        </template>
        <template #pct-cell="{ row }: { row: TableRow<AssetClassRow> }">
          <span class="text-sm text-muted">{{ (row.original.pct * 100).toFixed(1) }}%</span>
        </template>
      </UTable>
    </div>
  </div>
</template>
