<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEnvelopesStore } from '../stores/envelopes'
import { useAccountsStore } from '../stores/accounts'
import { useValuationsStore } from '../stores/valuations'
import { useCrudForm } from '../composables/useCrudForm'
import { useDeleteAction } from '../composables/useDeleteAction'
import { usePageAction } from '../composables/usePageAction'
import { formatCurrency } from '../lib/format'
import type { Envelope, EnvelopeCreate } from '../api/types'
import EntityFormModal from '../components/EntityFormModal.vue'
import EllipsisMenu from '../components/EllipsisMenu.vue'
import PageLoadingSkeleton from '../components/PageLoadingSkeleton.vue'

const { t } = useI18n()
const envelopesStore = useEnvelopesStore()

// Only while the very first fetch is still in flight — once any envelopes
// exist, later refetches (after a create/update/remove) don't re-show this.
const initialLoading = computed(() => envelopesStore.loading && envelopesStore.envelopes.length === 0)
const accountsStore = useAccountsStore()
const valuationsStore = useValuationsStore()

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
  const targetNum = Number(target)
  if (!target || targetNum === 0) return 0
  return Math.min(1, Number(current) / targetNum)
}

type EnvelopeStatusKey = 'unfunded' | 'funded' | 'empty' | 'filling'

function statusKey(target: string | null, current: string): EnvelopeStatusKey {
  if (!target || Number(target) === 0) return 'unfunded'
  if (ratio(target, current) >= 1) return 'funded'
  if (Number(current) === 0) return 'empty'
  return 'filling'
}

const STATUS_COLOR: Record<EnvelopeStatusKey, 'neutral' | 'primary'> = {
  unfunded: 'neutral',
  funded: 'primary',
  empty: 'neutral',
  filling: 'neutral',
}

function status(target: string | null, current: string) {
  const key = statusKey(target, current)
  return { key, label: t(`envelopes.status${key.charAt(0).toUpperCase()}${key.slice(1)}`), color: STATUS_COLOR[key] }
}

const sortedEnvelopes = computed(() =>
  [...envelopesStore.envelopes].sort((a, b) => a.name.localeCompare(b.name)),
)

function formatAmount(value: string | null) {
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
  entityKey: 'envelope',
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

usePageAction(() => t('envelopes.addTitle'), () => envelopeForm.openCreate())

const deleteEnvelope = useDeleteAction('envelope')

async function removeEnvelope(envelope: Envelope) {
  await deleteEnvelope(t('envelopes.deleteConfirm', { name: envelope.name }), () => envelopesStore.remove(envelope.id))
}

function envelopeMenuItems(envelope: Envelope) {
  return [
    { label: t('common.edit'), icon: 'i-lucide-pencil', onSelect: () => envelopeForm.openEdit(envelope) },
    { label: t('common.delete'), icon: 'i-lucide-trash-2', color: 'rust' as const, onSelect: () => removeEnvelope(envelope) },
  ]
}
</script>

<template>
  <div class="flex flex-col gap-7">
    <EntityFormModal
      :open="envelopeForm.state.open"
      :title="envelopeForm.state.isEditing ? t('envelopes.editTitle') : t('envelopes.addTitle')"
      :loading="envelopeForm.state.submitting"
      @update:open="envelopeForm.state.open = $event"
      @submit="envelopeForm.submit()"
    >
      <UFormField :label="t('envelopes.fieldName')" class="sm:col-span-2">
        <UInput v-model="envelopeForm.state.form.name" :placeholder="t('envelopes.fieldNamePlaceholder')" class="w-full" />
      </UFormField>
      <UFormField :label="t('envelopes.fieldTarget')">
        <UInput v-model="envelopeForm.state.form.target_amount" type="number" :placeholder="t('envelopes.fieldTargetPlaceholder')" class="w-full" />
      </UFormField>
      <UFormField :label="t('envelopes.fieldCurrentAmount')">
        <UInput v-model="envelopeForm.state.form.current_amount" type="number" :placeholder="t('envelopes.fieldCurrentAmountPlaceholder')" class="w-full" />
      </UFormField>
      <UFormField :label="t('envelopes.fieldColor')" :description="t('envelopes.fieldColorDescription')">
        <UInput v-model="envelopeForm.state.form.color" type="color" class="h-9 w-16 p-1" />
      </UFormField>
      <UFormField :label="t('envelopes.fieldIcon')" :description="t('envelopes.fieldIconDescription')">
        <UInput v-model="envelopeForm.state.form.icon" :placeholder="t('envelopes.fieldIconPlaceholder')" class="w-full" />
      </UFormField>
    </EntityFormModal>

    <PageLoadingSkeleton v-if="initialLoading" />

    <template v-else-if="envelopesStore.envelopes.length > 0">
      <div class="flex flex-col gap-3">
        <span class="text-xs tracking-wide text-muted uppercase">{{ t('envelopes.heroKicker') }}</span>
        <span class="flex flex-wrap items-baseline gap-2.5">
          <span class="font-heading text-[clamp(38px,5vw,60px)] leading-none font-extrabold tracking-tight">{{ formatCurrency(totalAllocated) }}</span>
          <span v-if="totalTargets > 0" class="text-[17px] font-semibold text-muted">{{ t('envelopes.heroOfTargets', { targets: formatCurrency(totalTargets) }) }}</span>
        </span>
        <span v-if="fundedRatio !== null" class="stripe-track max-w-[560px]">
          <span class="stripe-fill" :style="{ width: `${Math.min(1, fundedRatio) * 100}%` }" />
        </span>
        <span class="text-sm text-muted">{{ t('envelopes.heroNote', { unallocated: formatCurrency(unallocated) }, envelopesStore.envelopes.length) }}</span>
      </div>

      <div class="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-2.5">
        <div v-for="envelope in sortedEnvelopes" :key="envelope.id" class="neu-surface flex flex-col gap-4 bg-default p-5">
          <span class="flex items-center justify-between gap-2.5">
            <span class="text-[14.5px] font-bold">{{ envelope.name }}</span>
            <span class="flex items-center gap-1">
              <UBadge variant="soft" size="sm" :color="status(envelope.target_amount, envelope.current_amount).color">
                {{ status(envelope.target_amount, envelope.current_amount).label }}
              </UBadge>
              <EllipsisMenu :items="envelopeMenuItems(envelope)" size="xs" />
            </span>
          </span>
          <span class="flex flex-col gap-1">
            <span class="font-heading text-[26px] leading-none font-extrabold tracking-tight">{{ formatAmount(envelope.current_amount) }}</span>
            <span v-if="envelope.target_amount" class="text-[12.5px] text-muted">{{ t('envelopes.ofTarget', { target: formatAmount(envelope.target_amount) }) }}</span>
          </span>
          <span class="flex flex-col gap-1.5">
            <span class="stripe-track">
              <span class="stripe-fill" :style="{ width: `${ratio(envelope.target_amount, envelope.current_amount) * 100}%` }" />
            </span>
            <span class="text-[12.5px] text-muted">
              {{ t('envelopes.fundedPct', { pct: Math.round(ratio(envelope.target_amount, envelope.current_amount) * 100) }) }}
            </span>
          </span>
        </div>
      </div>
    </template>

    <UEmpty
      v-else
      icon="i-lucide-mail"
      :title="t('envelopes.emptyTitle')"
      :description="t('envelopes.emptyDescription')"
      class="neu-inset"
    />
  </div>
</template>
