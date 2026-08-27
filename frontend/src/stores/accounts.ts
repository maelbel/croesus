import { defineStore } from 'pinia'
import { createCrudStore } from '../composables/useCrudStore'
import type { Account, AccountCreate, AccountUpdate } from '../api/types'

export const useAccountsStore = defineStore('accounts', () => {
  const { items: accounts, loading, fetchAll, create, update, remove } = createCrudStore<
    Account,
    AccountCreate,
    AccountUpdate
  >('/accounts')

  return { accounts, loading, fetchAll, create, update, remove }
})
