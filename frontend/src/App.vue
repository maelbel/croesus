<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { isTauri, invoke } from '@tauri-apps/api/core'
import { waitForBackend } from './api/client'
import { useAccountsStore } from './stores/accounts'
import { useLiabilitiesStore } from './stores/liabilities'
import { useEnvelopesStore } from './stores/envelopes'
import { useNetWorthStore } from './stores/networth'
import { useCurrencyStore } from './stores/currency'
import { useFxRatesStore } from './stores/fxRates'
import { useValuationsStore } from './stores/valuations'
import { useAssetsStore } from './stores/assets'
import { useConnectionStore } from './stores/connection'
import { useAuthStore } from './stores/auth'
import { usePageActionStore } from './stores/pageActions'
import { useSidebarStore } from './stores/sidebar'
import { useLocaleStore } from './stores/locale'
import { useOidcCallback } from './composables/useOidcCallback'
import { formatCurrency, formatDate, deltaColorClass } from './lib/format'
import { en as uiEn, fr as uiFr } from '@nuxt/ui/locale'
import LoginForm from './components/LoginForm.vue'
import OnboardingScreen from './components/OnboardingScreen.vue'

const route = useRoute()
const { t } = useI18n()
const accountsStore = useAccountsStore()
const liabilitiesStore = useLiabilitiesStore()
const envelopesStore = useEnvelopesStore()
const netWorthStore = useNetWorthStore()
const currencyStore = useCurrencyStore()
const fxRatesStore = useFxRatesStore()
const valuationsStore = useValuationsStore()
const assetsStore = useAssetsStore()
const connectionStore = useConnectionStore()
const authStore = useAuthStore()
const pageActionStore = usePageActionStore()
const sidebarStore = useSidebarStore()
const localeStore = useLocaleStore()
const oidcCallback = useOidcCallback()

const uAppLocale = computed(() => (localeStore.locale === 'fr' ? uiFr : uiEn))

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

// undefined (never loaded) is distinct from the token's own null (no auth/no
// token yet) so the guard below doesn't mistake "not loaded" for "loaded for
// no token" on an auth-disabled deployment.
const loadedForToken = ref<string | null | undefined>(undefined)

