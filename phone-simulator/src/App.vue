<script setup>
import { onBeforeUnmount, onMounted } from 'vue'
import PhoneShell from './components/PhoneShell.vue'
import { phoneConfig } from './config/phone.config'
import { usePhoneStore } from './stores/phone'
import { useWechatStore } from './stores/wechat'
import { startProgressiveMediaPreload } from './utils/mediaPreloader'
import { prepareSynthAudio } from './utils/sounds'

const phone = usePhoneStore()
const wechat = useWechatStore()
wechat.attachPhone(phone)
let removeSoundUnlock = () => {}
let stopMediaPreload = () => {}

onMounted(() => {
  removeSoundUnlock = prepareSynthAudio()
  phone.startRuntime()
  stopMediaPreload = startProgressiveMediaPreload(phoneConfig)
})
onBeforeUnmount(() => {
  removeSoundUnlock()
  stopMediaPreload()
  phone.stopNavigation()
})
</script>

<template>
  <main class="phone-only-stage">
    <PhoneShell />
  </main>
</template>
