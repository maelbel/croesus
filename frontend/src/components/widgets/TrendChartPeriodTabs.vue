<script setup lang="ts">
import { PERIODS, useTrendPeriod } from '../../lib/trendPeriod'

const props = defineProps<{ widgetId: string }>()
const period = useTrendPeriod(props.widgetId)
</script>

<template>
  <div class="flex flex-none items-center gap-1 rounded-full bg-elevated p-0.5">
    <button
      v-for="p in PERIODS"
      :key="p"
      type="button"
      class="cursor-pointer rounded-full px-2 py-1 text-[11.5px] font-semibold"
      :class="p === period ? 'bg-default text-default shadow-sm' : 'text-muted'"
      @click="period = p"
    >
      {{ p }}
    </button>
  </div>
</template>
