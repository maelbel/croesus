<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useConnectionForm, useApplyConnection } from '../composables/useConnectionForm'
import ConnectionModeFields from './ConnectionModeFields.vue'

const { t } = useI18n()
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
    class="neu-surface flex w-96 flex-col gap-5 p-8"
  >
    <div class="flex flex-col gap-1">
      <span class="font-heading text-xl font-extrabold tracking-tight">CROESUS</span>
      <span class="text-sm text-muted">{{ t('onboarding.question') }}</span>
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
        {{ t('onboarding.localDescription') }}
      </p>
      <p v-else class="text-sm text-muted">{{ t('onboarding.remoteDescription') }}</p>
    </ConnectionModeFields>

    <UButton
      color="primary"
      block
      :loading="applying"
      :disabled="mode === 'remote' && !testOk"
      @click="apply"
    >
      {{ mode === 'remote' ? t('onboarding.connectAndRestart') : t('onboarding.continue') }}
    </UButton>
    <span class="text-sm text-muted">{{ t('onboarding.changeLater') }}</span>
  </div>
</template>
