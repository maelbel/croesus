import { i18n } from '../i18n'
import { useAccountsStore } from '../stores/accounts'
import { useLiabilitiesStore } from '../stores/liabilities'
import { useEnvelopesStore } from '../stores/envelopes'
import { useValuationsStore } from '../stores/valuations'
import { useNetWorthStore } from '../stores/networth'
import type { CatalogWidgetType, Currency, NetWorthHistoryPoint } from '../api/types'
import { accountTypeLabel } from '../api/types'
import { paidRatio } from './liabilityMath'
import { formatCurrency } from './format'
import { findReferencePoint } from './trailingWindow'

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
  value: number
  currency?: Currency
  /** A ratio (e.g. 0.02 for +2%), not a currency amount — every stat tile in the design shows a
   * percentage change, never an absolute delta. */
  deltaRatio: number | null
  /** True for metrics where a *decrease* is the good direction (e.g. debt) — flips which sign
   * reads as positive/green without changing the displayed number or arrow, which always follow
   * the real sign of deltaRatio. */
  downGood?: boolean
  note?: string
  /** Recent values for a small inline sparkline — only set where real history actually exists
   * (net worth, total debt, a specific account). Envelopes-remaining, emergency fund and a specific
   * liability have no stored history to draw one from honestly. */
  spark?: number[]
}

/** 30-day change as a ratio, computed the same way valuationsStore.changeOverDays does for an
 * account, but against netWorthStore's own history (net worth has no per-account granularity). */
function historyRatio(field: keyof Pick<NetWorthHistoryPoint, 'net_worth' | 'total_liabilities'>): number | null {
  const netWorthStore = useNetWorthStore()
  const history = netWorthStore.history
  const reference = findReferencePoint(history, (p) => p.date, 30)
  if (!reference) return null
  const latest = history[history.length - 1]
  const ref = Number(reference[field])
  if (ref === 0) return null
  return (Number(latest[field]) - ref) / ref
}

export function statTileData(source: string): StatTileData | null {
  const netWorthStore = useNetWorthStore()
  const accountsStore = useAccountsStore()
  const liabilitiesStore = useLiabilitiesStore()
  const envelopesStore = useEnvelopesStore()
  const valuationsStore = useValuationsStore()
  const period30d = i18n.global.t('dashboardGrid.period30d')

  if (source === 'net_worth') {
    return {
      value: netWorthStore.current?.net_worth ?? 0,
      deltaRatio: historyRatio('net_worth'),
      note: period30d,
      spark: netWorthStore.history.slice(-12).map((p) => p.net_worth),
    }
  }
  if (source === 'total_debt') {
    return {
      value: netWorthStore.current?.total_liabilities ?? 0,
      deltaRatio: historyRatio('total_liabilities'),
      downGood: true,
      note: period30d,
      spark: netWorthStore.history.slice(-12).map((p) => p.total_liabilities),
    }
  }
  if (source === 'envelopes_remaining') {
    const remaining = envelopesStore.envelopes.reduce((sum, e) => {
      if (!e.target_amount) return sum
      return sum + Math.max(0, Number(e.target_amount) - Number(e.current_amount))
    }, 0)
    // No month-over-month history is tracked for this figure, unlike the design's own demo data —
    // showing a delta here would mean fabricating a number, so it's left out rather than faked.
    return { value: remaining, deltaRatio: null }
  }
  if (source === 'emergency_fund') {
    const efAccounts = accountsStore.accounts.filter((a) => a.is_emergency_fund)
    const value = efAccounts.reduce((sum, a) => sum + valuationsStore.currentValue(a.id), 0)
    const target = efAccounts.reduce((sum, a) => sum + Number(a.emergency_fund_target ?? 0), 0)
    return {
      value,
      deltaRatio: null,
      note: target > 0 ? i18n.global.t('accountDetail.targetProgress', { current: formatCurrency(value), target: formatCurrency(target) }) : undefined,
    }
  }

  const entity = parseEntitySource(source)
  if (entity?.kind === 'account') {
    const account = accountsStore.accounts.find((a) => a.id === entity.id)
    if (!account) return null
    const change = valuationsStore.changeOverDays(account.id, 30)
    const history = valuationsStore.byAccount.get(account.id) ?? []
    return {
      value: valuationsStore.currentValue(account.id),
      currency: account.currency,
      deltaRatio: change?.ratio ?? null,
      note: change?.ratio != null ? period30d : undefined,
      spark: history.slice(-12).map((v) => Number(v.value)),
    }
  }
  if (entity?.kind === 'liability') {
    const liability = liabilitiesStore.liabilities.find((l) => l.id === entity.id)
    if (!liability) return null
    return {
      value: Number(liability.remaining_amount),
      currency: liability.currency,
      deltaRatio: null,
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

export interface BreakdownSlice {
  label: string
  value: number
  pct: number
  fill: string
}

/** Shared by AssetsByClassWidget (bars+table) and BreakdownDonutWidget (ring+legend) — same
 * underlying totals, just two different visual treatments of the same "assets_by_class" source. */
export function assetsByClassBreakdown(): BreakdownSlice[] {
  const accountsStore = useAccountsStore()
  const valuationsStore = useValuationsStore()

  const totals = new Map<string, number>()
  for (const account of accountsStore.accounts) {
    const label = accountTypeLabel(account.type)
    const value = valuationsStore.currentValue(account.id)
    totals.set(label, (totals.get(label) ?? 0) + value)
  }
  const total = [...totals.values()].reduce((sum, v) => sum + v, 0)
  return [...totals.entries()]
    .map(([label, value]) => ({ label, value, pct: total > 0 ? value / total : 0 }))
    .sort((a, b) => b.value - a.value)
    .map((c, idx) => ({ ...c, fill: `var(--band-${(idx % 6) + 1})` }))
}

/** The shared header's "sub" line (see WidgetGrid.vue) for the 3 catalog kinds that have one —
 * a stat tile and a trend chart don't (per the design's own `hasSub` flags). */
export function breakdownSubtitle(source: string | undefined): string {
  if (source !== 'assets_by_class') return ''
  const total = assetsByClassBreakdown().reduce((sum, c) => sum + c.value, 0)
  return i18n.global.t('dashboardGrid.breakdownTotal', { amount: formatCurrency(total) })
}

export function listSubtitle(source: string | undefined): string {
  const count =
    source === 'accounts'
      ? useAccountsStore().accounts.length
      : source === 'liabilities'
        ? useLiabilitiesStore().liabilities.length
        : source === 'envelopes'
          ? useEnvelopesStore().envelopes.length
          : 0
  return i18n.global.t('dashboardGrid.listItemCount', count)
}

export function payoffSubtitle(source: string | undefined): string {
  if (source === 'debt_payoff') {
    const total = useLiabilitiesStore().liabilities.reduce((sum, l) => sum + Number(l.remaining_amount), 0)
    return i18n.global.t('dashboardGrid.payoffRemaining', { amount: formatCurrency(total) })
  }
  if (source === 'envelope_allocation') {
    const total = useEnvelopesStore().envelopes.reduce((sum, e) => sum + Number(e.current_amount), 0)
    return i18n.global.t('dashboardGrid.payoffAllocated', { amount: formatCurrency(total) })
  }
  return ''
}
