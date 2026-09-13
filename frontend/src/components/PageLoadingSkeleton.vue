<script setup lang="ts">
// Shown while a page's data is still being fetched for the first time —
// stores track `loading`, but nothing rendered it until now, so a slow
// connection or a large portfolio just showed an empty page (or, worse,
// DashboardPage's onboarding state) until data popped in.
import StatCardRow from './StatCardRow.vue'

withDefaults(defineProps<{ rows?: number }>(), { rows: 4 })
</script>

<template>
  <div class="flex flex-col gap-7">
    <StatCardRow>
      <USkeleton v-for="i in 3" :key="i" class="h-24 w-full" />
    </StatCardRow>
    <div class="flex flex-col gap-2">
      <USkeleton v-for="i in rows" :key="i" class="h-12 w-full" />
    </div>
  </div>
</template>
