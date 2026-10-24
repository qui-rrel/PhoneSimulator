<script setup>
import { computed } from 'vue'
import { ChevronLeft, CircleEllipsis, Search, Share2, SquarePen } from 'lucide-vue-next'
import { contentConfig } from '../config/phone.config'
import { usePhoneStore } from '../stores/phone'

defineProps({ app: { type: Object, required: true } })
const phone = usePhoneStore()
const selected = computed(() => phone.activeContent?.appId === 'notes'
  ? contentConfig.notes.find((note) => note.id === phone.activeContent.targetId) || null
  : null)
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
        <button v-for="note in contentConfig.notes" :key="note.id" type="button" @click="openNote(note)">
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
