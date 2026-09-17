<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useEnvelopesStore } from '../stores/envelopes'
import { useCrudForm } from '../composables/useCrudForm'
import { useDeleteAction } from '../composables/useDeleteAction'
import { usePageTitle } from '../composables/usePageTitle'
import type { Envelope, EnvelopeCreate } from '../api/types'
import { formatCurrency } from '../lib/format'
import PageLoadingSkeleton from '../components/PageLoadingSkeleton.vue'

const props = defineProps<{ id: string }>()

const { t } = useI18n()
const router = useRouter()
const envelopesStore = useEnvelopesStore()

const envelope = computed<Envelope | null>(
  () => envelopesStore.envelopes.find((e) => e.id === Number(props.id)) ?? null,
)

// Covers both a bad id in the URL and an envelope deleted (from another tab,
// or via this page's own delete button) while its page is still open.
watch(
  () => [envelope.value, envelopesStore.loading] as const,
  ([found, loading]) => {
    if (!found && !loading) router.replace('/envelopes')
  },
  { immediate: true },
)

usePageTitle(() => t('router.envelopes.kicker'), () => envelope.value?.name ?? '')

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

const status = computed(() => {
  if (!envelope.value) return null
  const key = statusKey(envelope.value.target_amount, envelope.value.current_amount)
  return { key, label: t(`envelopes.status${key.charAt(0).toUpperCase()}${key.slice(1)}`), color: STATUS_COLOR[key] }
})

// Editable directly on the page (no modal) — kept in sync with whichever
// envelope this route currently points at.
const envelopeForm = useCrudForm<Envelope, EnvelopeCreate>({
  entityKey: 'envelope',
  createDefaults: () => ({
    name: '',
    target_amount: null,
    current_amount: '0',
    color: null,
    icon: null,
  }),
  toFormValues: (e) => ({
    name: e.name,
    target_amount: e.target_amount,
    current_amount: e.current_amount,
    color: e.color,
    icon: e.icon,
  }),
  create: (payload) => envelopesStore.create(payload),
  update: (id, payload) => envelopesStore.update(id, payload),
})

watch(
  envelope,
  (e) => {
    if (e) envelopeForm.openEdit(e)
  },
  { immediate: true },
)

// Starts collapsed to a read-only summary, same rationale as AccountPage.vue
// and LiabilityPage.vue: most visits are to check the balance, not to
// change the envelope's own fields.
const editingDetails = ref(false)

async function saveEnvelopeDetails() {
  if (await envelopeForm.submit()) editingDetails.value = false
}

function cancelEditDetails() {
  if (envelope.value) envelopeForm.openEdit(envelope.value)
  editingDetails.value = false
}

const deleteEnvelope = useDeleteAction('envelope')

async function removeEnvelope() {
  if (!envelope.value) return
  await deleteEnvelope(t('envelopes.deleteConfirm', { name: envelope.value.name }), async () => {
    await envelopesStore.remove(envelope.value!.id)
    router.push('/envelopes')
  })
}

// A fresh id in the route (navigating from one envelope's page straight to
// another's) shouldn't leave the previous one's page stuck in edit mode.
watch(
  () => props.id,
  () => {
    editingDetails.value = false
  },
)
</script>

<template>
  <div v-if="envelope" class="flex flex-col gap-8">
    <RouterLink to="/envelopes" class="inline-flex w-fit items-center gap-1 text-sm text-muted hover:text-toned">
      <UIcon name="i-lucide-chevron-left" class="size-3.5" />
      {{ t('envelopeDetail.backToEnvelopes') }}
    </RouterLink>

    <section class="neu-surface flex flex-col gap-4 p-5">
      <div class="flex flex-col gap-1">
        <span class="flex items-center justify-between gap-4">
          <span class="text-xs tracking-wide text-muted uppercase">{{ t('envelopes.fieldCurrentAmount') }}</span>
          <UBadge v-if="status" variant="soft" size="sm" :color="status.color">{{ status.label }}</UBadge>
        </span>
        <span class="font-heading text-[40px] leading-none font-extrabold">{{ formatCurrency(envelope.current_amount) }}</span>
        <span v-if="envelope.target_amount" class="text-sm text-muted">{{ t('envelopes.ofTarget', { target: formatCurrency(envelope.target_amount) }) }}</span>
      </div>

      <div class="flex flex-col gap-1.5">
        <span class="stripe-track">
          <span class="stripe-fill" :style="{ width: `${ratio(envelope.target_amount, envelope.current_amount) * 100}%` }" />
        </span>
        <span class="text-sm text-muted">
          {{ t('envelopes.fundedPct', { pct: Math.round(ratio(envelope.target_amount, envelope.current_amount) * 100) }) }}
        </span>
      </div>
    </section>

    <section class="flex flex-col gap-4">
      <div class="flex items-center justify-between gap-4">
        <span class="text-xs tracking-wide text-muted uppercase">{{ t('envelopeDetail.detailsHeading') }}</span>
        <UButton
          v-if="!editingDetails"
          variant="ghost"
          color="neutral"
          size="xs"
          icon="i-lucide-pencil"
          @click="editingDetails = true"
        >
          {{ t('common.edit') }}
        </UButton>
      </div>

      <div class="neu-surface flex flex-col gap-4 p-5">
        <template v-if="!editingDetails">
          <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div v-if="envelope.target_amount" class="flex flex-col gap-0.5">
              <dt class="text-xs text-muted">{{ t('envelopes.fieldTarget') }}</dt>
              <dd class="text-[15px]">{{ formatCurrency(envelope.target_amount) }}</dd>
            </div>
          </dl>
        </template>

        <template v-else>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <UFormField :label="t('envelopes.fieldName')" class="sm:col-span-2">
              <UInput v-model="envelopeForm.state.form.name" :placeholder="t('envelopes.fieldNamePlaceholder')" class="w-full" />
            </UFormField>
            <UFormField :label="t('envelopes.fieldTarget')">
              <UInput v-model="envelopeForm.state.form.target_amount" type="number" :placeholder="t('envelopes.fieldTargetPlaceholder')" class="w-full" />
            </UFormField>
            <UFormField :label="t('envelopes.fieldCurrentAmount')">
              <UInput v-model="envelopeForm.state.form.current_amount" type="number" :placeholder="t('envelopes.fieldCurrentAmountPlaceholder')" class="w-full" />
            </UFormField>
          </div>
          <div class="flex items-center gap-2.5">
            <UButton :loading="envelopeForm.state.submitting" @click="saveEnvelopeDetails">
              {{ t('common.save') }}
            </UButton>
            <UButton variant="ghost" color="neutral" :disabled="envelopeForm.state.submitting" @click="cancelEditDetails">
              {{ t('common.cancel') }}
            </UButton>
          </div>
        </template>

        <div class="flex flex-wrap items-center justify-between gap-3 border-t border-default pt-4">
          <span class="text-sm text-muted">{{ t('envelopeDetail.deleteEnvelopeHint') }}</span>
          <UButton color="rust" variant="outline" size="sm" class="flex-none" @click="removeEnvelope">
            {{ t('envelopeDetail.deleteEnvelope') }}
          </UButton>
        </div>
      </div>
    </section>
  </div>

  <PageLoadingSkeleton v-else />
</template>
