<script setup>
import { AlarmClock, Globe2, Timer, Watch } from 'lucide-vue-next'
import { usePhoneStore } from '../stores/phone'
defineProps({ app: { type: Object, required: true } })
const phone = usePhoneStore()
const tabs = [
  { label: '世界时钟', icon: Globe2 }, { label: '闹钟', icon: AlarmClock, active: true },
  { label: '秒表', icon: Watch }, { label: '计时器', icon: Timer },
]
</script>

<template>
  <div class="clock-app">
    <header class="clock-header-static"><h2>闹钟</h2></header>
    <main class="clock-content clock-content--alarms">
      <section class="alarm-list">
        <button v-for="alarm in phone.alarms" :key="alarm.id" type="button" @click="phone.toggleAlarm(alarm.id)">
          <span><strong>{{ alarm.time }}</strong><small v-if="alarm.label">{{ alarm.label }}</small></span>
          <i class="ios-switch" :class="{ on: alarm.enabled }"></i>
        </button>
      </section>
    </main>
    <nav class="ios-tabbar clock-tabs" aria-label="时钟导航">
      <div v-for="tab in tabs" :key="tab.label" :class="{ active: tab.active }"><component :is="tab.icon" :size="21" /><span>{{ tab.label }}</span></div>
    </nav>
  </div>
</template>
