<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { TableColumn, TableRow } from '@nuxt/ui'
import { useAccountsStore } from '../stores/accounts'
import { useLiabilitiesStore } from '../stores/liabilities'
import { useEnvelopesStore } from '../stores/envelopes'
import { useNetWorthStore } from '../stores/networth'
import { useValuationsStore } from '../stores/valuations'
import { accountTypeLabel, type NetWorthHistoryPoint } from '../api/types'
import { formatCurrency, formatSignedCurrency, formatDate, deltaColorClass } from '../lib/format'
import { usePageAction } from '../composables/usePageAction'
import StatCard from '../components/StatCard.vue'
import StatCardRow from '../components/StatCardRow.vue'
import NetWorthRings from '../components/NetWorthRings.vue'
import CompositionChart from '../components/CompositionChart.vue'
import PageLoadingSkeleton from '../components/PageLoadingSkeleton.vue'

const router = useRouter()
const { t } = useI18n()

usePageAction(() => t('dashboard.recordValuationAction'), () => router.push('/accounts'))
const accountsStore = useAccountsStore()
const liabilitiesStore = useLiabilitiesStore()
const envelopesStore = useEnvelopesStore()
const netWorthStore = useNetWorthStore()
const valuationsStore = useValuationsStore()

// Only while the first fetch across all four stores is still in flight —
// without this, a returning user with real data would flash the onboarding
// state below for a moment, since accounts/liabilities/envelopes all start
// out empty before their fetchAll() resolves.
const initialLoading = computed(
  () =>
    (accountsStore.loading || liabilitiesStore.loading || envelopesStore.loading || netWorthStore.loading) &&
    accountsStore.accounts.length === 0 &&
    liabilitiesStore.liabilities.length === 0 &&
    envelopesStore.envelopes.length === 0,
)

const showOnboarding = computed(
  () =>
    accountsStore.accounts.length === 0 &&
    liabilitiesStore.liabilities.length === 0 &&
    envelopesStore.envelopes.length === 0,
)
const hasHistory = computed(() => netWorthStore.history.length > 0)

const assetsByClass = computed(() => {
  const totals = new Map<string, number>()
  for (const account of accountsStore.accounts) {
    const label = accountTypeLabel(account.type)
    const value = valuationsStore.currentValue(account.id)
    totals.set(label, (totals.get(label) ?? 0) + value)
  }
  const total = [...totals.values()].reduce((sum, v) => sum + v, 0)
  return [...totals.entries()]
    .map(([label, value]) => ({ label, value, pct: total > 0 ? value / total : 0 }))
    .sort((a, b) => b.value - a.value)
    .map((c, idx) => ({ ...c, fill: `var(--band-${(idx % 6) + 1})`, flex: Math.round(c.pct * 1000) }))
})

const cairnClasses = computed(() => [...assetsByClass.value].reverse())

const liabilitiesBar = computed(() => {
  const totalAssets = netWorthStore.current?.total_assets ?? 0
  const totalLiabilities = netWorthStore.current?.total_liabilities ?? 0
  const pct = totalAssets > 0 ? totalLiabilities / totalAssets : 0
  return { heightPx: Math.round(pct * 340), pct }
})

const recentHistory = computed(() =>
  [...netWorthStore.history]
    .reverse()
    .slice(0, 8)
    .map((point, index, arr) => {
      const previous = arr[index + 1]
      return {
        ...point,
        change: previous ? point.net_worth - previous.net_worth : null,
      }
    }),
)

type AssetClassRow = { label: string; value: number; pct: number; fill: string; flex: number }

const assetClassColumns: TableColumn<AssetClassRow>[] = [
  { accessorKey: 'fill', header: '', meta: { class: { td: 'w-3.5' } } },
  { accessorKey: 'label', header: '' },
  { accessorKey: 'value', header: '', meta: { class: { td: 'text-right whitespace-nowrap' } } },
  { accessorKey: 'pct', header: '', meta: { class: { td: 'text-right whitespace-nowrap' } } },
]

type HistoryRow = NetWorthHistoryPoint & { change: number | null }

const historyColumns = computed<TableColumn<HistoryRow>[]>(() => [
  { accessorKey: 'date', header: t('dashboard.columnDate') },
  { accessorKey: 'total_assets', header: t('dashboard.columnAssets'), meta: { class: { th: 'text-right', td: 'text-right whitespace-nowrap' } } },
  { accessorKey: 'total_liabilities', header: t('dashboard.columnLiabilities'), meta: { class: { th: 'text-right', td: 'text-right whitespace-nowrap' } } },
  { accessorKey: 'net_worth', header: t('dashboard.columnNetWorth'), meta: { class: { th: 'text-right', td: 'text-right whitespace-nowrap' } } },
  { accessorKey: 'change', header: t('dashboard.columnChange'), meta: { class: { th: 'text-right', td: 'text-right whitespace-nowrap' } } },
])
</script>

