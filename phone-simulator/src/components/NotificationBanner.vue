<script setup>
import { computed } from 'vue'
import { phoneConfig } from '../config/phone.config'
import { usePhoneStore } from '../stores/phone'
import AppGlyph from './AppGlyph.vue'

const phone = usePhoneStore()
const contact = computed(() => phone.contacts.find((item) => item.id === phone.notification?.contactId))
const app = computed(() => phoneConfig.apps.find((item) => item.id === phone.notification?.appId))
const usesContactAvatar = computed(() => Boolean(contact.value && ['messages', 'phone'].includes(phone.notification?.appId)))
</script>

<template>
  <Transition name="notification">
    <button
      v-if="phone.notification"
      class="notification-banner"
      type="button"
      @click="phone.openNotification"
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
