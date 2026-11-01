<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { AtSign, Camera, ChevronLeft, Heart, Image as ImageIcon, MapPin, MessageCircle, MoreHorizontal, Smile, Users } from 'lucide-vue-next'
import WechatAvatar from '../components/WechatAvatar.vue'
import { usePhoneStore } from '../stores/phone'
import { useWechatStore } from '../stores/wechat'
import { MOMENTS_FIRST_SCREEN_ITEM_COUNT } from '../utils/mediaPreloader'
import { playKeyboardTapSound, playMessageSendSound } from '../utils/sounds'
import { createTypingPlan } from '../utils/typing'

const phone = usePhoneStore()
const wechat = useWechatStore()
const keyboardRows = [['Q','W','E','R','T','Y','U','I','O','P'], ['A','S','D','F','G','H','J','K','L'], ['Z','X','C','V','B','N','M']]
const menuMomentId = ref('')
const commentTarget = ref(null)
const commentDrafts = ref({})
const publishDraft = ref({ text: '', images: [], typedSteps: 0 })
const keyboardOwner = ref('')
const activeKey = ref('')
const typingToken = ref(0)
const typingOwner = ref('')
const addingImages = ref(false)
const viewerSwipeStart = ref(null)
const viewerSwipeOffset = ref(0)
const momentPane = ref(null)
const commentLayoutTimer = ref(null)

const target = computed(() => phone.activeContent?.appId === 'wechat' ? phone.activeContent.targetId : '')
const showingFeed = computed(() => target.value === 'moments')
const showingCompose = computed(() => target.value === 'moments-compose')
const showingActivity = computed(() => target.value === 'moments-activity')
const viewerTarget = computed(() => {
  if (target.value.startsWith('moment-viewer:')) {
    const [, momentId, rawIndex] = target.value.split(':')
    return { kind: 'moment', momentId, index: Math.max(0, Number.parseInt(rawIndex, 10) || 0) }
  }
  if (target.value.startsWith('comment-viewer:')) return { kind: 'comment', commentId: target.value.split(':')[1], index: 0 }
  return null
})
const activePublish = computed(() => wechat.getActivePublishScript())
const momentImages = (moment) => (Array.isArray(moment?.imageSrc) ? moment.imageSrc : moment?.imageSrc ? [moment.imageSrc] : []).filter(Boolean).slice(0, 9)
const viewerMoment = computed(() => viewerTarget.value?.kind === 'moment' ? wechat.findMoment(viewerTarget.value.momentId) : null)
const viewerComment = computed(() => viewerTarget.value?.kind === 'comment' ? wechat.findMomentComment(viewerTarget.value.commentId) : null)
const viewerImages = computed(() => viewerTarget.value?.kind === 'comment' ? [viewerComment.value?.imageSrc].filter(Boolean) : momentImages(viewerMoment.value))
const viewerIndex = computed(() => Math.min(viewerTarget.value?.index || 0, Math.max(0, viewerImages.value.length - 1)))
const viewerImage = computed(() => viewerImages.value[viewerIndex.value] || '')
const coverStyle = computed(() => wechat.profile.momentsCover ? { backgroundImage: `url("${wechat.profile.momentsCover}")` } : undefined)
const currentCommentScript = computed(() => commentTarget.value
  ? wechat.getActiveCommentScript(commentTarget.value.momentId, commentTarget.value.replyToCommentId || '')
  : null)
const currentCommentDraftKey = computed(() => commentTarget.value ? `${commentTarget.value.momentId}:${commentTarget.value.replyToCommentId || ''}` : '')
const currentCommentDraft = computed(() => {
  const key = currentCommentDraftKey.value
  if (!key) return { text: '', imageSrc: '', typedSteps: 0 }
  if (!commentDrafts.value[key]) commentDrafts.value[key] = { text: '', imageSrc: '', typedSteps: 0 }
  return commentDrafts.value[key]
})
const publishComplete = computed(() => {
  const script = activePublish.value
  if (!script || typingOwner.value === 'publish') return false
  return (!script.text || publishDraft.value.text === script.text)
    && (!(script.imageSrc || []).length || publishDraft.value.images.length === script.imageSrc.length)
})
const commentComplete = computed(() => {
  const script = currentCommentScript.value
  if (!script || typingOwner.value === `comment:${currentCommentDraftKey.value}`) return false
  return (!script.text || currentCommentDraft.value.text === script.text)
    && (!script.imageSrc || currentCommentDraft.value.imageSrc === script.imageSrc)
})

