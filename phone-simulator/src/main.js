import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { phoneConfig } from './config/phone.config'
import './styles.css'

document.title = String(phoneConfig.site?.title || '').trim() || 'PhoneSimulator'

createApp(App).use(createPinia()).mount('#app')
