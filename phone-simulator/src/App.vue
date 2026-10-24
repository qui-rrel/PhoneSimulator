<script setup>
import { onBeforeUnmount, onMounted } from 'vue'
import PhoneShell from './components/PhoneShell.vue'
import { phoneConfig } from './config/phone.config'
import { usePhoneStore } from './stores/phone'
import { startProgressiveMediaPreload } from './utils/mediaPreloader'
import { prepareSynthAudio } from './utils/sounds'

const phone = usePhoneStore()
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
