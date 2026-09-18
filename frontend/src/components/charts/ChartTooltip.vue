<script setup lang="ts">
// `align` lets the caller flip the anchor near a chart's edges — centering on the hover point
// (the default) means half the box's width extends past whichever point is hovered, which
// overflows the widget card's own bounds (clipped by its overflow-hidden) once that point is
// close enough to the left/right edge, i.e. always true for the very first/last point.
withDefaults(defineProps<{ x: number; y: number; value: string; label: string; align?: 'left' | 'center' | 'right' }>(), { align: 'center' })
</script>

<template>
  <div
    class="neu-surface pointer-events-none absolute z-10 -translate-y-[calc(100%+10px)] rounded-md bg-default px-2.5 py-1.5 text-xs whitespace-nowrap"
    :class="{ '-translate-x-1/2': align === 'center', '-translate-x-full': align === 'right' }"
    :style="{ left: `${x}%`, top: `${y}%` }"
  >
    <div class="font-semibold">{{ value }}</div>
    <div class="text-muted">{{ label }}</div>
  </div>
</template>
