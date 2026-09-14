import { i18n } from '../i18n'

const INTL_LOCALE: Record<string, string> = { en: 'en-US', fr: 'fr-FR' }

function intlLocale(): string {
  return INTL_LOCALE[i18n.global.locale.value] ?? 'en-US'
}

const currencyFormatters = new Map<string, Intl.NumberFormat>()
function currencyFormatter(): Intl.NumberFormat {
  const locale = intlLocale()
  let formatter = currencyFormatters.get(locale)
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' })
    currencyFormatters.set(locale, formatter)
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

export function formatCurrency(value: number | string): string {
  return currencyFormatter().format(Number(value))
}

export function formatSignedCurrency(value: number): string {
  const formatted = currencyFormatter().format(Math.abs(value))
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
