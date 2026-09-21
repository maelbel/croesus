import { defineConfig } from 'vitest/config'

// Deliberately standalone rather than merged with vite.config.ts: store-level unit tests
// don't compile .vue files or need the @nuxt/ui build plugin, so pulling those in would only
// add cost/fragility for no benefit. Revisit if/when component-level tests are added.
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.spec.ts'],
  },
})
