<script setup>
import { computed } from 'vue'
import {
  ChevronDown,
  ChevronLeft,
  House,
  MessageCircle,
  Plus,
  Search,
  Store,
  Trash2,
  UserRound,
} from 'lucide-vue-next'
import { contentConfig } from '../config/phone.config'
import { usePhoneStore } from '../stores/phone'

defineProps({ app: { type: Object, required: true } })

const phone = usePhoneStore()
const config = computed(() => contentConfig.xiaohongshu || {})
const feedImageSrc = computed(() => config.value.homeImageSrc || '')
const searchHistory = computed(() => config.value.searchHistory || [])
const searchOpen = computed(() => (
  phone.activeContent?.appId === 'xiaohongshu' &&
  phone.activeContent?.targetId === 'search'
))

function openSearch() {
  if (!searchOpen.value) phone.openContent('xiaohongshu', 'search')
}

function externalUrl(value) {
  const url = String(value || '').trim()
  return /^https?:\/\//i.test(url) ? url : ''
}
</script>

<template>
  <div class="xiaohongshu-app">
    <section v-show="!searchOpen" class="xiaohongshu-home">
      <header class="xiaohongshu-home-header">
        <div class="xiaohongshu-primary-nav">
          <span class="xiaohongshu-chat-mark" aria-hidden="true"><MessageCircle /></span>
          <div class="xiaohongshu-primary-tabs" aria-hidden="true">
            <span>关注</span>
            <strong>发现</strong>
            <span>同城</span>
          </div>
          <button type="button" aria-label="打开搜索" @click="openSearch"><Search /></button>
        </div>
        <div class="xiaohongshu-channel-nav" aria-hidden="true">
          <strong>推荐</strong>
          <span>RED</span>
          <span>直播</span>
          <span>热点</span>
          <span>短剧</span>
          <span>学习</span>
          <ChevronDown />
        </div>
      </header>

      <main class="xiaohongshu-feed-scroll desktop-drag-scroll">
        <img
          v-if="feedImageSrc"
          :src="feedImageSrc"
          alt="小红书首页内容"
          decoding="async"
          draggable="false"
        />
        <p v-else class="xiaohongshu-feed-empty">暂无首页内容</p>
      </main>

      <nav class="xiaohongshu-bottom-nav" aria-label="小红书底部栏">
        <span class="active"><House /><b>首页</b></span>
        <span><Store /><b>市集</b></span>
        <span class="xiaohongshu-create" aria-hidden="true"><Plus /></span>
        <span><MessageCircle /><b>消息</b></span>
        <span><UserRound /><b>我</b></span>
      </nav>
    </section>

    <section v-show="searchOpen" class="xiaohongshu-search-page">
      <header class="xiaohongshu-search-header">
        <button type="button" aria-label="返回首页" @click="phone.navigateBack"><ChevronLeft /></button>
        <div class="xiaohongshu-search-box"><Search /><span>小红书怎么领券</span></div>
        <strong>搜索</strong>
      </header>

      <main class="xiaohongshu-search-content desktop-drag-scroll">
        <div class="xiaohongshu-history-heading">
          <h2>历史记录</h2>
          <Trash2 aria-hidden="true" />
        </div>
        <div v-if="searchHistory.length" class="xiaohongshu-history-list">
          <template v-for="item in searchHistory" :key="item.id">
            <a
              v-if="externalUrl(item.url)"
              :href="externalUrl(item.url)"
              target="_blank"
              rel="noopener noreferrer"
            >{{ item.text }}</a>
            <span v-else>{{ item.text }}</span>
          </template>
        </div>
        <p v-else class="xiaohongshu-history-empty">暂无搜索记录</p>
      </main>
    </section>
  </div>
</template>
