<script setup lang="ts">
import { computed, ref } from 'vue'
import { isTauri } from '@tauri-apps/api/core'
import { useI18n } from 'vue-i18n'
import { useToast } from '@nuxt/ui/composables'
import type { NavigationMenuItem } from '@nuxt/ui'
import { useThemeStore } from '../stores/theme'
import { LOCALES, useLocaleStore } from '../stores/locale'
import { useCurrencyStore } from '../stores/currency'
import { CURRENCIES } from '../api/types'
import { useAccountsStore } from '../stores/accounts'
import { useLiabilitiesStore } from '../stores/liabilities'
import { useEnvelopesStore } from '../stores/envelopes'
import { useAuthStore } from '../stores/auth'
import { useConnectionForm, useApplyConnection } from '../composables/useConnectionForm'
import { useConfirm } from '../composables/useConfirm'
import ConnectionModeFields from '../components/ConnectionModeFields.vue'

const { t } = useI18n()
const toast = useToast()
const confirm = useConfirm()

const themeStore = useThemeStore()
const localeStore = useLocaleStore()
const currencyStore = useCurrencyStore()
const currencyOptions = computed(() => CURRENCIES.map((value) => ({ label: value, value })))
const accountsStore = useAccountsStore()
const liabilitiesStore = useLiabilitiesStore()
const envelopesStore = useEnvelopesStore()
const authStore = useAuthStore()

// Only the desktop shell can choose between a local sidecar and a remote
// server — the self-hosted/browser build always just talks to VITE_API_URL.
const isTauriApp = isTauri()

type Category = 'appearance' | 'connection' | 'account' | 'danger'
const activeCategory = ref<Category>('appearance')

// `onSelect` sets the active category explicitly rather than relying on
// UNavigationMenu's v-model alone — its items default to `type: 'link'`,
// which without a `to` doesn't reliably drive modelValue on click. Likewise
// `active` has to be set per item ourselves: with no `to`, the menu has no
// route to match against, so nothing is ever marked active on its own —
// there's no built-in "current section" indicator otherwise.
function select(value: Category) {
  return () => {
    activeCategory.value = value
  }
}

// Only the categories that actually have something to show — Connection is
// desktop-only, Account only exists once auth is turned on for this instance.
const categories = computed<NavigationMenuItem[]>(() => [
  { label: t('settings.appearanceTitle'), icon: 'i-lucide-palette', value: 'appearance' },
  ...(isTauriApp ? [{ label: t('settings.connectionTitle'), icon: 'i-lucide-server', value: 'connection' }] : []),
  ...(authStore.authEnabled ? [{ label: t('settings.accountTitle'), icon: 'i-lucide-user', value: 'account' }] : []),
  { label: t('settings.dangerZoneTitle'), icon: 'i-lucide-trash-2', value: 'danger' },
].map((item) => ({
  ...item,
  active: item.value === activeCategory.value,
  onSelect: select(item.value as Category),
})))

const {
  mode: pendingMode,
  serverUrl: pendingServerUrl,
  testing,
  testError,
  testOk,
  testConnection,
  resetTest,
} = useConnectionForm()
const { applying, apply: applyConnectionMode } = useApplyConnection()

function applyConnection() {
  return applyConnectionMode(pendingMode.value, pendingServerUrl.value, testOk.value)
}

async function deleteAllData() {
  const total =
    accountsStore.accounts.length + liabilitiesStore.liabilities.length + envelopesStore.envelopes.length
  if (total === 0) return
  const confirmed = await confirm(
    t('settings.deleteAllConfirm', {
      accounts: accountsStore.accounts.length,
      liabilities: liabilitiesStore.liabilities.length,
      envelopes: envelopesStore.envelopes.length,
    }),
    { confirmLabel: t('common.deleteAll'), confirmColor: 'rust' },
  )
  if (!confirmed) return

  const results = await Promise.allSettled([
    ...accountsStore.accounts.map((a) => accountsStore.remove(a.id)),
    ...liabilitiesStore.liabilities.map((l) => liabilitiesStore.remove(l.id)),
    ...envelopesStore.envelopes.map((e) => envelopesStore.remove(e.id)),
  ])

  const failed = results.filter((r) => r.status === 'rejected').length
  if (failed > 0) {
    toast.add({
      title: t('settings.deleteAllFailedTitle', { total }, failed),
      description: t('settings.deleteAllFailedDescription'),
      color: 'rust',
    })
  }
}
</script>

