<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import {
  Blocks, ChevronLeft, ChevronRight, CirclePlus, Compass, ContactRound, Gamepad2, Heart,
  Image as ImageIcon, MessageCircle, MessageSquare, Mic, MoreHorizontal, Music2, Plus,
  Phone, ScanLine, Search, Settings, ShoppingBag, Smile, UserRound, Video,
} from 'lucide-vue-next'
import WechatAvatar from '../components/WechatAvatar.vue'
import WeChatMoments from './WeChatMoments.vue'
import { usePhoneStore } from '../stores/phone'
import { useMapsStore } from '../stores/maps'
import { useWechatStore } from '../stores/wechat'
import { playKeyboardTapSound, playMessageSendSound } from '../utils/sounds'
import { createTypingPlan } from '../utils/typing'

defineProps({ app: { type: Object, required: true } })

const phone = usePhoneStore()
const maps = useMapsStore()
const wechat = useWechatStore()
const tab = ref('chats')
const messagePane = ref(null)
const draft = ref('')
const draftType = ref('text')
const draftMediaSrc = ref('')
const typingDraft = ref(false)
const keyboardVisible = ref(false)
const activeKey = ref('')
const typingToken = ref(0)
const conversationDrafts = ref({})
const typedSteps = ref(0)
const keyboardLayoutTimer = ref(null)
const viewerSwipeStart = ref(null)
const viewerSwipeOffset = ref(0)

const contentTarget = computed(() => phone.activeContent?.appId === 'wechat' ? phone.activeContent.targetId : '')
const showingMoments = computed(() => contentTarget.value === 'moments')
const showingMomentContent = computed(() => contentTarget.value === 'moments'
  || contentTarget.value === 'moments-compose'
  || contentTarget.value === 'moments-activity'
  || contentTarget.value.startsWith('moment-viewer:')
  || contentTarget.value.startsWith('comment-viewer:'))
const viewerTarget = computed(() => {
  if (!contentTarget.value.startsWith('moment-viewer:')) return null
  const [, momentId, rawIndex] = contentTarget.value.split(':')
  return { momentId, index: Math.max(0, Number.parseInt(rawIndex, 10) || 0) }
})
const conversation = computed(() => showingMomentContent.value ? null : wechat.findConversation(contentTarget.value))
const group = computed(() => conversation.value?.type === 'group' ? wechat.findGroup(conversation.value.targetId) : null)
const directContact = computed(() => conversation.value?.type === 'direct' ? wechat.findContact(conversation.value.targetId) : null)
const messages = computed(() => conversation.value ? wechat.conversationMessages(conversation.value.id) : [])
const messageRows = computed(() => {
  const displayedTimes = new Set()
  return messages.value.map((message) => {
    const time = String(message.time || '').trim()
    const showTime = Boolean(time && !displayedTimes.has(time))
    if (time) displayedTimes.add(time)
    return { message, time, showTime }
  })
})
const momentsCoverStyle = computed(() => wechat.profile.momentsCover
  ? { backgroundImage: `url("${wechat.profile.momentsCover}")` }
  : undefined)
const activeScript = computed(() => conversation.value ? wechat.getActiveScript(conversation.value.id) : null)
const pendingPlayerEntry = computed(() => {
  const script = activeScript.value
  const entry = script?.messages?.[script.currentIndex]
  return entry?.senderId === 'SELF' ? entry : null
})
const pendingType = computed(() => pendingPlayerEntry.value?.type || 'text')
const keyboardRows = [['Q','W','E','R','T','Y','U','I','O','P'], ['A','S','D','F','G','H','J','K','L'], ['Z','X','C','V','B','N','M']]
const momentImages = (moment) => {
  const configured = Array.isArray(moment?.imageSrc) ? moment.imageSrc : moment?.imageSrc ? [moment.imageSrc] : []
  return configured.filter(Boolean).slice(0, 9)
}
const viewerMoment = computed(() => wechat.moments.find((moment) => moment.id === viewerTarget.value?.momentId))
const viewerImages = computed(() => momentImages(viewerMoment.value))
const viewerIndex = computed(() => Math.min(viewerTarget.value?.index || 0, Math.max(0, viewerImages.value.length - 1)))
const viewerImage = computed(() => viewerImages.value[viewerIndex.value] || '')

