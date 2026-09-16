<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEnvelopesStore } from '../stores/envelopes'
import { useAccountsStore } from '../stores/accounts'
import { useValuationsStore } from '../stores/valuations'
import { useCrudForm } from '../composables/useCrudForm'
import { useDeleteAction } from '../composables/useDeleteAction'
import { usePageAction } from '../composables/usePageAction'
import { formatCurrency } from '../lib/format'
import type { Envelope, EnvelopeCreate } from '../api/types'
import StatCard from '../components/StatCard.vue'
import StatCardRow from '../components/StatCardRow.vue'
import EntityFormModal from '../components/EntityFormModal.vue'
import EllipsisMenu from '../components/EllipsisMenu.vue'
import PageLoadingSkeleton from '../components/PageLoadingSkeleton.vue'
import { useThemeStore } from '../stores/theme'

const { t } = useI18n()
const envelopesStore = useEnvelopesStore()

// Only while the very first fetch is still in flight — once any envelopes
// exist, later refetches (after a create/update/remove) don't re-show this.
const initialLoading = computed(() => envelopesStore.loading && envelopesStore.envelopes.length === 0)
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

const statusOptions = computed(() => [
  { label: t('common.allStatuses'), value: null },
  { label: t('envelopes.statusFunded'), value: 'funded' as const },
  { label: t('envelopes.statusFilling'), value: 'filling' as const },
  { label: t('envelopes.statusEmpty'), value: 'empty' as const },
  { label: t('envelopes.statusUnfunded'), value: 'unfunded' as const },
])

const filters = reactive({
  search: '',
  status: null as EnvelopeStatusKey | null,
})

const filteredEnvelopes = computed(() => {
  const search = filters.search.trim().toLowerCase()
  return envelopesStore.envelopes.filter((envelope) => {
    if (filters.status && statusKey(envelope.target_amount, envelope.current_amount) !== filters.status) return false
    if (!search) return true
    return envelope.name.toLowerCase().includes(search)
  })
})

function barColor(target: string | null, current: string) {
  return statusKey(target, current) === 'funded'
    ? 'var(--ui-primary)'
    : 'color-mix(in srgb, var(--ui-text) 62%, transparent)'
}

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
      <UFormField :label="t('envelopes.fieldName')">
        <UInput v-model="envelopeForm.state.form.name" :placeholder="t('envelopes.fieldNamePlaceholder')" />
      </UFormField>
      <UFormField :label="t('envelopes.fieldTarget')">
        <UInput v-model="envelopeForm.state.form.target_amount" type="number" :placeholder="t('envelopes.fieldTargetPlaceholder')" />
      </UFormField>
      <UFormField :label="t('envelopes.fieldCurrentAmount')">
        <UInput v-model="envelopeForm.state.form.current_amount" type="number" :placeholder="t('envelopes.fieldCurrentAmountPlaceholder')" />
      </UFormField>
      <UFormField :label="t('envelopes.fieldColor')" :description="t('envelopes.fieldColorDescription')">
        <UInput v-model="envelopeForm.state.form.color" type="color" class="h-9 w-16 p-1" />
      </UFormField>
      <UFormField :label="t('envelopes.fieldIcon')" :description="t('envelopes.fieldIconDescription')">
        <UInput v-model="envelopeForm.state.form.icon" :placeholder="t('envelopes.fieldIconPlaceholder')" />
      </UFormField>
    </EntityFormModal>

    <PageLoadingSkeleton v-if="initialLoading" />

    <template v-else-if="envelopesStore.envelopes.length > 0">
      <StatCardRow>
        <StatCard
          :label="t('envelopes.allocated')"
          :value="formatCurrency(totalAllocated)"
          :note="t('envelopes.allocatedNote', envelopesStore.envelopes.length)"
        />
        <StatCard :label="t('envelopes.targets')" value-color="muted" :value="formatCurrency(totalTargets)" :note="fundedRatio === null ? undefined : t('envelopes.targetsFundedNote', { pct: Math.round(fundedRatio * 100) })" />
        <StatCard :label="t('envelopes.unallocated')" value-color="positive" :value="formatCurrency(unallocated)" :note="t('envelopes.unallocatedNote')" />
      </StatCardRow>

      <div class="flex flex-wrap items-end gap-4">
        <UFormField :label="t('envelopes.searchLabel')" class="w-64">
          <UInput v-model="filters.search" :placeholder="t('envelopes.searchPlaceholder')" />
        </UFormField>
        <UFormField :label="t('envelopes.statusLabel')" class="w-48">
          <USelect v-model="filters.status" :items="statusOptions" :placeholder="t('common.allStatuses')" />
        </UFormField>
      </div>

      <div
        :class="
          themeStore.skin === 'neumorphic'
            ? 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'
            : 'grid grid-cols-1 gap-0.5 border-2 border-default bg-accented sm:grid-cols-2 lg:grid-cols-3'
        "
      >
        <div
          v-for="envelope in filteredEnvelopes"
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
              <span class="font-heading text-[28px] leading-none font-extrabold">{{ formatAmount(envelope.current_amount) }}</span>
              <span class="text-[15px] text-muted">/ {{ formatAmount(envelope.target_amount) }}</span>
            </span>
            <span class="flex items-center justify-between text-sm text-muted">
              <span>{{ t('envelopes.fundedPct', { pct: Math.round(ratio(envelope.target_amount, envelope.current_amount) * 100) }) }}</span>
              <EllipsisMenu :items="envelopeMenuItems(envelope)" size="xs" />
            </span>
          </div>
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
