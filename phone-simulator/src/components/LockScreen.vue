<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ChevronLeft, Delete, Flashlight, Globe2, LockKeyhole, Camera } from 'lucide-vue-next'
import { phoneConfig } from '../config/phone.config'
import { usePhoneStore } from '../stores/phone'
import AppGlyph from './AppGlyph.vue'

const phone = usePhoneStore()
const now = ref(new Date())
let timer

const time = computed(() =>
  new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now.value),
)
const date = computed(() =>
  new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(now.value),
)
const keypad = [1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'delete']
const dragStartY = ref(null)
const dragOffset = ref(0)
const notificationApp = (item) => phoneConfig.apps.find((app) => app.id === item.appId)
const notificationContact = (item) => phone.contacts.find((contact) => contact.id === item.contactId)
const usesContactAvatar = (item) => ['messages', 'phone'].includes(item.appId) && Boolean(notificationContact(item))
const notificationTitle = (item) => item.title || notificationContact(item)?.name || notificationApp(item)?.label || ''

function beginSwipe(event) {
  if (phone.passcodeVisible) return
  dragStartY.value = event.clientY
  dragOffset.value = 0
  event.currentTarget.setPointerCapture?.(event.pointerId)
}

function moveSwipe(event) {
  if (dragStartY.value === null || phone.passcodeVisible) return
  dragOffset.value = Math.min(0, event.clientY - dragStartY.value)
}

function endSwipe() {
  if (dragStartY.value === null) return
  const unlocked = dragOffset.value < -52
  dragStartY.value = null
  dragOffset.value = 0
  if (unlocked) phone.showPasscode()
}

onMounted(() => {
  timer = window.setInterval(() => (now.value = new Date()), 1000)
})
onBeforeUnmount(() => window.clearInterval(timer))
</script>

<template>
  <div
    class="lock-screen"
    :style="{ background: phoneConfig.theme.lockWallpaper || phoneConfig.theme.homeWallpaper }"
    @dblclick="phone.showPasscode"
    @pointerdown="beginSwipe"
    @pointermove="moveSwipe"
    @pointerup="endSwipe"
    @pointercancel="endSwipe"
  >
    <Transition name="fade" mode="out-in">
      <section
        v-if="!phone.passcodeVisible"
        key="clock"
        class="lock-overview"
        :style="{ transform: `translateY(${dragOffset * 0.28}px)` }"
      >
        <LockKeyhole :size="20" class="lock-symbol" />
        <p class="lock-date">{{ date }}</p>
        <h2 class="lock-time">{{ time }}</h2>

        <div v-if="phoneConfig.lockNotifications.length" class="lock-notifications">
          <button v-for="item in phoneConfig.lockNotifications" :key="item.id" class="lock-notification" type="button" @click="phone.showPasscode">
            <span
              class="lock-notification-icon"
              :class="{ 'lock-notification-icon--avatar': usesContactAvatar(item) }"
              :style="{ background: usesContactAvatar(item) ? notificationContact(item)?.color : undefined }"
            >
              <img v-if="usesContactAvatar(item) && notificationContact(item)?.avatar" :src="notificationContact(item)?.avatar" alt="" />
              <span v-else-if="usesContactAvatar(item)">{{ notificationContact(item)?.initials }}</span>
              <AppGlyph v-else-if="notificationApp(item)" :app="notificationApp(item)" :size="20" />
            </span>
            <span>
              <strong>{{ notificationTitle(item) }} <small>{{ item.time }}</small></strong>
              <span>{{ item.body }}</span>
            </span>
          </button>
        </div>

        <div class="lock-actions">
          <button type="button" aria-label="手电筒"><Flashlight :size="22" /></button>
          <button type="button" aria-label="相机"><Camera :size="22" /></button>
        </div>

        <button class="unlock-hint" type="button" @click="phone.showPasscode">
          向上滑动以解锁
        </button>
      </section>

      <section v-else key="passcode" class="passcode-screen">
        <button class="passcode-back" type="button" @click="phone.passcodeVisible = false; phone.pin = ''">
          <ChevronLeft :size="22" />
        </button>
        <LockKeyhole :size="18" />
        <p>输入密码</p>
        <div class="pin-dots" :class="{ 'pin-dots--error': phone.pinError }">
          <i v-for="index in phoneConfig.security.digits" :key="index" :class="{ filled: phone.pin.length >= index }"></i>
        </div>
        <div class="pin-pad">
          <template v-for="(key, index) in keypad" :key="`${key}-${index}`">
            <span v-if="key === null"></span>
            <button v-else-if="key === 'delete'" type="button" aria-label="删除" @click="phone.erasePin">
              <Delete :size="25" />
            </button>
            <button v-else type="button" @click="phone.pressPin(String(key))">
              <b>{{ key }}</b>
              <small>{{ ['', '', 'ABC', 'DEF', 'GHI', 'JKL', 'MNO', 'PQRS', 'TUV', 'WXYZ'][Number(key)] }}</small>
            </button>
          </template>
        </div>
        <button class="passcode-alt" type="button"><Globe2 :size="15" /> 中文</button>
      </section>
    </Transition>
  </div>
</template>
