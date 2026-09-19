import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import ui from '@nuxt/ui/vite'
import appConfig from './app.config.ts'

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8'))

// https://vite.dev/config/
export default defineConfig({
  // Baked in at build time (not read at runtime) so Settings -> About can show it without a
  // round trip — release-please keeps this file's version in lockstep with the backend/desktop
  // ones, so it's the same version across all 3 for any given release.
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [
    vue(),
    ui({
      ui: appConfig.ui,
      theme: { colors: ['moss', 'rust'] },
    }),
  ],
  server: {
    port: 5173,
    // host/allowedHosts/hmr below only kick in when the matching env var is
    // set (by the dev container's compose file) — plain local `pnpm dev` is
    // unaffected.
    host: true,
    allowedHosts: process.env.VITE_ALLOWED_HOSTS?.split(','),
    hmr: process.env.VITE_HMR_CLIENT_PORT
      ? { protocol: 'wss', clientPort: Number(process.env.VITE_HMR_CLIENT_PORT) }
      : undefined,
  },
})
