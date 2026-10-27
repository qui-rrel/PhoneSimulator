<script setup>
import {
  BedDouble,
  Briefcase,
  ChevronRight,
  Coffee,
  Cross,
  Footprints,
  GraduationCap,
  Home,
  Layers3,
  Landmark,
  LocateFixed,
  MapPin,
  Mic2,
  MoreHorizontal,
  Navigation,
  Plus,
  Search,
  Share,
  ShoppingBag,
  Star,
  TrainFront,
  Trees,
  Utensils,
  X,
} from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useMapsStore } from '../stores/maps'
import { usePhoneStore } from '../stores/phone'

defineProps({ app: { type: Object, required: true } })

const phone = usePhoneStore()
const maps = useMapsStore()
const mapViewport = ref(null)
const mapImage = ref(null)
const imageFailed = ref(false)
const isDragging = ref(false)
const pan = ref({ x: 0, y: 0 })
let drag = null

const typeStyles = Object.freeze({
  home: { label: '住宅', color: '#5b5ce8', icon: Home },
  work: { label: '工作地点', color: '#4978d0', icon: Briefcase },
  dining: { label: '餐饮', color: '#ff9500', icon: Utensils },
  cafe: { label: '咖啡', color: '#6d5bd0', icon: Coffee },
  shop: { label: '商店', color: '#2ca8b8', icon: ShoppingBag },
  hotel: { label: '酒店', color: '#8d67d8', icon: BedDouble },
  transport: { label: '交通', color: '#9c61d8', icon: TrainFront },
  hospital: { label: '医院', color: '#ef5c64', icon: Cross },
  school: { label: '学校', color: '#4c8cdd', icon: GraduationCap },
  park: { label: '公园', color: '#45a96b', icon: Trees },
  landmark: { label: '景点', color: '#e06f4f', icon: Landmark },
  'dance-studio': { label: '舞蹈室', color: '#e85ca7', icon: Footprints },
  'recording-studio': { label: '录音室', color: '#a45bd5', icon: Mic2 },
  other: { label: '其他', color: '#7d8593', icon: MapPin },
})

const activeLocation = computed(() => maps.activeLocation)
const detailLocation = computed(() => {
  if (phone.activeContent?.appId !== 'maps') return null
  return maps.locationById(phone.activeContent.targetId) || null
})
const detailType = computed(() => typeFor(detailLocation.value))
const detailSavedDate = computed(() => detailLocation.value ? maps.savedDateFor(detailLocation.value.id) : '')

function typeFor(location) {
  return typeStyles[location?.type] || typeStyles.other
}

function formattedDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value || '')
  if (!match) return value || ''
  return `${Number(match[1])}. ${Number(match[2])}. ${Number(match[3])}.`
}

function resetPan() {
  pan.value = { x: 0, y: 18 }
}

function clampPan(x, y) {
  const viewport = mapViewport.value
  const image = mapImage.value
  if (!viewport || !image) return { x, y }
  const maxX = Math.max(0, (image.offsetWidth - viewport.clientWidth) / 2 + 34)
  const maxY = Math.max(0, (image.offsetHeight - viewport.clientHeight) / 2 + 34)
  return {
    x: Math.max(-maxX, Math.min(maxX, x)),
    y: Math.max(-maxY, Math.min(maxY, y)),
  }
}

function beginMapDrag(event) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, panX: pan.value.x, panY: pan.value.y }
  isDragging.value = true
  event.currentTarget.setPointerCapture?.(event.pointerId)
}

function moveMapDrag(event) {
  if (!drag || drag.pointerId !== event.pointerId) return
  event.preventDefault()
  pan.value = clampPan(drag.panX + event.clientX - drag.x, drag.panY + event.clientY - drag.y)
}

function endMapDrag(event) {
  if (!drag || drag.pointerId !== event.pointerId) return
  event.currentTarget.releasePointerCapture?.(event.pointerId)
  drag = null
  isDragging.value = false
}

function openLocation(location) {
  if (!location || !maps.selectLocation(location.id)) return
  phone.openContent('maps', location.id)
}

function closeDetails() {
  phone.navigateBack()
}

watch(() => phone.activeContent, (content) => {
  if (content?.appId === 'maps') maps.selectLocation(content.targetId)
}, { immediate: true })

watch(() => activeLocation.value?.id, async () => {
  imageFailed.value = false
  await nextTick()
  resetPan()
})

onBeforeUnmount(() => { drag = null; isDragging.value = false })
</script>

