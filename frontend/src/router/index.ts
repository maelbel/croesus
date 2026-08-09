import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: () => import('../pages/DashboardPage.vue'),
    },
    {
      path: '/accounts',
      name: 'accounts',
      component: () => import('../pages/AccountsPage.vue'),
    },
    {
      path: '/liabilities',
      name: 'liabilities',
      component: () => import('../pages/LiabilitiesPage.vue'),
    },
    {
      path: '/envelopes',
      name: 'envelopes',
      component: () => import('../pages/EnvelopesPage.vue'),
    },
  ],
})

export default router
