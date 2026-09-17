<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAccountsStore } from '../stores/accounts'
import { useLiabilitiesStore } from '../stores/liabilities'
import { useEnvelopesStore } from '../stores/envelopes'
import { useNetWorthStore } from '../stores/networth'
import { useDashboardLayoutStore } from '../stores/dashboardLayout'
import { formatCurrency, formatSignedCurrency } from '../lib/format'
import { usePageAction } from '../composables/usePageAction'
import StatCard from '../components/StatCard.vue'
import StatCardRow from '../components/StatCardRow.vue'
import WidgetGrid from '../components/WidgetGrid.vue'
import PageLoadingSkeleton from '../components/PageLoadingSkeleton.vue'

const router = useRouter()
const { t } = useI18n()

usePageAction(() => t('dashboard.recordValuationAction'), () => router.push('/accounts'))
const accountsStore = useAccountsStore()
const liabilitiesStore = useLiabilitiesStore()
const envelopesStore = useEnvelopesStore()
const netWorthStore = useNetWorthStore()
const dashboardLayoutStore = useDashboardLayoutStore()

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

      <WidgetGrid
        v-if="hasHistory"
        :widgets="dashboardLayoutStore.widgets"
        @update:widgets="dashboardLayoutStore.save"
      />

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