<template>
  <div class="maps-app">
    <div
      ref="mapViewport"
      class="maps-canvas"
      :class="{ 'maps-canvas--dragging': isDragging }"
      @pointerdown="beginMapDrag"
      @pointermove="moveMapDrag"
      @pointerup="endMapDrag"
      @pointercancel="endMapDrag"
    >
      <img
        v-if="activeLocation && !imageFailed"
        ref="mapImage"
        class="maps-image"
        :src="activeLocation.mapSrc"
        :alt="`${activeLocation.name}地图`"
        draggable="false"
        :style="{ transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px))` }"
        @load="resetPan"
        @error="imageFailed = true"
      />
      <div v-else class="maps-image-error">
        <MapPin :size="34" />
        <span>地图素材未找到</span>
      </div>
      <div v-if="activeLocation" class="maps-focus" aria-hidden="true">
        <i></i>
        <strong>{{ activeLocation.name }}</strong>
      </div>
      <div class="maps-float-controls" aria-hidden="true">
        <span><Layers3 :size="20" /></span>
        <span><LocateFixed :size="20" /></span>
      </div>
    </div>

    <section v-if="!detailLocation" class="maps-sheet maps-library">
      <div class="maps-sheet-handle" aria-hidden="true"></div>
      <div class="maps-search" aria-hidden="true"><Search :size="18" /><span>搜索地图</span></div>

      <div class="maps-section-heading">
        <h2>个人收藏</h2>
      </div>
      <div class="maps-favorites" v-if="maps.favorites.length">
        <button v-for="location in maps.favorites" :key="location.id" type="button" @click="openLocation(location)">
          <span class="maps-place-icon maps-place-icon--large" :style="{ background: typeFor(location).color }">
            <component :is="typeFor(location).icon" :size="28" :stroke-width="2" />
          </span>
          <strong>{{ location.name }}</strong>
          <small>{{ typeFor(location).label }}</small>
        </button>
        <div class="maps-add-place" aria-hidden="true">
          <span><Plus :size="30" :stroke-width="1.8" /></span>
          <strong>添加</strong>
          <small>个人地点</small>
        </div>
      </div>
      <p v-else class="maps-empty">还没有收藏地点</p>

      <div class="maps-section-heading maps-section-heading--recent">
        <h2>最近</h2>
      </div>
      <div class="maps-recent" v-if="maps.recent.length">
        <button v-for="location in maps.recent" :key="location.id" type="button" @click="openLocation(location)">
          <span class="maps-place-icon" :style="{ background: typeFor(location).color }">
            <component :is="typeFor(location).icon" :size="19" :stroke-width="2.1" />
          </span>
          <span class="maps-recent-copy">
            <strong>{{ location.name }}</strong>
            <small>{{ location.address }}</small>
          </span>
          <ChevronRight :size="18" />
        </button>
      </div>
      <p v-else class="maps-empty">暂无最近地点</p>
    </section>

    <section v-else class="maps-sheet maps-detail">
      <div class="maps-sheet-handle" aria-hidden="true"></div>
      <header class="maps-detail-header">
        <div>
          <h2>{{ detailLocation.name }}</h2>
          <p>{{ detailType.label }}</p>
        </div>
        <button type="button" aria-label="关闭地点详情" @click="closeDetails"><X :size="22" /></button>
      </header>

      <div class="maps-detail-actions">
        <div class="maps-detail-action maps-detail-action--current" aria-hidden="true"><Navigation :size="24" /><span>当前位置</span></div>
        <div
          class="maps-detail-action"
          :class="{ 'is-favorite': maps.isFavorite(detailLocation.id) }"
          aria-hidden="true"
        >
          <Star :size="24" :fill="maps.isFavorite(detailLocation.id) ? 'currentColor' : 'none'" />
          <span>{{ maps.isFavorite(detailLocation.id) ? '已收藏' : '收藏' }}</span>
        </div>
        <div class="maps-detail-action" aria-hidden="true"><Share :size="24" /><span>共享</span></div>
        <div class="maps-detail-action" aria-hidden="true"><MoreHorizontal :size="25" /><span>更多</span></div>
      </div>

      <div class="maps-detail-card">
        <div><span>地址</span><strong>{{ detailLocation.address }}</strong></div>
        <div v-if="maps.isFavorite(detailLocation.id) && detailSavedDate"><span>保存时间</span><strong>{{ formattedDate(detailSavedDate) }}</strong></div>
      </div>
    </section>
  </div>
</template>
