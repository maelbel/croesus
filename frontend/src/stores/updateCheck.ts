import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api } from '../api/client'
import { APP_VERSION, isNewerVersion } from '../lib/version'

export interface LatestRelease {
  version: string
  url: string
}

export const useUpdateCheckStore = defineStore('updateCheck', () => {
  const latestRelease = ref<LatestRelease | null>(null)

  // Never throws — this is a non-critical background check (the backend itself already returns
  // null rather than an error when checking is disabled or GitHub is unreachable), so a failed
  // request here (offline, backend down) should just mean no indicator, not a surfaced error.
  async function check() {
    try {
      latestRelease.value = await api.get<LatestRelease | null>('/version/latest-release')
    } catch {
      latestRelease.value = null
    }
  }

  const updateAvailable = computed(
    () => latestRelease.value !== null && isNewerVersion(latestRelease.value.version, APP_VERSION),
  )

  return { latestRelease, updateAvailable, currentVersion: APP_VERSION, check }
})
