import { defineStore } from 'pinia'
import { createCrudStore } from '../composables/useCrudStore'
import type { Liability, LiabilityCreate, LiabilityUpdate } from '../api/types'

export const useLiabilitiesStore = defineStore('liabilities', () => {
  const { items: liabilities, loading, fetchAll, create, update, remove } = createCrudStore<
    Liability,
    LiabilityCreate,
    LiabilityUpdate
  >('/liabilities')

  return { liabilities, loading, fetchAll, create, update, remove }
})