<template>
  <div class="flex flex-col gap-9">
    <PageLoadingSkeleton v-if="initialLoading" :rows="6" />

    <StatCardRow v-else-if="showOnboarding">
      <div class="neu-surface bg-default flex flex-col gap-2.5 p-7">
        <span class="font-heading text-[37px] leading-none font-extrabold text-primary">01</span>
        <span class="font-heading text-lg font-extrabold">{{ t('dashboard.step1Heading') }}</span>
        <p class="text-[15px] text-muted">
          {{ t('dashboard.step1Description') }}
        </p>
        <UButton variant="outline" color="neutral" class="mt-1.5 self-start" @click="router.push('/accounts')">
          {{ t('dashboard.step1Action') }}
        </UButton>
      </div>
      <div class="neu-surface bg-default flex flex-col gap-2.5 p-7">
        <span class="font-heading text-[37px] leading-none font-extrabold text-muted">02</span>
        <span class="font-heading text-lg font-extrabold">{{ t('dashboard.step2Heading') }}</span>
        <p class="text-[15px] text-muted">
          {{ t('dashboard.step2Description') }}
        </p>
        <UButton variant="outline" color="neutral" class="mt-1.5 self-start" @click="router.push('/liabilities')">
          {{ t('dashboard.step2Action') }}
        </UButton>
      </div>
      <div class="neu-surface bg-default flex flex-col gap-2.5 p-7">
        <span class="font-heading text-[37px] leading-none font-extrabold text-muted">03</span>
        <span class="font-heading text-lg font-extrabold">{{ t('dashboard.step3Heading') }}</span>
        <p class="text-[15px] text-muted">
          {{ t('dashboard.step3Description') }}
        </p>
        <UButton variant="outline" color="neutral" class="mt-1.5 self-start" @click="router.push('/envelopes')">
          {{ t('dashboard.step3Action') }}
        </UButton>
      </div>
    </StatCardRow>

    <template v-else>
      <StatCardRow>
        <StatCard
          :label="t('dashboard.totalAssets')"
          :value="formatCurrency(netWorthStore.current?.total_assets ?? 0)"
          :note="
            netWorthStore.assetsDelta30d === null
              ? undefined
              : t('dashboard.accountsNote', { delta: formatSignedCurrency(netWorthStore.assetsDelta30d) }, accountsStore.accounts.length)
          "
          :note-color="
            netWorthStore.assetsDelta30d === null
              ? 'muted'
              : netWorthStore.assetsDelta30d >= 0
                ? 'positive'
                : 'negative'
          "
        />
        <StatCard
          :label="t('dashboard.totalLiabilities')"
          :value="formatCurrency(netWorthStore.current?.total_liabilities ?? 0)"
          value-color="negative"
          :note="
            netWorthStore.liabilitiesDelta30d === null
              ? undefined
              : t('dashboard.liabilitiesNote', { delta: formatSignedCurrency(netWorthStore.liabilitiesDelta30d) }, liabilitiesStore.liabilities.length)
          "
        />
        <StatCard
          :label="t('dashboard.netWorth')"
          :value="formatCurrency(netWorthStore.current?.net_worth ?? 0)"
          highlighted
          :note="
            netWorthStore.netWorthDelta30d === null
              ? undefined
              : t('dashboard.netWorthNote', { delta: formatSignedCurrency(netWorthStore.netWorthDelta30d) })
          "
          :note-color="
            netWorthStore.netWorthDelta30d === null
              ? 'muted'
              : netWorthStore.netWorthDelta30d >= 0
                ? 'positive'
                : 'negative'
          "
        />
      </StatCardRow>

      <template v-if="hasHistory">
        <section class="flex flex-col gap-5">
          <div class="flex items-end justify-between gap-5 border-b-2 border-default pb-2.5">
            <div class="flex flex-col gap-1">
              <span class="text-sm text-muted">{{ t('dashboard.netWorthByYearKicker') }}</span>
              <h2 class="text-[22px]">{{ t('dashboard.netWorthByYearHeading') }}</h2>
            </div>
          </div>
          <NetWorthRings />
        </section>

        <section class="flex flex-col gap-5">
          <div class="flex flex-col gap-1 border-b-2 border-default pb-2.5">
            <span class="text-sm text-muted">{{ t('dashboard.compositionKicker') }}</span>
            <h2 class="text-[22px]">{{ t('dashboard.compositionHeading') }}</h2>
          </div>
          <CompositionChart />
        </section>

        <section class="flex flex-col gap-5">
          <div class="flex flex-col gap-1 border-b-2 border-default pb-2.5">
            <span class="text-sm text-muted">{{ t('dashboard.byAssetClassKicker') }}</span>
            <h2 class="text-[22px]">{{ t('dashboard.byAssetClassHeading') }}</h2>
          </div>
          <div class="flex items-start gap-7">
            <div class="flex h-[340px] w-[104px] flex-none flex-col gap-1">
              <span
                v-for="c in cairnClasses"
                :key="c.label"
                class="figure-rounded min-h-1.5"
                :style="{ flexGrow: c.flex, background: c.fill }"
              />
            </div>
            <div class="min-w-0 flex-1">
              <UTable :data="assetsByClass" :columns="assetClassColumns" :ui="{ thead: 'hidden' }">
                <template #fill-cell="{ row }: { row: TableRow<AssetClassRow> }">
                  <span class="block h-3 w-3" :style="{ background: row.original.fill }" />
                </template>
                <template #label-cell="{ row }: { row: TableRow<AssetClassRow> }">
                  <span class="text-[15px]">{{ row.original.label }}</span>
                </template>
                <template #value-cell="{ row }: { row: TableRow<AssetClassRow> }">
                  <span class="font-heading text-[15px] font-extrabold">{{ formatCurrency(row.original.value) }}</span>
                </template>
                <template #pct-cell="{ row }: { row: TableRow<AssetClassRow> }">
                  <span class="text-sm text-muted">{{ (row.original.pct * 100).toFixed(1) }}%</span>
                </template>
              </UTable>
            </div>
          </div>

          <div class="flex flex-col gap-2.5 border-t-2 border-default pt-4.5">
            <span class="text-sm text-muted">{{ t('dashboard.setAgainstThem') }}</span>
            <div class="flex items-start gap-7">
              <span
                class="figure-rounded w-[104px] flex-none bg-rust"
                :style="{ height: `${Math.max(liabilitiesBar.heightPx, 8)}px` }"
              />
              <span class="flex-1 text-[15px] text-muted">
                {{
                  t('dashboard.liabilitiesVsAssets', {
                    value: formatCurrency(netWorthStore.current?.total_liabilities ?? 0),
                    pct: (liabilitiesBar.pct * 100).toFixed(1),
                  })
                }}
              </span>
            </div>
          </div>
        </section>

        <section class="flex flex-col gap-5">
          <div class="flex flex-col gap-1 border-b-2 border-default pb-2.5">
            <span class="text-sm text-muted">{{ t('dashboard.recentValuationsKicker') }}</span>
            <h2 class="text-[22px]">{{ t('dashboard.recentValuationsHeading') }}</h2>
          </div>
          <UTable :data="recentHistory" :columns="historyColumns">
            <template #date-cell="{ row }: { row: TableRow<HistoryRow> }">
              <span class="text-[15.5px] whitespace-nowrap">{{ formatDate(row.original.date) }}</span>
            </template>
            <template #total_assets-cell="{ row }: { row: TableRow<HistoryRow> }">
              <span class="text-[15.5px] whitespace-nowrap">{{ formatCurrency(row.original.total_assets) }}</span>
            </template>
            <template #total_liabilities-cell="{ row }: { row: TableRow<HistoryRow> }">
              <span class="text-[15.5px] whitespace-nowrap text-rust">{{ formatCurrency(row.original.total_liabilities) }}</span>
            </template>
            <template #net_worth-cell="{ row }: { row: TableRow<HistoryRow> }">
              <span class="font-heading text-[15.5px] font-extrabold whitespace-nowrap">{{ formatCurrency(row.original.net_worth) }}</span>
            </template>
            <template #change-cell="{ row }: { row: TableRow<HistoryRow> }">
              <span class="text-[15.5px] whitespace-nowrap" :class="deltaColorClass(row.original.change)">
                {{ row.original.change === null ? '—' : formatSignedCurrency(row.original.change) }}
              </span>
            </template>
          </UTable>
        </section>
      </template>

      <UEmpty
        v-else
        icon="i-lucide-line-chart"
        :title="t('dashboard.emptyTitle')"
        :description="t('dashboard.emptyDescription')"
        :actions="[{ label: t('dashboard.step1Action'), onClick: () => router.push('/accounts') }]"
        class="neu-inset"
      />
    </template>
  </div>
</template>
