<script setup>
import { Clock3, ContactRound, Grid3X3, Phone, Star } from 'lucide-vue-next'
import { usePhoneStore } from '../stores/phone'
import { formatListTimestamp } from '../utils/dateTime'

defineProps({ app: { type: Object, required: true } })
const phone = usePhoneStore()

const tabs = [
  { label: '个人收藏', icon: Star },
  { label: '最近通话', icon: Clock3, active: true },
  { label: '通讯录', icon: ContactRound },
  { label: '拨号键盘', icon: Grid3X3 },
  { label: '语音留言', icon: Phone },
]
</script>

<template>
  <div class="phone-app">
    <header class="phone-app-header">
      <button type="button">编辑</button>
      <div class="call-filter"><strong>全部</strong><span>未接来电</span></div>
      <button type="button" aria-label="添加">＋</button>
    </header>
    <section class="call-history">
      <h2>最近通话</h2>
      <div v-if="!phone.callHistory.length" class="empty-calls">
        <Phone :size="42" :stroke-width="1.25" />
        <strong>无最近通话</strong>
      </div>
      <div v-else class="call-list">
        <button
          v-for="record in phone.callHistory"
          :key="record.id"
          type="button"
          :class="{ 'call-list-row--missed': record.direction !== 'outgoing' && record.outcome === 'missed' }"
          @click="phone.startOutgoingCall(record.contactId, record)"
        >
          <span class="call-avatar-small" :style="{ background: record.color }"><img v-if="record.avatar" :src="record.avatar" alt="" />{{ record.avatar ? '' : record.initials }}</span>
          <span><strong>{{ record.name }}</strong><small>{{ record.direction === 'outgoing' ? (record.outcome === 'missed' ? '未接通' : '呼出电话') : record.outcome === 'missed' ? '未接电话' : '来电' }}</small></span>
          <time>{{ formatListTimestamp(record.time) }}</time>
        </button>
      </div>
    </section>
    <nav class="ios-tabbar phone-tabs" aria-label="电话导航">
      <button v-for="tab in tabs" :key="tab.label" type="button" :class="{ active: tab.active }">
        <component :is="tab.icon" :size="21" />
        <span>{{ tab.label }}</span>
      </button>
    </nav>
  </div>
</template>
