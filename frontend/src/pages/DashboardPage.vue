<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAccountsStore } from '../stores/accounts'
import { useLiabilitiesStore } from '../stores/liabilities'
import { useEnvelopesStore } from '../stores/envelopes'
import { useNetWorthStore } from '../stores/networth'
import { useDashboardLayoutStore } from '../stores/dashboardLayout'
import { usePageAction, useSecondaryPageAction } from '../composables/usePageAction'
import DashboardOnboarding from '../components/DashboardOnboarding.vue'
import WidgetGrid from '../components/WidgetGrid.vue'
import PageLoadingSkeleton from '../components/PageLoadingSkeleton.vue'

const router = useRouter()
const { t } = useI18n()

// Delegates to WidgetGrid's own edit-mode/add-widget state rather than duplicating either at
// the page level — a no-op if there's no grid mounted yet (no history recorded), which is a
// rare enough edge case not to special-case. Matches the design's own dashboard header, which
// puts "Edit layout"/"Done" right next to "Add widget" rather than in a second toolbar row.
const widgetGrid = ref<InstanceType<typeof WidgetGrid> | null>(null)
// Neither action has anything to act on once the grid is stacked/view-only on mobile (see
// WidgetGrid.vue's isMobile fallback), so both hide there the same way they already hide when
// there's nothing to add or no grid mounted yet.
useSecondaryPageAction(
  () =>
    !widgetGrid.value || widgetGrid.value.isMobile ? '' : widgetGrid.value.editMode ? t('dashboardGrid.doneEditing') : t('dashboardGrid.editLayout'),
  () => widgetGrid.value?.toggleEdit(),
)
usePageAction(
  () => (widgetGrid.value?.hasAnythingToAdd && !widgetGrid.value.isMobile ? t('dashboardGrid.addWidget') : ''),
  () => widgetGrid.value?.openAddMenu(),
)
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

    <DashboardOnboarding v-else-if="showOnboarding" />

    <template v-else>
      <WidgetGrid
        v-if="hasHistory"
        ref="widgetGrid"
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
