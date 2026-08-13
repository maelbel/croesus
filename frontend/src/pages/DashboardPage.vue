<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAccountsStore } from '../stores/accounts'
import { useLiabilitiesStore } from '../stores/liabilities'
import { useEnvelopesStore } from '../stores/envelopes'
import { useNetWorthStore } from '../stores/networth'
import { useValuationsStore } from '../stores/valuations'
import { ACCOUNT_TYPE_LABELS } from '../api/types'
import { formatCurrency, formatSignedCurrency, formatDate, deltaColorClass } from '../lib/format'
import StatCard from '../components/StatCard.vue'
import StatCardRow from '../components/StatCardRow.vue'
import NetWorthRings from '../components/NetWorthRings.vue'
import CompositionChart from '../components/CompositionChart.vue'

const router = useRouter()
const accountsStore = useAccountsStore()
const liabilitiesStore = useLiabilitiesStore()
const envelopesStore = useEnvelopesStore()
const netWorthStore = useNetWorthStore()
const valuationsStore = useValuationsStore()

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
</script>

<template>
  <div class="flex flex-col gap-9">
    <StatCardRow v-if="showOnboarding">
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
          <div class="flex flex-col gap-0.5">
            <span
              v-for="c in assetsByClass"
              :key="c.label"
              class="h-2.5 bg-primary"
              :style="{ opacity: 0.35 + c.pct * 0.65, width: `${Math.max(c.pct * 100, 1)}%` }"
            />
          </div>
          <table class="w-full border-collapse">
            <tbody>
              <tr v-for="c in assetsByClass" :key="c.label" class="border-b border-default">
                <td class="w-3.5 py-3 pr-2.5">
                  <span class="block h-3 w-3 bg-primary" :style="{ opacity: 0.35 + c.pct * 0.65 }" />
                </td>
                <td class="py-3 pr-2.5 text-[15px]">{{ c.label }}</td>
                <td class="py-3 pr-3.5 text-right font-heading text-[15px] font-extrabold whitespace-nowrap">
                  {{ formatCurrency(c.value) }}
                </td>
                <td class="py-3 text-right text-sm whitespace-nowrap text-muted">
                  {{ (c.pct * 100).toFixed(1) }}%
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="flex flex-col gap-5">
          <div class="flex flex-col gap-1 border-b-2 border-default pb-2.5">
            <span class="text-sm text-muted">Recent valuations</span>
            <h2 class="text-[22px]">Month by month</h2>
          </div>
          <table class="w-full border-collapse">
            <thead>
              <tr>
                <th class="border-b-2 border-default pb-2.5 text-left text-xs font-semibold text-muted">Date</th>
                <th class="border-b-2 border-default pb-2.5 pl-3 text-right text-xs font-semibold text-muted">Assets</th>
                <th class="border-b-2 border-default pb-2.5 pl-3 text-right text-xs font-semibold text-muted">Liabilities</th>
                <th class="border-b-2 border-default pb-2.5 pl-3 text-right text-xs font-semibold text-muted">Net worth</th>
                <th class="border-b-2 border-default pb-2.5 pl-3 text-right text-xs font-semibold text-muted">Change</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in recentHistory" :key="row.date" class="border-b border-default">
                <td class="py-3 pr-3 text-[15.5px] whitespace-nowrap">{{ formatDate(row.date) }}</td>
                <td class="py-3 pl-3 text-right text-[15.5px] whitespace-nowrap">{{ formatCurrency(row.total_assets) }}</td>
                <td class="py-3 pl-3 text-right text-[15.5px] whitespace-nowrap text-rust">
                  {{ formatCurrency(row.total_liabilities) }}
                </td>
                <td class="py-3 pl-3 text-right font-heading text-[15.5px] font-extrabold whitespace-nowrap">
                  {{ formatCurrency(row.net_worth) }}
                </td>
                <td class="py-3 pl-3 text-right text-[15.5px] whitespace-nowrap" :class="deltaColorClass(row.change)">
                  {{ row.change === null ? '—' : formatSignedCurrency(row.change) }}
                </td>
              </tr>
            </tbody>
          </table>
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
