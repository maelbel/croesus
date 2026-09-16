import { defineStore } from 'pinia'
import { ref, watchEffect } from 'vue'
import { getCookie, setCookie } from '../lib/cookies'
import { CURRENCIES, type Currency } from '../api/types'

const CURRENCY_COOKIE_KEY = 'croesus-reference-currency'

function initialCurrency(): Currency {
  const cookie = getCookie(CURRENCY_COOKIE_KEY)
  return (CURRENCIES as readonly string[]).includes(cookie ?? '') ? (cookie as Currency) : 'EUR'
}

export const useCurrencyStore = defineStore('currency', () => {
  const referenceCurrency = ref<Currency>(initialCurrency())

  watchEffect(() => {
    setCookie(CURRENCY_COOKIE_KEY, referenceCurrency.value)
  })

  function setReferenceCurrency(value: Currency) {
    referenceCurrency.value = value
  }

  return { referenceCurrency, setReferenceCurrency }
})
