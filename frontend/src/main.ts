import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ui from '@nuxt/ui/vue-plugin'
import './style.css'
import App from './App.vue'
import router from './router'
import { i18n } from './i18n'
import { useThemeStore } from './stores/theme'
import { useLocaleStore } from './stores/locale'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(ui)
app.use(i18n)

useThemeStore(pinia)
useLocaleStore(pinia)

app.mount('#app')
