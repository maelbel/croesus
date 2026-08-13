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
  },
})
