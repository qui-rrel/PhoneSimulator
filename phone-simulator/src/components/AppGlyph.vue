<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  app: { type: Object, required: true },
  size: { type: Number, default: 30 },
})

const now = ref(new Date())
const imageFailed = ref(false)
let timer

const isCalendar = computed(() => props.app.id === 'calendar')
const isClock = computed(() => props.app.id === 'clock')
const usesImage = computed(() => Boolean(props.app.iconSrc && !imageFailed.value && !isCalendar.value && !isClock.value))
const glyphStyle = computed(() => (
  usesImage.value || isCalendar.value || isClock.value
    ? undefined
    : { background: props.app.color, color: props.app.iconColor || '#fff' }
))
const weekday = computed(() => new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(now.value))
const day = computed(() => now.value.getDate())
const hourHandStyle = computed(() => ({
  transform: `translateX(-50%) rotate(${(now.value.getHours() % 12) * 30 + now.value.getMinutes() * 0.5}deg)`,
}))
const minuteHandStyle = computed(() => ({
  transform: `translateX(-50%) rotate(${now.value.getMinutes() * 6}deg)`,
}))

watch(() => props.app.iconSrc, () => { imageFailed.value = false })
onMounted(() => {
  if (isCalendar.value || isClock.value) timer = window.setInterval(() => { now.value = new Date() }, 1000)
})
onBeforeUnmount(() => window.clearInterval(timer))
</script>

<template>
  <span class="app-glyph" :style="glyphStyle" aria-hidden="true">
    <img v-if="usesImage" class="app-glyph-image" :src="app.iconSrc" alt="" @error="imageFailed = true" />
    <span v-else-if="isCalendar" class="app-glyph-calendar">
      <small>{{ weekday }}</small>
      <strong>{{ day }}</strong>
    </span>
    <span v-else-if="isClock" class="app-glyph-clock">
      <small class="app-glyph-clock__number app-glyph-clock__number--12">12</small>
      <small class="app-glyph-clock__number app-glyph-clock__number--3">3</small>
      <small class="app-glyph-clock__number app-glyph-clock__number--6">6</small>
      <small class="app-glyph-clock__number app-glyph-clock__number--9">9</small>
      <i class="app-glyph-clock__hand app-glyph-clock__hand--hour" :style="hourHandStyle"></i>
      <i class="app-glyph-clock__hand app-glyph-clock__hand--minute" :style="minuteHandStyle"></i>
      <i class="app-glyph-clock__hub"></i>
    </span>
    <component :is="app.icon" v-else-if="app.icon" :size="size" :stroke-width="1.9" />
  </span>
</template>
