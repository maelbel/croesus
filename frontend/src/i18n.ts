import { createI18n } from 'vue-i18n'
import { getCookie } from './lib/cookies'
import en from './locales/en'
import fr from './locales/fr'

export const LOCALE_KEY = 'croesus-locale'
export type Locale = 'en' | 'fr'

function initialLocale(): Locale {
  const stored = getCookie(LOCALE_KEY)
  if (stored === 'en' || stored === 'fr') return stored
  return navigator.language.toLowerCase().startsWith('fr') ? 'fr' : 'en'
}

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale(),
  fallbackLocale: 'en',
  messages: { en, fr },
})
