<script setup lang="ts">
import { ref } from 'vue'
import { isTauri, invoke } from '@tauri-apps/api/core'
import { useAuthStore } from '../stores/auth'
import { resolveBaseUrl } from '../api/client'

const authStore = useAuthStore()
const username = ref('')
const password = ref('')
const submitting = ref(false)
const ssoSubmitting = ref(false)

async function submit() {
  submitting.value = true
  try {
    await authStore.login(username.value, password.value)
  } finally {
    submitting.value = false
  }
}

// Desktop remote mode has no browser location to redirect through — the
// backend's OIDC callback instead hands the token to a one-shot loopback
// server the Rust side spins up for this attempt (see start_oidc_login).
// Self-hosted/browser mode is a plain redirect; the token comes back as a
// URL fragment picked up in App.vue.
async function signInWithSso() {
  authStore.error = null
  if (isTauri()) {
    ssoSubmitting.value = true
    try {
      const token = await invoke<string>('start_oidc_login', { serverUrl: resolveBaseUrl() })
      authStore.setToken(token)
    } catch (e) {
      authStore.error = e instanceof Error ? e.message : 'SSO sign-in failed'
    } finally {
      ssoSubmitting.value = false
    }
  } else {
    const params = new URLSearchParams({ redirect_uri: window.location.origin })
    window.location.href = `${resolveBaseUrl()}/auth/oidc/login?${params}`
  }
}
</script>

<template>
  <div class="neu-surface flex w-80 flex-col gap-4 border border-default p-8">
    <div class="flex flex-col gap-1">
      <span class="font-heading text-xl font-extrabold tracking-tight">CROESUS</span>
      <span class="text-sm text-muted">Sign in to this server.</span>
    </div>

    <form v-if="authStore.passwordEnabled" class="flex flex-col gap-4" @submit.prevent="submit">
      <UFormField label="Username">
        <UInput v-model="username" autocomplete="username" autofocus class="w-full" />
      </UFormField>
      <UFormField label="Password">
        <UInput v-model="password" type="password" autocomplete="current-password" class="w-full" />
      </UFormField>
      <UButton type="submit" block :loading="submitting">Sign in</UButton>
    </form>

    <div v-if="authStore.passwordEnabled && authStore.oidcEnabled" class="flex items-center gap-3">
      <div class="h-px flex-1 bg-default" />
      <span class="text-xs text-muted">or</span>
      <div class="h-px flex-1 bg-default" />
    </div>

    <UButton
      v-if="authStore.oidcEnabled"
      variant="outline"
      color="neutral"
      block
      :loading="ssoSubmitting"
      @click="signInWithSso"
    >
      Sign in with {{ authStore.oidcDisplayName }}
    </UButton>

    <p v-if="authStore.error" class="text-sm text-error">{{ authStore.error }}</p>
  </div>
</template>
