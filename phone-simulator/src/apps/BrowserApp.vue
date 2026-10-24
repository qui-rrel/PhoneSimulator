<script setup>
import { BookOpen, ChevronLeft, ChevronRight, Clock3, Copy, Plus, Search, Share, ShieldCheck } from 'lucide-vue-next'
import { contentConfig } from '../config/phone.config'
defineProps({ app: { type: Object, required: true } })
</script>

<template>
  <div class="browser-app">
    <header class="browser-start-header">
      <h2>起始页</h2>
      <section class="browser-favorites"><h3>个人收藏</h3><div><span><Search :size="24" /></span><small>搜索</small></div></section>
    </header>
    <main class="browser-history">
      <h3><Clock3 :size="16" />浏览记录</h3>
      <div v-if="contentConfig.browserHistory.length" class="history-list">
        <article v-for="item in contentConfig.browserHistory" :key="item.id">
          <span class="website-icon"><BookOpen :size="19" /></span>
          <div><strong>{{ item.title }}</strong><small>{{ item.url }}</small></div>
          <time>{{ item.time }}</time>
        </article>
      </div>
      <p v-else class="browser-empty">没有浏览记录</p>
    </main>
    <div class="browser-address"><ShieldCheck :size="14" /><span>搜索或输入网站名称</span></div>
    <footer class="browser-toolbar"><ChevronLeft :size="21" /><ChevronRight :size="21" /><Share :size="20" /><BookOpen :size="20" /><Copy :size="20" /><Plus :size="20" /></footer>
  </div>
</template>
