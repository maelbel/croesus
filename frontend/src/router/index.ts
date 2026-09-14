import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: () => import('../pages/DashboardPage.vue'),
      meta: { kicker: 'router.dashboard.kicker', title: 'router.dashboard.title' },
    },
    {
      path: '/accounts',
      name: 'accounts',
      component: () => import('../pages/AccountsPage.vue'),
      meta: { kicker: 'router.accounts.kicker', title: 'router.accounts.title' },
    },
    {
      path: '/liabilities',
      name: 'liabilities',
      component: () => import('../pages/LiabilitiesPage.vue'),
      meta: { kicker: 'router.liabilities.kicker', title: 'router.liabilities.title' },
    },
    {
      path: '/envelopes',
      name: 'envelopes',
      component: () => import('../pages/EnvelopesPage.vue'),
      meta: { kicker: 'router.envelopes.kicker', title: 'router.envelopes.title' },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../pages/SettingsPage.vue'),
      meta: { kicker: 'router.settings.kicker', title: 'router.settings.title' },
    },
  ],
})

export default router
