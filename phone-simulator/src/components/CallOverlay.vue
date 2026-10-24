<script setup>
import { computed } from 'vue'
import { MicOff, Phone, PhoneOff, Volume2 } from 'lucide-vue-next'
import { usePhoneStore } from '../stores/phone'
const phone = usePhoneStore()
const displayCall = computed(() => phone.incomingCall || phone.activeCall)
const formatDuration = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
const callStatusText = computed(() => {
  if (phone.incomingCall) return '来电'
  if (phone.callStatus === 'connecting') return '正在呼叫…'
  if (phone.callStatus === 'unanswered') return '对方未接听'
  return formatDuration(phone.callElapsed)
})
</script>

<template>
  <Transition name="call-screen">
    <section v-if="displayCall" class="call-overlay">
      <div class="call-avatar" :style="{ background: displayCall.color || '#7d8ef2' }"><img v-if="displayCall.avatar" :src="displayCall.avatar" alt="" />{{ displayCall.avatar ? '' : (displayCall.initials || displayCall.title?.slice(0, 1)) }}</div>
      <h2>{{ displayCall.title }}</h2>
      <p>{{ callStatusText }}</p>

      <div v-if="phone.activeCall && phone.callStatus === 'connected'" class="call-transcript">
        <p v-for="(line, index) in phone.callTranscript" :key="index" :class="`call-line--${line.side}`">{{ line.text }}</p>
      </div>

      <div v-if="phone.incomingCall" class="incoming-call-actions">
        <button type="button" class="reject" @click="phone.rejectCall"><PhoneOff :size="26" /><span>拒绝</span></button>
        <button type="button" class="accept" @click="phone.acceptCall"><Phone :size="26" /><span>接听</span></button>
      </div>
      <div v-else class="active-call-actions">
        <button type="button"><MicOff :size="22" /><span>静音</span></button>
        <button type="button"><Volume2 :size="22" /><span>扬声器</span></button>
        <button type="button" class="reject" @click="phone.endCall"><PhoneOff :size="27" /></button>
      </div>
    </section>
  </Transition>
</template>
