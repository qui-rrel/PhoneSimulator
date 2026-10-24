<script setup>
import { computed, ref } from 'vue'
import { ChevronLeft, ChevronRight, List, Plus } from 'lucide-vue-next'
import { contentConfig } from '../config/phone.config'
defineProps({ app: { type: Object, required: true } })
const today = new Date()
const shown = ref(new Date(today.getFullYear(), today.getMonth(), 1))
const monthLabel = computed(() => `${shown.value.getFullYear()}年${shown.value.getMonth() + 1}月`)
const days = computed(() => {
  const year = shown.value.getFullYear()
  const month = shown.value.getMonth()
  const firstWeekday = new Date(year, month, 1).getDay()
  const count = new Date(year, month + 1, 0).getDate()
  return [...Array(firstWeekday).fill(null), ...Array.from({ length: count }, (_, index) => index + 1)]
})
const dateKey = (day) => `${shown.value.getFullYear()}-${String(shown.value.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
const eventsForDay = (day) => contentConfig.calendarEvents.filter((event) => event.date === dateKey(day))
const selectedDay = ref(today.getDate())
const selectedEvents = computed(() => eventsForDay(selectedDay.value))
function changeMonth(offset) { shown.value = new Date(shown.value.getFullYear(), shown.value.getMonth() + offset, 1); selectedDay.value = 1 }
</script>

<template>
  <div class="calendar-app">
    <header class="calendar-header"><button type="button">今天</button><span><button type="button" @click="changeMonth(-1)"><ChevronLeft :size="20" /></button><button type="button" @click="changeMonth(1)"><ChevronRight :size="20" /></button><button type="button"><List :size="19" /></button><button type="button"><Plus :size="21" /></button></span><h2>{{ monthLabel }}</h2></header>
    <div class="weekdays"><span v-for="day in ['日','一','二','三','四','五','六']" :key="day">{{ day }}</span></div>
    <div class="calendar-grid"><button v-for="(day, index) in days" :key="index" type="button" :disabled="!day" :class="{ today: day === today.getDate() && shown.getMonth() === today.getMonth(), selected: day === selectedDay }" @click="day && (selectedDay = day)"><span v-if="day">{{ day }}</span><i v-for="event in day ? eventsForDay(day) : []" :key="event.id" :style="{ background: event.color }"></i></button></div>
    <section class="calendar-agenda"><h3>{{ selectedDay }}日</h3><article v-for="event in selectedEvents" :key="event.id"><i :style="{ background: event.color }"></i><div><strong>{{ event.title }}</strong><small>{{ event.time }}</small></div></article><p v-if="!selectedEvents.length">无日程</p></section>
  </div>
</template>
