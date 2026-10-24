<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { ChevronLeft, MoreHorizontal, Plus, Search, Send, Smile, Video } from 'lucide-vue-next'
import { usePhoneStore } from '../stores/phone'
import { playKeyboardTapSound, playMessageSendSound } from '../utils/sounds'

defineProps({ app: { type: Object, required: true } })

const phone = usePhoneStore()
const messagePane = ref(null)
const draft = ref('')
const typingDraft = ref(false)
const keyboardVisible = ref(false)
const activeKey = ref('')

const contact = computed(() => phone.activeContact)
const currentStage = computed(() => {
  if (!contact.value) return null
  return phone.getActiveSmsScript(contact.value.id)
})
const currentPlayerEntry = computed(() => {
  if (!currentStage.value) return null
  const entry = currentStage.value.messages?.[currentStage.value.currentIndex] || null
  return entry?.side === 'me' ? entry : null
})
const currentPlayerLine = computed(() => currentPlayerEntry.value?.text || '')
const contactTyping = computed(() => Boolean(currentStage.value?.isTyping))
const keyboardRows = [['Q','W','E','R','T','Y','U','I','O','P'], ['A','S','D','F','G','H','J','K','L'], ['Z','X','C','V','B','N','M']]
const conversationPreview = (item) => item.messages?.at(-1)?.text || ''

async function scrollToBottom() {
  await nextTick()
  if (messagePane.value) messagePane.value.scrollTop = messagePane.value.scrollHeight
}

async function openContact(id) {
  phone.openContact(id)
  await scrollToBottom()
}

async function typePresetReply() {
  if (!contact.value || typingDraft.value || contactTyping.value || draft.value) return
  keyboardVisible.value = true
  phone.triggerOperation('message-input', { appId: 'messages', targetId: contact.value.id })
  await nextTick()
  const stage = currentStage.value
  if (!stage) return
  const nextEntry = stage.messages?.[stage.currentIndex]
  if (nextEntry?.side === 'them') return
  const line = currentPlayerLine.value
  if (!line) return
  typingDraft.value = true
  draft.value = ''
  const keystrokes = currentPlayerEntry.value?.keystrokes || line.replace(/\s/g, '')
  for (let index = 0; index < keystrokes.length; index += 1) {
    activeKey.value = keystrokes[index].toUpperCase()
    playKeyboardTapSound()
    const textLength = Math.max(1, Math.floor(((index + 1) / keystrokes.length) * line.length))
    draft.value = line.slice(0, textLength)
    await new Promise((resolve) => window.setTimeout(resolve, 58 + Math.random() * 34))
  }
  draft.value = line
  activeKey.value = ''
  typingDraft.value = false
}

function tapKey(key) {
  playKeyboardTapSound()
  activeKey.value = key
  window.setTimeout(() => { if (activeKey.value === key) activeKey.value = '' }, 110)
}

async function sendPresetReply() {
  if (!draft.value || !contact.value || typingDraft.value) return
  const id = contact.value.id
  const stage = currentStage.value
  if (!stage) return
  playMessageSendSound()
  phone.addMessage(id, { side: 'me', text: draft.value, read: true })
  draft.value = ''
  phone.advanceSmsScript(stage.id)
  await scrollToBottom()
}

watch(() => contact.value?.messages.length, scrollToBottom)
</script>

<template>
  <div class="messages-app" :class="{ 'messages-app--keyboard': keyboardVisible && contact }">
    <template v-if="!contact">
      <header class="large-app-header">
        <div>
          <span class="header-caption">所有信息</span>
          <h2>信息</h2>
        </div>
        <div class="header-actions">
          <button type="button" aria-label="搜索"><Search :size="20" /></button>
          <button type="button" aria-label="更多"><MoreHorizontal :size="21" /></button>
        </div>
      </header>

      <div class="conversation-list">
        <button
          v-for="item in phone.contacts"
          :key="item.id"
          class="conversation-row"
          type="button"
          @click="openContact(item.id)"
        >
          <span class="avatar" :style="{ background: item.color }">{{ item.initials }}</span>
          <span class="conversation-copy">
            <span class="conversation-title">
              <strong>{{ item.name }}</strong>
              <small>{{ item.time }}</small>
            </span>
            <span class="conversation-preview">{{ conversationPreview(item) }}</span>
          </span>
          <span v-if="item.unread" class="conversation-badge">{{ item.unread }}</span>
        </button>
      </div>
    </template>

    <template v-else>
      <header class="chat-header">
        <button type="button" aria-label="返回" @click="phone.navigateBack">
          <ChevronLeft :size="26" />
        </button>
        <div>
          <span class="avatar avatar--small" :style="{ background: contact.color }">{{ contact.initials }}</span>
          <strong>{{ contact.name }}</strong>
        </div>
        <button type="button" aria-label="视频通话"><Video :size="21" /></button>
      </header>

      <div ref="messagePane" class="message-pane">
        <div class="date-pill">今天</div>
        <div
          v-for="message in contact.messages"
          :key="message.id"
          class="message-line"
          :class="message.side === 'me' ? 'message-line--me' : 'message-line--them'"
        >
          <span v-if="message.side !== 'me'" class="avatar avatar--message" :style="{ background: contact.color }">
            {{ contact.initials }}
          </span>
          <div>
            <p>{{ message.text }}</p>
            <small v-if="message.stamp || (message.read && message.side === 'me')">
              {{ message.stamp }}<em v-if="message.read && message.side === 'me'">已读</em>
            </small>
          </div>
        </div>

        <div v-if="contactTyping" class="message-line message-line--them">
          <span class="avatar avatar--message" :style="{ background: contact.color }">{{ contact.initials }}</span>
          <div class="typing-bubble"><i></i><i></i><i></i></div>
        </div>
      </div>

      <div class="chat-composer">
        <Plus :size="24" />
        <button
          class="fake-input"
          :class="{ 'fake-input--filled': draft }"
          type="button"
          @click="typePresetReply"
        >
          <span>{{ draft || (currentPlayerLine ? 'iMessage 信息' : 'iMessage 信息') }}</span>
          <i v-if="typingDraft"></i>
        </button>
        <Smile :size="22" />
        <button class="send-button" :class="{ 'send-button--ready': draft }" type="button" aria-label="发送" @click="sendPresetReply">
          <Send :size="18" />
        </button>
      </div>
      <Transition name="keyboard-rise">
        <section v-if="keyboardVisible" class="phone-keyboard">
          <div v-for="(row, rowIndex) in keyboardRows" :key="rowIndex" class="keyboard-row">
            <button v-for="key in row" :key="key" type="button" :class="{ active: activeKey === key }" @click="tapKey(key)">{{ key }}</button>
          </div>
          <div class="keyboard-bottom"><button type="button" @click="playKeyboardTapSound">123</button><button class="keyboard-space" type="button" @click="playKeyboardTapSound">空格</button><button type="button" @click="keyboardVisible = false">完成</button></div>
        </section>
      </Transition>
    </template>
  </div>
</template>