const contactName = (contact) => contact?.remark || contact?.nickname || contact?.name || '微信联系人'
const sender = (message) => wechat.findContact(message.senderId)
const conversationAvatar = (item) => item.type === 'group'
  ? { members: wechat.groupMembers(wechat.findGroup(item.targetId)) }
  : { person: wechat.findContact(item.targetId) }

async function scrollToBottom(smooth = false) {
  await nextTick()
  if (messagePane.value) messagePane.value.scrollTo({
    top: messagePane.value.scrollHeight,
    behavior: smooth ? 'smooth' : 'auto',
  })
}

function alignLatestAfterKeyboardLayout() {
  window.clearTimeout(keyboardLayoutTimer.value)
  window.requestAnimationFrame(() => { void scrollToBottom(true) })
  keyboardLayoutTimer.value = window.setTimeout(() => { void scrollToBottom(true) }, 280)
}

function openConversation(id) {
  tab.value = 'chats'
  wechat.markConversationRead(id)
  phone.openContent('wechat', id)
}

function openMoments() {
  tab.value = 'discover'
  phone.openContent('wechat', 'moments')
}

function openMomentImage(moment, index) {
  phone.openContent('wechat', `moment-viewer:${moment.id}:${index}`)
}

function openMapLocation(message) {
  const locationId = String(message?.mapLocationId || '').trim()
  if (!locationId || !maps.addRecentAndSelect(locationId)) return
  phone.openAppContent('maps', locationId)
}

function mapLocationLabel(message) {
  const location = maps.locationById(message?.mapLocationId)
  return location ? `打开${location.name}的地图定位` : '打开地图定位'
}

function replaceViewerIndex(index) {
  if (!viewerMoment.value || index < 0 || index >= viewerImages.value.length) return false
  phone.replaceContent('wechat', `moment-viewer:${viewerMoment.value.id}:${index}`)
  return true
}

function beginViewerSwipe(event) {
  viewerSwipeStart.value = { x: event.clientX, y: event.clientY, moved: false }
  viewerSwipeOffset.value = 0
  event.currentTarget.setPointerCapture?.(event.pointerId)
}

function moveViewerSwipe(event) {
  if (!viewerSwipeStart.value) return
  const offsetX = event.clientX - viewerSwipeStart.value.x
  const offsetY = event.clientY - viewerSwipeStart.value.y
  if (Math.hypot(offsetX, offsetY) > 8) viewerSwipeStart.value.moved = true
  viewerSwipeOffset.value = Math.abs(offsetX) > Math.abs(offsetY) ? offsetX : 0
}

function endViewerSwipe() {
  if (!viewerSwipeStart.value) return
  const wasTap = !viewerSwipeStart.value.moved
  const offset = viewerSwipeOffset.value
  viewerSwipeStart.value = null
  viewerSwipeOffset.value = 0
  if (wasTap) {
    phone.navigateBack()
    return
  }
  if (Math.abs(offset) < 46) return
  if (offset < 0) replaceViewerIndex(viewerIndex.value + 1)
  else if (!replaceViewerIndex(viewerIndex.value - 1) && viewerIndex.value === 0) phone.navigateBack()
}

function cancelViewerSwipe() {
  viewerSwipeStart.value = null
  viewerSwipeOffset.value = 0
}

async function prepareTextReply() {
  keyboardVisible.value = true
  phone.triggerOperation('message-input', { appId: 'wechat', targetId: conversation.value.id })
  await nextTick()
  alignLatestAfterKeyboardLayout()
  const entry = pendingPlayerEntry.value
  if (!entry || entry.type !== 'text' || typingDraft.value || draft.value === (entry.text || '')) return
  await scrollToBottom()
  typingDraft.value = true
  typingToken.value += 1
  const token = typingToken.value
  draftType.value = 'text'
  const line = entry.text || ''
  const plan = createTypingPlan(line, entry.keystrokes)
  if (!plan.keystrokes.length) {
    draft.value = line
    typingDraft.value = false
    return
  }
  for (let index = typedSteps.value; index < plan.keystrokes.length; index += 1) {
    if (token !== typingToken.value || !keyboardVisible.value) { typingDraft.value = false; return }
    activeKey.value = plan.keystrokes[index].toUpperCase()
    playKeyboardTapSound()
    typedSteps.value = index + 1
    const length = Math.max(1, Math.floor((typedSteps.value / plan.keystrokes.length) * plan.typeableCount))
    draft.value = plan.render(length)
    await new Promise((resolve) => window.setTimeout(resolve, 56 + Math.random() * 30))
  }
  draft.value = line
  activeKey.value = ''
  typingDraft.value = false
}

