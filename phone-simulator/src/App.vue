<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import PhoneShell from './components/PhoneShell.vue'
import { phoneConfig } from './config/phone.config'
import { usePhoneStore } from './stores/phone'
import { useWechatStore } from './stores/wechat'
import { preloadLockScreenMedia, startProgressiveMediaPreload } from './utils/mediaPreloader'
import { prepareSynthAudio } from './utils/sounds'

const phone = usePhoneStore()
const wechat = useWechatStore()
wechat.attachPhone(phone)
const shellReady = ref(false)
let mounted = true
let removeSoundUnlock = () => {}
let stopMediaPreload = () => {}

onMounted(async () => {
  removeSoundUnlock = prepareSynthAudio()
  await preloadLockScreenMedia(phoneConfig)
  if (!mounted) return
  shellReady.value = true
  phone.startRuntime()
  stopMediaPreload = startProgressiveMediaPreload(phoneConfig)
})
onBeforeUnmount(() => {
  mounted = false
  removeSoundUnlock()
  stopMediaPreload()
  phone.stopNavigation()
})
</script>

<template>
  <main class="phone-only-stage" :aria-busy="!shellReady">
    <PhoneShell v-if="shellReady" />
  </main>
</template>
