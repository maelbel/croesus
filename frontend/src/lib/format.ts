const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'EUR',
})

const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: 'always',
})

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export function formatCurrency(value: number | string): string {
  return currencyFormatter.format(Number(value))
}

export function formatSignedCurrency(value: number): string {
  const formatted = currencyFormatter.format(Math.abs(value))
  if (value > 0) return `+${formatted}`
  if (value < 0) return `-${formatted}`
  return formatted
}

export function formatPercent(ratio: number): string {
  return percentFormatter.format(ratio)
}

/** An already-in-percent number (e.g. an interest_rate of 2.01 means "2.01%"), not a 0-1 ratio. */
export function formatRate(percent: number): string {
  return `${percent.toFixed(2)}%`
}

export function formatDate(value: string): string {
  return dateFormatter.format(new Date(value))
}

export function deltaColorClass(value: number | null): string {
  if (value === null || value === 0) return 'text-muted'
  return value > 0 ? 'text-primary' : 'text-rust'
}