const contactName = (contact) => contact?.remark || contact?.nickname || contact?.name || '微信联系人'
const replyName = (comment) => {
  const replied = wechat.findMomentComment(comment.replyToCommentId)
  return replied ? contactName(wechat.findContact(replied.authorId)) : ''
}

function openCompose() { phone.openContent('wechat', 'moments-compose') }
function openActivity() { wechat.markMomentActivitiesRead(); phone.openContent('wechat', 'moments-activity') }
function openMomentImage(moment, index) { closeKeyboard(); phone.openContent('wechat', `moment-viewer:${moment.id}:${index}`) }
function openCommentImage(comment) { closeKeyboard(); phone.openContent('wechat', `comment-viewer:${comment.id}`) }
function replaceViewerIndex(index) {
  if (!viewerMoment.value || index < 0 || index >= viewerImages.value.length) return false
  phone.replaceContent('wechat', `moment-viewer:${viewerMoment.value.id}:${index}`)
  return true
}
function beginViewerSwipe(event) { viewerSwipeStart.value = { x: event.clientX, y: event.clientY, moved: false }; viewerSwipeOffset.value = 0; event.currentTarget.setPointerCapture?.(event.pointerId) }
function moveViewerSwipe(event) {
  if (!viewerSwipeStart.value) return
  const x = event.clientX - viewerSwipeStart.value.x
  const y = event.clientY - viewerSwipeStart.value.y
  if (Math.hypot(x, y) > 8) viewerSwipeStart.value.moved = true
  viewerSwipeOffset.value = Math.abs(x) > Math.abs(y) ? x : 0
}
function endViewerSwipe() {
  if (!viewerSwipeStart.value) return
  const tap = !viewerSwipeStart.value.moved
  const offset = viewerSwipeOffset.value
  viewerSwipeStart.value = null
  viewerSwipeOffset.value = 0
  if (tap) return phone.navigateBack()
  if (Math.abs(offset) < 46 || viewerTarget.value?.kind === 'comment') return
  if (offset < 0) replaceViewerIndex(viewerIndex.value + 1)
  else replaceViewerIndex(viewerIndex.value - 1)
}
function cancelViewerSwipe() { viewerSwipeStart.value = null; viewerSwipeOffset.value = 0 }

function closeKeyboard() {
  const closingComment = keyboardOwner.value.startsWith('comment:')
  window.clearTimeout(commentLayoutTimer.value)
  typingToken.value += 1
  typingOwner.value = ''
  keyboardOwner.value = ''
  activeKey.value = ''
  if (closingComment) commentTarget.value = null
}
function tapKey(key) { playKeyboardTapSound(); activeKey.value = key; window.setTimeout(() => { if (activeKey.value === key) activeKey.value = '' }, 110) }
async function typeConfigured(owner, line, keystrokes, draft) {
  keyboardOwner.value = owner
  if (typingOwner.value === owner) return
  typingToken.value += 1
  const token = typingToken.value
  if (!line || draft.text === line) return
  const plan = createTypingPlan(line, keystrokes)
  if (!plan.keystrokes.length) { draft.text = line; return }
  typingOwner.value = owner
  try {
    for (let index = draft.typedSteps || 0; index < plan.keystrokes.length; index += 1) {
      if (token !== typingToken.value || keyboardOwner.value !== owner) return
      activeKey.value = plan.keystrokes[index].toUpperCase()
      playKeyboardTapSound()
      draft.typedSteps = index + 1
      const length = Math.max(1, Math.floor((draft.typedSteps / plan.keystrokes.length) * plan.typeableCount))
      draft.text = plan.render(length)
      await new Promise((resolve) => window.setTimeout(resolve, 56 + Math.random() * 30))
    }
    draft.text = line
    activeKey.value = ''
  } finally {
    if (typingOwner.value === owner && token === typingToken.value) typingOwner.value = ''
  }
}
function openPublishKeyboard() { void typeConfigured('publish', activePublish.value?.text || '', activePublish.value?.keystrokes, publishDraft.value) }
function openCommentKeyboard() { void typeConfigured(`comment:${currentCommentDraftKey.value}`, currentCommentScript.value?.text || '', currentCommentScript.value?.keystrokes, currentCommentDraft.value) }

