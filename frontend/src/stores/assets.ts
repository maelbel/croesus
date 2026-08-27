import { defineStore } from 'pinia'
import { computed } from 'vue'
import { createCrudStore } from '../composables/useCrudStore'
import type { Asset, AssetCreate, AssetUpdate } from '../api/types'

export const useAssetsStore = defineStore('assets', () => {
  const { items: assets, loading, fetchAll, create, update, remove } = createCrudStore<
    Asset,
    AssetCreate,
    AssetUpdate
  >('/assets')

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

  return { assets, loading, fetchAll, byAccount, forAccount, create, update, remove }
})
