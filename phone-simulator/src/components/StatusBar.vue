<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { BatteryFull, Signal, Wifi } from 'lucide-vue-next'
import { usePhoneStore } from '../stores/phone'

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

onMounted(() => {
  timer = window.setInterval(() => (now.value = new Date()), 1000)
})
onBeforeUnmount(() => window.clearInterval(timer))
</script>

<template>
  <div class="status-bar" :class="{ 'status-bar--dark': phone.activeApp && !['music', 'weather', 'clock'].includes(phone.activeAppId) }">
    <span class="status-time">{{ time }}</span>
    <div class="status-icons" aria-hidden="true">
      <Signal :size="16" :stroke-width="2.4" />
      <Wifi :size="16" :stroke-width="2.4" />
      <BatteryFull :size="21" :stroke-width="2.1" />
    </div>
  </div>
</template>
