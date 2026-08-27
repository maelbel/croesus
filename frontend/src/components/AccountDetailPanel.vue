<script setup lang="ts">
import { computed, watch } from 'vue'
import { useValuationsStore } from '../stores/valuations'
import { useAssetsStore } from '../stores/assets'
import { useCrudForm } from '../composables/useCrudForm'
import {
  ASSET_CLASS_LABELS,
  type Account,
  type Asset,
  type AssetClass,
  type AssetCreate,
  type AssetUpdate,
  type Valuation,
  type ValuationCreate,
  type ValuationUpdate,
} from '../api/types'
import { formatCurrency, formatDate } from '../lib/format'

const props = defineProps<{
  open: boolean
  account: Account | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const valuationsStore = useValuationsStore()
const assetsStore = useAssetsStore()

const accountValuations = computed(() => {
  if (!props.account) return []
  return [...(valuationsStore.byAccount.get(props.account.id) ?? [])].reverse()
})

const accountAssets = computed(() => (props.account ? assetsStore.forAccount(props.account.id) : []))

function assetClassOptions() {
  return Object.entries(ASSET_CLASS_LABELS).map(([value, label]) => ({ label, value: value as AssetClass }))
}

type ValuationFormValues = Omit<ValuationCreate, 'account_id'>

const valuationForm = useCrudForm<Valuation, ValuationFormValues, ValuationUpdate>({
  entityLabel: 'valuation',
  createDefaults: () => ({
    date: new Date().toISOString().slice(0, 10),
    value: '',
    note: null,
  }),
  toFormValues: (valuation) => ({
    date: valuation.date,
    value: valuation.value,
    note: valuation.note,
  }),
  create: (payload) => valuationsStore.create({ ...payload, account_id: props.account!.id }),
  update: (id, payload) => valuationsStore.update(id, payload),
})

async function removeValuation(valuation: Valuation) {
  if (!window.confirm(`Delete the valuation from ${formatDate(valuation.date)}?`)) return
  await valuationsStore.remove(valuation.id)
}

type AssetFormValues = Omit<AssetCreate, 'account_id'>

const assetForm = useCrudForm<Asset, AssetFormValues, AssetUpdate>({
  entityLabel: 'holding',
  createDefaults: () => ({
    name: '',
    symbol: null,
    asset_class: 'stock',
    quantity: '',
    unit_cost: '',
  }),
  toFormValues: (asset) => ({
    name: asset.name,
    symbol: asset.symbol,
    asset_class: asset.asset_class,
    quantity: asset.quantity,
    unit_cost: asset.unit_cost,
  }),
  create: (payload) => assetsStore.create({ ...payload, account_id: props.account!.id }),
  update: (id, payload) => assetsStore.update(id, payload),
})

watch(
  () => [props.open, props.account?.id],
  () => {
    valuationForm.openCreate()
    assetForm.openCreate()
  },
)

function costBasis(asset: Asset) {
  return Number(asset.quantity) * Number(asset.unit_cost)
}

async function removeAsset(asset: Asset) {
  if (!window.confirm(`Remove "${asset.name}" from this account?`)) return
  await assetsStore.remove(asset.id)
}
</script>

<template>
  <USlideover :open="open" :title="account?.name ?? ''" side="right" @update:open="emit('update:open', $event)">
    <template #body>
      <div v-if="account" class="flex flex-col gap-8">
        <section class="flex flex-col gap-3.5">
          <h3 class="text-sm font-semibold text-muted">Valuation history</h3>

          <form
            class="neu-inset flex flex-wrap items-end gap-3 p-4"
            @submit.prevent="valuationForm.submit()"
          >
            <UFormField label="Date">
              <UInput v-model="valuationForm.state.form.date" type="date" />
            </UFormField>
            <UFormField label="Value">
              <UInput v-model="valuationForm.state.form.value" type="number" placeholder="12500" />
            </UFormField>
            <UFormField label="Note" class="min-w-[140px] flex-1">
              <UInput v-model="valuationForm.state.form.note" placeholder="Optional" />
            </UFormField>
            <UButton type="submit" :loading="valuationForm.state.submitting">
              {{ valuationForm.state.isEditing ? 'Save' : 'Add' }}
            </UButton>
            <UButton
              v-if="valuationForm.state.isEditing"
              variant="ghost"
              color="neutral"
              @click="valuationForm.openCreate()"
            >
              Cancel
            </UButton>
          </form>

          <table v-if="accountValuations.length > 0" class="w-full border-collapse">
            <tbody>
              <tr v-for="valuation in accountValuations" :key="valuation.id" class="border-b border-default">
                <td class="py-2.5 pr-3 text-sm whitespace-nowrap text-muted">{{ formatDate(valuation.date) }}</td>
                <td class="py-2.5 pr-3 text-right text-[15px] font-semibold whitespace-nowrap">
                  {{ formatCurrency(valuation.value) }}
                </td>
                <td class="py-2.5 pr-3 text-sm text-muted">{{ valuation.note }}</td>
                <td class="py-2.5 text-right whitespace-nowrap">
                  <UButton
                    variant="ghost"
                    color="neutral"
                    icon="i-lucide-pencil"
                    size="xs"
                    title="Edit valuation"
                    @click="valuationForm.openEdit(valuation)"
                  />
                  <UButton
                    variant="ghost"
                    color="error"
                    icon="i-lucide-trash-2"
                    size="xs"
                    title="Delete valuation"
                    @click="removeValuation(valuation)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
          <p v-else class="text-sm text-muted">No valuations recorded yet — add one above.</p>
        </section>

        <section class="flex flex-col gap-3.5">
          <h3 class="text-sm font-semibold text-muted">Holdings</h3>

          <form class="neu-inset flex flex-wrap items-end gap-3 p-4" @submit.prevent="assetForm.submit()">
            <UFormField label="Name">
              <UInput v-model="assetForm.state.form.name" placeholder="S&P 500 ETF" />
            </UFormField>
            <UFormField label="Symbol">
              <UInput v-model="assetForm.state.form.symbol" placeholder="CW8" class="w-24" />
            </UFormField>
            <UFormField label="Class">
              <USelect v-model="assetForm.state.form.asset_class" :items="assetClassOptions()" class="w-36" />
            </UFormField>
            <UFormField label="Quantity">
              <UInput v-model="assetForm.state.form.quantity" type="number" placeholder="10" class="w-24" />
            </UFormField>
            <UFormField label="Unit cost">
              <UInput v-model="assetForm.state.form.unit_cost" type="number" placeholder="420.50" class="w-28" />
            </UFormField>
            <UButton type="submit" :loading="assetForm.state.submitting">
              {{ assetForm.state.isEditing ? 'Save' : 'Add' }}
            </UButton>
            <UButton
              v-if="assetForm.state.isEditing"
              variant="ghost"
              color="neutral"
              @click="assetForm.openCreate()"
            >
              Cancel
            </UButton>
          </form>

          <table v-if="accountAssets.length > 0" class="w-full border-collapse">
            <tbody>
              <tr v-for="asset in accountAssets" :key="asset.id" class="border-b border-default">
                <td class="py-2.5 pr-3">
                  <div class="flex flex-col gap-0.5">
                    <span class="text-[15px] font-semibold whitespace-nowrap">{{ asset.name }}</span>
                    <span class="text-sm text-muted">
                      {{ ASSET_CLASS_LABELS[asset.asset_class] }}
                      <template v-if="asset.symbol"> · {{ asset.symbol }}</template>
                    </span>
                  </div>
                </td>
                <td class="py-2.5 pr-3 text-right text-sm whitespace-nowrap text-muted">
                  {{ asset.quantity }} × {{ formatCurrency(asset.unit_cost) }}
                </td>
                <td class="py-2.5 pr-3 text-right text-[15px] font-semibold whitespace-nowrap">
                  {{ formatCurrency(costBasis(asset)) }}
                </td>
                <td class="py-2.5 text-right whitespace-nowrap">
                  <UButton
                    variant="ghost"
                    color="neutral"
                    icon="i-lucide-pencil"
                    size="xs"
                    title="Edit holding"
                    @click="assetForm.openEdit(asset)"
                  />
                  <UButton
                    variant="ghost"
                    color="error"
                    icon="i-lucide-trash-2"
                    size="xs"
                    title="Remove holding"
                    @click="removeAsset(asset)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
          <p v-else class="text-sm text-muted">No holdings recorded yet — cost basis only, not a live market value.</p>
        </section>
      </div>
    </template>
  </USlideover>
</template>
