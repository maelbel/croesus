import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '../api/client'
import type { Valuation, ValuationCreate, ValuationUpdate } from '../api/types'

export interface ValuationChange {
  delta: number
  ratio: number | null
}

export const useValuationsStore = defineStore('valuations', () => {
  const valuations = ref<Valuation[]>([])
  const loading = ref(false)

  async function fetchAll() {
    loading.value = true
    try {
      valuations.value = await api.get<Valuation[]>('/valuations')
    } finally {
      loading.value = false
    }
  }

  async function create(payload: ValuationCreate) {
    const valuation = await api.post<Valuation>('/valuations', payload)
    valuations.value.push(valuation)
    return valuation
  }

  async function update(id: number, payload: ValuationUpdate) {
    const valuation = await api.patch<Valuation>(`/valuations/${id}`, payload)
    const index = valuations.value.findIndex((v) => v.id === id)
    if (index !== -1) valuations.value[index] = valuation
    return valuation
  }

  async function remove(id: number) {
    await api.delete(`/valuations/${id}`)
    valuations.value = valuations.value.filter((v) => v.id !== id)
  }

  const byAccount = computed(() => {
    const map = new Map<number, Valuation[]>()
    for (const valuation of valuations.value) {
      const list = map.get(valuation.account_id) ?? []
      list.push(valuation)
      map.set(valuation.account_id, list)
    }
    for (const list of map.values()) list.sort((a, b) => a.date.localeCompare(b.date))
    return map
  })

  function latest(accountId: number): Valuation | null {
    const list = byAccount.value.get(accountId)
    return list && list.length > 0 ? list[list.length - 1] : null
  }

  function currentValue(accountId: number): number {
    return Number(latest(accountId)?.value ?? 0)
  }

  /** Value/percent change over the trailing `days`, or null if there isn't enough history. */
  function changeOverDays(accountId: number, days: number): ValuationChange | null {
    const list = byAccount.value.get(accountId)
    if (!list || list.length < 2) return null

    const latestPoint = list[list.length - 1]
    const cutoff = new Date(latestPoint.date)
    cutoff.setDate(cutoff.getDate() - days)

    let reference = list[0]
    for (const point of list) {
      if (new Date(point.date) <= cutoff) reference = point
      else break
    }
    if (reference === latestPoint) return null

    const delta = Number(latestPoint.value) - Number(reference.value)
    const ratio = Number(reference.value) !== 0 ? delta / Number(reference.value) : null
    return { delta, ratio }
  }

  return {
    valuations,
    loading,
    fetchAll,
    create,
    update,
    remove,
    byAccount,
    latest,
    currentValue,
    changeOverDays,
  }
})
