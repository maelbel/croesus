<script setup lang="ts">
import { SKINS, useThemeStore } from '../stores/theme'
import { useAccountsStore } from '../stores/accounts'
import { useLiabilitiesStore } from '../stores/liabilities'
import { useEnvelopesStore } from '../stores/envelopes'

const themeStore = useThemeStore()
const accountsStore = useAccountsStore()
const liabilitiesStore = useLiabilitiesStore()
const envelopesStore = useEnvelopesStore()

async function deleteAllData() {
  const total =
    accountsStore.accounts.length + liabilitiesStore.liabilities.length + envelopesStore.envelopes.length
  if (total === 0) return
  const confirmed = window.confirm(
    `Delete ${accountsStore.accounts.length} accounts, ${liabilitiesStore.liabilities.length} liabilities and ${envelopesStore.envelopes.length} envelopes? This cannot be undone.`,
  )
  if (!confirmed) return

  await Promise.all([
    ...accountsStore.accounts.map((a) => accountsStore.remove(a.id)),
    ...liabilitiesStore.liabilities.map((l) => liabilitiesStore.remove(l.id)),
    ...envelopesStore.envelopes.map((e) => envelopesStore.remove(e.id)),
  ])
}
</script>

<template>
  <div class="flex max-w-[760px] flex-col">
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

    <div class="grid grid-cols-[200px_minmax(0,1fr)] gap-8 py-6">
      <div class="flex flex-col gap-1">
        <span class="font-heading text-[16.5px] font-extrabold">Danger zone</span>
        <span class="text-sm text-muted">This cannot be undone.</span>
      </div>
      <div class="flex flex-col items-start gap-3">
        <UButton color="error" variant="outline" @click="deleteAllData">Delete all data</UButton>
        <span class="text-sm text-muted">Removes every account, liability and envelope from this instance.</span>
      </div>
    </div>
  </div>
</template>
