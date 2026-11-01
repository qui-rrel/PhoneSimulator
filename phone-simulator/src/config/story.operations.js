export const APP_OPEN = 'app-open'
export const CONTENT_OPEN = 'content-open'
export const MESSAGE_INPUT = 'message-input'
export const OUTGOING_CALL = 'outgoing-call'
export const OUTGOING_CALL_ACCEPTED = 'outgoing-call-accepted'
export const OUTGOING_CALL_MISSED = 'outgoing-call-missed'
export const INCOMING_CALL_ACCEPTED = 'incoming-call-accepted'
export const INCOMING_CALL_REJECTED = 'incoming-call-rejected'
export const INCOMING_CALL_MISSED = 'incoming-call-missed'
export const CALL_ENDED = 'call-ended'
export const MOMENT_LIKED = 'moment-liked'
export const MOMENT_UNLIKED = 'moment-unliked'
export const MOMENT_COMMENT_SENT = 'moment-comment-sent'
export const MOMENT_PUBLISHED = 'moment-published'

const incomingCallOperations = {
  accepted: INCOMING_CALL_ACCEPTED,
  rejected: INCOMING_CALL_REJECTED,
  missed: INCOMING_CALL_MISSED,
}

export function getIncomingCallOperation(outcome) {
  return incomingCallOperations[outcome] || ''
}

export function matchesStoryOperation(event, operation, details = {}) {
  return event?.trigger?.type === 'operation' &&
    event.trigger.action === operation &&
    (!event.trigger.appId || event.trigger.appId === details.appId) &&
    (!event.trigger.targetId || event.trigger.targetId === details.targetId)
}