<template>
  <div class="flex flex-col gap-8 sm:flex-row sm:items-start">
    <UNavigationMenu
      v-model="activeCategory"
      :items="categories"
      orientation="vertical"
      type="single"
      class="w-full flex-none sm:w-52"
    />

    <div class="min-w-0 max-w-[560px] flex-1">
      <div v-if="activeCategory === 'appearance'" class="neu-surface flex flex-col divide-y divide-default bg-default">
        <div class="flex items-center gap-3.5 px-5 py-4">
          <span class="flex min-w-0 flex-1 flex-col gap-0.5">
            <span class="text-[14.5px] font-semibold">{{ t('settings.appearanceTitle') }}</span>
            <span class="text-[12.5px] text-muted">{{ t('settings.appearanceDescription') }}</span>
          </span>
          <div class="neu-inset flex flex-none">
            <UButton size="sm" :variant="themeStore.mode === 'dark' ? 'solid' : 'ghost'" color="neutral" @click="themeStore.setMode('dark')">
              {{ t('settings.dark') }}
            </UButton>
            <UButton size="sm" :variant="themeStore.mode === 'light' ? 'solid' : 'ghost'" color="neutral" @click="themeStore.setMode('light')">
              {{ t('settings.light') }}
            </UButton>
          </div>
        </div>
        <div class="flex items-center gap-3.5 px-5 py-4">
          <span class="flex min-w-0 flex-1 flex-col gap-0.5">
            <span class="text-[14.5px] font-semibold">{{ t('settings.languageTitle') }}</span>
            <span class="text-[12.5px] text-muted">{{ t('settings.languageDescription') }}</span>
          </span>
          <div class="neu-inset flex flex-none">
            <UButton
              v-for="locale in LOCALES"
              :key="locale.value"
              size="sm"
              :variant="localeStore.locale === locale.value ? 'solid' : 'ghost'"
              color="neutral"
              @click="localeStore.setLocale(locale.value)"
            >
              {{ locale.label }}
            </UButton>
          </div>
        </div>
        <div class="flex items-center gap-3.5 px-5 py-4">
          <span class="flex min-w-0 flex-1 flex-col gap-0.5">
            <span class="text-[14.5px] font-semibold">{{ t('settings.currencyTitle') }}</span>
            <span class="text-[12.5px] text-muted">{{ t('settings.currencyDescription') }}</span>
          </span>
          <USelect
            :model-value="currencyStore.referenceCurrency"
            :items="currencyOptions"
            class="w-32 flex-none"
            @update:model-value="currencyStore.setReferenceCurrency($event)"
          />
        </div>
      </div>

      <div v-else-if="activeCategory === 'connection'" class="neu-surface flex flex-col gap-4 bg-default p-5">
        <span class="text-[12.5px] text-muted">{{ t('settings.connectionDescription') }}</span>
        <ConnectionModeFields
          v-model:mode="pendingMode"
          v-model:server-url="pendingServerUrl"
          :testing="testing"
          :test-error="testError"
          :test-ok="testOk"
          @test="testConnection"
          @reset-test="resetTest"
        />
        <div class="flex flex-col items-start gap-2">
          <UButton
            color="primary"
            :loading="applying"
            :disabled="pendingMode === 'remote' && !testOk"
            @click="applyConnection"
          >
            {{ t('settings.saveAndRestart') }}
          </UButton>
          <span class="text-[12.5px] text-muted">{{ t('settings.switchingRestarts') }}</span>
        </div>
      </div>

      <div v-else-if="activeCategory === 'account'" class="flex flex-col gap-6">
        <div class="neu-surface flex flex-col divide-y divide-default bg-default">
          <div v-if="authStore.passwordEnabled" class="flex items-center gap-3.5 px-5 py-4">
            <span class="flex-1 text-[14.5px] font-semibold">{{ t('settings.passwordLoginLabel') }}</span>
            <span class="flex-none text-[13.5px] text-muted">{{ t('settings.passwordLoginValue') }}</span>
          </div>
          <div v-if="authStore.oidcEnabled" class="flex items-center gap-3.5 px-5 py-4">
            <span class="flex-1 text-[14.5px] font-semibold">{{ t('settings.ssoLabel') }}</span>
            <span class="flex-none text-[13.5px] text-muted">{{ authStore.oidcDisplayName }}</span>
          </div>
          <div class="flex items-center gap-3.5 px-5 py-4">
            <span class="flex min-w-0 flex-1 flex-col gap-0.5">
              <span class="text-[14.5px] font-semibold">{{ t('settings.sessionTitle') }}</span>
              <span class="text-[12.5px] text-muted">{{ t('settings.sessionDescription') }}</span>
            </span>
            <UButton color="neutral" variant="outline" class="flex-none" @click="authStore.logout()">
              {{ t('settings.logOut') }}
            </UButton>
          </div>
        </div>
      </div>

      <div v-else-if="activeCategory === 'danger'" class="neu-surface bg-default">
        <div class="flex items-center gap-3.5 px-5 py-4">
          <span class="flex min-w-0 flex-1 flex-col gap-0.5">
            <span class="text-[14.5px] font-semibold text-rust">{{ t('settings.deleteAllData') }}</span>
            <span class="text-[12.5px] text-muted">{{ t('settings.deleteAllDataDescription') }}</span>
          </span>
          <UButton color="rust" variant="outline" class="flex-none" @click="deleteAllData">
            {{ t('settings.deleteAllData') }}
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
