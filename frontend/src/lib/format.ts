import { i18n } from '../i18n'
import { useCurrencyStore } from '../stores/currency'
import type { Currency } from '../api/types'

const INTL_LOCALE: Record<string, string> = { en: 'en-US', fr: 'fr-FR' }

function intlLocale(): string {
  return INTL_LOCALE[i18n.global.locale.value] ?? 'en-US'
}

const currencyFormatters = new Map<string, Intl.NumberFormat>()
function currencyFormatter(currency?: Currency): Intl.NumberFormat {
  const code = currency ?? useCurrencyStore().referenceCurrency
  const locale = intlLocale()
  const key = `${locale}:${code}`
  let formatter = currencyFormatters.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, { style: 'currency', currency: code })
    currencyFormatters.set(key, formatter)
  }
  return formatter
}

const percentFormatters = new Map<string, Intl.NumberFormat>()
function percentFormatter(): Intl.NumberFormat {
  const locale = intlLocale()
  let formatter = percentFormatters.get(locale)
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
      signDisplay: 'always',
    })
    percentFormatters.set(locale, formatter)
  }
  return formatter
}

const dateFormatters = new Map<string, Intl.DateTimeFormat>()
function dateFormatter(): Intl.DateTimeFormat {
  const locale = intlLocale()
  let formatter = dateFormatters.get(locale)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' })
    dateFormatters.set(locale, formatter)
  }
  return formatter
}

export function formatCurrency(value: number | string, currency?: Currency): string {
  return currencyFormatter(currency).format(Number(value))
}

const currencyRoundedFormatters = new Map<string, Intl.NumberFormat>()
function currencyRoundedFormatter(currency?: Currency): Intl.NumberFormat {
  const code = currency ?? useCurrencyStore().referenceCurrency
  const locale = intlLocale()
  const key = `${locale}:${code}`
  let formatter = currencyRoundedFormatters.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, { style: 'currency', currency: code, maximumFractionDigits: 0 })
    currencyRoundedFormatters.set(key, formatter)
  }
  return formatter
}

/** Whole-unit currency, no cents — for chart annotations (axis labels, hover tooltips) where
 * exact-to-the-cent precision only adds visual noise a glance doesn't need. */
export function formatCurrencyRounded(value: number | string, currency?: Currency): string {
  return currencyRoundedFormatter(currency).format(Number(value))
}

export function formatSignedCurrency(value: number, currency?: Currency): string {
  const formatted = currencyFormatter(currency).format(Math.abs(value))
  if (value > 0) return `+${formatted}`
  if (value < 0) return `-${formatted}`
  return formatted
}

export function formatPercent(ratio: number): string {
  return percentFormatter().format(ratio)
}

/** An already-in-percent number (e.g. an interest_rate of 2.01 means "2.01%"), not a 0-1 ratio. */
export function formatRate(percent: number): string {
  return `${percent.toFixed(2)}%`
}

export function formatDate(value: string): string {
  return dateFormatter().format(new Date(value))
}

export function deltaColorClass(value: number | null): string {
  if (value === null || value === 0) return 'text-muted'
  return value > 0 ? 'text-primary' : 'text-rust'
}
