<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'

defineProps<{
  links: { label: string; to: string; icon: string; count: number | null }[]
  netWorth: string
}>()

const route = useRoute()
const { t } = useI18n()

// `/` only matches itself — otherwise every link would show active on the
// dashboard. Every other link also matches its own sub-routes (e.g.
// /accounts/:id should still highlight "Accounts").
function isActive(to: string) {
  return to === '/' ? route.path === '/' : route.path.startsWith(to)
}
</script>

<template>
  <div
    class="app-topbar sticky top-0 z-10 flex h-[60px] flex-none items-center gap-5 border-b border-default bg-default/88 px-4 backdrop-blur-md sm:px-6"
  >
    <RouterLink to="/" class="flex flex-none items-center" :title="t('nav.tagline')">
      <svg viewBox="0 0 28 28" class="size-7">
        <rect width="28" height="28" rx="9" fill="var(--ui-primary)" />
        <path
          d="M8 19.5V13.2M14 19.5V8.5M20 19.5v-4.2"
          fill="none"
          stroke="var(--ui-bg)"
          stroke-width="2.6"
          stroke-linecap="round"
        />
      </svg>
    </RouterLink>

    <nav class="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
      <RouterLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="flex flex-none items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold whitespace-nowrap"
        :class="isActive(link.to) ? 'bg-elevated text-primary' : 'text-muted hover:text-toned'"
      >
        <UIcon :name="link.icon" class="size-4" />
        <span>{{ link.label }}</span>
      </RouterLink>
    </nav>

    <span
      class="flex flex-none items-center gap-2 rounded-full bg-accented px-3.5 py-2 text-sm font-extrabold whitespace-nowrap"
    >
      <span class="size-1.5 flex-none rounded-full bg-primary" />
      {{ netWorth }}
    </span>
  </div>
</template>
