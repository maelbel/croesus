import { createRouter, createWebHistory } from 'vue-router'
import { usePageActionStore } from '../stores/pageActions'
import { usePageTitleStore } from '../stores/pageTitle'

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
      path: '/accounts/:id',
      name: 'account',
      component: () => import('../pages/AccountPage.vue'),
      props: true,
      // No meta kicker/title: this page's title is the account's own name,
      // set dynamically via usePageTitle (see composables/usePageTitle.ts).
    },
    {
      path: '/liabilities',
      name: 'liabilities',
      component: () => import('../pages/LiabilitiesPage.vue'),
      meta: { kicker: 'router.liabilities.kicker', title: 'router.liabilities.title' },
    },
    {
      path: '/liabilities/:id',
      name: 'liability',
      component: () => import('../pages/LiabilityPage.vue'),
      props: true,
      // No meta kicker/title: this page's title is the liability's own name,
      // set dynamically via usePageTitle (see composables/usePageTitle.ts).
    },
    {
      path: '/envelopes',
      name: 'envelopes',
      component: () => import('../pages/EnvelopesPage.vue'),
      meta: { kicker: 'router.envelopes.kicker', title: 'router.envelopes.title' },
    },
    {
      path: '/envelopes/:id',
      name: 'envelope',
      component: () => import('../pages/EnvelopePage.vue'),
      props: true,
      // No meta kicker/title: this page's title is the envelope's own name,
      // set dynamically via usePageTitle (see composables/usePageTitle.ts).
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../pages/SettingsPage.vue'),
      // Every other page uses the app's full-width shell (see App.vue), but settings' own
      // content is a fixed nav + form column that was never designed to stretch — centering it
      // in a capped-width column reads as intentional instead of leaving it stranded at the
      // left edge of a much wider shell.
      meta: { kicker: 'router.settings.kicker', title: 'router.settings.title', narrow: true },
    },
  ],
})

// Cleared here, before the outgoing page unmounts and the incoming one's
// setup runs — not from the outgoing page's unmount (see usePageAction.ts
// for why that races the next page's own call and can wipe its button).
router.beforeEach(() => {
  usePageActionStore().clearPrimaryAction()
  usePageActionStore().clearSecondaryAction()
  usePageTitleStore().clearTitle()
})

export default router
