<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from '@nuxt/ui/composables'
import type { TableColumn, TableRow } from '@nuxt/ui'
import { useValuationsStore } from '../stores/valuations'
import { useAssetsStore } from '../stores/assets'
import { useCrudForm } from '../composables/useCrudForm'
import { useDeleteAction } from '../composables/useDeleteAction'
import {
  ASSET_CLASSES,
  accountTypeLabel,
  assetClassLabel,
  AUTO_VALUATION_NOTE,
  type Account,
  type Asset,
  type AssetCreate,
  type AssetUpdate,
  type Valuation,
  type ValuationCreate,
  type ValuationUpdate,
} from '../api/types'
import { deltaColorClass, formatCurrency, formatDate, formatPercent, formatSignedCurrency } from '../lib/format'
import EllipsisMenu from './EllipsisMenu.vue'

const { t } = useI18n()

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
  return ASSET_CLASSES.map((value) => ({ label: assetClassLabel(value), value }))
}

type ValuationFormValues = Omit<ValuationCreate, 'account_id'>

const valuationForm = useCrudForm<Valuation, ValuationFormValues, ValuationUpdate>({
  entityKey: 'valuation',
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
    t('accountDetail.deleteValuationConfirm', { date: formatDate(valuation.date) }),
    () => valuationsStore.remove(valuation.id),
  )
}

function valuationMenuItems(valuation: Valuation) {
  return [
    { label: t('common.edit'), icon: 'i-lucide-pencil', onSelect: () => valuationForm.openEdit(valuation) },
    { label: t('common.delete'), icon: 'i-lucide-trash-2', color: 'rust' as const, onSelect: () => removeValuation(valuation) },
  ]
}

type AssetFormValues = Omit<AssetCreate, 'account_id'>

