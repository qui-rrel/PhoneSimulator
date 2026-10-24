<script setup>
import { onBeforeUnmount, onMounted } from 'vue'
import PhoneShell from './components/PhoneShell.vue'
import { usePhoneStore } from './stores/phone'
import { prepareSynthAudio } from './utils/sounds'

const phone = usePhoneStore()
let removeSoundUnlock = () => {}

onMounted(() => {
  removeSoundUnlock = prepareSynthAudio()
  phone.startRuntime()
})
onBeforeUnmount(() => removeSoundUnlock())
</script>

<template>
  <main class="phone-only-stage">
    <PhoneShell />
  </main>
</template>
