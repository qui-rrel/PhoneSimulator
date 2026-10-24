<script setup>
import { computed } from 'vue'
import { phoneConfig } from '../config/phone.config'
import { usePhoneStore } from '../stores/phone'
import AppWindow from './AppWindow.vue'
import AlarmOverlay from './AlarmOverlay.vue'
import CallOverlay from './CallOverlay.vue'
import DynamicIsland from './DynamicIsland.vue'
import HomeScreen from './HomeScreen.vue'
import LockScreen from './LockScreen.vue'
import NotificationBanner from './NotificationBanner.vue'
import StatusBar from './StatusBar.vue'

const phone = usePhoneStore()
const frameStyle = computed(() => ({
  '--device-radius': `${phoneConfig.device.radius}px`,
  '--phone-accent': phoneConfig.theme.accent,
  '--phone-wallpaper': phoneConfig.theme.wallpaper,
  '--phone-wallpaper-overlay': phoneConfig.theme.wallpaperOverlay,
}))
</script>

<template>
  <section class="phone-frame" :style="frameStyle" aria-label="手机界面">
    <div class="side-button side-button--left-a"></div>
    <div class="side-button side-button--left-b"></div>
    <div class="side-button side-button--right"></div>

    <div class="phone-screen">
      <div class="wallpaper"></div>
      <HomeScreen v-if="!phone.locked" :class="{ 'home-screen--app-open': phone.activeApp }" />
      <LockScreen v-else />
      <AppWindow v-if="!phone.locked" />
      <StatusBar />
      <DynamicIsland />
      <NotificationBanner />
      <CallOverlay />
      <AlarmOverlay />

      <button
        v-if="!phone.locked"
        class="home-indicator"
        :class="{ 'home-indicator--light': ['music', 'weather', 'clock'].includes(phone.activeAppId) || phone.incomingCall || phone.activeCall }"
        type="button"
        aria-label="返回主屏幕"
        @click="phone.closeApp"
      >
        <span></span>
      </button>
    </div>
  </section>
</template>
