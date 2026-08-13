<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    value: string
    note?: string
    noteColor?: 'muted' | 'positive' | 'negative'
    valueColor?: 'default' | 'positive' | 'negative' | 'muted'
    highlighted?: boolean
  }>(),
  {
    note: undefined,
    noteColor: 'muted',
    valueColor: 'default',
    highlighted: false,
  },
)

const valueClass = {
  default: 'text-highlighted',
  positive: 'text-primary',
  negative: 'text-rust',
  muted: 'text-muted',
}

const noteClass = {
  muted: 'text-muted',
  positive: 'text-primary',
  negative: 'text-rust',
}
</script>

<template>
  <div
    class="neu-surface flex min-w-0 flex-col gap-3 px-6 py-5"
    :class="highlighted ? 'bg-elevated' : 'bg-default'"
  >
    <span class="text-xs tracking-wide text-muted">{{ label }}</span>
    <span
      class="font-heading text-[clamp(26px,3.1vw,42px)] leading-none font-extrabold tracking-tight"
      :class="valueClass[valueColor]"
    >
      {{ value }}
    </span>
    <span v-if="note" class="text-sm" :class="noteClass[noteColor]">{{ note }}</span>
  </div>
</template>
