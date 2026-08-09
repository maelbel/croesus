import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '../api/client'
import type { Liability, LiabilityCreate } from '../api/types'

export const useLiabilitiesStore = defineStore('liabilities', () => {
  const liabilities = ref<Liability[]>([])
  const loading = ref(false)

  async function fetchAll() {
    loading.value = true
    try {
      liabilities.value = await api.get<Liability[]>('/liabilities')
    } finally {
      loading.value = false
    }
  }

  async function create(payload: LiabilityCreate) {
    const liability = await api.post<Liability>('/liabilities', payload)
    liabilities.value.push(liability)
    return liability
  }

  async function remove(id: number) {
    await api.delete(`/liabilities/${id}`)
    liabilities.value = liabilities.value.filter((l) => l.id !== id)
  }

  return { liabilities, loading, fetchAll, create, remove }
})
