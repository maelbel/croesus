import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import ui from '@nuxt/ui/vite'
import appConfig from './app.config.ts'

// https://vite.dev/config/
export default defineConfig({
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
