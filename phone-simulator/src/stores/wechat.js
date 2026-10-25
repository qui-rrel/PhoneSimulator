import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { contentConfig } from '../config/phone.config'
import { storyConfig } from '../config/story.config'
import { playMessageReceiveSound } from '../utils/sounds'

const clone = (value) => JSON.parse(JSON.stringify(value))
const SELF_ID = 'SELF'
const formatTime = (date = new Date()) => new Intl.DateTimeFormat('zh-CN', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
}).format(date)

let phoneBridge = null
const processingScripts = new Set()
const interactionTokens = new Set()

export const useWechatStore = defineStore('wechat', () => {
  const source = contentConfig.wechat || {}
  const profile = ref(clone(source.profile || {}))
  const contacts = ref(clone(source.contacts || []))
  const groups = ref(clone(source.groups || []))
  const conversations = ref(clone(source.conversations || []))
  const messages = ref(clone(source.messages || []))
  const momentDefinitions = clone(source.moments || [])
  const moments = ref(momentDefinitions.filter((item) => item.initiallyVisible !== false))
  const momentLikes = ref(clone(source.momentLikes || []))
  const momentComments = ref(clone(source.momentComments || []))
  const momentActivities = ref([])
  const activeScripts = ref([])
  const activePublishScripts = ref([])
  const activeCommentScripts = ref([])
  const activeInteractionScripts = ref([])

  const unreadTotal = computed(() => conversations.value.reduce((total, item) => total + Number(item.unread || 0), 0))
  const unreadMomentActivityCount = computed(() => momentActivities.value.filter((item) => !item.read).length)
  const sortedConversations = computed(() => [...conversations.value].sort((a, b) => Number(a.order || 0) - Number(b.order || 0)))

  function attachPhone(phone) {
    phoneBridge = phone
    syncAppBadge()
  }

  function syncAppBadge() {
    phoneBridge?.setAppBadge('wechat', unreadTotal.value)
  }

  function findContact(contactId) {
    if (contactId === SELF_ID) return { ...profile.value, id: SELF_ID, name: profile.value.nickname }
    return contacts.value.find((item) => item.id === contactId) || null
  }

  function findGroup(groupId) {
    return groups.value.find((item) => item.id === groupId) || null
  }

  function findConversation(conversationId) {
    return conversations.value.find((item) => item.id === conversationId) || null
  }

  function conversationMessages(conversationId) {
    return messages.value
      .filter((item) => item.conversationId === conversationId)
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
  }

  function conversationTitle(conversation) {
    if (!conversation) return ''
    if (conversation.type === 'group') return findGroup(conversation.targetId)?.name || '群聊'
    const contact = findContact(conversation.targetId)
    return contact?.remark || contact?.nickname || contact?.name || '微信联系人'
  }

  function groupMembers(group) {
    return (group?.memberIds || []).map(findContact).filter(Boolean)
  }

  function messagePreview(message) {
    if (!message) return ''
    if (message.type === 'image') return '[图片]'
    if (message.type === 'sticker') return '[表情]'
    return message.text || ''
  }

  function lastMessage(conversationId) {
    return conversationMessages(conversationId).at(-1) || null
  }

  function markConversationRead(conversationId) {
    const conversation = findConversation(conversationId)
    if (!conversation) return
    conversation.unread = 0
    syncAppBadge()
  }

  function addMessage(conversationId, message) {
    const conversation = findConversation(conversationId)
    if (!conversation) return null
    const order = Math.max(0, ...conversationMessages(conversationId).map((item) => Number(item.order || 0))) + 1
    const created = {
      id: `${conversationId}-${Date.now()}-${messages.value.length}`,
      conversationId,
      order,
      time: formatTime(),
      read: true,
      type: 'text',
      text: '',
      mediaSrc: '',
      ...clone(message),
    }
    messages.value.push(created)
    conversation.time = created.time
    return created
  }

  function receiveMessage(conversationId, message) {
    const conversation = findConversation(conversationId)
    const created = addMessage(conversationId, message)
    if (!conversation || !created) return
    playMessageReceiveSound()
    const isOpen = phoneBridge?.activeAppId === 'wechat' && phoneBridge?.activeContent?.targetId === conversationId
    if (isOpen) return
    conversation.unread = Number(conversation.unread || 0) + 1
    syncAppBadge()
    const sender = findContact(created.senderId)
    const title = conversationTitle(conversation)
    const senderName = sender?.remark || sender?.nickname || sender?.name || ''
    const preview = messagePreview(created)
    phoneBridge?.showNotification({
      appId: 'wechat',
      targetId: conversationId,
      title,
      body: conversation.type === 'group' && senderName ? `${senderName}：${preview}` : preview,
    })
  }

  function findScript(scriptId) {
    return storyConfig.wechatScripts?.find((item) => item.id === scriptId) || null
  }

  function getActiveScript(conversationId) {
    return activeScripts.value.find((item) => item.conversationId === conversationId) || null
  }

  function activateScript(scriptId, eventId = '') {
    const script = findScript(scriptId)
    if (!script || activeScripts.value.some((item) => item.id === scriptId)) return false
    activeScripts.value.push({ ...clone(script), currentIndex: 0, eventId, isTyping: false })
    void playAutomaticMessages(scriptId)
    return true
  }

  function completeScript(scriptId) {
    const index = activeScripts.value.findIndex((item) => item.id === scriptId)
    if (index < 0) return
    const [script] = activeScripts.value.splice(index, 1)
    if (script.eventId) phoneBridge?.resolveStoryOutcome(script.eventId, 'completed')
  }

  function advanceScript(scriptId) {
    const script = activeScripts.value.find((item) => item.id === scriptId)
    if (!script) return false
    script.currentIndex += 1
    if (script.currentIndex < (script.messages?.length || 0)) {
      void playAutomaticMessages(scriptId)
      return true
    }
    completeScript(scriptId)
    return false
  }

  async function playAutomaticMessages(scriptId) {
    if (processingScripts.has(scriptId)) return
    processingScripts.add(scriptId)
    try {
      let script = activeScripts.value.find((item) => item.id === scriptId)
      while (script) {
        const entry = script.messages?.[script.currentIndex]
        if (!entry || entry.senderId === SELF_ID) break
        const expectedIndex = script.currentIndex
        script.isTyping = true
        const configuredDelay = Number(entry.afterMs)
        const delay = Number.isFinite(configuredDelay)
          ? configuredDelay
          : 900 + (entry.text?.length || 2) * 45
        await new Promise((resolve) => window.setTimeout(resolve, Math.max(0, delay)))
        script = activeScripts.value.find((item) => item.id === scriptId)
        if (!script || script.currentIndex !== expectedIndex) break
        script.isTyping = false
        receiveMessage(script.conversationId, entry)
        script.currentIndex += 1
        if (script.currentIndex >= (script.messages?.length || 0)) {
          completeScript(scriptId)
          break
        }
        await new Promise((resolve) => window.setTimeout(resolve, 280))
        script = activeScripts.value.find((item) => item.id === scriptId)
      }
    } finally {
      const script = activeScripts.value.find((item) => item.id === scriptId)
      if (script) script.isTyping = false
      processingScripts.delete(scriptId)
    }
  }

  function momentLikesFor(momentId) {
    return momentLikes.value
      .filter((item) => item.momentId === momentId)
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
  }

  function momentCommentsFor(momentId) {
    return momentComments.value
      .filter((item) => item.momentId === momentId)
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
  }

  function findMoment(momentId) {
    return moments.value.find((item) => item.id === momentId) || null
  }

  function findMomentComment(commentId) {
    return momentComments.value.find((item) => item.id === commentId) || null
  }

  function isMomentLiked(momentId) {
    return momentLikes.value.some((item) => item.momentId === momentId && item.contactId === SELF_ID)
  }

  function addMomentActivity(activity) {
    momentActivities.value.unshift({
      id: `moment-activity-${Date.now()}-${momentActivities.value.length}`,
      time: formatTime(),
      read: false,
      ...clone(activity),
    })
  }

  function markMomentActivitiesRead() {
    momentActivities.value.forEach((item) => { item.read = true })
  }

  function setMomentLike(momentId, contactId, liked = true, notify = false, notificationText = '') {
    const index = momentLikes.value.findIndex((item) => item.momentId === momentId && item.contactId === contactId)
    if (liked && index < 0) {
      const order = Math.max(0, ...momentLikesFor(momentId).map((item) => Number(item.order || 0))) + 1
      momentLikes.value.push({ momentId, contactId, order })
      if (notify && contactId !== SELF_ID) {
        addMomentActivity({ type: 'like', momentId, actorId: contactId, text: notificationText })
      }
    } else if (!liked && index >= 0) {
      momentLikes.value.splice(index, 1)
    }
  }

  function toggleMomentLike(momentId) {
    const liked = !isMomentLiked(momentId)
    setMomentLike(momentId, SELF_ID, liked)
    phoneBridge?.triggerOperation(liked ? 'moment-liked' : 'moment-unliked', { appId: 'wechat', targetId: momentId })
    return liked
  }

  function revealMoment(momentId) {
    if (findMoment(momentId)) return true
    const definition = momentDefinitions.find((item) => item.id === momentId)
    if (!definition) return false
    moments.value.unshift(clone(definition))
    return true
  }

  function addMoment(moment) {
    if (!moment?.id || findMoment(moment.id)) return null
    const created = { order: 0, time: '刚刚', imageSrc: [], ...clone(moment) }
    moments.value.unshift(created)
    return created
  }

  function addMomentComment(comment, notify = false, notificationText = '') {
    if (!comment?.id || findMomentComment(comment.id)) return null
    const order = Math.max(0, ...momentCommentsFor(comment.momentId).map((item) => Number(item.order || 0))) + 1
    const created = { replyToCommentId: '', text: '', imageSrc: '', ...clone(comment), order }
    momentComments.value.push(created)
    if (notify && created.authorId !== SELF_ID) {
      addMomentActivity({
        type: 'comment',
        momentId: created.momentId,
        actorId: created.authorId,
        commentId: created.id,
        text: notificationText || created.text,
      })
    }
    return created
  }

  function getActivePublishScript() {
    return activePublishScripts.value[0] || null
  }

  function activatePublishScript(scriptId, eventId = '') {
    const sourceScript = storyConfig.momentPublishScripts?.find((item) => item.id === scriptId)
    if (!sourceScript || getActivePublishScript()) return false
    activePublishScripts.value.push({ ...clone(sourceScript), eventId })
    return true
  }

  function submitPublishScript(scriptId) {
    const index = activePublishScripts.value.findIndex((item) => item.id === scriptId)
    if (index < 0) return false
    const [script] = activePublishScripts.value.splice(index, 1)
    addMoment({
      id: script.momentId,
      authorId: SELF_ID,
      text: script.text || '',
      imageSrc: script.imageSrc || [],
      time: script.time || '刚刚',
    })
    phoneBridge?.triggerOperation('moment-published', { appId: 'wechat', targetId: script.momentId })
    if (script.eventId) phoneBridge?.resolveStoryOutcome(script.eventId, 'completed')
    return true
  }

  function getActiveCommentScript(momentId, replyToCommentId = '') {
    return activeCommentScripts.value.find((item) =>
      item.momentId === momentId && (item.replyToCommentId || '') === (replyToCommentId || '')) || null
  }

  function activateCommentScript(scriptId, eventId = '') {
    const sourceScript = storyConfig.momentCommentScripts?.find((item) => item.id === scriptId)
    if (!sourceScript || activeCommentScripts.value.some((item) => item.id === scriptId)) return false
    activeCommentScripts.value.push({ ...clone(sourceScript), eventId })
    return true
  }

  function submitCommentScript(scriptId) {
    const index = activeCommentScripts.value.findIndex((item) => item.id === scriptId)
    if (index < 0) return false
    const [script] = activeCommentScripts.value.splice(index, 1)
    addMomentComment({
      id: script.commentId,
      momentId: script.momentId,
      authorId: SELF_ID,
      replyToCommentId: script.replyToCommentId || '',
      text: script.text || '',
      imageSrc: script.imageSrc || '',
    })
    phoneBridge?.triggerOperation('moment-comment-sent', { appId: 'wechat', targetId: script.momentId, commentId: script.commentId })
    if (script.eventId) phoneBridge?.resolveStoryOutcome(script.eventId, 'completed')
    return true
  }

  function activateInteractionScript(scriptId, eventId = '') {
    const sourceScript = storyConfig.momentInteractionScripts?.find((item) => item.id === scriptId)
    if (!sourceScript || activeInteractionScripts.value.some((item) => item.id === scriptId)) return false
    activeInteractionScripts.value.push({ ...clone(sourceScript), eventId })
    void playInteractionScript(scriptId)
    return true
  }

  async function playInteractionScript(scriptId) {
    const script = activeInteractionScripts.value.find((item) => item.id === scriptId)
    if (!script) return
    const token = { cancelled: false }
    interactionTokens.add(token)
    for (const action of script.actions || []) {
      await new Promise((resolve) => window.setTimeout(resolve, Math.max(0, Number(action.afterMs || 0))))
      if (token.cancelled || !activeInteractionScripts.value.some((item) => item.id === scriptId)) return
      if (action.type === 'show-moment') revealMoment(action.momentId)
      if (action.type === 'like') setMomentLike(action.momentId, action.actorId, true, action.notify, action.notificationText)
      if (action.type === 'unlike') setMomentLike(action.momentId, action.actorId, false)
      if (action.type === 'comment') {
        addMomentComment({
          id: action.commentId,
          momentId: action.momentId,
          authorId: action.actorId,
          replyToCommentId: action.replyToCommentId || '',
          text: action.text || '',
          imageSrc: action.imageSrc || '',
        }, action.notify, action.notificationText)
      }
    }
    interactionTokens.delete(token)
    const index = activeInteractionScripts.value.findIndex((item) => item.id === scriptId)
    if (index < 0) return
    const [completed] = activeInteractionScripts.value.splice(index, 1)
    if (completed.eventId) phoneBridge?.resolveStoryOutcome(completed.eventId, 'completed')
  }

  function reset() {
    profile.value = clone(source.profile || {})
    contacts.value = clone(source.contacts || [])
    groups.value = clone(source.groups || [])
    conversations.value = clone(source.conversations || [])
    messages.value = clone(source.messages || [])
    moments.value = momentDefinitions.filter((item) => item.initiallyVisible !== false).map(clone)
    momentLikes.value = clone(source.momentLikes || [])
    momentComments.value = clone(source.momentComments || [])
    momentActivities.value = []
    activeScripts.value = []
    activePublishScripts.value = []
    activeCommentScripts.value = []
    activeInteractionScripts.value = []
    processingScripts.clear()
    interactionTokens.forEach((item) => { item.cancelled = true })
    interactionTokens.clear()
    syncAppBadge()
  }

  return {
    profile, contacts, groups, conversations, messages, moments, momentLikes, momentComments, momentActivities, activeScripts,
    activePublishScripts, activeCommentScripts, activeInteractionScripts, unreadTotal, unreadMomentActivityCount,
    sortedConversations, attachPhone, findContact, findGroup, findConversation, conversationMessages,
    conversationTitle, groupMembers, messagePreview, lastMessage, markConversationRead, addMessage, receiveMessage,
    getActiveScript, activateScript, advanceScript, completeScript, momentLikesFor, momentCommentsFor, findMoment,
    findMomentComment, isMomentLiked, toggleMomentLike, revealMoment, addMoment, addMomentComment, markMomentActivitiesRead,
    getActivePublishScript, activatePublishScript, submitPublishScript, getActiveCommentScript, activateCommentScript,
    submitCommentScript, activateInteractionScript, reset,
  }
})
