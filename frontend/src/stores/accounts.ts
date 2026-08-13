import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '../api/client'
import type { Account, AccountCreate, AccountUpdate } from '../api/types'

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

  async function update(id: number, payload: AccountUpdate) {
    const account = await api.patch<Account>(`/accounts/${id}`, payload)
    const index = accounts.value.findIndex((a) => a.id === id)
    if (index !== -1) accounts.value[index] = account
    return account
  }

  async function remove(id: number) {
    await api.delete(`/accounts/${id}`)
    accounts.value = accounts.value.filter((a) => a.id !== id)
  }

  return { accounts, loading, fetchAll, create, update, remove }
})
