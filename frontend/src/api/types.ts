export type AccountType =
  | 'checking'
  | 'regulated_savings'
  | 'pea'
  | 'life_insurance'
  | 'brokerage'
  | 'crypto'
  | 'real_estate'
  | 'scpi'
  | 'other'

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: 'Checking account',
  regulated_savings: 'Regulated savings',
  pea: 'PEA',
  life_insurance: 'Life insurance',
  brokerage: 'Brokerage account',
  crypto: 'Crypto',
  real_estate: 'Real estate',
  scpi: 'SCPI',
  other: 'Other',
}

export interface Account {
  id: number
  name: string
  type: AccountType
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

export type AssetClass = 'stock' | 'etf' | 'crypto' | 'fund' | 'other'

export const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  stock: 'Stock',
  etf: 'ETF',
  crypto: 'Crypto',
  fund: 'Fund',
  other: 'Other',
}

export interface Asset {
  id: number
  account_id: number
  name: string
  symbol: string | null
  asset_class: AssetClass
  quantity: string
  unit_cost: string
  created_at: string
  updated_at: string
}

export type AssetCreate = Omit<Asset, 'id' | 'created_at' | 'updated_at'>
export type AssetUpdate = Partial<Omit<AssetCreate, 'account_id'>>

export type LiabilityType = 'mortgage' | 'consumer_loan' | 'other'

export const LIABILITY_TYPE_LABELS: Record<LiabilityType, string> = {
  mortgage: 'Mortgage',
  consumer_loan: 'Consumer loan',
  other: 'Other',
}

export interface Liability {
  id: number
  name: string
  type: LiabilityType
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

export interface NetWorth {
  total_assets: number
  total_liabilities: number
  net_worth: number
}

export interface NetWorthHistoryPoint {
  date: string
  total_assets: number
  total_liabilities: number
  net_worth: number
}
