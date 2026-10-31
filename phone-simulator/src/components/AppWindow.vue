<script setup>
import { computed } from 'vue'
import MessagesApp from '../apps/MessagesApp.vue'
import BrowserApp from '../apps/BrowserApp.vue'
import CalculatorApp from '../apps/CalculatorApp.vue'
import CalendarApp from '../apps/CalendarApp.vue'
import ClockApp from '../apps/ClockApp.vue'
import GalleryApp from '../apps/GalleryApp.vue'
import MusicApp from '../apps/MusicApp.vue'
import MailApp from '../apps/MailApp.vue'
import MapsApp from '../apps/MapsApp.vue'
import NotesApp from '../apps/NotesApp.vue'
import PhoneApp from '../apps/PhoneApp.vue'
import SettingsApp from '../apps/SettingsApp.vue'
import WeatherApp from '../apps/WeatherApp.vue'
import WeChatApp from '../apps/WeChatApp.vue'
import XiaohongshuApp from '../apps/XiaohongshuApp.vue'
import { usePhoneStore } from '../stores/phone'

const phone = usePhoneStore()
const registry = { BrowserApp, CalculatorApp, CalendarApp, MessagesApp, ClockApp, GalleryApp, MailApp, MapsApp, MusicApp, NotesApp, PhoneApp, SettingsApp, WeatherApp, WeChatApp, XiaohongshuApp }
const activeComponent = computed(() => registry[phone.activeApp?.component])
const immersive = computed(() => (
  phone.activeApp?.id === 'wechat' &&
  (phone.activeContent?.targetId?.startsWith('moment-viewer:')
    || phone.activeContent?.targetId?.startsWith('comment-viewer:')
    || phone.activeContent?.targetId?.startsWith('chat-image-viewer:'))
))
</script>

<template>
  <Transition name="app-open" appear>
    <section v-if="phone.activeApp" :key="phone.activeApp.id" class="app-window" :class="{ 'app-window--immersive': immersive }">
      <component :is="activeComponent" :app="phone.activeApp" />
    </section>
  </Transition>
</template>
