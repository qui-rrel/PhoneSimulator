<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
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
import PowerOffOverlay from './PowerOffOverlay.vue'
import StatusBar from './StatusBar.vue'

const phone = usePhoneStore()
const EDGE_BACK_THRESHOLD = 64
const edgeStart = ref(null)
const edgeOffset = ref(0)
const edgeY = ref(0)
const mouseScrolling = ref(false)
const mouseScrollGesture = ref(null)
const suppressMouseScrollClick = ref(false)
let mouseScrollClickTimer = null
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

function findVerticalScroller(target, boundary) {
  let element = target instanceof Element ? target : target?.parentElement
  while (element && element !== boundary) {
    const style = window.getComputedStyle(element)
    if (/(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 1) return element
    element = element.parentElement
  }
  return null
}

function beginMouseScroll(event) {
  if (event.pointerType !== 'mouse' || event.button !== 0) return
  const scroller = findVerticalScroller(event.target, event.currentTarget)
  if (!scroller) return
  mouseScrollGesture.value = {
    pointerId: event.pointerId,
    screen: event.currentTarget,
    scroller,
    startX: event.clientX,
    startY: event.clientY,
    startScrollTop: scroller.scrollTop,
    dragging: false,
  }
}

function moveMouseScroll(event) {
  const gesture = mouseScrollGesture.value
  if (!gesture || gesture.pointerId !== event.pointerId) return
  const offsetX = event.clientX - gesture.startX
  const offsetY = event.clientY - gesture.startY
  if (!gesture.dragging) {
    if (Math.abs(offsetX) > 8 && Math.abs(offsetX) > Math.abs(offsetY)) {
      mouseScrollGesture.value = null
      return
    }
    if (Math.abs(offsetY) < 5 || Math.abs(offsetY) <= Math.abs(offsetX)) return
    gesture.dragging = true
    mouseScrolling.value = true
    gesture.screen.setPointerCapture?.(event.pointerId)
  }
  event.preventDefault()
  gesture.scroller.scrollTop = gesture.startScrollTop - offsetY
}

function finishMouseScroll(event, cancelled = false) {
  const gesture = mouseScrollGesture.value
  if (!gesture || gesture.pointerId !== event.pointerId) return
  if (gesture.dragging) {
    if (gesture.screen.hasPointerCapture?.(event.pointerId)) gesture.screen.releasePointerCapture(event.pointerId)
    if (!cancelled) {
      suppressMouseScrollClick.value = true
      window.clearTimeout(mouseScrollClickTimer)
      mouseScrollClickTimer = window.setTimeout(() => { suppressMouseScrollClick.value = false }, 0)
    }
  }
  mouseScrollGesture.value = null
  mouseScrolling.value = false
}

function blockMouseScrollClick(event) {
  if (!suppressMouseScrollClick.value) return
  event.preventDefault()
  event.stopPropagation()
  suppressMouseScrollClick.value = false
}

onBeforeUnmount(() => window.clearTimeout(mouseScrollClickTimer))

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

    <div
      class="phone-screen"
      :class="{ 'phone-screen--mouse-scrolling': mouseScrolling }"
      @pointerdown.capture="beginMouseScroll"
      @pointermove.capture="moveMouseScroll"
      @pointerup.capture="finishMouseScroll"
      @pointercancel.capture="(event) => finishMouseScroll(event, true)"
      @click.capture="blockMouseScrollClick"
    >
      <div v-if="!phone.locked" class="wallpaper"></div>
      <HomeScreen v-if="!phone.locked" :class="{ 'home-screen--app-open': phone.activeApp }" />
      <LockScreen v-else />
      <AppWindow v-if="!phone.locked" />
      <StatusBar />
      <DynamicIsland />
      <NotificationBanner />
      <CallOverlay />
      <AlarmOverlay />
      <PowerOffOverlay />

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
