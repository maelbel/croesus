import { defineStore } from 'pinia'
import { watchEffect } from 'vue'
import { setCookie } from '../lib/cookies'
import { i18n, LOCALE_KEY, type Locale } from '../i18n'

export const LOCALES: { value: Locale; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
]

export const useLocaleStore = defineStore('locale', () => {
  const locale = i18n.global.locale

  watchEffect(() => {
    document.documentElement.lang = locale.value
    setCookie(LOCALE_KEY, locale.value)
  })

  function setLocale(value: Locale) {
    locale.value = value
  }

  return { locale, setLocale }
})
