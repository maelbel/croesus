<script setup lang="ts">
const links = [
  { label: 'Dashboard', to: '/' },
  { label: 'Accounts', to: '/accounts' },
  { label: 'Liabilities', to: '/liabilities' },
  { label: 'Envelopes', to: '/envelopes' },
]
</script>

<template>
  <UApp class="isolate">
    <div class="flex min-h-screen">
      <aside class="w-56 shrink-0 border-r border-default p-4">
        <h1 class="mb-6 text-lg font-semibold">Croesus</h1>
        <nav class="flex flex-col gap-1">
          <RouterLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            class="rounded-md px-3 py-2 text-sm hover:bg-elevated"
            active-class="bg-elevated font-medium"
          >
            {{ link.label }}
          </RouterLink>
        </nav>
      </aside>
      <main class="flex-1 p-6">
        <RouterView />
      </main>
    </div>
  </UApp>
</template>
