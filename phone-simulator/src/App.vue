<script setup>
import { onMounted } from 'vue'
import PhoneShell from './components/PhoneShell.vue'
import { usePhoneStore } from './stores/phone'

const phone = usePhoneStore()

onMounted(() => phone.startRuntime())
</script>

<template>
  <main class="phone-only-stage">
    <PhoneShell />
  </main>
</template>