function prepareMediaReply(type) {
  const entry = pendingPlayerEntry.value
  if (!entry || entry.type !== type) return
  keyboardVisible.value = false
  activeKey.value = ''
  phone.triggerOperation('message-input', { appId: 'wechat', targetId: conversation.value.id })
  playKeyboardTapSound()
  draftType.value = type
  draftMediaSrc.value = entry.mediaSrc || ''
  draft.value = ''
}

function closeKeyboard() {
  typingToken.value += 1
  typingDraft.value = false
  keyboardVisible.value = false
  activeKey.value = ''
  nextTick(alignLatestAfterKeyboardLayout)
}

function tapKey(key) {
  playKeyboardTapSound()
  activeKey.value = key
  window.setTimeout(() => { if (activeKey.value === key) activeKey.value = '' }, 110)
}

async function sendPresetReply() {
  const entry = pendingPlayerEntry.value
  if (!entry || (!draft.value && !draftMediaSrc.value) || typingDraft.value || !conversation.value) return
  playMessageSendSound()
  wechat.addMessage(conversation.value.id, {
    senderId: 'SELF',
    type: entry.type,
    text: entry.text || '',
    mediaSrc: entry.mediaSrc || '',
  })
  draft.value = ''
  draftMediaSrc.value = ''
  draftType.value = 'text'
  typedSteps.value = 0
  delete conversationDrafts.value[conversation.value.id]
  wechat.advanceScript(activeScript.value.id)
  await scrollToBottom()
}

watch(contentTarget, async (target, previous) => {
  if (previous && wechat.findConversation(previous)) {
    conversationDrafts.value[previous] = { text: draft.value, type: draftType.value, mediaSrc: draftMediaSrc.value, typedSteps: typedSteps.value }
  }
  if (target && target !== 'moments') wechat.markConversationRead(target)
  const saved = conversationDrafts.value[target] || {}
  draft.value = saved.text || ''
  draftMediaSrc.value = saved.mediaSrc || ''
  draftType.value = saved.type || 'text'
  typedSteps.value = saved.typedSteps || 0
  closeKeyboard()
  activeKey.value = ''
  await scrollToBottom()
}, { immediate: true })
watch(() => messages.value.length, scrollToBottom)
</script>

