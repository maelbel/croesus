<script setup lang="ts">
import { computed } from 'vue'
import { statTileData } from '../../lib/widgetSources'
import { formatCurrency, formatSignedCurrency, deltaColorClass } from '../../lib/format'

const props = defineProps<{ source?: string }>()

const data = computed(() => (props.source ? statTileData(props.source) : null))
</script>

<template>
  <div v-if="data" class="flex h-full flex-col justify-center gap-1 p-4">
    <span class="truncate text-xs tracking-wide text-muted uppercase">{{ data.label }}</span>
    <span class="font-heading text-[22px] leading-none font-extrabold tracking-tight">
      {{ formatCurrency(data.value, data.currency) }}
    </span>
    <span v-if="data.deltaValue !== null" class="text-xs font-semibold" :class="deltaColorClass(data.deltaValue)">
      {{ formatSignedCurrency(data.deltaValue, data.currency) }}
    </span>
    <span v-else-if="data.note" class="truncate text-xs text-muted">{{ data.note }}</span>
  </div>
</template>
