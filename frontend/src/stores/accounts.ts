import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '../api/client'
import type { Account, AccountCreate } from '../api/types'

export const useAccountsStore = defineStore('accounts', () => {
  const accounts = ref<Account[]>([])
  const loading = ref(false)

  async function fetchAll() {
    loading.value = true
    try {
      accounts.value = await api.get<Account[]>('/accounts')
    } finally {
      loading.value = false
    }
  }

  async function create(payload: AccountCreate) {
    const account = await api.post<Account>('/accounts', payload)
    accounts.value.push(account)
    return account
  }

  async function remove(id: number) {
    await api.delete(`/accounts/${id}`)
    accounts.value = accounts.value.filter((a) => a.id !== id)
  }

  return { accounts, loading, fetchAll, create, remove }
})
