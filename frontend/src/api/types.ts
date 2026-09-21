import { i18n } from '../i18n'

export const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD'] as const
export type Currency = (typeof CURRENCIES)[number]

export const ACCOUNT_TYPES = [
  'checking',
  'regulated_savings',
  'pea',
  'life_insurance',
  'brokerage',
  'crypto',
  'real_estate',
  'scpi',
  'other',
] as const

export type AccountType = (typeof ACCOUNT_TYPES)[number]

export function accountTypeLabel(type: AccountType): string {
  return i18n.global.t(`accountTypes.${type}`)
}

export interface Account {
  id: number
  name: string
  type: AccountType
  currency: Currency
  institution: string | null
  opened_at: string | null
  is_emergency_fund: boolean
  emergency_fund_target: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type AccountCreate = Omit<Account, 'id' | 'created_at' | 'updated_at'>
export type AccountUpdate = Partial<AccountCreate>

export interface Valuation {
  id: number
  account_id: number
  date: string
  value: string
  note: string | null
  created_at: string
}

export type ValuationCreate = Omit<Valuation, 'id' | 'created_at'>
export type ValuationUpdate = Partial<Omit<ValuationCreate, 'account_id'>>

/** Must match AUTO_VALUATION_NOTE in backend/app/services/holdings_valuation.py. */
export const AUTO_VALUATION_NOTE = 'Auto-calculated from holdings'

export const ASSET_CLASSES = ['stock', 'etf', 'crypto', 'fund', 'other'] as const
export type AssetClass = (typeof ASSET_CLASSES)[number]

export function assetClassLabel(assetClass: AssetClass): string {
  return i18n.global.t(`assetClasses.${assetClass}`)
}

export interface Asset {
  id: number
  account_id: number
  name: string
  symbol: string | null
  asset_class: AssetClass
  quantity: string
  unit_cost: string
  current_price: string | null
  price_updated_at: string | null
  created_at: string
  updated_at: string
}

export type AssetCreate = Omit<
  Asset,
  'id' | 'current_price' | 'price_updated_at' | 'created_at' | 'updated_at'
>
export type AssetUpdate = Partial<Omit<AssetCreate, 'account_id'>>

export interface PriceRefreshResult {
  updated: string[]
  failed: string[]
  skipped_no_symbol: number
}

export const LIABILITY_TYPES = ['mortgage', 'consumer_loan', 'other'] as const
export type LiabilityType = (typeof LIABILITY_TYPES)[number]

export function liabilityTypeLabel(type: LiabilityType): string {
  return i18n.global.t(`liabilityTypes.${type}`)
}

export interface Liability {
  id: number
  name: string
  type: LiabilityType
  currency: Currency
  initial_amount: string
  remaining_amount: string
  monthly_payment: string | null
  interest_rate: string | null
  start_date: string | null
  end_date: string | null
  created_at: string
  updated_at: string
}

export type LiabilityCreate = Omit<Liability, 'id' | 'created_at' | 'updated_at'>
export type LiabilityUpdate = Partial<LiabilityCreate>

export interface Envelope {
  id: number
  name: string
  target_amount: string | null
  current_amount: string
  color: string | null
  icon: string | null
  created_at: string
  updated_at: string
}

export type EnvelopeCreate = Omit<Envelope, 'id' | 'created_at' | 'updated_at'>
export type EnvelopeUpdate = Partial<EnvelopeCreate>

// One fixed data source each, at most one instance on the board.
export const LEGACY_WIDGET_TYPES = [
  'netWorthRings',
  'composition',
  'assetsByClass',
  'liabilitiesVsAssets',
  'recentValuations',
] as const
// `source` picks what the widget shows; multiple instances are allowed as
// long as no two share the same (type, source) pair.
export const CATALOG_WIDGET_TYPES = ['statTile', 'trendChart', 'breakdownDonut', 'list', 'payoffStatus'] as const
export const WIDGET_TYPES = [...LEGACY_WIDGET_TYPES, ...CATALOG_WIDGET_TYPES] as const
export type LegacyWidgetType = (typeof LEGACY_WIDGET_TYPES)[number]
export type CatalogWidgetType = (typeof CATALOG_WIDGET_TYPES)[number]
export type WidgetType = (typeof WIDGET_TYPES)[number]

export interface Widget {
  id: string
  type: WidgetType
  source?: string
  x: number
  y: number
  w: number
  h: number
}

export interface DashboardLayout {
  widgets: Widget[]
  updated_at: string
}

export interface NetWorth {
  total_assets: number
  total_liabilities: number
  net_worth: number
  /** Account/liability ids excluded from the totals above because no FX rate was available for
   * their currency (see backend/app/services/fx.py's FxRateUnavailableError) — the backend never
   * fabricates a 1:1 rate, so a non-empty list here means these totals are a partial figure. */
  unconverted_accounts: number[]
  unconverted_liabilities: number[]
}

export interface NetWorthHistoryPoint {
  date: string
  total_assets: number
  total_liabilities: number
  net_worth: number
}

export interface FxRates {
  base: Currency
  /** rate[X] * amount_in_X === amount_in_base, for every currency other than base. */
  rates: Record<string, number>
  as_of: string
}

export interface AuthStatus {
  auth_enabled: boolean
  password_enabled: boolean
  oidc_enabled: boolean
  oidc_display_name: string | null
}

export interface TokenResponse {
  access_token: string
  token_type: string
}
