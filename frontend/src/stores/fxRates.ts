import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '../api/client'
import type { Currency, FxRates } from '../api/types'

export const useFxRatesStore = defineStore('fxRates', () => {
  const rates = ref<Record<string, number>>({})
  const base = ref<Currency | null>(null)
  const loading = ref(false)

  async function fetchRates(forBase: Currency) {
    loading.value = true
    try {
      const result = await api.get<FxRates>(`/fx-rates?base=${encodeURIComponent(forBase)}`)
      rates.value = result.rates
      base.value = result.base
    } finally {
      loading.value = false
    }
  }

  /** Converts an amount denominated in fromCurrency into the currently loaded base currency.
   * Falls back to the raw amount (rather than NaN) if the rate isn't loaded yet. */
  function convert(amount: number, fromCurrency: Currency): number {
    if (fromCurrency === base.value) return amount
    const rate = rates.value[fromCurrency]
    return rate !== undefined ? amount * rate : amount
  }

  return { rates, base, loading, fetchRates, convert }
})
