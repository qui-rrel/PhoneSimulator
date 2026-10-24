<script setup>
import { computed } from 'vue'
import MessagesApp from '../apps/MessagesApp.vue'
import BrowserApp from '../apps/BrowserApp.vue'
import CalendarApp from '../apps/CalendarApp.vue'
import ClockApp from '../apps/ClockApp.vue'
import GalleryApp from '../apps/GalleryApp.vue'
import MusicApp from '../apps/MusicApp.vue'
import MailApp from '../apps/MailApp.vue'
import NotesApp from '../apps/NotesApp.vue'
import PhoneApp from '../apps/PhoneApp.vue'
import SettingsApp from '../apps/SettingsApp.vue'
import WeatherApp from '../apps/WeatherApp.vue'
import { usePhoneStore } from '../stores/phone'

const phone = usePhoneStore()
const registry = { BrowserApp, CalendarApp, MessagesApp, ClockApp, GalleryApp, MailApp, MusicApp, NotesApp, PhoneApp, SettingsApp, WeatherApp }
const activeComponent = computed(() => registry[phone.activeApp?.component])
</script>

<template>
  <Transition name="app-open" appear>
    <section v-if="phone.activeApp" :key="phone.activeApp.id" class="app-window">
      <component :is="activeComponent" :app="phone.activeApp" />
    </section>
  </Transition>
</template>
