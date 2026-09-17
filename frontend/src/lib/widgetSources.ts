import { i18n } from '../i18n'
import { useAccountsStore } from '../stores/accounts'
import { useLiabilitiesStore } from '../stores/liabilities'
import { useEnvelopesStore } from '../stores/envelopes'
import { useValuationsStore } from '../stores/valuations'
import { useNetWorthStore } from '../stores/networth'
import type { CatalogWidgetType, Currency } from '../api/types'
import { paidRatio } from './liabilityMath'
import { formatCurrency } from './format'

const FIXED_SOURCE_KEYS: Record<string, string> = {
  net_worth: 'dashboardGrid.sourceNetWorth',
  total_debt: 'dashboardGrid.sourceTotalDebt',
  envelopes_remaining: 'dashboardGrid.sourceEnvelopesRemaining',
  emergency_fund: 'dashboardGrid.sourceEmergencyFund',
  assets_by_class: 'dashboardGrid.sourceAssetsByClass',
  accounts: 'dashboardGrid.sourceAccounts',
  liabilities: 'dashboardGrid.sourceLiabilities',
  envelopes: 'dashboardGrid.sourceEnvelopes',
  debt_payoff: 'dashboardGrid.sourceDebtPayoff',
  envelope_allocation: 'dashboardGrid.sourceEnvelopeAllocation',
}

export function parseEntitySource(source: string | undefined): { kind: 'account' | 'liability'; id: number } | null {
  if (!source) return null
  const [kind, idStr] = source.split(':')
  if (kind !== 'account' && kind !== 'liability') return null
  const id = Number(idStr)
  return Number.isFinite(id) ? { kind, id } : null
}

/** The one place that turns a (type, source) pair into what a human reads — the card's title for
 * every catalog widget, and the label shown for each option in the add-widget source picker. */
export function resolveSourceLabel(source: string | undefined): string {
  if (!source) return ''
  const entity = parseEntitySource(source)
  if (entity) {
    const name =
      entity.kind === 'account'
        ? useAccountsStore().accounts.find((a) => a.id === entity.id)?.name
        : useLiabilitiesStore().liabilities.find((l) => l.id === entity.id)?.name
    return name ?? i18n.global.t('dashboardGrid.sourceDeleted')
  }
  const key = FIXED_SOURCE_KEYS[source]
  return key ? i18n.global.t(key) : source
}

export function availableSources(type: CatalogWidgetType): { value: string; label: string }[] {
  const accountsStore = useAccountsStore()
  const liabilitiesStore = useLiabilitiesStore()
  const fixed = (keys: string[]) => keys.map((value) => ({ value, label: i18n.global.t(FIXED_SOURCE_KEYS[value]) }))
  const accountOptions = () => accountsStore.accounts.map((a) => ({ value: `account:${a.id}`, label: a.name }))
  const liabilityOptions = () => liabilitiesStore.liabilities.map((l) => ({ value: `liability:${l.id}`, label: l.name }))

  switch (type) {
    case 'statTile':
      return [...fixed(['net_worth', 'total_debt', 'envelopes_remaining', 'emergency_fund']), ...accountOptions(), ...liabilityOptions()]
    case 'trendChart':
      return [...fixed(['net_worth']), ...accountOptions()]
    case 'breakdownDonut':
      return fixed(['assets_by_class'])
    case 'list':
      return fixed(['accounts', 'liabilities', 'envelopes'])
    case 'payoffStatus':
      return fixed(['debt_payoff', 'envelope_allocation'])
  }
}

export interface StatTileData {
  label: string
  value: number
  currency?: Currency
  deltaValue: number | null
  note?: string
}

export function statTileData(source: string): StatTileData | null {
  const netWorthStore = useNetWorthStore()
  const accountsStore = useAccountsStore()
  const liabilitiesStore = useLiabilitiesStore()
  const envelopesStore = useEnvelopesStore()
  const valuationsStore = useValuationsStore()

  if (source === 'net_worth') {
    return {
      label: i18n.global.t('dashboardGrid.sourceNetWorth'),
      value: netWorthStore.current?.net_worth ?? 0,
      deltaValue: netWorthStore.netWorthDelta30d,
    }
  }
  if (source === 'total_debt') {
    // A decrease in debt is the "good" direction, unlike every other delta —
    // same negation the Liabilities page itself already applies.
    const delta = netWorthStore.liabilitiesDelta30d
    return {
      label: i18n.global.t('dashboardGrid.sourceTotalDebt'),
      value: netWorthStore.current?.total_liabilities ?? 0,
      deltaValue: delta === null ? null : -delta,
    }
  }
  if (source === 'envelopes_remaining') {
    const remaining = envelopesStore.envelopes.reduce((sum, e) => {
      if (!e.target_amount) return sum
      return sum + Math.max(0, Number(e.target_amount) - Number(e.current_amount))
    }, 0)
    return { label: i18n.global.t('dashboardGrid.sourceEnvelopesRemaining'), value: remaining, deltaValue: null }
  }
  if (source === 'emergency_fund') {
    const efAccounts = accountsStore.accounts.filter((a) => a.is_emergency_fund)
    const value = efAccounts.reduce((sum, a) => sum + valuationsStore.currentValue(a.id), 0)
    const target = efAccounts.reduce((sum, a) => sum + Number(a.emergency_fund_target ?? 0), 0)
    return {
      label: i18n.global.t('dashboardGrid.sourceEmergencyFund'),
      value,
      deltaValue: null,
      note: target > 0 ? i18n.global.t('accountDetail.targetProgress', { current: formatCurrency(value), target: formatCurrency(target) }) : undefined,
    }
  }

  const entity = parseEntitySource(source)
  if (entity?.kind === 'account') {
    const account = accountsStore.accounts.find((a) => a.id === entity.id)
    if (!account) return null
    const change = valuationsStore.changeOverDays(account.id, 30)
    return {
      label: account.name,
      value: valuationsStore.currentValue(account.id),
      currency: account.currency,
      deltaValue: change?.delta ?? null,
    }
  }
  if (entity?.kind === 'liability') {
    const liability = liabilitiesStore.liabilities.find((l) => l.id === entity.id)
    if (!liability) return null
    return {
      label: liability.name,
      value: Number(liability.remaining_amount),
      currency: liability.currency,
      deltaValue: null,
      note: i18n.global.t('liabilities.paidOffPct', { pct: Math.round(paidRatio(liability) * 100) }),
    }
  }
  return null
}

export interface TrendPoint {
  date: string
  value: number
}

export function trendPoints(source: string): TrendPoint[] {
  const netWorthStore = useNetWorthStore()
  const valuationsStore = useValuationsStore()

  if (source === 'net_worth') return netWorthStore.history.map((p) => ({ date: p.date, value: p.net_worth }))
  const entity = parseEntitySource(source)
  if (entity?.kind === 'account') {
    return (valuationsStore.byAccount.get(entity.id) ?? []).map((v) => ({ date: v.date, value: Number(v.value) }))
  }
  return []
}
