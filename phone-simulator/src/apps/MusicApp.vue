<script setup>
import { computed, ref } from 'vue'
import { ChevronDown, ListMusic, MoreHorizontal, Pause, Play, Repeat1, Search, Shuffle, SkipBack, SkipForward } from 'lucide-vue-next'
import { useMusicStore } from '../stores/music'

defineProps({ app: { type: Object, required: true } })
const music = useMusicStore()
const view = ref('library')
const failedCovers = ref(new Set())
const track = computed(() => music.track)
const modeIcon = computed(() => ({ sequence: ListMusic, shuffle: Shuffle, 'repeat-one': Repeat1 }[music.mode]))
const modeLabel = computed(() => ({ sequence: '顺序播放', shuffle: '随机播放', 'repeat-one': '单曲循环' }[music.mode]))
const stamp = (seconds) => `${Math.floor(Number(seconds || 0) / 60)}:${String(Math.floor(Number(seconds || 0)) % 60).padStart(2, '0')}`
const fallbackCoverStyle = (item) => ({ '--cover-color': item?.color || '#7c8ff6' })
const hasCover = (item) => Boolean(item?.cover && !failedCovers.value.has(item.id))
function markCoverFailed(item) { failedCovers.value = new Set([...failedCovers.value, item.id]) }
</script>

<template>
  <div class="music-app" :class="{ 'music-app--player': view === 'player' }" :style="{ '--album-color': track.color || '#7c8ff6' }">
    <template v-if="view === 'library'">
      <header class="music-library-header"><span>资料库</span><h2>歌曲</h2><div><Search :size="16" />搜索</div></header>
      <main class="song-list">
        <button v-for="(item, index) in music.playlist" :key="item.id" type="button" @click="music.selectTrack(index)">
          <span class="song-cover" :style="fallbackCoverStyle(item)"><img v-if="hasCover(item)" :src="item.cover" alt="" @error="markCoverFailed(item)" /><i v-else></i></span>
          <span class="song-copy"><strong :class="{ active: music.currentIndex === index && music.playing }">{{ item.title }}</strong><small>{{ item.artist }}</small></span>
          <MoreHorizontal :size="19" />
        </button>
      </main>
      <div v-if="music.hasSelection" class="mini-player" role="button" tabindex="0" @click="view = 'player'" @keyup.enter="view = 'player'">
        <span class="mini-cover" :style="fallbackCoverStyle(track)"><img v-if="hasCover(track)" :src="track.cover" alt="" @error="markCoverFailed(track)" /><i v-else></i></span><strong>{{ track.title }}</strong>
        <span class="mini-controls" @click.stop><button type="button" :aria-label="music.playing ? '暂停' : '播放'" @click="music.togglePlay"><Pause v-if="music.playing" :size="22" fill="currentColor" /><Play v-else :size="22" fill="currentColor" /></button><button type="button" aria-label="下一首" @click="music.nextTrack(1)"><SkipForward :size="21" fill="currentColor" /></button></span>
      </div>
      <nav class="music-tabs"><button type="button">现在就听</button><button type="button">浏览</button><button type="button">广播</button><button class="active" type="button">资料库</button><button type="button">搜索</button></nav>
    </template>
    <template v-else>
      <header class="music-topbar"><button type="button" aria-label="返回歌曲列表" @click="view = 'library'"><ChevronDown :size="24" /></button><span>正在播放</span><button type="button"><MoreHorizontal :size="21" /></button></header>
      <div class="album-art" :style="fallbackCoverStyle(track)"><img v-if="hasCover(track)" :src="track.cover" alt="" @error="markCoverFailed(track)" /><span v-else><i></i><i></i><i></i><i></i><i></i></span></div>
      <div class="track-meta"><div><strong>{{ track.title }}</strong><span>{{ track.artist }}</span></div><button type="button"><MoreHorizontal :size="20" /></button></div>
      <div class="track-progress"><div><i :style="{ width: `${music.progress}%` }"></i></div><span>{{ stamp(music.elapsed) }}</span><span>-{{ stamp(Math.max(0, music.duration - music.elapsed)) }}</span></div>
      <div class="player-controls"><button class="play-mode" type="button" :aria-label="modeLabel" :title="modeLabel" @click="music.cycleMode"><component :is="modeIcon" :size="20" /></button><button type="button" aria-label="上一首" @click="music.nextTrack(-1)"><SkipBack :size="32" fill="currentColor" /></button><button class="play-main" type="button" :aria-label="music.playing ? '暂停' : '播放'" @click="music.togglePlay"><Pause v-if="music.playing" :size="36" fill="currentColor" /><Play v-else :size="36" fill="currentColor" /></button><button type="button" aria-label="下一首" @click="music.nextTrack(1)"><SkipForward :size="32" fill="currentColor" /></button></div>
    </template>
  </div>
</template>
