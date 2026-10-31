import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { contentConfig } from '../config/phone.config'

const PLAY_MODES = ['sequence', 'shuffle', 'repeat-one']

export const useMusicStore = defineStore('music', () => {
  const currentIndex = ref(0)
  const playing = ref(false)
  const elapsed = ref(0)
  const mediaDuration = ref(0)
  const hasSelection = ref(false)
  const mode = ref('sequence')
  let audio = null
  let fallbackTimer = null

  const playlist = computed(() => contentConfig.playlist || [])
  const track = computed(() => playlist.value[currentIndex.value] || {})
  const duration = computed(() => mediaDuration.value || Number(track.value.duration) || 180)
  const progress = computed(() => Math.min(100, duration.value > 0 ? (elapsed.value / duration.value) * 100 : 0))

  function clearFallbackTimer() {
    window.clearInterval(fallbackTimer)
    fallbackTimer = null
  }

  function startFallbackTimer() {
    clearFallbackTimer()
    if (!playing.value || track.value.src) return
    fallbackTimer = window.setInterval(() => {
      elapsed.value += 1
      if (elapsed.value >= duration.value) nextTrack(1, true)
    }, 1000)
  }

  function disposeAudio() {
    if (!audio) return
    audio.pause()
    audio.src = ''
    audio = null
  }

  function loadAudio(autoplay = false) {
    clearFallbackTimer()
    disposeAudio()
    mediaDuration.value = 0
    if (!track.value.src) {
      if (autoplay) startFallbackTimer()
      return
    }
    audio = new Audio(track.value.src)
    audio.preload = 'metadata'
    audio.addEventListener('timeupdate', () => { elapsed.value = Math.floor(audio?.currentTime || 0) })
    audio.addEventListener('loadedmetadata', () => {
      if (Number.isFinite(audio?.duration)) mediaDuration.value = Math.floor(audio.duration)
    })
    audio.addEventListener('ended', () => nextTrack(1, true))
    audio.addEventListener('play', () => { playing.value = true })
    audio.addEventListener('pause', () => {
      if (audio && !audio.ended) playing.value = false
    })
    if (autoplay) audio.play().catch(() => { playing.value = false })
  }

  function selectTrack(index) {
    if (!playlist.value.length) return
    currentIndex.value = index
    elapsed.value = 0
    hasSelection.value = true
    playing.value = true
    loadAudio(true)
  }

  function togglePlay() {
    if (!playlist.value.length) return
    if (!hasSelection.value) {
      selectTrack(currentIndex.value)
      return
    }
    if (playing.value) {
      playing.value = false
      clearFallbackTimer()
      audio?.pause()
      return
    }
    playing.value = true
    if (!audio && track.value.src) loadAudio(true)
    else if (audio) audio.play().catch(() => { playing.value = false })
    else startFallbackTimer()
  }

  function shuffledIndex() {
    const length = playlist.value.length
    if (length <= 1) return currentIndex.value
    let next = currentIndex.value
    while (next === currentIndex.value) next = Math.floor(Math.random() * length)
    return next
  }

  function nextTrack(direction = 1, automatic = false) {
    const length = playlist.value.length
    if (!length) return
    hasSelection.value = true
    if (automatic && mode.value === 'repeat-one') {
      elapsed.value = 0
      if (audio) {
        audio.currentTime = 0
        audio.play().catch(() => { playing.value = false })
      } else {
        playing.value = true
        startFallbackTimer()
      }
      return
    }
    currentIndex.value = mode.value === 'shuffle'
      ? shuffledIndex()
      : (currentIndex.value + direction + length) % length
    elapsed.value = 0
    playing.value = true
    loadAudio(true)
  }

  function cycleMode() {
    const index = PLAY_MODES.indexOf(mode.value)
    mode.value = PLAY_MODES[(index + 1) % PLAY_MODES.length]
  }

  function stopPlayback() {
    playing.value = false
    clearFallbackTimer()
    audio?.pause()
  }

  return {
    playlist, currentIndex, track, playing, elapsed, duration, progress, hasSelection, mode,
    selectTrack, togglePlay, nextTrack, cycleMode, stopPlayback,
  }
})
