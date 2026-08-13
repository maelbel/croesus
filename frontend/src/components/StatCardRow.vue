<script setup lang="ts">
import { useThemeStore } from '../stores/theme'

const themeStore = useThemeStore()
</script>

<template>
  <div
    :class="
      themeStore.skin === 'neumorphic'
        ? 'grid grid-cols-3 gap-5'
        : 'grid grid-cols-3 divide-x-2 divide-default border-2 border-default'
    "
  >
    <slot />
  </div>
</template>
