<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
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
import { usePageTitleStore } from './stores/pageTitle'
import { useLocaleStore } from './stores/locale'
import { useOidcCallback } from './composables/useOidcCallback'
import { formatCurrency, formatDate } from './lib/format'
import { en as uiEn, fr as uiFr } from '@nuxt/ui/locale'
import LoginForm from './components/LoginForm.vue'
import OnboardingScreen from './components/OnboardingScreen.vue'
import AppTopBar from './components/AppTopBar.vue'

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
const pageTitleStore = usePageTitleStore()
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
const asOf = computed(() => t('nav.asOf', { date: formatDate(new Date().toISOString()) }))
// router.isReady() isn't awaited before mount (see main.ts), so on the very
// first paint `route.meta` can briefly be `{}` before the initial navigation
// resolves — t(undefined) throws, where the old raw-string interpolation
// just rendered blank, so guard instead of passing an empty key straight in.
const pageKicker = computed(
  () => pageTitleStore.kicker ?? (route.meta.kicker ? t(route.meta.kicker as string) : ''),
)
const pageTitle = computed(
  () => pageTitleStore.title ?? (route.meta.title ? t(route.meta.title as string) : ''),
)
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
        class="neu-inset max-h-64 w-full max-w-2xl overflow-auto p-3 text-left text-xs text-muted"
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
    <div v-else class="flex min-h-screen flex-col bg-default text-default">
      <AppTopBar :links="links" :net-worth="netWorth" />

      <div class="min-w-0">
        <main class="mx-auto max-w-[1360px] px-4 py-8 pb-16 sm:px-10">
          <div class="mb-8 flex flex-wrap items-end justify-between gap-4 sm:gap-6">
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

          <RouterView />
        </main>
      </div>
    </div>
  </UApp>
</template>
