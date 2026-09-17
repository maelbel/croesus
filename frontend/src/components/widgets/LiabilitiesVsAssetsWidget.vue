<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNetWorthStore } from '../../stores/networth'
import { formatCurrency } from '../../lib/format'

const { t } = useI18n()
const netWorthStore = useNetWorthStore()

const liabilitiesBar = computed(() => {
  const totalAssets = netWorthStore.current?.total_assets ?? 0
  const totalLiabilities = netWorthStore.current?.total_liabilities ?? 0
  const pct = totalAssets > 0 ? totalLiabilities / totalAssets : 0
  return { heightPx: Math.round(pct * 340), pct }
})
</script>

<template>
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
</template>