const assetForm = useCrudForm<Asset, AssetFormValues, AssetUpdate>({
  entityKey: 'holding',
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
  await deleteAsset(t('accountDetail.removeHoldingConfirm', { name: asset.name }), () => assetsStore.remove(asset.id))
}

function assetMenuItems(asset: Asset) {
  return [
    { label: t('common.edit'), icon: 'i-lucide-pencil', onSelect: () => assetForm.openEdit(asset) },
    { label: t('common.remove'), icon: 'i-lucide-trash-2', color: 'rust' as const, onSelect: () => removeAsset(asset) },
  ]
}

async function refreshPrices() {
  const result = await assetsStore.refreshPrices()
  if (result.failed.length > 0) {
    toast.add({
      title: t('accountDetail.refreshFailedTitle', { symbols: result.failed.join(', ') }),
      description:
        result.updated.length > 0
          ? t('accountDetail.refreshFailedOthersUpdated', result.updated.length)
          : undefined,
      color: 'rust',
    })
  } else if (result.updated.length > 0) {
    toast.add({ title: t('accountDetail.refreshSuccessTitle', result.updated.length), color: 'primary' })
  }
}

const valuationColumns = computed<TableColumn<Valuation>[]>(() => [
  { accessorKey: 'date', header: t('accountDetail.fieldDate') },
  { accessorKey: 'value', header: t('accountDetail.fieldValue'), meta: { class: { th: 'text-right', td: 'text-right whitespace-nowrap' } } },
  { id: 'note', header: t('accountDetail.fieldNote') },
  { id: 'actions', header: '', meta: { class: { td: 'text-right whitespace-nowrap' } } },
])

const holdingsColumns = computed<TableColumn<Asset>[]>(() => [
  { accessorKey: 'name', header: t('accountDetail.columnHolding'), footer: '' },
  { accessorKey: 'quantity', header: t('accountDetail.columnQty'), meta: { class: { th: 'text-right', td: 'text-right whitespace-nowrap' } } },
  { id: 'price', header: t('accountDetail.columnPrice'), meta: { class: { th: 'text-right', td: 'text-right whitespace-nowrap' } } },
  { id: 'marketValue', header: t('accountDetail.columnValue'), meta: { class: { th: 'text-right', td: 'text-right whitespace-nowrap' } }, footer: '' },
  { id: 'actions', header: '', meta: { class: { td: 'text-right whitespace-nowrap' } } },
])

const detailTabs = computed(() => [
  { label: t('accountDetail.tabHistory'), value: 'history', slot: 'history' as const },
  { label: t('accountDetail.tabHoldings'), value: 'holdings', slot: 'holdings' as const },
])
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
              <span v-else class="text-sm text-muted">{{ t('accountDetail.noComparisonYet') }}</span>
            </div>
            <div class="flex flex-col items-end gap-1 text-right text-sm text-muted">
              <span class="flex items-center gap-2">
                {{ accountTypeLabel(account.type) }}
                <UBadge v-if="account.is_emergency_fund" variant="outline" size="sm">{{ t('accounts.emergencyFundBadge') }}</UBadge>
              </span>
              <span v-if="account.institution">{{ account.institution }}</span>
              <span v-if="account.opened_at">{{ t('accountDetail.openedOn', { date: formatDate(account.opened_at) }) }}</span>
            </div>
          </div>

          <div v-if="account.is_emergency_fund && account.emergency_fund_target" class="flex flex-col gap-1.5">
            <span class="stripe-track">
              <span class="stripe-fill" :style="{ width: `${emergencyRatio * 100}%` }" />
            </span>
            <span class="text-sm text-muted">
              {{ t('accountDetail.targetProgress', { current: formatCurrency(currentValue), target: formatCurrency(account.emergency_fund_target) }) }}
            </span>
          </div>

          <p v-if="account.notes" class="text-sm text-muted">{{ account.notes }}</p>
        </section>

        <UTabs v-model="activeTab" :items="detailTabs" class="w-full">
          <template #history>
            <div class="flex flex-col gap-3.5 pt-4">
              <p v-if="hasHoldings" class="text-sm text-muted">
                {{ t('accountDetail.autoValueNote') }}
              </p>

              <UForm
                class="neu-inset flex flex-wrap items-end gap-3 p-4"
                @submit="valuationForm.submit()"
              >
                <UFormField :label="t('accountDetail.fieldDate')">
                  <UInput v-model="valuationForm.state.form.date" type="date" />
                </UFormField>
                <UFormField :label="t('accountDetail.fieldValue')">
                  <UInput v-model="valuationForm.state.form.value" type="number" :placeholder="t('accountDetail.fieldValuePlaceholder')" />
                </UFormField>
                <UFormField :label="t('accountDetail.fieldNote')" class="min-w-[140px] flex-1">
                  <UInput v-model="valuationForm.state.form.note" :placeholder="t('accountDetail.fieldNotePlaceholder')" />
                </UFormField>
                <UButton type="submit" :loading="valuationForm.state.submitting">
                  {{ valuationForm.state.isEditing ? t('common.save') : t('common.add') }}
                </UButton>
                <UButton
                  v-if="valuationForm.state.isEditing"
                  variant="ghost"
                  color="neutral"
                  @click="valuationForm.openCreate()"
                >
                  {{ t('common.cancel') }}
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
                      {{ t('accountDetail.autoHoldingsBadge') }}
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
                :title="t('accountDetail.emptyValuationsTitle')"
                :description="t('accountDetail.emptyValuationsDescription')"
                class="neu-inset"
              />
            </div>
          </template>

          <template #holdings>
            <div class="flex flex-col gap-3.5 pt-4">
              <UForm class="neu-inset flex flex-wrap items-end gap-3 p-4" @submit="assetForm.submit()">
                <UFormField :label="t('accountDetail.fieldHoldingName')">
                  <UInput v-model="assetForm.state.form.name" :placeholder="t('accountDetail.fieldHoldingNamePlaceholder')" />
                </UFormField>
                <UFormField class="w-32">
                  <template #label>
                    <span class="inline-flex items-center gap-1">
                      {{ t('accountDetail.fieldSymbol') }}
                      <UTooltip :text="t('accountDetail.fieldSymbolTooltip')">
                        <UIcon name="i-lucide-info" class="text-muted" />
                      </UTooltip>
                    </span>
                  </template>
                  <UInput v-model="assetForm.state.form.symbol" :placeholder="t('accountDetail.fieldSymbolPlaceholder')" class="w-full" />
                </UFormField>
                <UFormField :label="t('accountDetail.fieldClass')">
                  <USelect v-model="assetForm.state.form.asset_class" :items="assetClassOptions()" class="w-36" />
                </UFormField>
                <div class="flex items-end gap-3">
                  <UFormField :label="t('accountDetail.fieldQuantity')">
                    <UInput v-model="assetForm.state.form.quantity" type="number" :placeholder="t('accountDetail.fieldQuantityPlaceholder')" class="w-24" />
                  </UFormField>
                  <UFormField :label="t('accountDetail.fieldUnitCost')">
                    <UInput v-model="assetForm.state.form.unit_cost" type="number" :placeholder="t('accountDetail.fieldUnitCostPlaceholder')" class="w-28" />
                  </UFormField>
                </div>
                <UButton type="submit" :loading="assetForm.state.submitting">
                  {{ assetForm.state.isEditing ? t('common.save') : t('common.add') }}
                </UButton>
                <UButton
                  v-if="assetForm.state.isEditing"
                  variant="ghost"
                  color="neutral"
                  @click="assetForm.openCreate()"
                >
                  {{ t('common.cancel') }}
                </UButton>
              </UForm>

              <UTable v-if="accountAssets.length > 0" :data="sortedAssets" :columns="holdingsColumns">
                <template #name-cell="{ row }: { row: TableRow<Asset> }">
                  <div class="flex flex-col gap-0.5">
                    <span class="text-[15px] font-semibold whitespace-nowrap">{{ row.original.name }}</span>
                    <span class="text-sm text-muted">
                      {{ assetClassLabel(row.original.asset_class) }}
                      <template v-if="row.original.symbol"> · {{ row.original.symbol }}</template>
                    </span>
                    <span v-if="accountAssets.length > 1" class="text-xs text-muted">
                      {{ t('accountDetail.weightPct', { pct: Math.round(weightPct(row.original) * 100) }) }}
                    </span>
                  </div>
                </template>
                <template #name-footer>
                  <span class="text-sm text-muted">
                    {{ t('accountDetail.holdingsFooter', accountAssets.length) }}
                    <template v-if="totalUnrealizedGain !== null">
                      ·
                      <span :class="deltaColorClass(totalUnrealizedGain)">{{ formatSignedCurrency(totalUnrealizedGain) }}</span>
                      {{ t('accountDetail.unrealizedSuffix') }}
                    </template>
                  </span>
                </template>
                <template #quantity-cell="{ row }: { row: TableRow<Asset> }">
                  <span class="whitespace-nowrap text-sm text-muted">{{ row.original.quantity }}</span>
                </template>
                <template #price-cell="{ row }: { row: TableRow<Asset> }">
                  <UTooltip :text="row.original.price_updated_at ? t('accountDetail.livePriceAsOf', { date: formatDate(row.original.price_updated_at) }) : t('accountDetail.noLivePriceYet')">
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
                      {{ assetsStore.refreshingPrices ? t('accountDetail.refreshing') : t('accountDetail.refresh') }}
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
                :title="t('accountDetail.emptyHoldingsTitle')"
                :description="t('accountDetail.emptyHoldingsDescription')"
                class="neu-inset"
              />
            </div>
          </template>
        </UTabs>
      </div>
    </template>
  </USlideover>
</template>
