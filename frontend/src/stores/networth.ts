import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api } from '../api/client'
import { findReferencePoint } from '../lib/trailingWindow'
import type { NetWorth, NetWorthHistoryPoint } from '../api/types'
import { useAccountsStore } from './accounts'
import { useLiabilitiesStore } from './liabilities'
import { useValuationsStore } from './valuations'

/** Net worth = latest valuation per account minus liabilities (see backend's networth.py) — so only
 * mutations on these three stores can actually change it. Envelopes/assets never factor in. */
const NET_WORTH_INPUT_STORES = [useAccountsStore, useLiabilitiesStore, useValuationsStore]
const INVALIDATING_ACTIONS = new Set(['create', 'update', 'remove'])

export const useNetWorthStore = defineStore('networth', () => {
  const current = ref<NetWorth | null>(null)
  const history = ref<NetWorthHistoryPoint[]>([])
  const loading = ref(false)

  // Self-invalidate on any successful create/update/remove from an input store, instead of
  // requiring every other store to remember to notify this one.
  for (const useInputStore of NET_WORTH_INPUT_STORES) {
    useInputStore().$onAction(({ name, after }) => {
      if (!INVALIDATING_ACTIONS.has(name)) return
      after(() => fetchAll())
    })
  }

  async function fetchAll() {
    loading.value = true
    try {
      const [currentResult, historyResult] = await Promise.all([
        api.get<NetWorth>('/dashboard/net-worth'),
        api.get<NetWorthHistoryPoint[]>('/dashboard/net-worth/history'),
      ])
      current.value = currentResult
      history.value = historyResult
    } finally {
      loading.value = false
    }
  }

  /** Change in a history field over the trailing ~30 days, or null if there isn't enough history. */
  function deltaOverDays(field: keyof NetWorthHistoryPoint, days: number): number | null {
    const reference = findReferencePoint(history.value, (p) => p.date, days)
    if (!reference) return null
    const latest = history.value[history.value.length - 1]
    return Number(latest[field]) - Number(reference[field])
  }

  const netWorthDelta30d = computed(() => deltaOverDays('net_worth', 30))
  const assetsDelta30d = computed(() => deltaOverDays('total_assets', 30))
  const liabilitiesDelta30d = computed(() => deltaOverDays('total_liabilities', 30))

  return {
    current,
    history,
    loading,
    fetchAll,
    deltaOverDays,
    netWorthDelta30d,
    assetsDelta30d,
    liabilitiesDelta30d,
  }
})
