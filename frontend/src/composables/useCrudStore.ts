import { ref, type Ref } from 'vue'
import { api } from '../api/client'

export function createCrudStore<TEntity extends { id: number }, TCreate, TUpdate>(endpoint: string) {
  const items = ref([]) as Ref<TEntity[]>
  const loading = ref(false)

  async function fetchAll() {
    loading.value = true
    try {
      items.value = await api.get<TEntity[]>(endpoint)
    } finally {
      loading.value = false
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
