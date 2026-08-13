<script setup lang="ts">
import { useId } from 'vue'

withDefaults(
  defineProps<{
    open: boolean
    title: string
    submitLabel?: string
    loading?: boolean
  }>(),
  {
    submitLabel: 'Save',
    loading: false,
  },
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: []
}>()

const formId = useId()
</script>

<template>
  <UModal :open="open" :title="title" @update:open="emit('update:open', $event)">
    <template #body>
      <form :id="formId" class="flex flex-col gap-3.5" @submit.prevent="emit('submit')">
        <slot />
      </form>
    </template>
    <template #footer>
      <div class="flex flex-1 justify-end gap-2.5">
        <UButton variant="ghost" color="neutral" label="Cancel" @click="emit('update:open', false)" />
        <UButton :form="formId" type="submit" :label="submitLabel" :loading="loading" />
      </div>
    </template>
  </UModal>
</template>