async function addPublishImages() {
  const configured = activePublish.value?.imageSrc || []
  if (addingImages.value || !configured.length || publishDraft.value.images.length >= configured.length) return
  addingImages.value = true
  for (const src of configured.slice(publishDraft.value.images.length)) {
    publishDraft.value.images.push(src)
    await new Promise((resolve) => window.setTimeout(resolve, 105))
  }
  addingImages.value = false
}
function addCommentImage() {
  const src = currentCommentScript.value?.imageSrc || ''
  if (src) { playKeyboardTapSound(); currentCommentDraft.value.imageSrc = src }
}
function publishMoment() {
  if (!publishComplete.value) return
  playMessageSendSound()
  wechat.submitPublishScript(activePublish.value.id)
  publishDraft.value = { text: '', images: [], typedSteps: 0 }
  closeKeyboard()
  phone.navigateBack()
}
function cancelPublish() {
  publishDraft.value = { text: '', images: [], typedSteps: 0 }
  closeKeyboard()
  phone.navigateBack()
}
function toggleMenu(momentId) { menuMomentId.value = menuMomentId.value === momentId ? '' : momentId }
function handleFeedPointerDown(event) {
  if (keyboardOwner.value) closeKeyboard()
  if (!event.target.closest?.('.wechat-moment-menu, .wechat-moment__meta > button')) menuMomentId.value = ''
}
function toggleLike(momentId) { wechat.toggleMomentLike(momentId); menuMomentId.value = '' }
function scrollMomentAboveComposer(momentId) {
  const pane = momentPane.value
  if (!pane) return
  const article = [...pane.querySelectorAll('[data-moment-id]')]
    .find((item) => item.dataset.momentId === momentId)
  const composer = pane.parentElement?.querySelector('.wechat-comment-bar')
  if (!article || !composer) return
  const articleBottom = article.getBoundingClientRect().bottom
  const targetBottom = composer.getBoundingClientRect().top - 8
  const desiredTop = pane.scrollTop + articleBottom - targetBottom
  const maxTop = Math.max(0, pane.scrollHeight - pane.clientHeight)
  pane.scrollTo({ top: Math.max(0, Math.min(desiredTop, maxTop)), behavior: 'smooth' })
}
function openComment(moment, replyToCommentId = '') {
  menuMomentId.value = ''
  commentTarget.value = { momentId: moment.id, replyToCommentId }
  phone.triggerOperation('message-input', { appId: 'wechat', targetId: moment.id })
  nextTick(() => {
    typingToken.value += 1
    keyboardOwner.value = `comment:${currentCommentDraftKey.value}`
    activeKey.value = ''
    window.clearTimeout(commentLayoutTimer.value)
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => scrollMomentAboveComposer(moment.id)))
    commentLayoutTimer.value = window.setTimeout(() => scrollMomentAboveComposer(moment.id), 280)
  })
}
function sendComment() {
  const script = currentCommentScript.value
  if (!script || !commentComplete.value) return
  playMessageSendSound()
  wechat.submitCommentScript(script.id)
  delete commentDrafts.value[currentCommentDraftKey.value]
  commentTarget.value = null
  closeKeyboard()
}
function activityText(item) {
  const actor = contactName(wechat.findContact(item.actorId))
  if (item.type === 'like') return `${actor} 赞了你的朋友圈`
  const comment = wechat.findMomentComment(item.commentId)
  const preview = comment?.text || (comment?.imageSrc ? '[图片]' : '')
  return `${actor} 评论了你的朋友圈${preview ? `：${preview}` : ''}`
}

