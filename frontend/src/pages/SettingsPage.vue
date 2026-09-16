<script setup lang="ts">
import { computed } from 'vue'
import { isTauri } from '@tauri-apps/api/core'
import { useI18n } from 'vue-i18n'
import { useToast } from '@nuxt/ui/composables'
import { SKINS, useThemeStore, type Skin } from '../stores/theme'
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
  <div class="mx-auto flex max-w-[760px] flex-col">
    <div
      v-if="isTauriApp"
      class="grid grid-cols-[200px_minmax(0,1fr)] items-start gap-8 border-b border-default py-6"
    >
      <div class="flex flex-col gap-1">
        <span class="font-heading text-[16.5px] font-extrabold">{{ t('settings.connectionTitle') }}</span>
        <span class="text-sm text-muted">{{ t('settings.connectionDescription') }}</span>
      </div>
      <div class="flex flex-col items-start gap-3">
        <div class="w-full max-w-sm">
          <ConnectionModeFields
            v-model:mode="pendingMode"
            v-model:server-url="pendingServerUrl"
            :testing="testing"
            :test-error="testError"
            :test-ok="testOk"
            @test="testConnection"
            @reset-test="resetTest"
          />
        </div>

        <UButton
          color="primary"
          :loading="applying"
          :disabled="pendingMode === 'remote' && !testOk"
          @click="applyConnection"
        >
          {{ t('settings.saveAndRestart') }}
        </UButton>
        <span class="text-sm text-muted">{{ t('settings.switchingRestarts') }}</span>
      </div>
    </div>

    <div class="grid grid-cols-[200px_minmax(0,1fr)] items-start gap-8 border-b border-default py-6">
      <div class="flex flex-col gap-1">
        <span class="font-heading text-[16.5px] font-extrabold">{{ t('settings.themeTitle') }}</span>
        <span class="text-sm text-muted">{{ t('settings.themeDescription') }}</span>
      </div>
      <URadioGroup
        :model-value="themeStore.skin"
        :items="SKINS"
        variant="card"
        indicator="hidden"
        orientation="horizontal"
        :ui="{ fieldset: 'flex-wrap gap-3', item: 'w-48 rounded-md', label: 'font-heading font-extrabold', description: 'text-sm' }"
        @update:model-value="(value: Skin) => themeStore.setSkin(value)"
      />
    </div>

    <div class="grid grid-cols-[200px_minmax(0,1fr)] items-start gap-8 border-b border-default py-6">
      <div class="flex flex-col gap-1">
        <span class="font-heading text-[16.5px] font-extrabold">{{ t('settings.appearanceTitle') }}</span>
        <span class="text-sm text-muted">{{ t('settings.appearanceDescription') }}</span>
      </div>
      <div class="neu-inset flex w-max border border-default">
        <UButton
          size="sm"
          :variant="themeStore.mode === 'dark' ? 'solid' : 'ghost'"
          color="neutral"
          @click="themeStore.setMode('dark')"
        >
          {{ t('settings.dark') }}
        </UButton>
        <UButton
          size="sm"
          :variant="themeStore.mode === 'light' ? 'solid' : 'ghost'"
          color="neutral"
          @click="themeStore.setMode('light')"
        >
          {{ t('settings.light') }}
        </UButton>
      </div>
    </div>

    <div class="grid grid-cols-[200px_minmax(0,1fr)] items-start gap-8 border-b border-default py-6">
      <div class="flex flex-col gap-1">
        <span class="font-heading text-[16.5px] font-extrabold">{{ t('settings.languageTitle') }}</span>
        <span class="text-sm text-muted">{{ t('settings.languageDescription') }}</span>
      </div>
      <div class="neu-inset flex w-max border border-default">
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

    <div class="grid grid-cols-[200px_minmax(0,1fr)] items-start gap-8 border-b border-default py-6">
      <div class="flex flex-col gap-1">
        <span class="font-heading text-[16.5px] font-extrabold">{{ t('settings.currencyTitle') }}</span>
        <span class="text-sm text-muted">{{ t('settings.currencyDescription') }}</span>
      </div>
      <USelect
        :model-value="currencyStore.referenceCurrency"
        :items="currencyOptions"
        class="w-40"
        @update:model-value="currencyStore.setReferenceCurrency($event)"
      />
    </div>

    <div v-if="authStore.authEnabled" class="grid grid-cols-[200px_minmax(0,1fr)] items-start gap-8 border-b border-default py-6">
      <div class="flex flex-col gap-1">
        <span class="font-heading text-[16.5px] font-extrabold">{{ t('settings.sessionTitle') }}</span>
        <span class="text-sm text-muted">{{ t('settings.sessionDescription') }}</span>
      </div>
      <div class="flex flex-col items-start gap-3">
        <UButton color="neutral" variant="outline" @click="authStore.logout()">{{ t('settings.logOut') }}</UButton>
      </div>
    </div>

    <div class="grid grid-cols-[200px_minmax(0,1fr)] items-start gap-8 py-6">
      <div class="flex flex-col gap-1">
        <span class="font-heading text-[16.5px] font-extrabold">{{ t('settings.dangerZoneTitle') }}</span>
        <span class="text-sm text-muted">{{ t('settings.dangerZoneDescription') }}</span>
      </div>
      <div class="flex flex-col items-start gap-3">
        <UButton color="rust" variant="outline" @click="deleteAllData">{{ t('settings.deleteAllData') }}</UButton>
        <span class="text-sm text-muted">{{ t('settings.deleteAllDataDescription') }}</span>
      </div>
    </div>
  </div>
</template>
