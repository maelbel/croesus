<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import StatCardRow from './StatCardRow.vue'

// Shown instead of the dashboard grid until there's at least one account, liability or envelope —
// pulled out of DashboardPage.vue for readability now that page also branches on loading state,
// history presence, and (soon) viewport width. Stays its own 3-card layout rather than converging
// with the "no widgets"/"no history" UEmpty blocks below it: those are a single message + one
// action, while this one genuinely needs 3 distinct steps with 3 distinct CTAs.
const router = useRouter()
const { t } = useI18n()
</script>

<template>
  <StatCardRow>
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
</template>
