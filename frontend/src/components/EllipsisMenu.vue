<script setup lang="ts">
// Thin wrapper around UDropdownMenu for this app's one actual use of it: a
// row/section's overflow-action menu, triggered by an ellipsis button.
// Nuxt UI ships no default `content` position for any of its teleported
// components (see app.config.ts's z-index policy for the same problem with
// stacking) — appConfig can only override CSS classes, not prop *values*
// like this, so making bottom-end the default for every usage needs an
// actual wrapper rather than an app.config.ts entry.
withDefaults(
  defineProps<{
    items: unknown[]
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  }>(),
  { size: 'sm' },
)
</script>

<template>
  <UDropdownMenu :items="items" :content="{ side: 'bottom', align: 'end' }">
    <slot>
      <UButton variant="ghost" color="neutral" icon="i-lucide-ellipsis-vertical" :size="size" />
    </slot>
  </UDropdownMenu>
</template>
