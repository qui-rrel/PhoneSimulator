<script setup>
import { computed, ref } from 'vue'
import { ChevronLeft, Heart, MoreHorizontal, Share2, Trash2 } from 'lucide-vue-next'
import { contentConfig } from '../config/phone.config'
import { usePhoneStore } from '../stores/phone'

defineProps({ app: { type: Object, required: true } })
const phone = usePhoneStore()
const selectedIndex = computed(() => {
  if (phone.activeContent?.appId !== 'photos') return -1
  return contentConfig.gallery.findIndex((photo) => photo.id === phone.activeContent.targetId)
})
const selected = computed(() => contentConfig.gallery[selectedIndex.value])
const photoStyle = (photo) => photo.src
  ? {
      backgroundColor: '#ececf0',
      backgroundImage: `url("${photo.src}"), ${photo.gradient || 'linear-gradient(145deg,#d8d9df,#aeb3bf)'}`,
      backgroundSize: 'cover, cover',
      backgroundPosition: 'center, center',
    }
  : { background: photo.gradient }
const swipeStart = ref(null)
const swipeOffset = ref(0)
function openPhoto(photo, index) { selectedIndex.value = index; phone.openContent('photos', photo.id) }
function beginSwipe(event) { swipeStart.value = event.clientX; swipeOffset.value = 0; event.currentTarget.setPointerCapture?.(event.pointerId) }
function moveSwipe(event) { if (swipeStart.value !== null) swipeOffset.value = event.clientX - swipeStart.value }
function endSwipe() {
  if (swipeStart.value === null) return
  if (Math.abs(swipeOffset.value) > 45) {
    const direction = swipeOffset.value < 0 ? 1 : -1
    const nextIndex = (selectedIndex.value + direction + contentConfig.gallery.length) % contentConfig.gallery.length
    phone.replaceContent('photos', contentConfig.gallery[nextIndex].id)
  }
  swipeStart.value = null
  swipeOffset.value = 0
}
</script>

<template>
  <div class="gallery-app">
    <template v-if="selectedIndex < 0">
      <header class="photos-header"><div><span>图库</span><h2>所有照片</h2></div><button type="button">选择</button></header>
      <div class="photos-count">{{ contentConfig.gallery.length }} 张照片</div>
      <div class="photo-grid"><button v-for="(photo, index) in contentConfig.gallery" :key="photo.id" type="button" :aria-label="`查看第 ${index + 1} 张照片`" @click="openPhoto(photo, index)"><span :style="photoStyle(photo)"><i v-if="!photo.src"></i></span></button></div>
    </template>
    <template v-else>
      <header class="simple-app-header photo-detail-header"><button type="button" @click="phone.navigateBack"><ChevronLeft :size="24" /></button><div><strong>{{ selected.date }}</strong><small>{{ selectedIndex + 1 }} / {{ contentConfig.gallery.length }}</small></div><button type="button"><MoreHorizontal :size="21" /></button></header>
      <div class="photo-viewer" :style="{ ...photoStyle(selected), transform: `translateX(${swipeOffset * 0.18}px)` }" @pointerdown="beginSwipe" @pointermove="moveSwipe" @pointerup="endSwipe" @pointercancel="endSwipe"><span v-if="!selected.src" class="abstract-photo-mark"></span></div>
      <footer class="photo-toolbar"><Share2 :size="21" /><Heart :size="21" /><Trash2 :size="21" /></footer>
    </template>
  </div>
</template>
