<script setup lang="ts">
defineProps<{
  open?: boolean
  title?: string
  message: string
  confirmLabel?: string
  confirmColor?: 'primary' | 'rust'
}>()

// Emitted directly by useConfirm's programmatic useOverlay().open() —
// `close` resolves that call's result promise (true/false), `update:open`
// and `after:leave` just forward UModal's own so the overlay provider knows
// when to unmount us. See composables/useConfirm.ts.
const emit = defineEmits<{
  close: [boolean]
  'update:open': [boolean]
  'after:leave': []
}>()

function cancel() {
  emit('close', false)
}

function confirm() {
  emit('close', true)
}
</script>

<template>
  <UModal
    :open="open"
    :title="title ?? 'Confirm'"
    :ui="{ content: 'sm:max-w-sm' }"
    @update:open="(value: boolean) => { emit('update:open', value); if (!value) cancel() }"
    @after:leave="emit('after:leave')"
  >
    <template #body>
      <p class="text-sm text-muted">{{ message }}</p>
    </template>
    <template #footer>
      <div class="flex flex-1 justify-end gap-2.5">
        <UButton variant="ghost" color="neutral" label="Cancel" @click="cancel" />
        <UButton :color="confirmColor ?? 'rust'" :label="confirmLabel ?? 'Delete'" @click="confirm" />
      </div>
    </template>
  </UModal>
</template>
