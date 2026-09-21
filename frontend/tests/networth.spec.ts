import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { api } from '../src/api/client'
import { useAccountsStore } from '../src/stores/accounts'
import { useLiabilitiesStore } from '../src/stores/liabilities'
import { useValuationsStore } from '../src/stores/valuations'
import { useCurrencyStore } from '../src/stores/currency'
import { useFxRatesStore } from '../src/stores/fxRates'
import { useNetWorthStore } from '../src/stores/networth'
import type { Account, Liability, NetWorthHistoryPoint } from '../src/api/types'

vi.mock('../src/api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockedApi = vi.mocked(api)

const ZERO_NET_WORTH = { total_assets: 0, total_liabilities: 0, net_worth: 0 }

const account: Account = {
  id: 1,
  name: 'Checking',
  type: 'checking',
  currency: 'EUR',
  institution: null,
  opened_at: null,
  is_emergency_fund: false,
  emergency_fund_target: null,
  notes: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const liability: Liability = {
  id: 5,
  name: 'Loan',
  type: 'consumer_loan',
  currency: 'EUR',
  initial_amount: '1000',
  remaining_amount: '1000',
  monthly_payment: null,
  interest_rate: null,
  start_date: null,
  end_date: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

function flushMicrotasks() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

function clearCookies() {
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0]?.trim()
    if (name) document.cookie = `${name}=;expires=${new Date(0).toUTCString()};path=/`
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  clearCookies()
  setActivePinia(createPinia())
})

describe('useNetWorthStore self-invalidation', () => {
  it('refetches net worth after an input store creates an item', async () => {
    useNetWorthStore()
    const accounts = useAccountsStore()
    mockedApi.post.mockResolvedValue(account)
    mockedApi.get.mockResolvedValue(ZERO_NET_WORTH)

    await accounts.create(account as never)
    await flushMicrotasks()

    expect(mockedApi.get).toHaveBeenCalledWith(expect.stringContaining('/dashboard/net-worth?currency='))
  })

  it('refetches net worth after an input store updates an item', async () => {
    useNetWorthStore()
    const liabilities = useLiabilitiesStore()
    mockedApi.patch.mockResolvedValue(liability)
    mockedApi.get.mockResolvedValue(ZERO_NET_WORTH)

    await liabilities.update(5, liability as never)
    await flushMicrotasks()

    expect(mockedApi.get).toHaveBeenCalledWith(expect.stringContaining('/dashboard/net-worth?currency='))
  })

  it('refetches net worth after an input store removes an item', async () => {
    useNetWorthStore()
    const valuations = useValuationsStore()
    mockedApi.delete.mockResolvedValue(undefined)
    mockedApi.get.mockResolvedValue(ZERO_NET_WORTH)

    await valuations.remove(1)
    await flushMicrotasks()

    expect(mockedApi.get).toHaveBeenCalledWith(expect.stringContaining('/dashboard/net-worth?currency='))
  })

  it('does not refetch net worth on a plain fetchAll of an input store', async () => {
    useNetWorthStore()
    const accounts = useAccountsStore()
    mockedApi.get.mockResolvedValue([])

    await accounts.fetchAll()
    await flushMicrotasks()

    expect(mockedApi.get).toHaveBeenCalledTimes(1)
    expect(mockedApi.get).toHaveBeenCalledWith('/accounts')
  })

  it('does not refetch net worth for a store outside accounts/liabilities/valuations', async () => {
    // Envelopes/assets are deliberately excluded from NET_WORTH_INPUT_STORES —
    // see networth.ts's own comment on why they don't factor into net worth.
    useNetWorthStore()
    mockedApi.get.mockResolvedValue([])
    const { useEnvelopesStore } = await import('../src/stores/envelopes')
    const envelopes = useEnvelopesStore()

    await envelopes.fetchAll()
    await flushMicrotasks()

    expect(mockedApi.get).toHaveBeenCalledTimes(1)
    expect(mockedApi.get).toHaveBeenCalledWith('/envelopes')
  })
})

describe('useNetWorthStore currency changes', () => {
  it('refetches net worth and FX rates when the reference currency changes', async () => {
    useNetWorthStore()
    const currency = useCurrencyStore()
    const fxRates = useFxRatesStore()
    mockedApi.get.mockImplementation((path: unknown) => {
      if (typeof path === 'string' && path.startsWith('/fx-rates')) {
        return Promise.resolve({ base: 'USD', rates: { EUR: 0.9 }, as_of: '2026-01-01' })
      }
      return Promise.resolve(ZERO_NET_WORTH)
    })

    currency.setReferenceCurrency('USD')
    await flushMicrotasks()

    expect(fxRates.base).toBe('USD')
    expect(mockedApi.get).toHaveBeenCalledWith(expect.stringContaining('/dashboard/net-worth?currency=USD'))
  })
})

describe('useNetWorthStore trailing deltas', () => {
  const history: NetWorthHistoryPoint[] = [
    { date: '2026-01-01', total_assets: 1000, total_liabilities: 0, net_worth: 1000 },
    { date: '2026-02-05', total_assets: 1200, total_liabilities: 0, net_worth: 1200 },
  ]

  it('computes netWorthDelta30d from the trailing ~30 day window', () => {
    const store = useNetWorthStore()
    store.history = history

    expect(store.netWorthDelta30d).toBe(200)
  })

  it('returns null with fewer than two history points', () => {
    const store = useNetWorthStore()
    store.history = [history[0]]

    expect(store.netWorthDelta30d).toBeNull()
  })
})
