import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: () => import('../pages/DashboardPage.vue'),
      meta: { kicker: 'Overview', title: 'Dashboard' },
    },
    {
      path: '/accounts',
      name: 'accounts',
      component: () => import('../pages/AccountsPage.vue'),
      meta: { kicker: 'Where the money is', title: 'Accounts' },
    },
    {
      path: '/liabilities',
      name: 'liabilities',
      component: () => import('../pages/LiabilitiesPage.vue'),
      meta: { kicker: 'What you owe', title: 'Liabilities' },
    },
    {
      path: '/envelopes',
      name: 'envelopes',
      component: () => import('../pages/EnvelopesPage.vue'),
      meta: { kicker: 'Money with a job', title: 'Envelopes' },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../pages/SettingsPage.vue'),
      meta: { kicker: 'Preferences', title: 'Settings' },
    },
  ],
})

export default router
