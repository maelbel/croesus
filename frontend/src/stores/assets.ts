import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api } from '../api/client'
import { createCrudStore } from '../composables/useCrudStore'
import type { Asset, AssetCreate, AssetUpdate, PriceRefreshResult } from '../api/types'

export const useAssetsStore = defineStore('assets', () => {
  const { items: assets, loading, fetchAll, create, update, remove } = createCrudStore<
    Asset,
    AssetCreate,
    AssetUpdate
  >('/assets')

  const refreshingPrices = ref(false)

  const byAccount = computed(() => {
    const map = new Map<number, Asset[]>()
    for (const asset of assets.value) {
      const list = map.get(asset.account_id) ?? []
      list.push(asset)
      map.set(asset.account_id, list)
    }
    return map
  })

  function forAccount(accountId: number): Asset[] {
    return byAccount.value.get(accountId) ?? []
  }

  async function refreshPrices(): Promise<PriceRefreshResult> {
    refreshingPrices.value = true
    try {
      const result = await api.post<PriceRefreshResult>('/assets/refresh-prices', {})
      await fetchAll()
      return result
    } finally {
      refreshingPrices.value = false
    }
  }

  return {
    assets,
    loading,
    refreshingPrices,
    fetchAll,
    byAccount,
    forAccount,
    create,
    update,
    remove,
    refreshPrices,
  }
})
