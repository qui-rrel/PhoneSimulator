import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { contentConfig, phoneConfig } from '../config/phone.config'
import { storyConfig } from '../config/story.config'
import { useMapsStore } from './maps'
import { useMusicStore } from './music'
import { useWechatStore } from './wechat'
import {
  playMessageReceiveSound,
  playPasscodeDeleteSound,
  playPasscodeDigitSound,
  startIncomingCallRingtone,
  stopIncomingCallRingtone,
} from '../utils/sounds'

const clone = (value) => JSON.parse(JSON.stringify(value))
const formatTime = (date = new Date()) => new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
const formatDateKey = (date = new Date()) => `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
const hydrateContacts = (contacts = []) => clone(contacts)
const CALL_END_DISPLAY_MS = 2500
const SMS_TYPING_LEAD_MS = 3000
const PHONE_HISTORY_KEY = '__phoneSimulatorNavigation'
const normalizeBatteryLevel = (value, fallback = 100) => {
  const number = Number(value)
  return Number.isFinite(number) ? Math.min(100, Math.max(0, Math.round(number))) : fallback
}

let timelineTimers = []
let callTimeout = null
let callElapsedTimer = null
let callScriptTimers = []
let outgoingCallTimer = null
let outgoingCloseTimer = null
let alarmTimer = null
let alarmAudio = null
let alarmAudioContext = null
let alarmPulse = null
let navigationReady = false
let navigationDepth = 0
let navigationPopstateHandler = null
let explicitHistoryNavigation = false
let powerWarningTimer = null
let powerShutdownTimer = null
let batteryDrainTimer = null
let storyPowerOffTimer = null
let storyTimelineStarted = false

export const usePhoneStore = defineStore('phone', () => {
  const locked = ref(true)
  const batteryLevel = ref(normalizeBatteryLevel(contentConfig.device?.initialBatteryLevel))
  const powerState = ref('on')
  const passcodeVisible = ref(false)
  const pin = ref('')
  const pinError = ref(false)
  const activeAppId = ref(null)
  const activeContactId = ref(null)
  const activeContent = ref(null)
  const notification = ref(null)
  const contacts = ref(hydrateContacts(contentConfig.contacts))
  const mail = ref(clone(contentConfig.mail || []))
  const alarms = ref(clone(contentConfig.alarms || []))
  const callHistory = ref((contentConfig.callHistory || []).map(hydrateCallRecord))
  const triggeredEvents = ref([])
  const activeStoryEvents = ref([])
  const completedEvents = ref([])
  const eventOutcomes = ref({})
  const activeSmsScripts = ref([])
  const startedAt = ref(Date.now())
  const incomingCall = ref(null)
  const activeCall = ref(null)
  const callTranscript = ref([])
  const callElapsed = ref(0)
  const callStatus = ref('idle')
  const outgoingDialCounts = ref({})
  const alarmRinging = ref(null)
  const alarmTriggerKeys = new Set()
  const processingSmsScripts = new Set()
  const edgeBackHandlers = []

  const activeApp = computed(() => phoneConfig.apps.find((app) => app.id === activeAppId.value))
  const activeContact = computed(() => contacts.value.find((contact) => contact.id === activeContactId.value))
  const unreadTotal = computed(() => contacts.value.reduce((total, contact) => total + (contact.unread || 0), 0))
  const unreadMailTotal = computed(() => mail.value.reduce((total, item) => total + (item.unread ? 1 : 0), 0))
  const canNavigateBack = computed(() => Boolean(
    powerState.value === 'on' &&
    !locked.value &&
    activeAppId.value &&
    !incomingCall.value &&
    !activeCall.value &&
    !alarmRinging.value,
  ))

  function navigationSnapshot() {
    return {
      appId: activeAppId.value,
      contactId: activeContactId.value,
      content: activeContent.value ? clone(activeContent.value) : null,
    }
  }

  function historyPayload(depth = navigationDepth) {
    const currentState = window.history.state
    const state = currentState && typeof currentState === 'object' ? currentState : {}
    return {
      ...state,
      [PHONE_HISTORY_KEY]: {
        depth,
        view: navigationSnapshot(),
      },
    }
  }

  function replaceNavigationHistory() {
    if (!navigationReady || typeof window === 'undefined') return
    window.history.replaceState(historyPayload(), '')
  }

  function pushNavigationHistory() {
    if (!navigationReady || typeof window === 'undefined') return
    navigationDepth += 1
    window.history.pushState(historyPayload(), '')
  }

  function applyNavigationView(view = {}) {
    const app = phoneConfig.apps.find((item) => item.id === view.appId && item.enabled !== false)
    activeAppId.value = app?.id || null
    activeContactId.value = activeAppId.value === 'messages' && contacts.value.some((item) => item.id === view.contactId)
      ? view.contactId
      : null
    activeContent.value = view.content?.appId === activeAppId.value
      ? clone(view.content)
      : null
  }

  function startNavigation() {
    if (navigationReady || typeof window === 'undefined') return
    navigationReady = true
    navigationDepth = 0
    window.history.replaceState(historyPayload(0), '')
    navigationPopstateHandler = (event) => {
      const isExplicitNavigation = explicitHistoryNavigation
      explicitHistoryNavigation = false
      const navigation = event.state?.[PHONE_HISTORY_KEY]
      if (!navigation) return
      if (!isExplicitNavigation && runEdgeBackHandlers()) {
        window.history.pushState(historyPayload(navigationDepth), '')
        return
      }
      navigationDepth = Math.max(0, Number(navigation.depth) || 0)
      applyNavigationView(navigation.view)
    }
    window.addEventListener('popstate', navigationPopstateHandler)
  }

  function stopNavigation() {
    if (typeof window !== 'undefined' && navigationPopstateHandler) {
      window.removeEventListener('popstate', navigationPopstateHandler)
    }
    navigationPopstateHandler = null
    navigationReady = false
    explicitHistoryNavigation = false
  }

  function navigateBack() {
    if (!canNavigateBack.value) return false
    if (navigationReady && navigationDepth > 0) {
      explicitHistoryNavigation = true
      window.history.back()
      return true
    }
    if (activeContent.value) activeContent.value = null
    else if (activeContactId.value) activeContactId.value = null
    else if (activeAppId.value) activeAppId.value = null
    return true
  }

  function registerEdgeBackHandler(handler) {
    if (typeof handler !== 'function') return () => {}
    edgeBackHandlers.push(handler)
    return () => {
      const index = edgeBackHandlers.lastIndexOf(handler)
      if (index >= 0) edgeBackHandlers.splice(index, 1)
    }
  }

  function runEdgeBackHandlers() {
    for (let index = edgeBackHandlers.length - 1; index >= 0; index -= 1) {
      if (edgeBackHandlers[index]()) return true
    }
    return false
  }

  function handleEdgeBack() {
    if (runEdgeBackHandlers()) return true
    return navigateBack()
  }

  function navigateHome() {
    if (locked.value) return false
    if (navigationReady && navigationDepth > 0) {
      explicitHistoryNavigation = true
      window.history.go(-navigationDepth)
      return true
    }
    activeContent.value = null
    activeContactId.value = null
    activeAppId.value = null
    return true
  }

  function showPasscode() { passcodeVisible.value = true }
  function pressPin(value) {
    if (pin.value.length >= phoneConfig.security.digits) return
    playPasscodeDigitSound()
    pin.value += value
    pinError.value = false
    if (pin.value.length !== phoneConfig.security.digits) return
    window.setTimeout(() => {
      if (pin.value === String(phoneConfig.security.passcode)) {
        locked.value = false
        passcodeVisible.value = false
        pin.value = ''
      } else {
        pinError.value = true
        window.setTimeout(() => { pin.value = ''; pinError.value = false }, 520)
      }
    }, 140)
  }
  function erasePin() {
    playPasscodeDeleteSound()
    pin.value = pin.value.slice(0, -1)
  }
  function lock() { activeContent.value = null; activeAppId.value = null; activeContactId.value = null; passcodeVisible.value = false; locked.value = true; replaceNavigationHistory() }
  function openApp(id) {
    if (locked.value) return
    const app = phoneConfig.apps.find((item) => item.id === id)
    if (!app || app.enabled === false) return
    const changed = activeAppId.value !== id || activeContactId.value || activeContent.value
    activeContent.value = null
    activeContactId.value = null
    activeAppId.value = id
    if (changed) pushNavigationHistory()
    triggerOperation('app-open', { appId: id, targetId: id })
  }
  function closeApp() { navigateHome() }
  function openContact(id) {
    if (activeAppId.value !== 'messages') activeAppId.value = 'messages'
    activeContent.value = null
    activeContactId.value = id
    const contact = contacts.value.find((item) => item.id === id)
    if (contact) contact.unread = 0
    pushNavigationHistory()
    triggerOperation('content-open', { appId: 'messages', targetId: id })
  }
  function closeContact() { navigateBack() }
  function openContent(appId, targetId) {
    if (appId === 'mail') markMailRead(targetId)
    replaceNavigationHistory()
    activeContent.value = { appId, targetId }
    pushNavigationHistory()
    triggerOperation('content-open', { appId, targetId })
  }
  function openAppContent(appId, targetId) {
    if (locked.value) return false
    const app = phoneConfig.apps.find((item) => item.id === appId)
    if (!app || app.enabled === false) return false
    if (appId === 'mail') markMailRead(targetId)
    activeAppId.value = appId
    activeContactId.value = null
    activeContent.value = { appId, targetId }
    pushNavigationHistory()
    triggerOperation('app-open', { appId, targetId: appId })
    triggerOperation('content-open', { appId, targetId })
    return true
  }
  function replaceContent(appId, targetId) {
    activeContent.value = { appId, targetId }
    replaceNavigationHistory()
  }
  function markMailRead(id) {
    const item = mail.value.find((entry) => entry.id === id)
    if (item) item.unread = false
  }
  function findSmsScript(scriptId) {
    return storyConfig.smsScripts?.find((item) => item.id === scriptId)
  }
  function getActiveSmsScript(contactId) {
    return activeSmsScripts.value.find((item) => item.contactId === contactId) || null
  }
  function activateSmsScript(scriptId, eventId = '') {
    const script = findSmsScript(scriptId)
    if (!script || activeSmsScripts.value.some((item) => item.id === scriptId)) return false
    activeSmsScripts.value.push({ ...clone(script), currentIndex: 0, eventId, isTyping: false })
    void playAutomaticSmsMessages(scriptId)
    return true
  }
  function advanceSmsScript(scriptId) {
    const script = activeSmsScripts.value.find((item) => item.id === scriptId)
    if (!script) return false
    script.currentIndex += 1
    if (script.currentIndex < (script.messages?.length || 0)) {
      void playAutomaticSmsMessages(scriptId)
      return true
    }
    completeSmsScript(scriptId)
    return false
  }
  function completeSmsScript(scriptId) {
    const index = activeSmsScripts.value.findIndex((item) => item.id === scriptId)
    if (index < 0) return
    const [script] = activeSmsScripts.value.splice(index, 1)
    if (script.eventId) resolveStoryOutcome(script.eventId, 'completed')
  }
  function markSentMessagesRead(contactId) {
    const contact = contacts.value.find((item) => item.id === contactId)
    if (!contact) return
    contact.messages.forEach((message) => {
      if (message.side === 'me' && message.read !== true) message.read = true
    })
  }
  async function playAutomaticSmsMessages(scriptId) {
    if (processingSmsScripts.has(scriptId)) return
    processingSmsScripts.add(scriptId)
    try {
      let script = activeSmsScripts.value.find((item) => item.id === scriptId)
      while (script) {
        const entry = script.messages?.[script.currentIndex]
        if (!entry || entry.side !== 'them') break
        const expectedIndex = script.currentIndex
        const configuredDelay = Number(entry.afterMs)
        const totalDelay = Math.max(0, Number.isFinite(configuredDelay) ? configuredDelay : 900 + entry.text.length * 45)
        const typingDelay = Math.min(totalDelay, SMS_TYPING_LEAD_MS)
        const offlineDelay = totalDelay - typingDelay
        script.isTyping = false
        if (offlineDelay > 0) await new Promise((resolve) => window.setTimeout(resolve, offlineDelay))
        script = activeSmsScripts.value.find((item) => item.id === scriptId)
        if (!script || script.currentIndex !== expectedIndex) break
        markSentMessagesRead(script.contactId)
        script.isTyping = true
        if (typingDelay > 0) await new Promise((resolve) => window.setTimeout(resolve, typingDelay))
        script = activeSmsScripts.value.find((item) => item.id === scriptId)
        if (!script || script.currentIndex !== expectedIndex) break
        script.isTyping = false
        receiveMessage(script.contactId, entry.text)
        script.currentIndex += 1
        if (script.currentIndex >= (script.messages?.length || 0)) {
          completeSmsScript(scriptId)
          break
        }
        await new Promise((resolve) => window.setTimeout(resolve, 320))
        script = activeSmsScripts.value.find((item) => item.id === scriptId)
      }
    } finally {
      const script = activeSmsScripts.value.find((item) => item.id === scriptId)
      if (script) script.isTyping = false
      processingSmsScripts.delete(scriptId)
    }
  }
  function addMessage(contactId, message) {
    const contact = contacts.value.find((item) => item.id === contactId)
    if (!contact) return
    contact.messages.push({ id: `${contactId}-${Date.now()}-${contact.messages.length}`, stamp: formatTime(), ...message })
    contact.time = formatTime()
  }
  function receiveMessage(contactId, text) {
    addMessage(contactId, { side: 'them', text })
    const contact = contacts.value.find((item) => item.id === contactId)
    if (!contact) return
    playMessageReceiveSound()
    const isConversationOpen = activeAppId.value === 'messages' && activeContactId.value === contactId
    if (isConversationOpen) return
    contact.unread = (contact.unread || 0) + 1
    showNotification({ appId: 'messages', contactId, title: contact.name, body: text, initials: contact.initials, color: contact.color })
  }
  function showNotification(payload) {
    if (powerState.value !== 'on') return
    notification.value = { ...payload, id: Date.now() }
    window.clearTimeout(showNotification.timer)
    showNotification.timer = window.setTimeout(() => { notification.value = null }, 5200)
  }
  function dismissNotification() { notification.value = null }
  function openNotification() {
    const payload = notification.value
    if (!payload) return
    if (locked.value) { showPasscode(); return }
    openApp(payload.appId)
    if (payload.appId === 'messages' && payload.contactId) openContact(payload.contactId)
    else if (payload.targetId) openContent(payload.appId, payload.targetId)
    dismissNotification()
  }

  function findContact(contactId) { return contacts.value.find((item) => item.id === contactId) }
  function hydrateCallRecord(record = {}) {
    const contact = findContact(record.contactId)
    return {
      ...clone(record),
      name: contact?.name || '未知号码',
      avatar: contact?.avatar || '',
      initials: contact?.initials || contact?.name?.slice(0, 1) || '?',
      color: contact?.color || '#8b8d94',
    }
  }
  function findPhoneDialogue(dialogueId, direction = '') {
    const dialogue = storyConfig.phoneDialogues?.find((item) => item.id === dialogueId) || null
    if (!dialogue || (direction && ![direction, 'any'].includes(dialogue.direction))) return null
    return dialogue
  }
  function hydrateCall(dialogue, record = {}, fallbackContactId = '') {
    const contactId = dialogue?.contactId || record.contactId || fallbackContactId
    const contact = findContact(contactId)
    return {
      ...clone(dialogue || {}),
      id: contactId || record.id || `call-${Date.now()}`,
      contactId,
      title: contact?.name || record.name || '未知号码',
      avatar: contact?.avatar || record.avatar || '',
      initials: contact?.initials || record.initials || contact?.name?.slice(0, 1) || '?',
      color: contact?.color || record.color || '#8b8d94',
      dialogueId: dialogue?.dialogueId || dialogue?.id || '',
      conversation: clone(dialogue?.conversation || []),
      hangupAfterMs: Number(dialogue?.hangupAfterMs ?? 3000),
    }
  }
  function addCallRecord(call, outcome, direction, duration = 0) {
    const contact = findContact(call.contactId)
    callHistory.value.unshift({
      id: `history-${Date.now()}`,
      contactId: call.contactId,
      name: call.title || contact?.name || '未知号码',
      avatar: call.avatar || contact?.avatar || '',
      initials: contact?.initials || call.title?.slice(0, 1) || '?',
      color: call.color || contact?.color || '#8b8d94',
      direction,
      outcome,
      time: formatTime(),
      duration,
    })
  }
  function showCallEnded(call, afterClose = null) {
    window.clearTimeout(outgoingCloseTimer)
    incomingCall.value = null
    activeCall.value = { ...call }
    callTranscript.value = []
    callStatus.value = 'ended'
    outgoingCloseTimer = window.setTimeout(() => {
      activeCall.value = null
      callTranscript.value = []
      callElapsed.value = 0
      callStatus.value = 'idle'
      if (afterClose) afterClose()
    }, CALL_END_DISPLAY_MS)
  }
  function beginCall(call, direction, eventId = '') {
    stopIncomingCallRingtone()
    window.clearTimeout(callTimeout)
    window.clearTimeout(outgoingCallTimer)
    window.clearTimeout(outgoingCloseTimer)
    incomingCall.value = null
    activeCall.value = { ...hydrateCall(call), direction, eventId }
    callTranscript.value = []
    callElapsed.value = 0
    callStatus.value = 'connected'
    if (direction === 'outgoing') {
      triggerOperation('outgoing-call-accepted', { appId: 'phone', targetId: call.contactId })
    }
    window.clearInterval(callElapsedTimer)
    callElapsedTimer = window.setInterval(() => { callElapsed.value += 1 }, 1000)
    callScriptTimers.forEach((timer) => window.clearTimeout(timer))
    callScriptTimers = []
    let delay = 450
    for (const line of call.conversation || []) {
      delay += line.afterMs ?? 1200
      callScriptTimers.push(window.setTimeout(() => callTranscript.value.push(line), delay))
    }
    if (call.conversation?.length) {
      callScriptTimers.push(window.setTimeout(() => {
        if (activeCall.value?.dialogueId === call.dialogueId && callStatus.value === 'connected') finishCall()
      }, delay + Number(call.hangupAfterMs ?? 3000)))
    }
  }
  function startIncomingCall(dialogueId, eventId = '', timeoutMs = 16000) {
    const dialogue = findPhoneDialogue(dialogueId, 'incoming')
    if (!dialogue || incomingCall.value || activeCall.value) return
    const call = hydrateCall(dialogue)
    incomingCall.value = { ...call, eventId }
    startIncomingCallRingtone()
    showNotification({ appId: 'phone', contactId: call.contactId, title: call.title, body: '来电' })
    window.clearTimeout(callTimeout)
    callTimeout = window.setTimeout(() => resolveIncomingCall('missed'), timeoutMs)
  }
  function resolveIncomingCall(outcome) {
    const ringing = incomingCall.value
    if (!ringing) return
    stopIncomingCallRingtone()
    window.clearTimeout(callTimeout)
    incomingCall.value = null
    if (notification.value?.appId === 'phone' && notification.value?.contactId === ringing.contactId) dismissNotification()
    triggerOperation(`incoming-call-${outcome}`, { appId: 'phone', targetId: ringing.contactId })
    if (outcome === 'accepted') beginCall(ringing, 'incoming', ringing.eventId)
    else {
      addCallRecord(ringing, outcome, 'incoming')
      showCallEnded(ringing, () => resolveStoryOutcome(ringing.eventId, outcome))
    }
  }
  function acceptCall() { resolveIncomingCall('accepted') }
  function rejectCall() { resolveIncomingCall('rejected') }
  function outgoingConditionMatches(condition) {
    const eventId = condition.targetId || ''
    if (!eventId) return false
    if (condition.type === 'event-state') {
      const active = activeStoryEvents.value.includes(eventId)
      const triggered = triggeredEvents.value.includes(eventId)
      const completed = completedEvents.value.includes(eventId)
      if (condition.value === 'not-triggered') return !active && !triggered && !completed
      if (condition.value === 'in-progress') return !completed && (active || triggered)
      if (condition.value === 'completed') return completed
      return false
    }
    if (condition.type === 'event-outcome') return eventOutcomes.value[eventId] === condition.value
    return false
  }
  function outgoingRuleMatches(rule, dialCount) {
    const legacyState = rule.eventState === 'triggered' ? 'completed' : rule.eventState
    const legacyConditions = rule.eventId && legacyState && legacyState !== 'any'
      ? [{ type: 'event-state', targetId: rule.eventId, value: legacyState }]
      : []
    const conditions = Array.isArray(rule.conditions) ? rule.conditions : legacyConditions
    if (!conditions.every(outgoingConditionMatches)) return false
    if (Number(rule.minDialCount || 0) > dialCount) return false
    if (Number(rule.maxDialCount || 0) > 0 && dialCount > Number(rule.maxDialCount)) return false
    return true
  }
  function finishUnansweredOutgoing(call) {
    if (!activeCall.value) return
    addCallRecord(call, 'missed', 'outgoing')
    triggerOperation('outgoing-call-missed', { appId: 'phone', targetId: call.contactId })
    triggerOperation('call-ended', { appId: 'phone', targetId: call.contactId, outcome: 'missed' })
    showCallEnded(call)
  }
  function startOutgoingCall(contactId, record = {}) {
    if (incomingCall.value || activeCall.value) return
    const baseCall = hydrateCall(null, record, contactId)
    triggerOperation('outgoing-call', { appId: 'phone', targetId: baseCall.contactId })
    const dialCount = (outgoingDialCounts.value[baseCall.contactId] || 0) + 1
    outgoingDialCounts.value[baseCall.contactId] = dialCount
    const rule = [...(storyConfig.outgoingCallRules || [])]
      .filter((item) => item.contactId === baseCall.contactId)
      .sort((left, right) => Number(left.order || 0) - Number(right.order || 0))
      .find((item) => outgoingRuleMatches(item, dialCount))
    const dialogue = rule?.dialogueId ? findPhoneDialogue(rule.dialogueId, 'outgoing') : null
    const call = hydrateCall(dialogue, record, baseCall.contactId)

    activeCall.value = { ...call, direction: 'outgoing', eventId: '' }
    callTranscript.value = []
    callElapsed.value = 0
    callStatus.value = 'connecting'
    window.clearTimeout(outgoingCallTimer)
    window.clearTimeout(outgoingCloseTimer)

    if (!rule?.answer) {
      outgoingCallTimer = window.setTimeout(() => finishUnansweredOutgoing(call), Number(rule?.ringMs || 6500))
      return
    }
    outgoingCallTimer = window.setTimeout(() => beginCall(call, 'outgoing'), Number(rule.connectAfterMs || 1200))
  }
  function finishCall() {
    const call = activeCall.value
    if (!call || callStatus.value === 'ended') return
    const endedStatus = callStatus.value
    window.clearTimeout(outgoingCallTimer)
    window.clearTimeout(outgoingCloseTimer)
    window.clearInterval(callElapsedTimer)
    callScriptTimers.forEach((timer) => window.clearTimeout(timer))
    addCallRecord(call, endedStatus === 'connected' ? 'completed' : 'outgoing', call.direction, callElapsed.value)
    const eventId = call.eventId
    triggerOperation('call-ended', { appId: 'phone', targetId: call.contactId, outcome: endedStatus })
    showCallEnded(call, () => {
      if (eventId) resolveStoryOutcome(eventId, 'accepted')
    })
  }

  function findStoryEvent(eventId) {
    return storyConfig.events?.find((item) => item.id === eventId)
  }
  function removeActiveStoryEvent(eventId) {
    activeStoryEvents.value = activeStoryEvents.value.filter((id) => id !== eventId)
  }
  function clearStoryPowerOffTimer() {
    window.clearTimeout(storyPowerOffTimer)
    storyPowerOffTimer = null
  }
  function hasPendingStoryEvents() {
    return activeStoryEvents.value.length > 0 || triggeredEvents.value.some((eventId) => !completedEvents.value.includes(eventId))
  }
  function maybeScheduleStoryPowerOff() {
    if (!storyTimelineStarted || powerState.value !== 'on' || hasPendingStoryEvents()) return
    if (storyPowerOffTimer) return
    const seconds = Number(contentConfig.device?.powerOffDelaySeconds)
    const delay = (Number.isFinite(seconds) && seconds >= 0 ? seconds : 30) * 1000
    storyPowerOffTimer = window.setTimeout(() => {
      storyPowerOffTimer = null
      beginPowerOff()
    }, delay)
  }
  function activateStoryEvent(eventId, delayOverride = null) {
    if (powerState.value !== 'on') return
    const event = findStoryEvent(eventId)
    if (!event || completedEvents.value.includes(eventId) || activeStoryEvents.value.includes(eventId)) return
    clearStoryPowerOffTimer()
    activeStoryEvents.value.push(eventId)
    if (event.trigger?.type !== 'timer') {
      const action = event.trigger?.action
      const targetId = event.trigger?.targetId
      if (action === 'moment-liked' && targetId && useWechatStore().isMomentLiked(targetId)) runEvent(event)
      if (action === 'moment-unliked' && targetId && !useWechatStore().isMomentLiked(targetId)) runEvent(event)
      return
    }
    const delay = delayOverride === null ? Number(event.trigger.afterMs || 0) : Number(delayOverride || 0)
    timelineTimers.push(window.setTimeout(() => runEvent(event), delay))
  }
  function runEvent(event) {
    if (!event || powerState.value !== 'on' || completedEvents.value.includes(event.id)) return
    removeActiveStoryEvent(event.id)
    if (!triggeredEvents.value.includes(event.id)) triggeredEvents.value.push(event.id)
    const action = event.action || {}
    if (action.type === 'call') {
      startIncomingCall(action.dialogueId, event.id, action.timeoutMs)
      return
    }
    if (action.type === 'sms-script') {
      if (!activateSmsScript(action.smsScriptId, event.id)) resolveStoryOutcome(event.id, 'completed')
      return
    }
    if (action.type === 'wechat-script') {
      if (!useWechatStore().activateScript(action.wechatScriptId, event.id)) resolveStoryOutcome(event.id, 'completed')
      return
    }
    if (action.type === 'moment-publish') {
      if (!useWechatStore().activatePublishScript(action.publishScriptId, event.id)) resolveStoryOutcome(event.id, 'completed')
      return
    }
    if (action.type === 'moment-comment') {
      if (!useWechatStore().activateCommentScript(action.commentScriptId, event.id)) resolveStoryOutcome(event.id, 'completed')
      return
    }
    if (action.type === 'moment-interactions') {
      if (!useWechatStore().activateInteractionScript(action.interactionScriptId, event.id)) resolveStoryOutcome(event.id, 'completed')
      return
    }
    resolveStoryOutcome(event.id, 'completed')
  }
  function resolveStoryOutcome(eventId, outcome) {
    if (!eventId) return
    const event = findStoryEvent(eventId)
    if (!event) return
    const retry = event.retry
    if (retry?.enabled && retry.outcomes?.includes(outcome)) {
      timelineTimers.push(window.setTimeout(() => runEvent(event), retry.afterMs || 30000))
      return
    }
    if (!completedEvents.value.includes(eventId)) completedEvents.value.push(eventId)
    eventOutcomes.value[eventId] = outcome
    const nextId = event.nextByOutcome?.[outcome] || event.nextByOutcome?.completed
    if (nextId) activateStoryEvent(nextId)
    maybeScheduleStoryPowerOff()
  }
  function triggerOperation(action, payload = {}) {
    if (powerState.value !== 'on') return
    const details = typeof payload === 'string' ? { targetId: payload } : payload
    const matchedEvents = (storyConfig.events || []).filter((item) =>
      activeStoryEvents.value.includes(item.id) &&
      item.trigger?.type === 'operation' && item.trigger.action === action &&
      (!item.trigger.appId || item.trigger.appId === details.appId) &&
      (!item.trigger.targetId || item.trigger.targetId === details.targetId),
    )
    matchedEvents.forEach(runEvent)
  }
  function startTimeline() {
    timelineTimers.forEach((timer) => window.clearTimeout(timer))
    timelineTimers = []
    clearStoryPowerOffTimer()
    storyTimelineStarted = false
    activeStoryEvents.value = []
    const events = storyConfig.events || []
    let initialEvents = events.filter((event) => event.initialActive)
    if (!initialEvents.length) {
      const referenced = new Set(events.flatMap((event) => Object.values(event.nextByOutcome || {})).filter(Boolean))
      initialEvents = events.filter((event) => !referenced.has(event.id))
    }
    initialEvents.forEach((event) => activateStoryEvent(event.id))
    storyTimelineStarted = initialEvents.length > 0
    maybeScheduleStoryPowerOff()
  }

  function clearBatteryDrainTimer() {
    window.clearInterval(batteryDrainTimer)
    batteryDrainTimer = null
  }
  function updateTimedBatteryLevel() {
    if (powerState.value !== 'on') return
    const seconds = Number(contentConfig.device?.batteryDrainIntervalSeconds)
    const intervalMs = (Number.isFinite(seconds) && seconds > 0 ? seconds : 30) * 1000
    const initialLevel = Math.max(1, normalizeBatteryLevel(contentConfig.device?.initialBatteryLevel))
    const drainedLevel = initialLevel - Math.floor((Date.now() - startedAt.value) / intervalMs)
    batteryLevel.value = Math.max(1, drainedLevel)
  }
  function startBatteryDrain() {
    clearBatteryDrainTimer()
    startedAt.value = Date.now()
    updateTimedBatteryLevel()
    batteryDrainTimer = window.setInterval(updateTimedBatteryLevel, 1000)
  }

  function clearPowerTimers() {
    window.clearTimeout(powerWarningTimer)
    window.clearTimeout(powerShutdownTimer)
    powerWarningTimer = null
    powerShutdownTimer = null
  }
  function beginPowerOff() {
    if (powerState.value !== 'on') return
    stopIncomingCallRingtone()
    storyTimelineStarted = false
    clearStoryPowerOffTimer()
    clearBatteryDrainTimer()
    batteryLevel.value = 0
    powerState.value = 'warning'
    notification.value = null
    window.clearTimeout(showNotification.timer)
    timelineTimers.forEach((timer) => window.clearTimeout(timer))
    timelineTimers = []
    window.clearTimeout(callTimeout)
    window.clearTimeout(outgoingCallTimer)
    window.clearTimeout(outgoingCloseTimer)
    window.clearInterval(callElapsedTimer)
    callScriptTimers.forEach((timer) => window.clearTimeout(timer))
    callScriptTimers = []
    stopAlarmSound()
    alarmRinging.value = null
    useMusicStore().stopPlayback()
    clearPowerTimers()
    powerWarningTimer = window.setTimeout(() => {
      powerState.value = 'shutting-down'
      powerShutdownTimer = window.setTimeout(() => { powerState.value = 'off' }, 620)
    }, 1700)
  }

  function stopAlarmSound() {
    if (alarmAudio) { alarmAudio.pause(); alarmAudio.currentTime = 0; alarmAudio = null }
    window.clearInterval(alarmPulse)
    alarmPulse = null
    if (alarmAudioContext) { alarmAudioContext.close().catch(() => {}); alarmAudioContext = null }
  }
  function playDefaultAlarm() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (!AudioContextClass) return
      alarmAudioContext = new AudioContextClass()
      const pulse = () => {
        if (!alarmAudioContext) return
        const oscillator = alarmAudioContext.createOscillator()
        const gain = alarmAudioContext.createGain()
        oscillator.type = 'sine'
        oscillator.frequency.value = 880
        gain.gain.setValueAtTime(0.0001, alarmAudioContext.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.22, alarmAudioContext.currentTime + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, alarmAudioContext.currentTime + 0.46)
        oscillator.connect(gain).connect(alarmAudioContext.destination)
        oscillator.start()
        oscillator.stop(alarmAudioContext.currentTime + 0.5)
      }
      pulse()
      alarmPulse = window.setInterval(pulse, 720)
    } catch { /* 浏览器可能在首次交互前阻止声音，界面仍会响铃提示。 */ }
  }
  function triggerAlarm(alarm) {
    if (alarmRinging.value) return
    alarmRinging.value = clone(alarm)
    stopAlarmSound()
    if (alarm.sound) {
      alarmAudio = new Audio(alarm.sound)
      alarmAudio.loop = true
      alarmAudio.play().catch(playDefaultAlarm)
    } else playDefaultAlarm()
  }
  function stopAlarm() { stopAlarmSound(); alarmRinging.value = null }
  function toggleAlarm(id) {
    const alarm = alarms.value.find((item) => item.id === id)
    if (alarm) alarm.enabled = !alarm.enabled
  }
  function startAlarmClock() {
    window.clearInterval(alarmTimer)
    const check = () => {
      const now = new Date()
      const current = formatTime(now)
      for (const alarm of alarms.value) {
        const key = `${formatDateKey(now)}:${alarm.id}`
        if (alarm.enabled && alarm.time === current && !alarmTriggerKeys.has(key)) {
          alarmTriggerKeys.add(key)
          triggerAlarm(alarm)
        }
      }
    }
    check()
    alarmTimer = window.setInterval(check, 1000)
  }
  function startRuntime() { startNavigation(); startBatteryDrain(); startTimeline(); startAlarmClock() }
  function resetStory() {
    stopIncomingCallRingtone()
    clearPowerTimers()
    clearStoryPowerOffTimer()
    clearBatteryDrainTimer()
    storyTimelineStarted = false
    batteryLevel.value = Math.max(1, normalizeBatteryLevel(contentConfig.device?.initialBatteryLevel))
    powerState.value = 'on'
    contacts.value = hydrateContacts(contentConfig.contacts)
    mail.value = clone(contentConfig.mail || [])
    callHistory.value = (contentConfig.callHistory || []).map(hydrateCallRecord)
    triggeredEvents.value = []
    activeStoryEvents.value = []
    completedEvents.value = []
    eventOutcomes.value = {}
    activeSmsScripts.value = []
    outgoingDialCounts.value = {}
    notification.value = null
    useMapsStore().reset()
    useWechatStore().reset()
    startBatteryDrain()
    startTimeline()
  }

  return {
    locked, batteryLevel, powerState, passcodeVisible, pin, pinError, activeAppId, activeApp, activeContactId, activeContact, activeContent,
    notification, contacts, unreadTotal, mail, unreadMailTotal, alarms, callHistory, incomingCall, activeCall, callTranscript,
    callElapsed, callStatus, alarmRinging, canNavigateBack, showPasscode, pressPin, erasePin, lock, openApp, closeApp, openContact,
    closeContact, openContent, openAppContent, replaceContent, navigateBack, handleEdgeBack, registerEdgeBackHandler, navigateHome, stopNavigation, addMessage, receiveMessage, showNotification, dismissNotification, openNotification,
    toggleAlarm, stopAlarm, triggerOperation, startOutgoingCall, acceptCall, rejectCall,
    activeStoryEvents, completedEvents, eventOutcomes, activeSmsScripts, getActiveSmsScript, advanceSmsScript, completeSmsScript,
    resolveStoryOutcome, resetStory, startTimeline, startRuntime,
  }
})
