import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { api } from '../src/api/client'
import { useDashboardLayoutStore } from '../src/stores/dashboardLayout'
import type { Widget } from '../src/api/types'

vi.mock('../src/api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockedApi = vi.mocked(api)

const widget: Widget = { id: 'w1', type: 'statTile', source: 'net_worth', x: 0, y: 0, w: 2, h: 2 }

beforeEach(() => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
})

describe('useDashboardLayoutStore', () => {
  it('fetchAll loads widgets from the API', async () => {
    mockedApi.get.mockResolvedValue({ widgets: [widget], updated_at: '2026-01-01T00:00:00Z' })
    const store = useDashboardLayoutStore()

    await store.fetchAll()

    expect(mockedApi.get).toHaveBeenCalledWith('/dashboard/layout')
    expect(store.widgets).toEqual([widget])
  })

  it('save applies the new layout locally before the PATCH resolves (optimistic apply)', async () => {
    const store = useDashboardLayoutStore()
    let resolvePatch!: (value: unknown) => void
    mockedApi.patch.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePatch = resolve
        }),
    )

    const savePromise = store.save([widget])

    // The grid already applied this change locally — save() must reflect it
    // synchronously, not wait on the round trip.
    expect(store.widgets).toEqual([widget])

    resolvePatch({ widgets: [widget], updated_at: '2026-01-01T00:00:00Z' })
    await savePromise

    expect(mockedApi.patch).toHaveBeenCalledWith('/dashboard/layout', { widgets: [widget] })
  })

  it('save persists a layout down to empty the same way', async () => {
    const store = useDashboardLayoutStore()
    store.widgets = [widget]
    mockedApi.patch.mockResolvedValue({ widgets: [], updated_at: '2026-01-01T00:00:00Z' })

    await store.save([])

    expect(store.widgets).toEqual([])
    expect(mockedApi.patch).toHaveBeenCalledWith('/dashboard/layout', { widgets: [] })
  })
})
