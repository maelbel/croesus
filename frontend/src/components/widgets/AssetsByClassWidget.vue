<script setup lang="ts">
import { computed, ref } from 'vue'
import type { TableColumn, TableRow } from '@nuxt/ui'
import { assetsByClassBreakdown, type BreakdownSlice } from '../../lib/widgetSources'
import { formatCurrency } from '../../lib/format'

// Smallest to largest — both the bar stack (smallest segment on top) and the table read the same
// way top-to-bottom, so there's one order to follow instead of two.
const assetsByClass = computed(() =>
  assetsByClassBreakdown()
    .map((c) => ({ ...c, flex: Math.round(c.pct * 1000) }))
    .sort((a, b) => a.value - b.value),
)

type AssetClassRow = BreakdownSlice & { flex: number }

const assetClassColumns: TableColumn<AssetClassRow>[] = [
  { accessorKey: 'fill', header: '', meta: { class: { td: 'w-3.5' } } },
  { accessorKey: 'label', header: '' },
  { accessorKey: 'value', header: '', meta: { class: { td: 'text-right whitespace-nowrap' } } },
  { accessorKey: 'pct', header: '', meta: { class: { td: 'text-right whitespace-nowrap' } } },
]

// Links a bar segment to its table row (and back) — otherwise the only thing connecting them is
// matching a color swatch by eye. Table-side highlighting goes through UTable's own onHover/meta
// hooks rather than a per-cell listener, since only the shared `<tr>` gives a whole-row background.
const hoveredLabel = ref<string | null>(null)

function handleRowHover(_event: Event, row: TableRow<AssetClassRow> | null) {
  hoveredLabel.value = row?.original.label ?? null
}

const rowMeta = { class: { tr: (row: TableRow<AssetClassRow>) => (row.original.label === hoveredLabel.value ? 'bg-elevated' : '') } }
</script>

<template>
  <div class="flex items-start gap-7">
    <div class="flex h-[340px] w-[104px] flex-none flex-col gap-1">
      <span
        v-for="c in assetsByClass"
        :key="c.label"
        class="figure-rounded min-h-1.5 transition-opacity"
        :class="hoveredLabel && hoveredLabel !== c.label ? 'opacity-40' : ''"
        :style="{ flexGrow: c.flex, background: c.fill }"
        @mouseenter="hoveredLabel = c.label"
        @mouseleave="hoveredLabel = null"
      />
    </div>
    <div class="h-[340px] min-w-0 flex-1 overflow-x-auto overflow-y-auto pr-1 [scrollbar-gutter:stable]">
      <UTable :data="assetsByClass" :columns="assetClassColumns" :ui="{ thead: 'hidden' }" :meta="rowMeta" :on-hover="handleRowHover">
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
