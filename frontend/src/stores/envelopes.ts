import { defineStore } from 'pinia'
import { createCrudStore } from '../composables/useCrudStore'
import type { Envelope, EnvelopeCreate, EnvelopeUpdate } from '../api/types'

export const useEnvelopesStore = defineStore('envelopes', () => {
  const { items: envelopes, loading, fetchAll, create, update, remove } = createCrudStore<
    Envelope,
    EnvelopeCreate,
    EnvelopeUpdate
  >('/envelopes')

  return { envelopes, loading, fetchAll, create, update, remove }
})
