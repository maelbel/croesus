<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useToast } from '@nuxt/ui/composables'
import type { TableColumn, TableRow } from '@nuxt/ui'
import { useValuationsStore } from '../stores/valuations'
import { useAssetsStore } from '../stores/assets'
import { useCrudForm } from '../composables/useCrudForm'
import { useDeleteAction } from '../composables/useDeleteAction'
import {
  ACCOUNT_TYPE_LABELS,
  ASSET_CLASS_LABELS,
  AUTO_VALUATION_NOTE,
  type Account,
  type Asset,
  type AssetClass,
  type AssetCreate,
  type AssetUpdate,
  type Valuation,
  type ValuationCreate,
  type ValuationUpdate,
} from '../api/types'
import { deltaColorClass, formatCurrency, formatDate, formatPercent, formatSignedCurrency } from '../lib/format'
import EllipsisMenu from './EllipsisMenu.vue'

const props = defineProps<{
  open: boolean
  account: Account | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const valuationsStore = useValuationsStore()
const assetsStore = useAssetsStore()
const toast = useToast()

const accountValuations = computed(() => {
  if (!props.account) return []
  return [...(valuationsStore.byAccount.get(props.account.id) ?? [])].reverse()
})

const accountAssets = computed(() => (props.account ? assetsStore.forAccount(props.account.id) : []))
const hasHoldings = computed(() => accountAssets.value.length > 0)

const currentValue = computed(() => (props.account ? valuationsStore.currentValue(props.account.id) : 0))
const change30d = computed(() => (props.account ? valuationsStore.changeOverDays(props.account.id, 30) : null))

const emergencyRatio = computed(() => {
  const target = Number(props.account?.emergency_fund_target ?? 0)
  return target > 0 ? Math.min(1, currentValue.value / target) : 0
})

const totalMarketValue = computed(() => accountAssets.value.reduce((sum, asset) => sum + marketValue(asset), 0))

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

const deleteValuation = useDeleteAction('valuation')

async function removeValuation(valuation: Valuation) {
  await deleteValuation(
    `Delete the valuation from ${formatDate(valuation.date)}?`,
    () => valuationsStore.remove(valuation.id),
  )
}

function valuationMenuItems(valuation: Valuation) {
  return [
    { label: 'Edit', icon: 'i-lucide-pencil', onSelect: () => valuationForm.openEdit(valuation) },
    { label: 'Delete', icon: 'i-lucide-trash-2', color: 'rust' as const, onSelect: () => removeValuation(valuation) },
  ]
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

const activeTab = ref<'history' | 'holdings'>('history')

watch(
  () => [props.open, props.account?.id],
  () => {
    valuationForm.openCreate()
    assetForm.openCreate()
    activeTab.value = 'history'
  },
)

function costBasis(asset: Asset) {
  return Number(asset.quantity) * Number(asset.unit_cost)
}

/** The live fetched price if one exists yet, otherwise the cost basis price (see ROADMAP.md — automatic
 * price fetching only covers assets with a symbol; everything else always falls back to unit_cost). */
function currentPrice(asset: Asset) {
  return asset.current_price !== null ? Number(asset.current_price) : Number(asset.unit_cost)
}

function marketValue(asset: Asset) {
  return Number(asset.quantity) * currentPrice(asset)
}

function unrealizedGain(asset: Asset): number | null {
  return asset.current_price !== null ? marketValue(asset) - costBasis(asset) : null
}

function weightPct(asset: Asset): number {
  return totalMarketValue.value > 0 ? marketValue(asset) / totalMarketValue.value : 0
}

const totalUnrealizedGain = computed(() => {
  const withPrice = accountAssets.value.filter((asset) => asset.current_price !== null)
  if (withPrice.length === 0) return null
  return withPrice.reduce((sum, asset) => sum + (unrealizedGain(asset) ?? 0), 0)
})

// Biggest holdings first by default — more useful than API/creation order.
const sortedAssets = computed(() => [...accountAssets.value].sort((a, b) => marketValue(b) - marketValue(a)))

const deleteAsset = useDeleteAction('holding')

async function removeAsset(asset: Asset) {
  await deleteAsset(`Remove "${asset.name}" from this account?`, () => assetsStore.remove(asset.id))
}

function assetMenuItems(asset: Asset) {
  return [
    { label: 'Edit', icon: 'i-lucide-pencil', onSelect: () => assetForm.openEdit(asset) },
    { label: 'Remove', icon: 'i-lucide-trash-2', color: 'rust' as const, onSelect: () => removeAsset(asset) },
  ]
}

async function refreshPrices() {
  const result = await assetsStore.refreshPrices()
  if (result.failed.length > 0) {
    toast.add({
      title: `Couldn't fetch a price for ${result.failed.join(', ')}`,
      description:
        result.updated.length > 0 ? `${result.updated.length} other holding(s) updated.` : undefined,
      color: 'rust',
    })
  } else if (result.updated.length > 0) {
    toast.add({ title: `Refreshed ${result.updated.length} price(s)`, color: 'primary' })
  }
}

const valuationColumns: TableColumn<Valuation>[] = [
  { accessorKey: 'date', header: 'Date' },
  { accessorKey: 'value', header: 'Value', meta: { class: { th: 'text-right', td: 'text-right whitespace-nowrap' } } },
  { id: 'note', header: 'Note' },
  { id: 'actions', header: '', meta: { class: { td: 'text-right whitespace-nowrap' } } },
]

const holdingsColumns: TableColumn<Asset>[] = [
  { accessorKey: 'name', header: 'Holding', footer: '' },
  { accessorKey: 'quantity', header: 'Qty', meta: { class: { th: 'text-right', td: 'text-right whitespace-nowrap' } } },
  { id: 'price', header: 'Price', meta: { class: { th: 'text-right', td: 'text-right whitespace-nowrap' } } },
  { id: 'marketValue', header: 'Value', meta: { class: { th: 'text-right', td: 'text-right whitespace-nowrap' } }, footer: '' },
  { id: 'actions', header: '', meta: { class: { td: 'text-right whitespace-nowrap' } } },
]

const detailTabs = [
  { label: 'History', value: 'history', slot: 'history' as const },
  { label: 'Holdings', value: 'holdings', slot: 'holdings' as const },
]
</script>

<template>
  <USlideover
    :open="open"
    :title="account?.name ?? ''"
    side="right"
    :ui="{ content: 'sm:max-w-2xl' }"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div v-if="account" class="flex flex-col gap-8">
        <section class="neu-surface flex flex-col gap-4 border-2 border-default p-5">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="flex flex-col gap-1">
              <span class="font-heading text-[28px] leading-none font-extrabold">{{ formatCurrency(currentValue) }}</span>
              <span v-if="change30d?.ratio != null" class="text-sm" :class="deltaColorClass(change30d.ratio)">
                {{ formatSignedCurrency(change30d.delta) }} ({{ formatPercent(change30d.ratio) }}) · 30 d
              </span>
              <span v-else class="text-sm text-muted">No 30-day comparison yet</span>
            </div>
            <div class="flex flex-col items-end gap-1 text-right text-sm text-muted">
              <span class="flex items-center gap-2">
                {{ ACCOUNT_TYPE_LABELS[account.type] }}
                <UBadge v-if="account.is_emergency_fund" variant="outline" size="sm">Emergency fund</UBadge>
              </span>
              <span v-if="account.institution">{{ account.institution }}</span>
              <span v-if="account.opened_at">Opened {{ formatDate(account.opened_at) }}</span>
            </div>
          </div>

          <div v-if="account.is_emergency_fund && account.emergency_fund_target" class="flex flex-col gap-1.5">
            <span class="stripe-track">
              <span class="stripe-fill" :style="{ width: `${emergencyRatio * 100}%` }" />
            </span>
            <span class="text-sm text-muted">
              {{ formatCurrency(currentValue) }} of {{ formatCurrency(account.emergency_fund_target) }} target
            </span>
          </div>

          <p v-if="account.notes" class="text-sm text-muted">{{ account.notes }}</p>
        </section>

        <UTabs v-model="activeTab" :items="detailTabs" class="w-full">
          <template #history>
            <div class="flex flex-col gap-3.5 pt-4">
              <p v-if="hasHoldings" class="text-sm text-muted">
                This account's value is calculated automatically from its holdings below. A manual
                entry for today will be overwritten next time prices refresh.
              </p>

              <UForm
                class="neu-inset flex flex-wrap items-end gap-3 p-4"
                @submit="valuationForm.submit()"
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
              </UForm>

              <UTable v-if="accountValuations.length > 0" :data="accountValuations" :columns="valuationColumns">
                <template #date-cell="{ row }: { row: TableRow<Valuation> }">
                  <span class="text-sm whitespace-nowrap text-muted">{{ formatDate(row.original.date) }}</span>
                </template>
                <template #value-cell="{ row }: { row: TableRow<Valuation> }">
                  <span class="text-[15px] font-semibold whitespace-nowrap">{{ formatCurrency(row.original.value) }}</span>
                </template>
                <template #note-cell="{ row }: { row: TableRow<Valuation> }">
                  <span class="text-sm text-muted">
                    <UBadge v-if="row.original.note === AUTO_VALUATION_NOTE" variant="outline" size="sm" icon="i-lucide-refresh-cw">
                      Auto (holdings)
                    </UBadge>
                    <template v-else>{{ row.original.note }}</template>
                  </span>
                </template>
                <template #actions-cell="{ row }: { row: TableRow<Valuation> }">
                  <EllipsisMenu :items="valuationMenuItems(row.original)" size="xs" />
                </template>
              </UTable>
              <UEmpty
                v-else
                icon="i-lucide-line-chart"
                title="No valuations yet"
                description="Add one above to start tracking this account's value over time."
                class="neu-inset"
              />
            </div>
          </template>

          <template #holdings>
            <div class="flex flex-col gap-3.5 pt-4">
              <UForm class="neu-inset flex flex-wrap items-end gap-3 p-4" @submit="assetForm.submit()">
                <UFormField label="Name">
                  <UInput v-model="assetForm.state.form.name" placeholder="S&P 500 ETF" />
                </UFormField>
                <UFormField class="w-32">
                  <template #label>
                    <span class="inline-flex items-center gap-1">
                      Symbol
                      <UTooltip text="Yahoo Finance ticker (e.g. AAPL, CW8.PA) or crypto symbol (BTC, ETH...) for automatic pricing">
                        <UIcon name="i-lucide-info" class="text-muted" />
                      </UTooltip>
                    </span>
                  </template>
                  <UInput v-model="assetForm.state.form.symbol" placeholder="AAPL / CW8.PA / BTC" class="w-full" />
                </UFormField>
                <UFormField label="Class">
                  <USelect v-model="assetForm.state.form.asset_class" :items="assetClassOptions()" class="w-36" />
                </UFormField>
                <div class="flex items-end gap-3">
                  <UFormField label="Quantity">
                    <UInput v-model="assetForm.state.form.quantity" type="number" placeholder="10" class="w-24" />
                  </UFormField>
                  <UFormField label="Unit cost">
                    <UInput v-model="assetForm.state.form.unit_cost" type="number" placeholder="420.50" class="w-28" />
                  </UFormField>
                </div>
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
              </UForm>

              <UTable v-if="accountAssets.length > 0" :data="sortedAssets" :columns="holdingsColumns">
                <template #name-cell="{ row }: { row: TableRow<Asset> }">
                  <div class="flex flex-col gap-0.5">
                    <span class="text-[15px] font-semibold whitespace-nowrap">{{ row.original.name }}</span>
                    <span class="text-sm text-muted">
                      {{ ASSET_CLASS_LABELS[row.original.asset_class] }}
                      <template v-if="row.original.symbol"> · {{ row.original.symbol }}</template>
                    </span>
                    <span v-if="accountAssets.length > 1" class="text-xs text-muted">
                      {{ Math.round(weightPct(row.original) * 100) }}% of holdings
                    </span>
                  </div>
                </template>
                <template #name-footer>
                  <span class="text-sm text-muted">
                    {{ accountAssets.length }} holding{{ accountAssets.length === 1 ? '' : 's' }}
                    <template v-if="totalUnrealizedGain !== null">
                      ·
                      <span :class="deltaColorClass(totalUnrealizedGain)">{{ formatSignedCurrency(totalUnrealizedGain) }}</span>
                      unrealized
                    </template>
                  </span>
                </template>
                <template #quantity-cell="{ row }: { row: TableRow<Asset> }">
                  <span class="whitespace-nowrap text-sm text-muted">{{ row.original.quantity }}</span>
                </template>
                <template #price-cell="{ row }: { row: TableRow<Asset> }">
                  <UTooltip :text="row.original.price_updated_at ? `Live price as of ${formatDate(row.original.price_updated_at)}` : 'No live price yet — showing cost basis'">
                    <span class="inline-flex items-center gap-1 whitespace-nowrap text-sm text-muted">
                      {{ formatCurrency(currentPrice(row.original)) }}
                      <UIcon v-if="row.original.current_price !== null" name="i-lucide-radio" class="text-primary" />
                    </span>
                  </UTooltip>
                </template>
                <template #marketValue-cell="{ row }: { row: TableRow<Asset> }">
                  <div class="text-[15px] font-semibold">{{ formatCurrency(marketValue(row.original)) }}</div>
                  <div v-if="unrealizedGain(row.original) !== null" class="text-xs" :class="deltaColorClass(unrealizedGain(row.original))">
                    {{ formatSignedCurrency(unrealizedGain(row.original)!) }}
                  </div>
                </template>
                <template #marketValue-footer>
                  <span class="text-sm font-semibold whitespace-nowrap">{{ formatCurrency(totalMarketValue) }}</span>
                </template>
                <template #actions-header>
                  <div v-if="accountAssets.some((asset) => asset.symbol)" class="flex justify-end">
                    <UButton
                      variant="ghost"
                      color="neutral"
                      size="xs"
                      icon="i-lucide-refresh-cw"
                      :loading="assetsStore.refreshingPrices"
                      :disabled="assetsStore.refreshingPrices"
                      @click="refreshPrices"
                    >
                      {{ assetsStore.refreshingPrices ? 'Refreshing…' : 'Refresh' }}
                    </UButton>
                  </div>
                </template>
                <template #actions-cell="{ row }: { row: TableRow<Asset> }">
                  <EllipsisMenu :items="assetMenuItems(row.original)" size="xs" />
                </template>
              </UTable>
              <UEmpty
                v-else
                icon="i-lucide-briefcase"
                title="No holdings yet"
                description="Add one above — set a symbol to pick up a live market price automatically."
                class="neu-inset"
              />
            </div>
          </template>
        </UTabs>
      </div>
    </template>
  </USlideover>
</template>