<template>
  <div class="wechat-app" :class="{ 'wechat-app--keyboard': keyboardVisible && conversation }">
    <WeChatMoments v-if="showingMomentContent" />

    <template v-else-if="conversation">
      <header class="wechat-chat-header">
        <button type="button" aria-label="返回" @click="phone.navigateBack"><ChevronLeft :size="27" /></button>
        <strong>{{ wechat.conversationTitle(conversation) }}<span v-if="group">（{{ group.memberIds.length }}）</span></strong>
        <button type="button" aria-label="更多"><MoreHorizontal :size="24" /></button>
      </header>

      <main ref="messagePane" class="wechat-message-pane" @pointerdown="closeKeyboard">
        <template v-for="row in messageRows" :key="row.message.id">
          <time v-if="row.showTime" class="wechat-chat-time">{{ row.time }}</time>
          <article
            class="wechat-message"
            :class="{ 'wechat-message--me': row.message.senderId === 'SELF' }"
          >
            <WechatAvatar
              v-if="row.message.senderId !== 'SELF'"
              :person="sender(row.message)"
              :size="38"
            />
            <div class="wechat-message__content">
              <small v-if="group && row.message.senderId !== 'SELF'">{{ contactName(sender(row.message)) }}</small>
              <p v-if="row.message.type === 'text'" class="wechat-bubble">{{ row.message.text }}</p>
              <p
                v-else-if="row.message.type === 'voice-call' || row.message.type === 'video-call'"
                class="wechat-bubble wechat-call-record"
              >
                <span>{{ wechat.messagePreview(row.message) }}</span>
                <Phone v-if="row.message.type === 'voice-call'" :size="17" aria-hidden="true" />
                <Video v-else :size="17" aria-hidden="true" />
              </p>
              <button
                v-else-if="row.message.type === 'location'"
                class="wechat-location-card"
                type="button"
                :aria-label="mapLocationLabel(row.message)"
                @click.stop="openMapLocation(row.message)"
              >
                <img
                  class="wechat-message-media"
                  :src="row.message.mediaSrc"
                  :alt="mapLocationLabel(row.message)"
                  draggable="false"
                />
              </button>
              <img v-else class="wechat-message-media" :src="row.message.mediaSrc" :alt="row.message.type === 'image' ? '图片消息' : '表情消息'" />
            </div>
            <WechatAvatar v-if="row.message.senderId === 'SELF'" :person="{ ...wechat.profile, nickname: wechat.profile.nickname }" :size="38" />
          </article>
        </template>
        <div v-if="activeScript?.isTyping" class="wechat-typing">对方正在输入…</div>
      </main>

      <footer class="wechat-composer">
        <button type="button" aria-label="语音"><Mic :size="23" /></button>
        <button class="wechat-composer__input" type="button" @click="prepareTextReply">
          <span v-if="draftType === 'text'">{{ draft }}</span>
          <span v-else class="wechat-composer__media"><img v-if="draftMediaSrc" :src="draftMediaSrc" alt="" /></span>
          <i v-if="typingDraft"></i>
        </button>
        <button type="button" aria-label="表情" @click="prepareMediaReply('sticker')"><Smile :size="25" /></button>
        <button v-if="!draft && !draftMediaSrc" type="button" aria-label="更多" @click="prepareMediaReply('image')"><CirclePlus :size="25" /></button>
        <button v-else class="wechat-send" type="button" @click="sendPresetReply">发送</button>
      </footer>
      <Transition name="keyboard-rise">
        <section v-if="keyboardVisible" class="phone-keyboard">
          <div v-for="(row, rowIndex) in keyboardRows" :key="rowIndex" class="keyboard-row">
            <button v-for="key in row" :key="key" type="button" :class="{ active: activeKey === key }" @click="tapKey(key)">{{ key }}</button>
          </div>
          <div class="keyboard-bottom"><button type="button" @click="playKeyboardTapSound">123</button><button class="keyboard-space" type="button" @click="playKeyboardTapSound">空格</button><button type="button" @click="closeKeyboard">完成</button></div>
        </section>
      </Transition>
    </template>

    <template v-else-if="showingMoments">
      <header class="wechat-page-header">
        <button type="button" aria-label="返回" @click="phone.navigateBack"><ChevronLeft :size="27" /></button>
        <strong>朋友圈</strong>
        <span></span>
      </header>
      <main class="wechat-moments">
        <section class="wechat-moments-cover" :style="momentsCoverStyle">
          <div class="wechat-moments-cover__profile"><strong>{{ wechat.profile.nickname }}</strong><WechatAvatar :person="wechat.profile" :size="60" /></div>
        </section>
        <article v-for="moment in wechat.moments" :key="moment.id" class="wechat-moment">
          <WechatAvatar :person="wechat.findContact(moment.authorId)" :size="42" />
          <div class="wechat-moment__body">
            <strong>{{ contactName(wechat.findContact(moment.authorId)) }}</strong>
            <p>{{ moment.text }}</p>
            <div
              v-if="momentImages(moment).length"
              class="wechat-moment-gallery"
              :class="{
                'wechat-moment-gallery--single': momentImages(moment).length === 1,
                'wechat-moment-gallery--two': momentImages(moment).length === 2,
                'wechat-moment-gallery--four': momentImages(moment).length === 4,
              }"
            >
              <button
                v-for="(src, imageIndex) in momentImages(moment)"
                :key="`${moment.id}-${imageIndex}`"
                type="button"
                :aria-label="`查看第 ${imageIndex + 1} 张朋友圈图片`"
                @click="openMomentImage(moment, imageIndex)"
              >
                <img :src="src" alt="" loading="lazy" />
              </button>
            </div>
            <div class="wechat-moment__meta"><small>{{ moment.time }}</small><MoreHorizontal :size="17" /></div>
            <div v-if="wechat.momentLikesFor(moment.id).length || wechat.momentCommentsFor(moment.id).length" class="wechat-moment__reactions">
              <div v-if="wechat.momentLikesFor(moment.id).length" class="wechat-moment__likes">
                <Heart :size="13" />
                <span>{{ wechat.momentLikesFor(moment.id).map((item) => contactName(wechat.findContact(item.contactId))).join('，') }}</span>
              </div>
              <p v-for="comment in wechat.momentCommentsFor(moment.id)" :key="comment.id">
                <strong>{{ contactName(wechat.findContact(comment.authorId)) }}</strong>
                <template v-if="comment.replyToId"> 回复 <strong>{{ contactName(wechat.findContact(comment.replyToId)) }}</strong></template>
                ：{{ comment.text }}
              </p>
            </div>
          </div>
        </article>
      </main>
    </template>

    <template v-else>
      <header class="wechat-main-header">
        <span></span><strong>{{ tab === 'chats' ? '微信' : tab === 'discover' ? '发现' : '我' }}</strong>
        <div v-if="tab !== 'me'"><Search :size="22" /><Plus :size="24" /></div><span v-else></span>
      </header>

      <main v-if="tab === 'chats'" class="wechat-conversations">
        <button v-for="item in wechat.sortedConversations" :key="item.id" type="button" class="wechat-conversation" @click="openConversation(item.id)">
          <WechatAvatar v-bind="conversationAvatar(item)" :size="47" />
          <span class="wechat-conversation__copy">
            <span><strong>{{ wechat.conversationTitle(item) }}</strong><small>{{ item.time }}</small></span>
            <em>{{ wechat.messagePreview(wechat.lastMessage(item.id)) }}</em>
          </span>
          <b v-if="item.unread" class="wechat-unread">{{ item.unread }}</b>
        </button>
        <p v-if="!wechat.sortedConversations.length" class="wechat-empty">暂无聊天</p>
      </main>

      <main v-else-if="tab === 'discover'" class="wechat-list-page">
        <button class="wechat-list-row" type="button" @click="openMoments"><ImageIcon color="#f0a23b" /><span>朋友圈</span><ChevronRight /></button>
        <div class="wechat-list-gap"></div>
        <button class="wechat-list-row" type="button" disabled><ScanLine color="#2c98d4" /><span>扫一扫</span><ChevronRight /></button>
        <button class="wechat-list-row" type="button" disabled><Music2 color="#ef5d6a" /><span>听一听</span><ChevronRight /></button>
        <div class="wechat-list-gap"></div>
        <button class="wechat-list-row" type="button" disabled><Search color="#ef5d6a" /><span>搜一搜</span><ChevronRight /></button>
        <div class="wechat-list-gap"></div>
        <button class="wechat-list-row" type="button" disabled><Gamepad2 color="#5b8bdd" /><span>游戏</span><ChevronRight /></button>
        <button class="wechat-list-row" type="button" disabled><Blocks color="#7458d3" /><span>小程序</span><ChevronRight /></button>
      </main>

      <main v-else class="wechat-me">
        <section class="wechat-profile-card">
          <WechatAvatar :person="wechat.profile" :size="62" />
          <div><h2>{{ wechat.profile.nickname }}</h2><p>微信号：{{ wechat.profile.wechatId }}</p></div>
        </section>
        <div class="wechat-list-gap"></div>
        <button class="wechat-list-row" type="button" disabled><ShoppingBag color="#ef7f57" /><span>服务</span><ChevronRight /></button>
        <div class="wechat-list-gap"></div>
        <button class="wechat-list-row" type="button" disabled><MessageSquare color="#19bd72" /><span>收藏</span><ChevronRight /></button>
        <button class="wechat-list-row" type="button" disabled><ImageIcon color="#f0a23b" /><span>朋友圈</span><ChevronRight /></button>
        <button class="wechat-list-row" type="button" disabled><Smile color="#e9b720" /><span>表情</span><ChevronRight /></button>
        <div class="wechat-list-gap"></div>
        <button class="wechat-list-row" type="button" disabled><Settings color="#2c98d4" /><span>设置</span><ChevronRight /></button>
      </main>

      <nav class="wechat-tabs" aria-label="微信导航">
        <button type="button" :class="{ active: tab === 'chats' }" @click="tab = 'chats'"><MessageCircle /><span>微信</span><b v-if="wechat.unreadTotal">{{ wechat.unreadTotal }}</b></button>
        <button type="button" disabled><ContactRound /><span>通讯录</span></button>
        <button type="button" :class="{ active: tab === 'discover' }" @click="tab = 'discover'"><Compass /><span>发现</span></button>
        <button type="button" :class="{ active: tab === 'me' }" @click="tab = 'me'"><UserRound /><span>我</span></button>
      </nav>
    </template>
  </div>
</template>