watch(target, (value, previous) => {
  menuMomentId.value = ''
  commentTarget.value = null
  closeKeyboard()
  if (previous === 'moments-compose' && value !== 'moments-compose') publishDraft.value = { text: '', images: [], typedSteps: 0 }
})
</script>

<template>
  <main v-if="viewerTarget" class="wechat-moment-viewer" aria-label="朋友圈图片查看器"
    @pointerdown="beginViewerSwipe" @pointermove="moveViewerSwipe" @pointerup="endViewerSwipe" @pointercancel="cancelViewerSwipe">
    <img v-if="viewerImage" :src="viewerImage" :style="{ transform: `translateX(${viewerSwipeOffset * 0.18}px)` }" alt="" draggable="false" />
  </main>

  <template v-else-if="showingCompose">
    <header class="wechat-compose-header"><button type="button" @click="cancelPublish">取消</button><button type="button" :disabled="!publishComplete" @click="publishMoment">发表</button></header>
    <main class="wechat-compose" @pointerdown.self="closeKeyboard">
      <button class="wechat-compose__idea" :class="{ 'is-placeholder': !publishDraft.text }" type="button" @click.stop="openPublishKeyboard">{{ publishDraft.text || '这一刻的想法…' }}</button>
      <div class="wechat-compose__images">
        <img v-for="(src, index) in publishDraft.images" :key="`${src}-${index}`" :src="src" alt="" />
        <button v-if="publishDraft.images.length < 9" type="button" aria-label="添加图片" @click.stop="addPublishImages">+</button>
      </div>
      <div class="wechat-compose__options"><p><MapPin />所在位置</p><p><AtSign />提醒谁看</p><p><Users />谁可以看 <span>公开</span></p></div>
    </main>
  </template>

  <template v-else-if="showingActivity">
    <header class="wechat-page-header"><button type="button" aria-label="返回" @click="phone.navigateBack"><ChevronLeft :size="27" /></button><strong>消息</strong><span></span></header>
    <main class="wechat-activity-list"><article v-for="item in wechat.momentActivities" :key="item.id"><WechatAvatar :person="wechat.findContact(item.actorId)" :size="42" /><div><strong>{{ contactName(wechat.findContact(item.actorId)) }}</strong><p>{{ activityText(item) }}</p><small>{{ item.time }}</small></div></article><p v-if="!wechat.momentActivities.length" class="wechat-empty">暂无消息</p></main>
  </template>

  <template v-else-if="showingFeed">
    <header class="wechat-page-header"><button type="button" aria-label="返回" @click="phone.navigateBack"><ChevronLeft :size="27" /></button><strong>朋友圈</strong><button type="button" aria-label="发表朋友圈" @click="openCompose"><Camera :size="23" /></button></header>
    <main ref="momentPane" class="wechat-moments" @pointerdown="handleFeedPointerDown">
      <section class="wechat-moments-cover" :style="coverStyle"><div class="wechat-moments-cover__profile"><strong>{{ wechat.profile.nickname }}</strong><WechatAvatar :person="wechat.profile" :size="60" /></div></section>
      <button v-if="wechat.unreadMomentActivityCount" class="wechat-moment-notice" type="button" @click="openActivity">{{ wechat.unreadMomentActivityCount }} 条新消息</button>
      <article v-for="(moment, momentIndex) in wechat.moments" :key="moment.id" class="wechat-moment" :data-moment-id="moment.id">
        <WechatAvatar :person="wechat.findContact(moment.authorId)" :size="42" />
        <div class="wechat-moment__body"><strong>{{ contactName(wechat.findContact(moment.authorId)) }}</strong><p v-if="moment.text">{{ moment.text }}</p>
          <div v-if="momentImages(moment).length" class="wechat-moment-gallery" :class="{ 'wechat-moment-gallery--single': momentImages(moment).length === 1, 'wechat-moment-gallery--two': momentImages(moment).length === 2, 'wechat-moment-gallery--four': momentImages(moment).length === 4 }">
            <button v-for="(src, imageIndex) in momentImages(moment)" :key="`${moment.id}-${imageIndex}`" type="button" @click="openMomentImage(moment, imageIndex)"><img :src="src" alt="" :loading="momentIndex < MOMENTS_FIRST_SCREEN_ITEM_COUNT ? 'eager' : 'lazy'" :fetchpriority="momentIndex < MOMENTS_FIRST_SCREEN_ITEM_COUNT ? 'high' : 'low'" decoding="async" /></button>
          </div>
          <div class="wechat-moment__meta"><small>{{ moment.time }}</small><button type="button" aria-label="朋友圈操作" @click.stop="toggleMenu(moment.id)"><MoreHorizontal :size="17" /></button>
            <Transition name="wechat-pop"><div v-if="menuMomentId === moment.id" class="wechat-moment-menu"><button type="button" @click="toggleLike(moment.id)"><Heart :class="{ active: wechat.isMomentLiked(moment.id) }" />{{ wechat.isMomentLiked(moment.id) ? '取消' : '赞' }}</button><button type="button" @click="openComment(moment)"><MessageCircle />评论</button></div></Transition>
          </div>
          <div v-if="wechat.momentLikesFor(moment.id).length || wechat.momentCommentsFor(moment.id).length" class="wechat-moment__reactions">
            <div v-if="wechat.momentLikesFor(moment.id).length" class="wechat-moment__likes"><Heart :size="13" /><span>{{ wechat.momentLikesFor(moment.id).map((item) => contactName(wechat.findContact(item.contactId))).join('，') }}</span></div>
            <button v-for="comment in wechat.momentCommentsFor(moment.id)" :key="comment.id" class="wechat-moment-comment" type="button" @click="openComment(moment, comment.id)"><span><strong>{{ contactName(wechat.findContact(comment.authorId)) }}</strong><template v-if="comment.replyToCommentId"> 回复 <strong>{{ replyName(comment) }}</strong></template>：{{ comment.text }}</span><img v-if="comment.imageSrc" :src="comment.imageSrc" alt="评论图片" @click.stop="openCommentImage(comment)" /></button>
          </div>
        </div>
      </article>
      <div v-if="commentTarget" class="wechat-moment-comment-spacer" aria-hidden="true"></div>
    </main>
  </template>

  <div v-if="commentTarget" class="wechat-comment-bar" :class="{ 'wechat-comment-bar--keyboard': keyboardOwner.startsWith('comment:') }"><button class="wechat-comment-input" type="button" aria-label="评论输入框" @click="openCommentKeyboard">{{ currentCommentDraft.text }}</button><button type="button" aria-label="表情"><Smile /></button><button type="button" aria-label="添加图片" @click="addCommentImage"><ImageIcon /></button><img v-if="currentCommentDraft.imageSrc" :src="currentCommentDraft.imageSrc" alt="待发送图片" /><button class="wechat-comment-send" type="button" :disabled="!commentComplete" @click="sendComment">发送</button></div>
  <Transition name="keyboard-rise"><section v-if="keyboardOwner" class="phone-keyboard wechat-moment-keyboard" @pointerdown.stop><div v-for="(row, rowIndex) in keyboardRows" :key="rowIndex" class="keyboard-row"><button v-for="key in row" :key="key" type="button" :class="{ active: activeKey === key }" @click="tapKey(key)">{{ key }}</button></div><div class="keyboard-bottom"><button type="button" @click="playKeyboardTapSound">123</button><button class="keyboard-space" type="button" @click="playKeyboardTapSound">空格</button><button type="button" @click="closeKeyboard">完成</button></div></section></Transition>
</template>
