<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { isTauri, invoke } from '@tauri-apps/api/core'
import { waitForBackend } from './api/client'
import { useAccountsStore } from './stores/accounts'
import { useLiabilitiesStore } from './stores/liabilities'
import { useEnvelopesStore } from './stores/envelopes'
import { useNetWorthStore } from './stores/networth'
import { useValuationsStore } from './stores/valuations'
import { useAssetsStore } from './stores/assets'
import { useConnectionStore } from './stores/connection'
import { useAuthStore } from './stores/auth'
import { usePageActionStore } from './stores/pageActions'
import { useSidebarStore } from './stores/sidebar'
import { useOidcCallback } from './composables/useOidcCallback'
import { formatCurrency, formatDate, deltaColorClass } from './lib/format'
import LoginForm from './components/LoginForm.vue'
import OnboardingScreen from './components/OnboardingScreen.vue'

const route = useRoute()
const accountsStore = useAccountsStore()
const liabilitiesStore = useLiabilitiesStore()
const envelopesStore = useEnvelopesStore()
const netWorthStore = useNetWorthStore()
const valuationsStore = useValuationsStore()
const assetsStore = useAssetsStore()
const connectionStore = useConnectionStore()
const authStore = useAuthStore()
const pageActionStore = usePageActionStore()
const sidebarStore = useSidebarStore()
const oidcCallback = useOidcCallback()

// In desktop mode the backend starts as a sidecar process and can take a
// couple of seconds to come up — wait for it before firing the first
// requests, instead of showing a failed fetch on a slow cold start.
const backendReady = ref(false)
const backendUnreachable = ref(false)
// Populated from the sidecar's own stdout/stderr when it doesn't come up —
// there's no console visible in a packaged app otherwise, so this is the
// only way to see *why* short of restarting with a terminal attached.
const sidecarLog = ref<string[]>([])

// First launch of the desktop shell: ask local-vs-remote before showing
// anything else. Picking remote saves + relaunches (see OnboardingScreen);
// picking local just needs to fall through to the usual boot sequence below.
const showOnboarding = ref(false)

const loadedForToken = ref<string | null>(null)

function loadData() {
  if (loadedForToken.value === authStore.token) return
  loadedForToken.value = authStore.token
  accountsStore.fetchAll()
  liabilitiesStore.fetchAll()
  envelopesStore.fetchAll()
  netWorthStore.fetchAll()
  valuationsStore.fetchAll()
  assetsStore.fetchAll()
}

async function bootAfterConnectionDecided() {
  if (!(await waitForBackend())) {
    backendUnreachable.value = true
    if (isTauri() && connectionStore.mode === 'local') {
      sidecarLog.value = await invoke<string[]>('get_sidecar_log')
    }
    return
  }
  backendReady.value = true

  await authStore.checkStatus()
  if (!authStore.authEnabled || authStore.token) loadData()
}

function onOnboardingContinueLocal() {
  showOnboarding.value = false
  bootAfterConnectionDecided()
}

onMounted(async () => {
  oidcCallback.consume()
  await connectionStore.load()

  if (isTauri() && !connectionStore.configured) {
    showOnboarding.value = true
    return
  }

  await bootAfterConnectionDecided()
})

// Covers both the initial "already logged in" case and logging in fresh —
// and doubles as the recovery path if a 401 mid-session clears the token
// and the user logs back in, since showLogin reacts to authStore.token too.
watch(
  () => authStore.token,
  (token) => {
    if (token && backendReady.value) loadData()
  },
)

const showLogin = computed(() => backendReady.value && authStore.authEnabled && !authStore.token)

const links = [
  { label: 'Dashboard', to: '/', icon: 'i-lucide-layout-dashboard', count: null },
  { label: 'Accounts', to: '/accounts', icon: 'i-lucide-wallet', count: computed(() => accountsStore.accounts.length) },
  { label: 'Liabilities', to: '/liabilities', icon: 'i-lucide-landmark', count: computed(() => liabilitiesStore.liabilities.length) },
  { label: 'Envelopes', to: '/envelopes', icon: 'i-lucide-mail', count: computed(() => envelopesStore.envelopes.length) },
  { label: 'Settings', to: '/settings', icon: 'i-lucide-settings', count: null },
]

const netWorth = computed(() =>
  netWorthStore.current ? formatCurrency(netWorthStore.current.net_worth) : '—',
)
const netDelta = computed(() => netWorthStore.netWorthDelta30d)
const asOf = computed(() => `As of ${formatDate(new Date().toISOString())}`)

function onSidebarShortcut(event: KeyboardEvent) {
  if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'b') return
  const target = event.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
  event.preventDefault()
  sidebarStore.toggle()
}

onMounted(() => window.addEventListener('keydown', onSidebarShortcut))
onUnmounted(() => window.removeEventListener('keydown', onSidebarShortcut))
</script>

