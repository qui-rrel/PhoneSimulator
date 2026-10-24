<script setup>
import { computed } from 'vue'
import { usePhoneStore } from '../stores/phone'
const phone = usePhoneStore()
const displayCall = computed(() => phone.incomingCall || phone.activeCall)
const formatDuration = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
const callStatusText = computed(() => {
  if (phone.incomingCall) return '来电'
  if (phone.callStatus === 'connecting') return '正在呼叫…'
  if (phone.callStatus === 'ended') return '通话结束'
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
        <button type="button" aria-label="拒绝来电" @click="phone.rejectCall">
          <img src="/media/UI/CallIcon/decline-call-icon.png" alt="" />
        </button>
        <button type="button" aria-label="接听来电" @click="phone.acceptCall">
          <img src="/media/UI/CallIcon/accept-call-icon.png" alt="" />
        </button>
      </div>
      <div v-else-if="phone.activeCall && phone.callStatus !== 'ended'" class="active-call-actions">
        <button type="button" aria-label="免提">
          <img src="/media/UI/CallIcon/speaker-call-icon.png" alt="" />
        </button>
        <button type="button" aria-label="静音">
          <img src="/media/UI/CallIcon/mute-call-icon.png" alt="" />
        </button>
        <button type="button" aria-label="结束通话" @click="phone.endCall">
          <img src="/media/UI/CallIcon/decline-call-icon.png" alt="" />
        </button>
      </div>
    </section>
  </Transition>
</template>
