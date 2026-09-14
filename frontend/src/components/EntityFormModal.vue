<script setup lang="ts">
import { useId, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    submitLabel?: string
    loading?: boolean
  }>(),
  {
    submitLabel: undefined,
    loading: false,
  },
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: []
}>()

const { t } = useI18n()
const formId = useId()
const resolvedSubmitLabel = computed(() => props.submitLabel ?? t('common.save'))
</script>

<template>
  <UModal :open="open" :title="title" @update:open="emit('update:open', $event)">
    <template #body>
      <UForm :id="formId" class="flex flex-col gap-3.5" @submit="emit('submit')">
        <slot />
      </UForm>
    </template>
    <template #footer>
      <div class="flex flex-1 justify-end gap-2.5">
        <UButton variant="ghost" color="neutral" :label="t('common.cancel')" @click="emit('update:open', false)" />
        <UButton :form="formId" type="submit" :label="resolvedSubmitLabel" :loading="loading" />
      </div>
    </template>
  </UModal>
</template>
