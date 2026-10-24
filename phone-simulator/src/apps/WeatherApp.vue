<script setup>
import { CloudRain, CloudSun, Droplets, Eye, Navigation, Sun, Sunrise, Wind } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { phoneConfig } from '../config/phone.config'
import { createWeatherSnapshot } from '../utils/weather'
import { usePointerScroll } from '../utils/pointerScroll'

defineProps({ app: { type: Object, required: true } })
const now = ref(new Date())
const { dragging, beginPointerScroll, movePointerScroll, endPointerScroll, wheelPointerScroll } = usePointerScroll()
let timer
const weather = computed(() => createWeatherSnapshot(phoneConfig.weather, now.value))
onMounted(() => { timer = window.setInterval(() => (now.value = new Date()), 60000) })
onBeforeUnmount(() => window.clearInterval(timer))
</script>

<template>
  <div class="weather-app">
    <div class="weather-scene"><i></i><i></i><i></i></div>
    <header class="weather-hero">
      <span>{{ weather.location }}</span>
      <strong>{{ weather.temperature }}°</strong>
      <p>{{ weather.condition }}</p>
      <small>最高 {{ weather.high }}°　最低 {{ weather.low }}°</small>
    </header>
    <main
      class="weather-scroll desktop-drag-scroll"
      :class="{ 'is-dragging': dragging }"
      @pointerdown="beginPointerScroll"
      @pointermove="movePointerScroll"
      @pointerup="endPointerScroll"
      @pointercancel="endPointerScroll"
      @wheel.prevent="wheelPointerScroll"
    >
      <section class="weather-card hourly-card">
        <p>今天大部分时间晴朗。今晚云量增多，最低气温 13°。</p>
        <div class="hourly-row">
          <div v-for="item in weather.hourly" :key="item.time"><span>{{ item.time }}</span><CloudRain v-if="item.icon === 'rain'" :size="19" /><CloudSun v-else-if="item.icon.includes('cloud')" :size="19" /><Sun v-else :size="19" fill="currentColor" /><strong>{{ item.value }}°</strong></div>
        </div>
      </section>
      <section class="weather-card forecast-card">
        <h3>10日天气预报</h3>
        <div v-for="day in weather.days" :key="day.label" class="forecast-row">
          <strong>{{ day.label }}</strong>
          <CloudRain v-if="day.icon === 'rain'" :size="19" />
          <CloudSun v-else :size="19" />
          <span>{{ day.low }}°</span><i><b :style="{ left: `${Math.max(0, (day.low - 8) * 4)}%`, right: `${Math.max(0, (26 - day.high) * 4)}%` }"></b></i><span>{{ day.high }}°</span>
        </div>
      </section>
      <div class="weather-metrics">
        <section class="weather-card"><h3><Droplets :size="13" />湿度</h3><strong>62%</strong><p>露点 12°</p></section>
        <section class="weather-card"><h3><Wind :size="13" />风</h3><strong>东南风</strong><p>每小时 9 公里</p></section>
        <section class="weather-card"><h3><Sunrise :size="13" />日落</h3><strong>17:42</strong><p>日出 06:12</p></section>
        <section class="weather-card"><h3><Eye :size="13" />能见度</h3><strong>16 公里</strong><p>当前视野清晰</p></section>
      </div>
    </main>
    <footer class="weather-footer"><Navigation :size="17" fill="currentColor" /><span>•••</span><span>☷</span></footer>
  </div>
</template>
