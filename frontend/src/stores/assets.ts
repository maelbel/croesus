import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '../api/client'
import type { Asset, AssetCreate, AssetUpdate } from '../api/types'

export const useAssetsStore = defineStore('assets', () => {
  const assets = ref<Asset[]>([])
  const loading = ref(false)

  async function fetchAll() {
    loading.value = true
    try {
      assets.value = await api.get<Asset[]>('/assets')
    } finally {
      loading.value = false
    }
  }

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

  async function create(payload: AssetCreate) {
    const asset = await api.post<Asset>('/assets', payload)
    assets.value.push(asset)
    return asset
  }

  async function update(id: number, payload: AssetUpdate) {
    const asset = await api.patch<Asset>(`/assets/${id}`, payload)
    const index = assets.value.findIndex((a) => a.id === id)
    if (index !== -1) assets.value[index] = asset
    return asset
  }

  async function remove(id: number) {
    await api.delete(`/assets/${id}`)
    assets.value = assets.value.filter((a) => a.id !== id)
  }

  return { assets, loading, fetchAll, byAccount, forAccount, create, update, remove }
})
