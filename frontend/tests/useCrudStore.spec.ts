import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createCrudStore } from '../src/composables/useCrudStore'
import { api } from '../src/api/client'

vi.mock('../src/api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockedApi = vi.mocked(api)

interface Item {
  id: number
  name: string
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createCrudStore', () => {
  it('fetchAll loads items from the API and tracks the loading flag', async () => {
    const items: Item[] = [{ id: 1, name: 'A' }]
    mockedApi.get.mockResolvedValue(items)
    const store = createCrudStore<Item, unknown, unknown>('/things')

    const pending = store.fetchAll()
    expect(store.loading.value).toBe(true)
    await pending

    expect(mockedApi.get).toHaveBeenCalledWith('/things')
    expect(store.items.value).toEqual(items)
    expect(store.loading.value).toBe(false)
  })

  it('create appends the created item and returns it', async () => {
    const created: Item = { id: 2, name: 'B' }
    mockedApi.post.mockResolvedValue(created)
    const store = createCrudStore<Item, { name: string }, unknown>('/things')

    const result = await store.create({ name: 'B' })

    expect(mockedApi.post).toHaveBeenCalledWith('/things', { name: 'B' })
    expect(result).toEqual(created)
    expect(store.items.value).toEqual([created])
  })

  it('update replaces the matching item in place by id', async () => {
    mockedApi.get.mockResolvedValue([
      { id: 1, name: 'A' },
      { id: 2, name: 'B' },
    ] satisfies Item[])
    const store = createCrudStore<Item, unknown, { name: string }>('/things')
    await store.fetchAll()

    const updated: Item = { id: 2, name: 'B2' }
    mockedApi.patch.mockResolvedValue(updated)
    await store.update(2, { name: 'B2' })

    expect(mockedApi.patch).toHaveBeenCalledWith('/things/2', { name: 'B2' })
    expect(store.items.value).toEqual([{ id: 1, name: 'A' }, updated])
  })

  it('update is a no-op on local items if the id is not currently loaded', async () => {
    mockedApi.get.mockResolvedValue([{ id: 1, name: 'A' }] satisfies Item[])
    const store = createCrudStore<Item, unknown, { name: string }>('/things')
    await store.fetchAll()

    mockedApi.patch.mockResolvedValue({ id: 999, name: 'ghost' })
    await store.update(999, { name: 'ghost' })

    expect(store.items.value).toEqual([{ id: 1, name: 'A' }])
  })

  it('remove deletes the item and filters it out locally', async () => {
    mockedApi.get.mockResolvedValue([
      { id: 1, name: 'A' },
      { id: 2, name: 'B' },
    ] satisfies Item[])
    const store = createCrudStore<Item, unknown, unknown>('/things')
    await store.fetchAll()

    mockedApi.delete.mockResolvedValue(undefined)
    await store.remove(1)

    expect(mockedApi.delete).toHaveBeenCalledWith('/things/1')
    expect(store.items.value).toEqual([{ id: 2, name: 'B' }])
  })

  it('only applies the result of the most recently started fetchAll call', async () => {
    const store = createCrudStore<Item, unknown, unknown>('/things')
    let resolveFirst!: (items: Item[]) => void
    let resolveSecond!: (items: Item[]) => void
    mockedApi.get
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve
          }),
      )

    const first = store.fetchAll()
    const second = store.fetchAll()

    // The second (newer) call resolves first; the first (now-stale) call
    // resolving afterward must not clobber the newer result.
    resolveSecond([{ id: 2, name: 'second' }])
    await second
    resolveFirst([{ id: 1, name: 'first' }])
    await first

    expect(store.items.value).toEqual([{ id: 2, name: 'second' }])
    expect(store.loading.value).toBe(false)
  })
})
