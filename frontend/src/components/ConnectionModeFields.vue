<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { ConnectionMode } from '../stores/connection'

const mode = defineModel<ConnectionMode>('mode', { required: true })
const serverUrl = defineModel<string>('serverUrl', { required: true })

defineProps<{
  testing: boolean
  testError: string | null
  testOk: boolean
}>()

const emit = defineEmits<{ test: []; 'reset-test': [] }>()

const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="neu-inset flex w-max border border-default">
      <UButton size="sm" :variant="mode === 'local' ? 'solid' : 'ghost'" color="neutral" @click="mode = 'local'">
        {{ t('connection.local') }}
      </UButton>
      <UButton size="sm" :variant="mode === 'remote' ? 'solid' : 'ghost'" color="neutral" @click="mode = 'remote'">
        {{ t('connection.remote') }}
      </UButton>
    </div>

    <slot />

    <template v-if="mode === 'remote'">
      <div class="flex items-end gap-2">
        <UFormField :label="t('connection.serverUrl')" class="flex-1">
          <UInput
            v-model="serverUrl"
            :placeholder="t('connection.serverUrlPlaceholder')"
            class="w-full"
            @update:model-value="emit('reset-test')"
          />
        </UFormField>
        <UButton variant="outline" color="neutral" :loading="testing" @click="emit('test')">
          {{ t('connection.test') }}
        </UButton>
      </div>
      <p v-if="testError" class="text-sm text-error">{{ testError }}</p>
      <p v-else-if="testOk" class="text-sm text-success">{{ t('connection.reachable') }}</p>
    </template>
  </div>
</template>
