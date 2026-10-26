<script setup>
import { computed } from 'vue'
import { ChevronLeft, CircleEllipsis, Pin, Search, Share2, SquarePen } from 'lucide-vue-next'
import { contentConfig } from '../config/phone.config'
import { usePhoneStore } from '../stores/phone'

defineProps({ app: { type: Object, required: true } })
const phone = usePhoneStore()
const selected = computed(() => phone.activeContent?.appId === 'notes'
  ? contentConfig.notes.find((note) => note.id === phone.activeContent.targetId) || null
  : null)

function noteTimeValue(value) {
  const text = String(value || '').trim()
  const dateMatch = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?$/.exec(text)
  if (dateMatch) {
    const [, yearText, monthText, dayText, hourText = '0', minuteText = '0'] = dateMatch
    const year = Number(yearText)
    const month = Number(monthText) - 1
    const day = Number(dayText)
    const hour = Number(hourText)
    const minute = Number(minuteText)
    const date = new Date(year, month, day, hour, minute)
    if (date.getFullYear() === year
      && date.getMonth() === month
      && date.getDate() === day
      && date.getHours() === hour
      && date.getMinutes() === minute) return date.getTime()
  }

  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(text)
  if (timeMatch) {
    const hour = Number(timeMatch[1])
    const minute = Number(timeMatch[2])
    if (hour <= 23 && minute <= 59) {
      const today = new Date()
      today.setHours(hour, minute, 0, 0)
      return today.getTime()
    }
  }

  return Number.NEGATIVE_INFINITY
}

const sortedNotes = computed(() => contentConfig.notes
  .map((note, sourceIndex) => ({ note, sourceIndex, timeValue: noteTimeValue(note.updatedAt) }))
  .sort((left, right) => {
    if (Boolean(left.note.pinned) !== Boolean(right.note.pinned)) return left.note.pinned ? -1 : 1
    if (left.note.pinned) return left.sourceIndex - right.sourceIndex
    if (left.timeValue !== right.timeValue) return right.timeValue - left.timeValue
    return left.sourceIndex - right.sourceIndex
  })
  .map(({ note }) => note))

function openNote(note) { phone.openContent('notes', note.id) }
</script>

<template>
  <div class="notes-app">
    <template v-if="!selected">
      <header class="large-app-header large-app-header--warm">
        <div>
          <span class="header-caption">iCloud</span>
          <h2>备忘录</h2>
        </div>
        <button type="button" aria-label="更多"><CircleEllipsis :size="22" /></button>
      </header>
      <div class="notes-search"><Search :size="17" />搜索</div>
      <div class="notes-list">
        <button
          v-for="note in sortedNotes"
          :key="note.id"
          type="button"
          :class="{ 'is-pinned': note.pinned }"
          @click="openNote(note)"
        >
          <Pin v-if="note.pinned" class="notes-pin" :size="14" aria-label="已置顶" />
          <strong>{{ note.title }}</strong>
          <span>{{ note.excerpt }}</span>
          <small>{{ note.updatedAt }}</small>
        </button>
      </div>
      <footer class="notes-toolbar"><span>{{ contentConfig.notes.length }}个备忘录</span><SquarePen :size="22" /></footer>
    </template>

    <template v-else>
      <header class="simple-app-header simple-app-header--yellow">
        <button type="button" @click="phone.navigateBack"><ChevronLeft :size="24" />备忘录</button>
        <button type="button" aria-label="分享"><Share2 :size="19" /></button>
      </header>
      <article class="note-detail">
        <time>{{ selected.updatedAt }}</time>
        <h2>{{ selected.title }}</h2>
        <p>{{ selected.body }}</p>
      </article>
    </template>
  </div>
</template>
