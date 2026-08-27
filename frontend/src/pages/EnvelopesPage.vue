<script setup lang="ts">
import { computed } from 'vue'
import { useEnvelopesStore } from '../stores/envelopes'
import { useAccountsStore } from '../stores/accounts'
import { useValuationsStore } from '../stores/valuations'
import { useCrudForm } from '../composables/useCrudForm'
import { usePageAction } from '../composables/usePageAction'
import { formatCurrency } from '../lib/format'
import type { Envelope, EnvelopeCreate } from '../api/types'
import StatCard from '../components/StatCard.vue'
import StatCardRow from '../components/StatCardRow.vue'
import EntityFormModal from '../components/EntityFormModal.vue'
import { useThemeStore } from '../stores/theme'

const envelopesStore = useEnvelopesStore()
const accountsStore = useAccountsStore()
const valuationsStore = useValuationsStore()
const themeStore = useThemeStore()

const totalAllocated = computed(() =>
  envelopesStore.envelopes.reduce((sum, e) => sum + Number(e.current_amount), 0),
)
const totalTargets = computed(() =>
  envelopesStore.envelopes.reduce((sum, e) => sum + Number(e.target_amount ?? 0), 0),
)
const fundedRatio = computed(() => (totalTargets.value > 0 ? totalAllocated.value / totalTargets.value : null))

const checkingBalance = computed(() =>
  accountsStore.accounts
    .filter((a) => a.type === 'checking')
    .reduce((sum, a) => sum + valuationsStore.currentValue(a.id), 0),
)
const unallocated = computed(() => Math.max(0, checkingBalance.value - totalAllocated.value))

function ratio(target: string | null, current: string) {
  const t = Number(target)
  if (!target || t === 0) return 0
  return Math.min(1, Number(current) / t)
}

function status(target: string | null, current: string) {
  if (!target || Number(target) === 0) return { label: 'Unfunded', color: 'neutral' as const }
  const r = ratio(target, current)
  if (r >= 1) return { label: 'Funded', color: 'primary' as const }
  if (Number(current) === 0) return { label: 'Empty', color: 'neutral' as const }
  return { label: 'Filling', color: 'neutral' as const }
}

function barColor(target: string | null, current: string) {
  return status(target, current).label === 'Funded'
    ? 'var(--ui-primary)'
    : 'color-mix(in srgb, var(--ui-text) 62%, transparent)'
}

function formatEuro(value: string | null) {
  if (value === null) return '—'
  return formatCurrency(value)
}

function envelopeFormDefaults(): EnvelopeCreate {
  return {
    name: '',
    target_amount: null,
    current_amount: '0',
    color: null,
    icon: null,
  }
}

const envelopeForm = useCrudForm<Envelope, EnvelopeCreate>({
  entityLabel: 'envelope',
  createDefaults: envelopeFormDefaults,
  toFormValues: (envelope) => ({
    name: envelope.name,
    target_amount: envelope.target_amount,
    current_amount: envelope.current_amount,
    color: envelope.color,
    icon: envelope.icon,
  }),
  create: (payload) => envelopesStore.create(payload),
  update: (id, payload) => envelopesStore.update(id, payload),
})

usePageAction('Add an envelope', () => envelopeForm.openCreate())

async function removeEnvelope(envelope: Envelope) {
  if (!window.confirm(`Delete "${envelope.name}"?`)) return
  await envelopesStore.remove(envelope.id)
}
</script>

<template>
  <div class="flex flex-col gap-7">
    <EntityFormModal
      :open="envelopeForm.state.open"
      :title="envelopeForm.state.isEditing ? 'Edit envelope' : 'Add an envelope'"
      :loading="envelopeForm.state.submitting"
      @update:open="envelopeForm.state.open = $event"
      @submit="envelopeForm.submit()"
    >
      <UFormField label="Name">
        <UInput v-model="envelopeForm.state.form.name" placeholder="Vacation" />
      </UFormField>
      <UFormField label="Target">
        <UInput v-model="envelopeForm.state.form.target_amount" type="number" placeholder="2000" />
      </UFormField>
      <UFormField label="Current amount">
        <UInput v-model="envelopeForm.state.form.current_amount" type="number" placeholder="0" />
      </UFormField>
      <UFormField label="Color" description="A hex color used for the envelope's accent">
        <UInput v-model="envelopeForm.state.form.color" type="color" class="h-9 w-16 p-1" />
      </UFormField>
      <UFormField label="Icon" description="A Lucide icon name, e.g. i-lucide-plane">
        <UInput v-model="envelopeForm.state.form.icon" placeholder="i-lucide-plane" />
      </UFormField>
    </EntityFormModal>

    <template v-if="envelopesStore.envelopes.length > 0">
      <StatCardRow>
        <StatCard
          label="Allocated"
          :value="formatCurrency(totalAllocated)"
          :note="`Across ${envelopesStore.envelopes.length} envelopes`"
        />
        <StatCard label="Targets" value-color="muted" :value="formatCurrency(totalTargets)" :note="fundedRatio === null ? undefined : `${Math.round(fundedRatio * 100)}% funded`" />
        <StatCard label="Unallocated" value-color="positive" :value="formatCurrency(unallocated)" note="Sitting in checking" />
      </StatCardRow>

      <div
        :class="
          themeStore.skin === 'neumorphic'
            ? 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'
            : 'grid grid-cols-1 gap-0.5 border-2 border-default bg-accented sm:grid-cols-2 lg:grid-cols-3'
        "
      >
        <div
          v-for="envelope in envelopesStore.envelopes"
          :key="envelope.id"
          class="neu-surface flex gap-4.5 bg-default p-5"
        >
          <span class="stripe-track-v">
            <span
              class="stripe-fill-v"
              :style="{
                height: `${ratio(envelope.target_amount, envelope.current_amount) * 100}%`,
                '--stripe-color': barColor(envelope.target_amount, envelope.current_amount),
              }"
            />
          </span>
          <div class="flex min-w-0 flex-1 flex-col gap-3">
            <span class="flex items-baseline justify-between gap-2.5">
              <span class="text-[16.5px] font-semibold">{{ envelope.name }}</span>
              <UBadge variant="outline" size="sm" :color="status(envelope.target_amount, envelope.current_amount).color">
                {{ status(envelope.target_amount, envelope.current_amount).label }}
              </UBadge>
            </span>
            <span class="flex items-baseline gap-2">
              <span class="font-heading text-[28px] leading-none font-extrabold">{{ formatEuro(envelope.current_amount) }}</span>
              <span class="text-[15px] text-muted">/ {{ formatEuro(envelope.target_amount) }}</span>
            </span>
            <span class="flex items-center justify-between text-sm text-muted">
              <span>{{ Math.round(ratio(envelope.target_amount, envelope.current_amount) * 100) }}% funded</span>
              <span class="flex items-center">
                <UButton
                  variant="ghost"
                  color="neutral"
                  icon="i-lucide-pencil"
                  size="xs"
                  title="Edit envelope"
                  @click="envelopeForm.openEdit(envelope)"
                />
                <UButton
                  color="rust"
                  variant="ghost"
                  icon="i-lucide-trash-2"
                  size="xs"
                  title="Delete envelope"
                  @click="removeEnvelope(envelope)"
                />
              </span>
            </span>
          </div>
        </div>
      </div>
    </template>

    <UEmpty
      v-else
      icon="i-lucide-mail"
      title="No envelopes yet"
      description="Envelopes divide the money you already have into jobs — travel, works, taxes. They never move money between accounts."
      class="neu-inset"
    />
  </div>
</template>
