<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { CloudSun } from 'lucide-vue-next'
import { phoneConfig } from '../config/phone.config'
import { usePhoneStore } from '../stores/phone'
import AppIcon from './AppIcon.vue'
import { createWeatherSnapshot } from '../utils/weather'

const phone = usePhoneStore()
const dockApps = computed(() => phoneConfig.apps.filter((app) => app.enabled !== false && app.dock))
const gridApps = computed(() => phoneConfig.apps.filter((app) => app.enabled !== false && !app.dock))
const now = ref(new Date())
let timer
const widgetTime = computed(() => new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(now.value))
const widgetDate = computed(() => new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' }).format(now.value))
const weather = computed(() => createWeatherSnapshot(phoneConfig.weather, now.value))
onMounted(() => { timer = window.setInterval(() => (now.value = new Date()), 1000) })
onBeforeUnmount(() => window.clearInterval(timer))
</script>

<template>
  <div class="home-screen">
    <div class="home-content">
      <section v-if="phoneConfig.home.showGreetingWidget" class="home-widget">
        <div>
          <span class="widget-kicker">{{ widgetDate }}</span>
          <strong class="widget-time">{{ widgetTime }}</strong>
        </div>
        <div class="weather-mini">
          <CloudSun :size="28" />
          <span>{{ weather.temperature }}°</span>
          <small>{{ weather.location }}</small>
        </div>
      </section>

      <div class="app-grid">
        <AppIcon
          v-for="app in gridApps"
          :key="app.id"
          :app="app"
          :badge="app.id === 'messages' ? phone.unreadTotal : app.badge"
          @open="phone.openApp"
        />
      </div>
    </div>

    <div class="page-dots" aria-label="主屏幕分页">
      <i class="is-current"></i><i></i>
    </div>

    <div class="dock">
      <AppIcon
        v-for="app in dockApps"
        :key="app.id"
        :app="app"
        :badge="app.id === 'messages' ? phone.unreadTotal : app.badge"
        compact
        @open="phone.openApp"
      />
    </div>
  </div>
</template>
