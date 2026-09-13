import { ref, type Ref } from 'vue'
import { api } from '../api/client'

export function createCrudStore<TEntity extends { id: number }, TCreate, TUpdate>(endpoint: string) {
  const items = ref([]) as Ref<TEntity[]>
  const loading = ref(false)
  // Guards against two overlapping fetchAll() calls resolving out of order
  // (e.g. two rapid edits each triggering a refetch) — only the response to
  // the most recently started call is ever applied.
  let fetchSeq = 0

  async function fetchAll() {
    const seq = ++fetchSeq
    loading.value = true
    try {
      const result = await api.get<TEntity[]>(endpoint)
      if (seq === fetchSeq) items.value = result
    } finally {
      if (seq === fetchSeq) loading.value = false
    }
  }

  async function create(payload: TCreate) {
    const item = await api.post<TEntity>(endpoint, payload)
    items.value.push(item)
    return item
  }

  async function update(id: number, payload: TUpdate) {
    const item = await api.patch<TEntity>(`${endpoint}/${id}`, payload)
    const index = items.value.findIndex((i) => i.id === id)
    if (index !== -1) items.value[index] = item
    return item
  }

  async function remove(id: number) {
    await api.delete(`${endpoint}/${id}`)
    items.value = items.value.filter((i) => i.id !== id)
  }

  return { items, loading, fetchAll, create, update, remove }
}
