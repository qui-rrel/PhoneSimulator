<script setup>
import { computed, onMounted, ref } from 'vue'
import { ChevronLeft, Heart, MoreHorizontal, Share2, Trash2 } from 'lucide-vue-next'
import { contentConfig } from '../config/phone.config'
import { usePhoneStore } from '../stores/phone'
import { GALLERY_FIRST_SCREEN_IMAGE_COUNT, warmImageSources } from '../utils/mediaPreloader'

defineProps({ app: { type: Object, required: true } })
const phone = usePhoneStore()
const selectedIndex = computed(() => {
  if (phone.activeContent?.appId !== 'photos') return -1
  return contentConfig.gallery.findIndex((photo) => photo.id === phone.activeContent.targetId)
})
const selected = computed(() => contentConfig.gallery[selectedIndex.value])
const thumbnailStyle = (photo) => ({
  background: photo.gradient || 'linear-gradient(145deg,#d8d9df,#aeb3bf)',
})
const selectedPhotoStyle = computed(() => selected.value?.src
  ? {
      backgroundColor: '#000',
      backgroundImage: `url("${selected.value.src}")`,
      backgroundSize: 'contain',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    }
  : { background: selected.value?.gradient || '#000' })
const swipeStart = ref(null)
const swipeOffset = ref(0)
onMounted(() => {
  void warmImageSources(contentConfig.gallery.slice(0, GALLERY_FIRST_SCREEN_IMAGE_COUNT).map((photo) => photo.src))
})
function openPhoto(photo) { phone.openContent('photos', photo.id) }
function hideBrokenThumbnail(event) { event.currentTarget.hidden = true }
function beginSwipe(event) { swipeStart.value = event.clientX; swipeOffset.value = 0; event.currentTarget.setPointerCapture?.(event.pointerId) }
function moveSwipe(event) { if (swipeStart.value !== null) swipeOffset.value = event.clientX - swipeStart.value }
function endSwipe() {
  if (swipeStart.value === null) return
  if (Math.abs(swipeOffset.value) > 45) {
    const direction = swipeOffset.value < 0 ? 1 : -1
    const nextIndex = selectedIndex.value + direction
    const nextPhoto = contentConfig.gallery[nextIndex]
    if (nextPhoto) phone.replaceContent('photos', nextPhoto.id)
  }
  swipeStart.value = null
  swipeOffset.value = 0
}
</script>

<template>
  <div class="gallery-app">
    <div v-if="selectedIndex < 0" class="gallery-library">
      <header class="photos-header"><div><span>图库</span><h2>所有照片</h2></div><button type="button">选择</button></header>
      <div class="photos-count">{{ contentConfig.gallery.length }} 张照片</div>
      <div class="photo-grid"><button v-for="(photo, index) in contentConfig.gallery" :key="photo.id" type="button" :aria-label="`查看第 ${index + 1} 张照片`" @click="openPhoto(photo)"><span :style="thumbnailStyle(photo)"><img v-if="photo.src" :src="photo.src" alt="" :loading="index < GALLERY_FIRST_SCREEN_IMAGE_COUNT ? 'eager' : 'lazy'" :fetchpriority="index < GALLERY_FIRST_SCREEN_IMAGE_COUNT ? 'high' : 'low'" decoding="async" @error="hideBrokenThumbnail" /><i v-else></i></span></button></div>
    </div>
    <template v-else>
      <header class="simple-app-header photo-detail-header"><button type="button" aria-label="返回所有照片" @click="phone.navigateBack"><ChevronLeft :size="24" /></button><strong>{{ selectedIndex + 1 }} / {{ contentConfig.gallery.length }}</strong><button type="button" aria-label="更多"><MoreHorizontal :size="21" /></button></header>
      <div class="photo-viewer" :style="{ ...selectedPhotoStyle, transform: `translateX(${swipeOffset * 0.18}px)` }" @pointerdown="beginSwipe" @pointermove="moveSwipe" @pointerup="endSwipe" @pointercancel="endSwipe"><span v-if="!selected.src" class="abstract-photo-mark"></span></div>
      <footer class="photo-toolbar"><Share2 :size="21" /><Heart :size="21" /><Trash2 :size="21" /></footer>
    </template>
  </div>
</template>
