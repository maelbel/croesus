<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNetWorthStore } from '../../stores/networth'
import { formatCurrency } from '../../lib/format'

const { t } = useI18n()
const netWorthStore = useNetWorthStore()

// Assets is the reference bar (always full height, 100%) so liabilities' height next to it reads
// as an actual "vs" comparison rather than a lone bar with nothing to measure it against.
const BAR_HEIGHT = 340

const bars = computed(() => {
  const totalAssets = netWorthStore.current?.total_assets ?? 0
  const totalLiabilities = netWorthStore.current?.total_liabilities ?? 0
  const pct = totalAssets > 0 ? totalLiabilities / totalAssets : 0
  return { totalAssets, totalLiabilities, pct, liabilitiesHeightPx: Math.round(pct * BAR_HEIGHT) }
})
</script>

<template>
  <div class="flex items-start gap-7">
    <div class="flex h-[340px] w-[104px] flex-none items-end gap-2">
      <span class="figure-rounded h-full w-12 bg-primary" />
      <span class="figure-rounded w-12 bg-rust" :style="{ height: `${Math.max(bars.liabilitiesHeightPx, 8)}px` }" />
    </div>
    <div class="flex min-w-0 flex-1 flex-col gap-4">
      <span class="text-[15px] text-muted">
        {{
          t('dashboard.liabilitiesVsAssets', {
            value: formatCurrency(bars.totalLiabilities),
            pct: (bars.pct * 100).toFixed(1),
          })
        }}
      </span>
      <div class="flex flex-col gap-1.5 text-[13.5px] text-muted">
        <span class="flex items-center gap-1.5">
          <span class="figure-rounded block size-2.5 bg-primary" />
          {{ t('dashboard.liabilitiesVsAssetsAssetsLegend') }} · {{ formatCurrency(bars.totalAssets) }}
        </span>
        <span class="flex items-center gap-1.5">
          <span class="figure-rounded block size-2.5 bg-rust" />
          {{ t('dashboard.liabilitiesVsAssetsLiabilitiesLegend') }} · {{ formatCurrency(bars.totalLiabilities) }}
        </span>
      </div>
    </div>
  </div>
</template>
