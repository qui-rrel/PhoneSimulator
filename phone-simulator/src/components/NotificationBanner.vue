<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { phoneConfig } from '../config/phone.config'
import { usePhoneStore } from '../stores/phone'
import AppGlyph from './AppGlyph.vue'

const phone = usePhoneStore()
const contact = computed(() => phone.contacts.find((item) => item.id === phone.notification?.contactId))
const app = computed(() => phoneConfig.apps.find((item) => item.id === phone.notification?.appId))
const usesContactAvatar = computed(() => Boolean(contact.value && ['messages', 'phone'].includes(phone.notification?.appId)))
const swipeOffset = ref(0)
const swiping = ref(false)
let swipe = null
let suppressClick = false
let suppressClickTimer = null

const bannerStyle = computed(() => ({
  '--notification-swipe-offset': `${swipeOffset.value}px`,
  '--notification-swipe-opacity': Math.max(0.35, 1 + swipeOffset.value / 150),
}))

function beginSwipe(event) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  swipe = { pointerId: event.pointerId, startY: event.clientY, moved: false }
  swipeOffset.value = 0
  swiping.value = true
  event.currentTarget.setPointerCapture?.(event.pointerId)
}

function moveSwipe(event) {
  if (!swipe || swipe.pointerId !== event.pointerId) return
  const offset = Math.min(0, event.clientY - swipe.startY)
  if (Math.abs(offset) > 4) swipe.moved = true
  if (!swipe.moved) return
  event.preventDefault()
  swipeOffset.value = Math.max(-120, offset)
}

function endSwipe(event, cancelled = false) {
  if (!swipe || swipe.pointerId !== event.pointerId) return
  if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId)
  }
  const shouldDismiss = !cancelled && swipeOffset.value <= -42
  if (swipe.moved) {
    suppressClick = true
    window.clearTimeout(suppressClickTimer)
    suppressClickTimer = window.setTimeout(() => { suppressClick = false }, 0)
  }
  swipe = null
  swiping.value = false
  swipeOffset.value = 0
  if (shouldDismiss) phone.dismissNotification()
}

function openNotification(event) {
  if (suppressClick) {
    event.preventDefault()
    event.stopPropagation()
    suppressClick = false
    return
  }
  phone.openNotification()
}

onBeforeUnmount(() => window.clearTimeout(suppressClickTimer))
</script>

<template>
  <Transition name="notification">
    <button
      v-if="phone.notification"
      class="notification-banner"
      :class="{ 'notification-banner--swiping': swiping }"
      :style="bannerStyle"
      type="button"
      @pointerdown="beginSwipe"
      @pointermove="moveSwipe"
      @pointerup="endSwipe"
      @pointercancel="(event) => endSwipe(event, true)"
      @click="openNotification"
    >
      <span
        class="notification-icon"
        :class="{ 'notification-icon--avatar': usesContactAvatar }"
        :style="{ background: usesContactAvatar ? contact.color : undefined }"
      >
        <img v-if="usesContactAvatar && contact.avatar" :src="contact.avatar" alt="" />
        <span v-else-if="usesContactAvatar">{{ contact.initials }}</span>
        <AppGlyph v-else-if="app" :app="app" :size="20" />
      </span>
      <span class="notification-copy">
        <span class="notification-head">
          <strong>{{ phone.notification.title }}</strong>
          <small>现在</small>
        </span>
        <span>{{ phone.notification.body }}</span>
      </span>
    </button>
  </Transition>
</template>
