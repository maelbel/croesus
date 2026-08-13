<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAccountsStore } from './stores/accounts'
import { useLiabilitiesStore } from './stores/liabilities'
import { useEnvelopesStore } from './stores/envelopes'
import { useNetWorthStore } from './stores/networth'
import { useValuationsStore } from './stores/valuations'
import { useAssetsStore } from './stores/assets'
import { useThemeStore } from './stores/theme'
import { formatCurrency, formatDate, deltaColorClass } from './lib/format'

const route = useRoute()
const accountsStore = useAccountsStore()
const liabilitiesStore = useLiabilitiesStore()
const envelopesStore = useEnvelopesStore()
const netWorthStore = useNetWorthStore()
const valuationsStore = useValuationsStore()
const assetsStore = useAssetsStore()
const themeStore = useThemeStore()

onMounted(() => {
  accountsStore.fetchAll()
  liabilitiesStore.fetchAll()
  envelopesStore.fetchAll()
  netWorthStore.fetchAll()
  valuationsStore.fetchAll()
  assetsStore.fetchAll()
})

const links = [
  { label: 'Dashboard', to: '/', count: null },
  { label: 'Accounts', to: '/accounts', count: computed(() => accountsStore.accounts.length) },
  { label: 'Liabilities', to: '/liabilities', count: computed(() => liabilitiesStore.liabilities.length) },
  { label: 'Envelopes', to: '/envelopes', count: computed(() => envelopesStore.envelopes.length) },
  { label: 'Settings', to: '/settings', count: null },
]

const netWorth = computed(() =>
  netWorthStore.current ? formatCurrency(netWorthStore.current.net_worth) : '—',
)
const netDelta = computed(() => netWorthStore.netWorthDelta30d)
const asOf = computed(() => `As of ${formatDate(new Date().toISOString())}`)
</script>

<template>
  <UApp class="isolate">
    <div class="grid min-h-screen grid-cols-[248px_minmax(0,1fr)] bg-default text-default">
      <aside class="app-sidebar sticky top-0 flex h-screen flex-col border-r-2 border-default">
        <div class="neu-flat flex flex-col gap-2 border-b-2 border-default px-6 py-6">
          <span class="font-heading text-xl font-extrabold tracking-tight">CROESUS</span>
          <span class="text-sm text-muted">Every euro, accounted for.</span>
        </div>

        <nav class="flex flex-col py-3">
          <RouterLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            class="nav-link group flex items-center gap-3 py-2.5 pr-6 text-sm"
            active-class="nav-active font-semibold text-highlighted"
          >
            <span
              class="nav-bar-indicator block w-[3px] self-stretch"
              :class="route.path === link.to ? 'bg-primary' : 'bg-transparent'"
            />
            <span class="flex-1 text-left" :class="route.path === link.to ? '' : 'text-muted group-hover:text-toned'">
              {{ link.label }}
            </span>
            <span v-if="link.count !== null" class="text-[13.5px] text-muted">{{ link.count }}</span>
          </RouterLink>
        </nav>

        <div class="app-networth mt-auto flex flex-col gap-1.5 border-t-2 border-default px-6 py-5">
          <span class="text-sm text-muted">Net worth</span>
          <span class="font-heading text-2xl leading-none font-extrabold tracking-tight">{{ netWorth }}</span>
          <span class="text-sm" :class="deltaColorClass(netDelta)">
            {{ netDelta === null ? '—' : formatCurrency(netDelta) }} · 30 days
          </span>
        </div>
      </aside>

      <div class="min-w-0">
        <header class="app-header flex items-end justify-between gap-6 border-b-2 border-default px-10 py-6">
          <div class="flex flex-col gap-1.5">
            <span class="text-sm text-muted">{{ route.meta.kicker }}</span>
            <h1 class="text-[37px] tracking-tight">{{ route.meta.title }}</h1>
          </div>
          <div class="flex items-center gap-2.5">
            <span class="text-sm text-muted">{{ asOf }}</span>
            <UButton
              variant="outline"
              color="neutral"
              size="sm"
              :label="themeStore.mode === 'dark' ? 'Light' : 'Dark'"
              @click="themeStore.toggle()"
            />
          </div>
        </header>

        <main class="max-w-[1360px] px-10 py-8 pb-16">
          <RouterView />
        </main>
      </div>
    </div>
  </UApp>
</template>
