import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '../api/client'
import type { Envelope, EnvelopeCreate, EnvelopeUpdate } from '../api/types'

export const useEnvelopesStore = defineStore('envelopes', () => {
  const envelopes = ref<Envelope[]>([])
  const loading = ref(false)

  async function fetchAll() {
    loading.value = true
    try {
      envelopes.value = await api.get<Envelope[]>('/envelopes')
    } finally {
      loading.value = false
    }
  }

  async function create(payload: EnvelopeCreate) {
    const envelope = await api.post<Envelope>('/envelopes', payload)
    envelopes.value.push(envelope)
    return envelope
  }

  async function update(id: number, payload: EnvelopeUpdate) {
    const envelope = await api.patch<Envelope>(`/envelopes/${id}`, payload)
    const index = envelopes.value.findIndex((e) => e.id === id)
    if (index !== -1) envelopes.value[index] = envelope
    return envelope
  }

  async function remove(id: number) {
    await api.delete(`/envelopes/${id}`)
    envelopes.value = envelopes.value.filter((e) => e.id !== id)
  }

  return { envelopes, loading, fetchAll, create, update, remove }
})
