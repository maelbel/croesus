<script setup lang="ts">
import { ref } from 'vue'
import { isTauri } from '@tauri-apps/api/core'
import { relaunch } from '@tauri-apps/plugin-process'
import { useToast } from '@nuxt/ui/composables'
import { SKINS, useThemeStore } from '../stores/theme'
import { useAccountsStore } from '../stores/accounts'
import { useLiabilitiesStore } from '../stores/liabilities'
import { useEnvelopesStore } from '../stores/envelopes'
import { useConnectionStore } from '../stores/connection'
import { useAuthStore } from '../stores/auth'
import { normalizeUrl, useConnectionForm } from '../composables/useConnectionForm'
import ConnectionModeFields from '../components/ConnectionModeFields.vue'

const toast = useToast()

const themeStore = useThemeStore()
const accountsStore = useAccountsStore()
const liabilitiesStore = useLiabilitiesStore()
const envelopesStore = useEnvelopesStore()
const connectionStore = useConnectionStore()
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
const applying = ref(false)

async function applyConnection() {
  if (pendingMode.value === 'remote' && !testOk.value) return

  applying.value = true
  try {
    await connectionStore.save(
      pendingMode.value,
      pendingMode.value === 'remote' ? normalizeUrl(pendingServerUrl.value) : null,
    )
    await relaunch()
  } finally {
    applying.value = false
  }
}

async function deleteAllData() {
  const total =
    accountsStore.accounts.length + liabilitiesStore.liabilities.length + envelopesStore.envelopes.length
  if (total === 0) return
  const confirmed = window.confirm(
    `Delete ${accountsStore.accounts.length} accounts, ${liabilitiesStore.liabilities.length} liabilities and ${envelopesStore.envelopes.length} envelopes? This cannot be undone.`,
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
      title: `${failed} of ${total} item(s) couldn't be deleted`,
      description: 'Check your connection and try again.',
      color: 'rust',
    })
  }
}
</script>

<template>
  <div class="flex max-w-[760px] flex-col">
    <div
      v-if="isTauriApp"
      class="grid grid-cols-[200px_minmax(0,1fr)] gap-8 border-b border-default py-6"
    >
      <div class="flex flex-col gap-1">
        <span class="font-heading text-[16.5px] font-extrabold">Connection</span>
        <span class="text-sm text-muted">Local database, or an existing self-hosted server.</span>
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
          Save & restart
        </UButton>
        <span class="text-sm text-muted">Switching modes restarts the app.</span>
      </div>
    </div>

    <div class="grid grid-cols-[200px_minmax(0,1fr)] gap-8 border-b border-default py-6">
      <div class="flex flex-col gap-1">
        <span class="font-heading text-[16.5px] font-extrabold">Theme</span>
        <span class="text-sm text-muted">Same data, different visual language.</span>
      </div>
      <div class="flex flex-wrap gap-3">
        <button
          v-for="s in SKINS"
          :key="s.value"
          type="button"
          class="flex w-48 flex-col gap-1.5 rounded-md border p-4 text-left"
          :class="
            themeStore.skin === s.value
              ? 'neu-inset border-primary bg-elevated'
              : 'neu-surface border-default hover:bg-elevated'
          "
          @click="themeStore.setSkin(s.value)"
        >
          <span class="font-heading text-[15px] font-extrabold">{{ s.label }}</span>
          <span class="text-sm text-muted">{{ s.description }}</span>
        </button>
      </div>
    </div>

    <div class="grid grid-cols-[200px_minmax(0,1fr)] gap-8 border-b border-default py-6">
      <div class="flex flex-col gap-1">
        <span class="font-heading text-[16.5px] font-extrabold">Appearance</span>
        <span class="text-sm text-muted">Dark is the default.</span>
      </div>
      <div class="neu-inset flex w-max border border-default">
        <UButton
          size="sm"
          :variant="themeStore.mode === 'dark' ? 'solid' : 'ghost'"
          color="neutral"
          @click="themeStore.setMode('dark')"
        >
          Dark
        </UButton>
        <UButton
          size="sm"
          :variant="themeStore.mode === 'light' ? 'solid' : 'ghost'"
          color="neutral"
          @click="themeStore.setMode('light')"
        >
          Light
        </UButton>
      </div>
    </div>

    <div class="grid grid-cols-[200px_minmax(0,1fr)] gap-8 border-b border-default py-6">
      <div class="flex flex-col gap-1">
        <span class="font-heading text-[16.5px] font-extrabold">Language</span>
        <span class="text-sm text-muted">Sets number and date formatting.</span>
      </div>
      <div class="flex flex-col items-start gap-2">
        <div class="neu-inset flex w-max border border-default opacity-50">
          <UButton size="sm" variant="solid" color="neutral" disabled>English</UButton>
          <UButton size="sm" variant="ghost" color="neutral" disabled>Français</UButton>
        </div>
        <span class="text-sm text-muted">Not available yet — the app is English-only for now.</span>
      </div>
    </div>

    <div class="grid grid-cols-[200px_minmax(0,1fr)] gap-8 border-b border-default py-6">
      <div class="flex flex-col gap-1">
        <span class="font-heading text-[16.5px] font-extrabold">Currency</span>
        <span class="text-sm text-muted">Everything is converted for display.</span>
      </div>
      <div class="flex flex-col items-start gap-2">
        <div class="neu-inset flex w-max border border-default opacity-50">
          <UButton size="sm" variant="solid" color="neutral" disabled>EUR</UButton>
          <UButton size="sm" variant="ghost" color="neutral" disabled>USD</UButton>
        </div>
        <span class="text-sm text-muted">Not available yet — values are shown in euros.</span>
      </div>
    </div>

    <div v-if="authStore.authEnabled" class="grid grid-cols-[200px_minmax(0,1fr)] gap-8 border-b border-default py-6">
      <div class="flex flex-col gap-1">
        <span class="font-heading text-[16.5px] font-extrabold">Session</span>
        <span class="text-sm text-muted">Signed in to this instance.</span>
      </div>
      <div class="flex flex-col items-start gap-3">
        <UButton color="neutral" variant="outline" @click="authStore.logout()">Log out</UButton>
      </div>
    </div>

    <div class="grid grid-cols-[200px_minmax(0,1fr)] gap-8 py-6">
      <div class="flex flex-col gap-1">
        <span class="font-heading text-[16.5px] font-extrabold">Danger zone</span>
        <span class="text-sm text-muted">This cannot be undone.</span>
      </div>
      <div class="flex flex-col items-start gap-3">
        <UButton color="rust" variant="outline" @click="deleteAllData">Delete all data</UButton>
        <span class="text-sm text-muted">Removes every account, liability and envelope from this instance.</span>
      </div>
    </div>
  </div>
</template>
