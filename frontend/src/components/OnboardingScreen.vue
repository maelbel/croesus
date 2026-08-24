<script setup lang="ts">
import { ref } from 'vue'
import { relaunch } from '@tauri-apps/plugin-process'
import { useConnectionStore } from '../stores/connection'
import { normalizeUrl, useConnectionForm } from '../composables/useConnectionForm'

const emit = defineEmits<{ continueLocal: [] }>()

const connectionStore = useConnectionStore()
const { mode, serverUrl, testing, testError, testOk, testConnection, resetTest } = useConnectionForm()
const applying = ref(false)

async function apply() {
  if (mode.value === 'remote' && !testOk.value) return

  applying.value = true
  try {
    await connectionStore.save(mode.value, mode.value === 'remote' ? normalizeUrl(serverUrl.value) : null)
    if (mode.value === 'remote') {
      // New server URL only takes effect from a clean process start.
      await relaunch()
    } else {
      emit('continueLocal')
    }
  } finally {
    applying.value = false
  }
}
</script>

<template>
  <div
    class="neu-surface flex w-96 flex-col gap-5 border border-default p-8"
  >
    <div class="flex flex-col gap-1">
      <span class="font-heading text-xl font-extrabold tracking-tight">CROESUS</span>
      <span class="text-sm text-muted">How do you want to use this app?</span>
    </div>

    <div class="neu-inset flex w-max border border-default">
      <UButton
        size="sm"
        :variant="mode === 'local' ? 'solid' : 'ghost'"
        color="neutral"
        @click="mode = 'local'"
      >
        Local
      </UButton>
      <UButton
        size="sm"
        :variant="mode === 'remote' ? 'solid' : 'ghost'"
        color="neutral"
        @click="mode = 'remote'"
      >
        Remote
      </UButton>
    </div>

    <p v-if="mode === 'local'" class="text-sm text-muted">
      Keeps everything on this device, in a local database. Nothing leaves your computer.
    </p>
    <template v-else>
      <p class="text-sm text-muted">Connect to an existing self-hosted Croesus instance.</p>
      <div class="flex items-end gap-2">
        <UFormField label="Server URL" class="flex-1">
          <UInput
            v-model="serverUrl"
            placeholder="https://croesus.example.com"
            class="w-full"
            @update:model-value="resetTest"
          />
        </UFormField>
        <UButton variant="outline" color="neutral" :loading="testing" @click="testConnection">
          Test
        </UButton>
      </div>
      <p v-if="testError" class="text-sm text-error">{{ testError }}</p>
      <p v-else-if="testOk" class="text-sm text-success">Reachable — ready to connect.</p>
    </template>

    <UButton
      color="primary"
      block
      :loading="applying"
      :disabled="mode === 'remote' && !testOk"
      @click="apply"
    >
      {{ mode === 'remote' ? 'Connect & restart' : 'Continue' }}
    </UButton>
    <span class="text-sm text-muted">You can change this later in Settings.</span>
  </div>
</template>
