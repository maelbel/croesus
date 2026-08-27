import { defineStore } from 'pinia'
import { computed } from 'vue'
import { createCrudStore } from '../composables/useCrudStore'
import { findReferencePoint } from '../lib/trailingWindow'
import type { Valuation, ValuationCreate, ValuationUpdate } from '../api/types'

export interface ValuationChange {
  delta: number
  ratio: number | null
}

export const useValuationsStore = defineStore('valuations', () => {
  const { items: valuations, loading, fetchAll, create, update, remove } = createCrudStore<
    Valuation,
    ValuationCreate,
    ValuationUpdate
  >('/valuations')

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

  function changeOverDays(accountId: number, days: number): ValuationChange | null {
    const list = byAccount.value.get(accountId)
    if (!list) return null

    const reference = findReferencePoint(list, (v) => v.date, days)
    if (!reference) return null

    const latestPoint = list[list.length - 1]
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
