<script setup>
import { Accessibility, Bell, Bluetooth, ChevronRight, CircleUserRound, Clock3, Eye, Focus, Gauge, LockKeyhole, Moon, Search, Settings, Smartphone, Volume2, Wallpaper, Wifi, Zap } from 'lucide-vue-next'
import { phoneConfig } from '../config/phone.config'
import { usePointerScroll } from '../utils/pointerScroll'

defineProps({ app: { type: Object, required: true } })
const { dragging, beginPointerScroll, movePointerScroll, endPointerScroll, wheelPointerScroll } = usePointerScroll()
const rows = [
  { label: '通知', icon: Bell, color: '#ee4b4e' },
  { label: '声音与触感', icon: Volume2, color: '#f14c4e' },
  { label: '专注模式', icon: Focus, color: '#6c5ce7' },
  { label: '屏幕使用时间', icon: Clock3, color: '#745bd8' },
  { label: '通用', icon: Settings, color: '#858a91' },
  { label: '显示与亮度', icon: Eye, color: '#3486f6' },
  { label: '主屏幕', icon: Smartphone, color: '#4d8cf5' },
  { label: '辅助功能', icon: Accessibility, color: '#2588f5' },
  { label: '墙纸', icon: Wallpaper, color: '#48a5a0' },
  { label: '面容 ID 与密码', icon: LockKeyhole, color: '#46a6a0' },
  { label: '电池', icon: Zap, color: '#38b54a' },
  { label: '隐私与安全性', icon: Gauge, color: '#3986e5' },
]
</script>

<template>
  <div class="settings-app">
    <header><h2>设置</h2></header>
    <div class="app-search settings-search"><Search :size="17" />搜索</div>
    <main
      class="settings-scroll desktop-drag-scroll"
      :class="{ 'is-dragging': dragging }"
      @pointerdown="beginPointerScroll"
      @pointermove="movePointerScroll"
      @pointerup="endPointerScroll"
      @pointercancel="endPointerScroll"
      @wheel.prevent="wheelPointerScroll"
    >
      <section class="settings-profile">
        <span><CircleUserRound :size="42" /></span><div><strong>{{ phoneConfig.owner.name }}</strong><p>Apple ID、iCloud、媒体与购买项目</p></div><ChevronRight :size="17" />
      </section>
      <section class="settings-group connectivity-group">
        <div><i class="setting-icon orange"><Moon :size="16" /></i><span>飞行模式</span><b class="ios-switch"></b></div>
        <div><i class="setting-icon blue"><Wifi :size="16" /></i><span>无线局域网</span><em>{{ phoneConfig.owner.wifiName || 'Home Wi-Fi' }}</em><ChevronRight :size="15" /></div>
        <div><i class="setting-icon blue"><Bluetooth :size="16" /></i><span>蓝牙</span><em>打开</em><ChevronRight :size="15" /></div>
      </section>
      <section class="settings-group settings-main-list">
        <div v-for="row in rows" :key="row.label"><i class="setting-icon" :style="{ background: row.color }"><component :is="row.icon" :size="16" /></i><span>{{ row.label }}</span><ChevronRight :size="15" /></div>
      </section>
    </main>
  </div>
</template>
