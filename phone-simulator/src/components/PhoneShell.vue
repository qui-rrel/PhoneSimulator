<script setup>
import { computed, ref } from 'vue'
import { ChevronLeft } from 'lucide-vue-next'
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
const EDGE_BACK_THRESHOLD = 64
const edgeStart = ref(null)
const edgeOffset = ref(0)
const edgeY = ref(0)
const edgeReady = computed(() => edgeOffset.value >= EDGE_BACK_THRESHOLD)
const edgeIndicatorStyle = computed(() => ({
  top: `${edgeY.value}px`,
  transform: `translate(${Math.min(58, edgeOffset.value * 0.45)}px, -50%)`,
}))
const frameStyle = computed(() => ({
  '--device-radius': `${phoneConfig.device.radius}px`,
  '--phone-accent': phoneConfig.theme.accent,
  '--phone-wallpaper': phoneConfig.theme.wallpaper,
  '--phone-wallpaper-overlay': phoneConfig.theme.wallpaperOverlay,
}))

function beginEdgeBack(event) {
  if (!phone.canNavigateBack) return
  const screen = event.currentTarget.parentElement
  const rect = screen.getBoundingClientRect()
  edgeStart.value = { x: event.clientX, y: event.clientY }
  edgeOffset.value = 0
  edgeY.value = Math.max(44, Math.min(rect.height - 44, event.clientY - rect.top))
  event.currentTarget.setPointerCapture?.(event.pointerId)
}

function moveEdgeBack(event) {
  if (!edgeStart.value) return
  const offsetX = event.clientX - edgeStart.value.x
  const offsetY = event.clientY - edgeStart.value.y
  if (offsetX <= 0 || Math.abs(offsetY) > Math.max(48, offsetX * 0.8)) {
    edgeOffset.value = 0
    return
  }
  event.preventDefault()
  edgeOffset.value = offsetX
}

function endEdgeBack() {
  if (!edgeStart.value) return
  const shouldNavigate = edgeReady.value
  edgeStart.value = null
  edgeOffset.value = 0
  if (shouldNavigate) phone.navigateBack()
}

function cancelEdgeBack() {
  edgeStart.value = null
  edgeOffset.value = 0
}
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

      <div
        v-if="phone.canNavigateBack"
        class="edge-back-zone"
        aria-hidden="true"
        @pointerdown="beginEdgeBack"
        @pointermove="moveEdgeBack"
        @pointerup="endEdgeBack"
        @pointercancel="cancelEdgeBack"
      >
        <span
          v-if="edgeStart"
          class="edge-back-indicator"
          :class="{ 'edge-back-indicator--ready': edgeReady }"
          :style="edgeIndicatorStyle"
        >
          <ChevronLeft :size="18" :stroke-width="3" />
        </span>
      </div>

      <button
        v-if="!phone.locked"
        class="home-indicator"
        type="button"
        aria-label="返回主屏幕"
        @click="phone.navigateHome"
      >
        <span></span>
      </button>
    </div>
  </section>
</template>
