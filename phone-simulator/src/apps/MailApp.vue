<script setup>
import { computed } from 'vue'
import { Archive, ChevronLeft, CircleEllipsis, Search, SquarePen, Trash2 } from 'lucide-vue-next'
import { usePhoneStore } from '../stores/phone'
defineProps({ app: { type: Object, required: true } })
const phone = usePhoneStore()
const selected = computed(() => phone.activeContent?.appId === 'mail'
  ? phone.mail.find((mail) => mail.id === phone.activeContent.targetId) || null
  : null)
function openMail(mail) { phone.openContent('mail', mail.id) }
</script>

<template>
  <div class="mail-app">
    <template v-if="!selected">
      <header class="mail-header"><button type="button">邮箱</button><button type="button">编辑</button><h2>收件箱</h2></header>
      <div class="app-search mail-search"><Search :size="16" />搜索</div>
      <main class="mail-list">
        <button v-for="mail in phone.mail" :key="mail.id" type="button" @click="openMail(mail)">
          <i v-if="mail.unread"></i><span><strong>{{ mail.from }}</strong><b>{{ mail.subject }}</b><small>{{ mail.preview }}</small></span><time>{{ mail.time }}</time>
        </button>
      </main>
      <footer class="mail-footer"><span>{{ phone.unreadMailTotal }} 封未读</span><SquarePen :size="21" /></footer>
    </template>
    <template v-else>
      <header class="mail-detail-header"><button type="button" @click="phone.navigateBack"><ChevronLeft :size="25" />收件箱</button><span><Archive :size="19" /><Trash2 :size="19" /><CircleEllipsis :size="20" /></span></header>
      <article class="mail-detail"><h2>{{ selected.subject }}</h2><div><span class="mail-avatar">{{ selected.from.slice(0, 1) }}</span><p><strong>{{ selected.from }}</strong><small>发给我</small></p><time>{{ selected.time }}</time></div><p>{{ selected.body }}</p></article>
    </template>
  </div>
</template>
