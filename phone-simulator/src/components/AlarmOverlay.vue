<script setup>
import { AlarmClock, X } from 'lucide-vue-next'
import { usePhoneStore } from '../stores/phone'
const phone = usePhoneStore()
</script>

<template>
  <Transition name="fade">
    <section v-if="phone.alarmRinging" class="alarm-overlay">
      <AlarmClock :size="42" />
      <span>闹钟</span>
      <strong>{{ phone.alarmRinging.time }}</strong>
      <p>{{ phone.alarmRinging.label }}</p>
      <button type="button" @click="phone.stopAlarm"><X :size="20" />停止</button>
    </section>
  </Transition>
</template>
