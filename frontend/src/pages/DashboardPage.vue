<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { TableColumn, TableRow } from '@nuxt/ui'
import { useAccountsStore } from '../stores/accounts'
import { useLiabilitiesStore } from '../stores/liabilities'
import { useEnvelopesStore } from '../stores/envelopes'
import { useNetWorthStore } from '../stores/networth'
import { useValuationsStore } from '../stores/valuations'
import { ACCOUNT_TYPE_LABELS, type NetWorthHistoryPoint } from '../api/types'
import { formatCurrency, formatSignedCurrency, formatDate, deltaColorClass } from '../lib/format'
import { usePageAction } from '../composables/usePageAction'
import StatCard from '../components/StatCard.vue'
import StatCardRow from '../components/StatCardRow.vue'
import NetWorthRings from '../components/NetWorthRings.vue'
import CompositionChart from '../components/CompositionChart.vue'
import PageLoadingSkeleton from '../components/PageLoadingSkeleton.vue'

const router = useRouter()

usePageAction('Record a valuation', () => router.push('/accounts'))
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
    const label = ACCOUNT_TYPE_LABELS[account.type]
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

const historyColumns: TableColumn<HistoryRow>[] = [
  { accessorKey: 'date', header: 'Date' },
  { accessorKey: 'total_assets', header: 'Assets', meta: { class: { th: 'text-right', td: 'text-right whitespace-nowrap' } } },
  { accessorKey: 'total_liabilities', header: 'Liabilities', meta: { class: { th: 'text-right', td: 'text-right whitespace-nowrap' } } },
  { accessorKey: 'net_worth', header: 'Net worth', meta: { class: { th: 'text-right', td: 'text-right whitespace-nowrap' } } },
  { accessorKey: 'change', header: 'Change', meta: { class: { th: 'text-right', td: 'text-right whitespace-nowrap' } } },
]
</script>

<template>
  <div class="flex flex-col gap-9">
    <PageLoadingSkeleton v-if="initialLoading" :rows="6" />

    <StatCardRow v-else-if="showOnboarding">
      <div class="neu-surface bg-default flex flex-col gap-2.5 p-7">
        <span class="font-heading text-[37px] leading-none font-extrabold text-primary">01</span>
        <span class="font-heading text-lg font-extrabold">Add your accounts</span>
        <p class="text-[15px] text-muted">
          Checking, Livret A, PEA, assurance-vie, SCPI, property. Each account keeps its own
          valuation history.
        </p>
        <UButton variant="outline" color="neutral" class="mt-1.5 self-start" @click="router.push('/accounts')">
          Add an account
        </UButton>
      </div>
      <div class="neu-surface bg-default flex flex-col gap-2.5 p-7">
        <span class="font-heading text-[37px] leading-none font-extrabold text-muted">02</span>
        <span class="font-heading text-lg font-extrabold">Record what you owe</span>
        <p class="text-[15px] text-muted">
          Mortgage and loans, with remaining balance and monthly payment. Net worth is only
          accurate once your debts are in it.
        </p>
        <UButton variant="outline" color="neutral" class="mt-1.5 self-start" @click="router.push('/liabilities')">
          Add a liability
        </UButton>
      </div>
      <div class="neu-surface bg-default flex flex-col gap-2.5 p-7">
        <span class="font-heading text-[37px] leading-none font-extrabold text-muted">03</span>
        <span class="font-heading text-lg font-extrabold">Divide it into envelopes</span>
        <p class="text-[15px] text-muted">
          Give every euro a job. Envelopes split money you already have; they never move it
          between accounts.
        </p>
        <UButton variant="outline" color="neutral" class="mt-1.5 self-start" @click="router.push('/envelopes')">
          Add an envelope
        </UButton>
      </div>
    </StatCardRow>

    <template v-else>
      <StatCardRow>
        <StatCard
          label="Total assets"
          :value="formatCurrency(netWorthStore.current?.total_assets ?? 0)"
          :note="
            netWorthStore.assetsDelta30d === null
              ? undefined
              : `${formatSignedCurrency(netWorthStore.assetsDelta30d)} · ${accountsStore.accounts.length} accounts`
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
          label="Total liabilities"
          :value="formatCurrency(netWorthStore.current?.total_liabilities ?? 0)"
          value-color="negative"
          :note="
            netWorthStore.liabilitiesDelta30d === null
              ? undefined
              : `${formatSignedCurrency(netWorthStore.liabilitiesDelta30d)} · ${liabilitiesStore.liabilities.length} liabilities`
          "
        />
        <StatCard
          label="Net worth"
          :value="formatCurrency(netWorthStore.current?.net_worth ?? 0)"
          highlighted
          :note="
            netWorthStore.netWorthDelta30d === null
              ? undefined
              : `${formatSignedCurrency(netWorthStore.netWorthDelta30d)} · 30 days`
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
              <span class="text-sm text-muted">Net worth by year</span>
              <h2 class="text-[22px]">One ring per year on record</h2>
            </div>
          </div>
          <NetWorthRings />
        </section>

        <section class="flex flex-col gap-5">
          <div class="flex flex-col gap-1 border-b-2 border-default pb-2.5">
            <span class="text-sm text-muted">Composition over time</span>
            <h2 class="text-[22px]">Where the money sits, valuation by valuation</h2>
          </div>
          <CompositionChart />
        </section>

        <section class="flex flex-col gap-5">
          <div class="flex flex-col gap-1 border-b-2 border-default pb-2.5">
            <span class="text-sm text-muted">What the total is made of</span>
            <h2 class="text-[22px]">By asset class</h2>
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
            <span class="text-sm text-muted">Set against them</span>
            <div class="flex items-start gap-7">
              <span
                class="figure-rounded w-[104px] flex-none bg-rust"
                :style="{ height: `${Math.max(liabilitiesBar.heightPx, 8)}px` }"
              />
              <span class="flex-1 text-[15px] text-muted">
                Liabilities · {{ formatCurrency(netWorthStore.current?.total_liabilities ?? 0) }} ·
                {{ (liabilitiesBar.pct * 100).toFixed(1) }}% of assets, drawn to the same scale as the bar above.
              </span>
            </div>
          </div>
        </section>

        <section class="flex flex-col gap-5">
          <div class="flex flex-col gap-1 border-b-2 border-default pb-2.5">
            <span class="text-sm text-muted">Recent valuations</span>
            <h2 class="text-[22px]">Month by month</h2>
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
        title="No history yet"
        description="The dashboard fills in as soon as two valuations exist. Add an account and give it a starting value."
        :actions="[{ label: 'Add an account', onClick: () => router.push('/accounts') }]"
        class="neu-inset"
      />
    </template>
  </div>
</template>