<template>
  <UApp class="isolate">
    <div
      v-if="showOnboarding"
      class="flex min-h-screen flex-col items-center justify-center bg-default text-default"
    >
      <OnboardingScreen @continue-local="onOnboardingContinueLocal" />
    </div>
    <div
      v-else-if="backendUnreachable"
      class="flex min-h-screen flex-col items-center justify-center gap-3 bg-default text-default"
    >
      <span class="font-heading text-xl font-extrabold tracking-tight">CROESUS</span>
      <p class="text-muted">Couldn't reach the backend. Please restart the app.</p>
      <pre
        v-if="sidecarLog.length"
        class="neu-inset max-h-64 w-full max-w-2xl overflow-auto border border-default p-3 text-left text-xs text-muted"
      >{{ sidecarLog.join('\n') }}</pre>
    </div>
    <div
      v-else-if="!backendReady"
      class="flex min-h-screen flex-col items-center justify-center gap-2 bg-default text-default"
    >
      <span class="font-heading text-xl font-extrabold tracking-tight">CROESUS</span>
      <p class="text-muted">Starting up…</p>
    </div>
    <div
      v-else-if="showLogin"
      class="flex min-h-screen flex-col items-center justify-center bg-default text-default"
    >
      <LoginForm />
    </div>
    <div
      v-else
      class="grid min-h-screen bg-default text-default transition-[grid-template-columns] duration-200 ease-in-out"
      :style="{ gridTemplateColumns: (sidebarStore.open ? '248px' : '64px') + ' minmax(0,1fr)' }"
    >
      <aside class="app-sidebar sticky top-0 h-screen overflow-hidden border-r-2 border-default">
        <div class="flex h-full w-[248px] flex-col">
          <div class="neu-flat flex items-center gap-3 border-b-2 border-default py-6 pr-6 pl-5">
            <UButton
              variant="ghost"
              color="neutral"
              size="sm"
              class="shrink-0"
              :icon="sidebarStore.open ? 'i-lucide-panel-left-close' : 'i-lucide-panel-left-open'"
              :aria-label="sidebarStore.open ? 'Hide sidebar' : 'Show sidebar'"
              :title="sidebarStore.open ? 'Hide sidebar (⌘B)' : 'Show sidebar (⌘B)'"
              @click="sidebarStore.toggle()"
            />
            <div class="flex flex-col gap-2 whitespace-nowrap">
              <span class="font-heading text-xl font-extrabold tracking-tight">CROESUS</span>
              <span class="text-sm text-muted">Every euro, accounted for.</span>
            </div>
          </div>

          <nav class="flex flex-col py-3">
            <RouterLink
              v-for="link in links"
              :key="link.to"
              :to="link.to"
              :title="link.label"
              class="nav-link group flex items-center gap-3 py-2.5 pr-6 text-sm"
              active-class="nav-active font-semibold text-highlighted"
            >
              <span
                class="nav-bar-indicator block w-[3px] self-stretch"
                :class="route.path === link.to ? 'bg-primary' : 'bg-transparent'"
              />
              <UIcon
                :name="link.icon"
                class="size-5 shrink-0"
                :class="route.path === link.to ? '' : 'text-muted group-hover:text-toned'"
              />
              <span
                class="flex-1 text-left whitespace-nowrap"
                :class="route.path === link.to ? '' : 'text-muted group-hover:text-toned'"
              >
                {{ link.label }}
              </span>
              <span v-if="link.count !== null" class="text-[13.5px] text-muted">{{ link.count }}</span>
            </RouterLink>
          </nav>

          <Transition name="sidebar-fade">
            <div
              v-if="sidebarStore.open"
              class="app-networth mt-auto flex flex-col gap-1.5 border-t-2 border-default px-6 py-5 whitespace-nowrap"
            >
              <span class="text-sm text-muted">Net worth</span>
              <span class="font-heading text-2xl leading-none font-extrabold tracking-tight">{{ netWorth }}</span>
              <span class="text-sm" :class="deltaColorClass(netDelta)">
                {{ netDelta === null ? '—' : formatCurrency(netDelta) }} · 30 days
              </span>
            </div>
          </Transition>
        </div>
      </aside>

      <div class="min-w-0">
        <header class="app-header sticky top-0 z-10 border-b-2 border-default bg-default">
          <div class="mx-auto flex max-w-[1360px] items-end justify-between gap-6 px-10 py-6">
            <div class="flex flex-col gap-1.5">
              <span class="text-sm text-muted">{{ route.meta.kicker }}</span>
              <h1 class="text-[37px] tracking-tight">{{ route.meta.title }}</h1>
            </div>
            <div class="flex items-center gap-2.5">
              <span class="text-sm text-muted">{{ asOf }}</span>
              <UButton
                v-if="pageActionStore.label"
                color="primary"
                size="sm"
                :label="pageActionStore.label"
                @click="pageActionStore.action?.()"
              />
            </div>
          </div>
        </header>

        <main class="mx-auto max-w-[1360px] px-10 py-8 pb-16">
          <RouterView />
        </main>
      </div>
    </div>
  </UApp>
</template>
