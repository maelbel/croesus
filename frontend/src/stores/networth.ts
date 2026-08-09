import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '../api/client'
import type { NetWorth, NetWorthHistoryPoint } from '../api/types'

export const useNetWorthStore = defineStore('networth', () => {
  const current = ref<NetWorth | null>(null)
  const history = ref<NetWorthHistoryPoint[]>([])
  const loading = ref(false)

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

  return { current, history, loading, fetchAll }
})
