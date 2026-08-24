<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const username = ref('')
const password = ref('')
const submitting = ref(false)

async function submit() {
  submitting.value = true
  try {
    await authStore.login(username.value, password.value)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <form
    class="neu-surface flex w-80 flex-col gap-4 border border-default p-8"
    @submit.prevent="submit"
  >
    <div class="flex flex-col gap-1">
      <span class="font-heading text-xl font-extrabold tracking-tight">CROESUS</span>
      <span class="text-sm text-muted">Sign in to this server.</span>
    </div>
    <UFormField label="Username">
      <UInput v-model="username" autocomplete="username" autofocus class="w-full" />
    </UFormField>
    <UFormField label="Password">
      <UInput v-model="password" type="password" autocomplete="current-password" class="w-full" />
    </UFormField>
    <p v-if="authStore.error" class="text-sm text-error">{{ authStore.error }}</p>
    <UButton type="submit" block :loading="submitting">Sign in</UButton>
  </form>
</template>
