<script setup lang="ts">
import { useConnectionForm, useApplyConnection } from '../composables/useConnectionForm'
import ConnectionModeFields from './ConnectionModeFields.vue'

const emit = defineEmits<{ continueLocal: [] }>()

const { mode, serverUrl, testing, testError, testOk, testConnection, resetTest } = useConnectionForm()
const { applying, apply: applyConnection } = useApplyConnection({
  onLocalWithoutRelaunch: () => emit('continueLocal'),
})

function apply() {
  return applyConnection(mode.value, serverUrl.value, testOk.value)
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

    <ConnectionModeFields
      v-model:mode="mode"
      v-model:server-url="serverUrl"
      :testing="testing"
      :test-error="testError"
      :test-ok="testOk"
      @test="testConnection"
      @reset-test="resetTest"
    >
      <p v-if="mode === 'local'" class="text-sm text-muted">
        Keeps everything on this device, in a local database. Nothing leaves your computer.
      </p>
      <p v-else class="text-sm text-muted">Connect to an existing self-hosted Croesus instance.</p>
    </ConnectionModeFields>

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
