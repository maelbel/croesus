import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '../api/client'
import type { DashboardLayout, Widget } from '../api/types'

export const useDashboardLayoutStore = defineStore('dashboardLayout', () => {
  const widgets = ref<Widget[]>([])
  const loading = ref(false)

  async function fetchAll() {
    loading.value = true
    try {
      widgets.value = (await api.get<DashboardLayout>('/dashboard/layout')).widgets
    } finally {
      loading.value = false
    }
  }

  // The grid already applies every change locally (drag/resize/add/remove) before calling this —
  // this just persists that same state, so the UI never waits on the round-trip.
  async function save(next: Widget[]) {
    widgets.value = next
    await api.patch<DashboardLayout>('/dashboard/layout', { widgets: next })
  }

  return { widgets, loading, fetchAll, save }
})