function loadData() {
  if (loadedForToken.value === authStore.token) return
  loadedForToken.value = authStore.token
  accountsStore.fetchAll()
  liabilitiesStore.fetchAll()
  envelopesStore.fetchAll()
  netWorthStore.fetchAll()
  fxRatesStore.fetchRates(currencyStore.referenceCurrency)
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

  try {
    await authStore.checkStatus()
  } catch {
    // A transient failure right after /health succeeded still leaves us
    // unable to tell whether auth is required — treat it the same as an
    // unreachable backend instead of silently rendering an empty dashboard.
    backendUnreachable.value = true
    return
  }
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

const links = computed(() => [
  { label: t('router.dashboard.title'), to: '/', icon: 'i-lucide-layout-dashboard', count: null },
  {
    label: t('router.accounts.title'),
    to: '/accounts',
    icon: 'i-lucide-wallet',
    count: accountsStore.accounts.length,
  },
  {
    label: t('router.liabilities.title'),
    to: '/liabilities',
    icon: 'i-lucide-landmark',
    count: liabilitiesStore.liabilities.length,
  },
  {
    label: t('router.envelopes.title'),
    to: '/envelopes',
    icon: 'i-lucide-mail',
    count: envelopesStore.envelopes.length,
  },
  { label: t('router.settings.title'), to: '/settings', icon: 'i-lucide-settings', count: null },
])

const netWorth = computed(() =>
  netWorthStore.current ? formatCurrency(netWorthStore.current.net_worth) : '—',
)
const netDelta = computed(() => netWorthStore.netWorthDelta30d)
const asOf = computed(() => t('nav.asOf', { date: formatDate(new Date().toISOString()) }))
// router.isReady() isn't awaited before mount (see main.ts), so on the very
// first paint `route.meta` can briefly be `{}` before the initial navigation
// resolves — t(undefined) throws, where the old raw-string interpolation
// just rendered blank, so guard instead of passing an empty key straight in.
const pageKicker = computed(() => (route.meta.kicker ? t(route.meta.kicker as string) : ''))
const pageTitle = computed(() => (route.meta.title ? t(route.meta.title as string) : ''))
const shortcutHint = /Mac|iPod|iPhone|iPad/.test(navigator.platform) ? '⌘B' : 'Ctrl+B'

// The sidebar's overflow-hidden aside (needed for the collapse animation)
// is a clipping ancestor of these tooltips' triggers, so Floating UI's
// collision detection under-reports available space even though the
// tooltip content itself is portaled to <body>. Pin the boundary to the
// body so it sizes/positions against the real viewport instead. (Tooltip
// content out-ranking the sticky header is handled once, centrally, in
// app.config.ts's z-index policy — not per usage here.)
const tooltipBoundary = document.body

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
  <UApp class="isolate" :locale="uAppLocale">
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
      <p class="text-muted">{{ t('nav.backendUnreachable') }}</p>
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
      <p class="text-muted">{{ t('nav.startingUp') }}</p>
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
          <div class="neu-flat flex items-end border-b-2 border-default py-6 pr-6">
            <span class="flex w-16 shrink-0 items-center justify-center">
              <UTooltip
                :text="sidebarStore.open ? t('nav.hideSidebar', { shortcut: shortcutHint }) : t('nav.showSidebar', { shortcut: shortcutHint })"
                :content="{ collisionBoundary: tooltipBoundary }"
              >
                <UButton
                  variant="ghost"
                  color="neutral"
                  size="sm"
                  :icon="sidebarStore.open ? 'i-lucide-panel-left-close' : 'i-lucide-panel-left-open'"
                  :aria-label="sidebarStore.open ? t('nav.hideSidebarLabel') : t('nav.showSidebarLabel')"
                  @click="sidebarStore.toggle()"
                />
              </UTooltip>
            </span>
            <div
              class="flex flex-1 flex-col gap-2 whitespace-nowrap transition-opacity duration-150"
              :class="sidebarStore.open ? 'opacity-100' : 'opacity-0'"
            >
              <span class="font-heading text-xl font-extrabold tracking-tight">CROESUS</span>
              <span class="text-sm text-muted">{{ t('nav.tagline') }}</span>
            </div>
          </div>

          <nav class="flex flex-col py-3">
            <UTooltip
              v-for="link in links"
              :key="link.to"
              :text="link.label"
              :disabled="sidebarStore.open"
              :content="{ collisionBoundary: tooltipBoundary }"
            >
              <RouterLink
                :to="link.to"
                class="nav-link group relative flex items-center py-2.5 pr-6 text-sm"
                active-class="nav-active font-semibold text-highlighted"
              >
                <span
                  class="nav-bar-indicator absolute inset-y-0 left-0 w-[3px]"
                  :class="route.path === link.to ? 'bg-primary' : 'bg-transparent'"
                />
                <span class="flex w-16 shrink-0 items-center justify-center">
                  <UIcon
                    :name="link.icon"
                    class="size-5"
                    :class="route.path === link.to ? '' : 'text-muted group-hover:text-toned'"
                  />
                </span>
                <span
                  class="flex flex-1 items-center gap-3 whitespace-nowrap transition-opacity duration-150"
                  :class="sidebarStore.open ? 'opacity-100' : 'opacity-0'"
                >
                  <span
                    class="flex-1 text-left"
                    :class="route.path === link.to ? '' : 'text-muted group-hover:text-toned'"
                  >
                    {{ link.label }}
                  </span>
                  <span v-if="link.count !== null" class="text-[13.5px] text-muted">
                    {{ link.count }}
                  </span>
                </span>
              </RouterLink>
            </UTooltip>
          </nav>

          <Transition name="sidebar-fade">
            <div
              v-if="sidebarStore.open"
              class="app-networth mt-auto flex flex-col gap-1.5 border-t-2 border-default px-6 py-5 whitespace-nowrap"
            >
              <span class="text-sm text-muted">{{ t('nav.netWorth') }}</span>
              <span class="font-heading text-2xl leading-none font-extrabold tracking-tight">{{ netWorth }}</span>
              <span class="text-sm" :class="deltaColorClass(netDelta)">
                {{ netDelta === null ? '—' : formatCurrency(netDelta) }} {{ t('nav.last30Days') }}
              </span>
            </div>
          </Transition>
        </div>
      </aside>

      <div class="min-w-0">
        <header class="app-header sticky top-0 z-10 border-b-2 border-default bg-default">
          <div class="mx-auto flex max-w-[1360px] flex-wrap items-end justify-between gap-4 px-4 py-6 sm:gap-6 sm:px-10">
            <div class="flex flex-col gap-1.5">
              <span class="text-sm text-muted">{{ pageKicker }}</span>
              <h1 class="text-[37px] tracking-tight">{{ pageTitle }}</h1>
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

        <main class="mx-auto max-w-[1360px] px-4 py-8 pb-16 sm:px-10">
          <RouterView />
        </main>
      </div>
    </div>
  </UApp>
</template>
