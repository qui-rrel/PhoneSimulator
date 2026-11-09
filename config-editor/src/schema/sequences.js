const field = (key, labelZh, type = 'string', extra = {}) => ({
  key, labelZh, labelEn: extra.labelEn || key.split('.').at(-1), type,
  default: extra.default ?? (type === 'boolean' ? false : type === 'list' ? [] : ['int', 'number', 'seconds'].includes(type) ? 0 : ''),
  ...extra,
})

const sideOptions = [
  { value: 'me', labelZh: '我', labelEn: 'Me' },
  { value: 'them', labelZh: '对方', labelEn: 'Them' },
]
const messageTypeOptions = [['text', '文字'], ['image', '图片'], ['sticker', '表情图片'], ['location', '定位']]
  .map(([value, labelZh]) => ({ value, labelZh, labelEn: value }))

const scriptId = field('script.id', '脚本 ID', 'string', { required: true, runtimePath: 'id' })
const scriptName = field('script.name', '脚本名称', 'string', { required: true, editorOnly: true })

export const sequenceSchemas = {
  'sms-script': {
    label: '短信剧情', runtimeCollection: 'smsScripts', itemPath: 'messages', itemLabel: '短信',
    scriptFields: [scriptId, scriptName, field('smsScript.contactId', '联系人', 'reference', { required: true, referenceType: 'contact', runtimePath: 'contactId' })],
    itemFields: [
      field('smsLine.side', '发送方', 'enum', { required: true, runtimePath: 'side', default: 'them', options: sideOptions }),
      field('smsLine.text', '消息内容', 'multiline string', { required: true, runtimePath: 'text' }),
      field('smsLine.keystrokes', '键盘按键序列', 'string', { runtimePath: 'keystrokes', visibleWhen: { path: 'smsLine.side', equals: 'me' } }),
      field('smsLine.afterSeconds', '对方发送延迟', 'seconds', { runtimePath: 'afterMs', storage: 'milliseconds', default: 1.2, min: 0, step: 0.1, visibleWhen: { path: 'smsLine.side', equals: 'them' }, requiredWhen: { path: 'smsLine.side', equals: 'them' } }),
    ],
  },
  'wechat-script': {
    label: '微信剧情', runtimeCollection: 'wechatScripts', itemPath: 'messages', itemLabel: '微信消息',
    scriptFields: [scriptId, scriptName, field('wechatScript.conversationId', '微信会话', 'reference', { required: true, referenceType: 'wechat-conversation', runtimePath: 'conversationId' })],
    itemFields: [
      field('wechatLine.senderId', '发送人', 'reference', { required: true, referenceType: 'wechat-sender', runtimePath: 'senderId' }),
      field('wechatLine.type', '消息类型', 'enum', { required: true, runtimePath: 'type', default: 'text', options: messageTypeOptions }),
      field('wechatLine.text', '消息内容', 'multiline string', { runtimePath: 'text', visibleWhen: { path: 'wechatLine.type', equals: 'text' }, requiredWhen: { path: 'wechatLine.type', equals: 'text' } }),
      field('wechatLine.mediaSrc', '图片或表情路径', 'media path', { runtimePath: 'mediaSrc', placeholder: '/media/文件名.后缀', visibleWhen: { path: 'wechatLine.type', in: ['image', 'sticker', 'location'] }, requiredWhen: { path: 'wechatLine.type', in: ['image', 'sticker', 'location'] } }),
      field('wechatLine.mapLocationId', '地图地点', 'reference', { referenceType: 'map-location', runtimePath: 'mapLocationId', visibleWhen: { path: 'wechatLine.type', equals: 'location' }, requiredWhen: { path: 'wechatLine.type', equals: 'location' } }),
      field('wechatLine.keystrokes', '键盘按键序列', 'string', { runtimePath: 'keystrokes', visibleWhen: { path: 'wechatLine.senderId', equals: 'SELF' } }),
      field('wechatLine.afterSeconds', '对方发送延迟', 'seconds', { runtimePath: 'afterMs', storage: 'milliseconds', default: 1.2, min: 0, step: 0.1, visibleWhen: { path: 'wechatLine.senderId', notEquals: 'SELF' }, requiredWhen: { path: 'wechatLine.senderId', notEquals: 'SELF' } }),
    ],
  },
  'phone-dialogue': {
    label: '电话对白', runtimeCollection: 'phoneDialogues', itemPath: 'conversation', itemLabel: '对白',
    scriptFields: [
      scriptId, scriptName,
      field('phoneDialogue.contactId', '联系人', 'reference', { required: true, referenceType: 'contact', runtimePath: 'contactId' }),
      field('phoneDialogue.direction', '对白方向', 'enum', { required: true, runtimePath: 'direction', default: 'incoming', options: [{ value: 'incoming', labelZh: '来电', labelEn: 'Incoming' }, { value: 'outgoing', labelZh: '主动拨打', labelEn: 'Outgoing' }, { value: 'any', labelZh: '通用', labelEn: 'Any' }] }),
      field('phoneDialogue.hangupSeconds', '对白结束后挂断等待', 'seconds', { required: true, runtimePath: 'hangupAfterMs', storage: 'milliseconds', default: 3, min: 0, step: 0.1 }),
    ],
    itemFields: [
      field('phoneLine.side', '说话方', 'enum', { required: true, runtimePath: 'side', default: 'them', options: sideOptions }),
      field('phoneLine.text', '对白内容', 'multiline string', { required: true, runtimePath: 'text' }),
      field('phoneLine.afterSeconds', '出现延迟', 'seconds', { required: true, runtimePath: 'afterMs', storage: 'milliseconds', default: 1.2, min: 0, step: 0.1 }),
    ],
  },
  'moment-publish-script': {
    label: '朋友圈发布剧情', runtimeCollection: 'momentPublishScripts', rootItem: true, itemLabel: '发布内容',
    scriptFields: [scriptId, scriptName],
    itemFields: [
      field('publish.momentId', '生成的朋友圈 ID', 'string', { required: true, runtimePath: 'momentId' }),
      field('publish.text', '发布正文', 'multiline string', { runtimePath: 'text' }),
      field('publish.keystrokes', '键盘按键序列', 'string', { runtimePath: 'keystrokes' }),
      field('publish.imageSrc', '朋友圈图片', 'list', { runtimePath: 'imageSrc', placeholder: '每行一个 /media/... 路径' }),
      field('publish.time', '发布时间', 'string', { runtimePath: 'time', placeholder: 'LOCAL_TIME 或显示文字' }),
    ],
  },
  'moment-comment-script': {
    label: '朋友圈玩家评论剧情', runtimeCollection: 'momentCommentScripts', rootItem: true, itemLabel: '评论内容',
    scriptFields: [scriptId, scriptName],
    itemFields: [
      field('playerComment.commentId', '生成的评论 ID', 'string', { required: true, runtimePath: 'commentId' }),
      field('playerComment.momentId', '朋友圈 ID', 'string', { required: true, runtimePath: 'momentId' }),
      field('playerComment.replyToCommentId', '回复的评论 ID', 'string', { runtimePath: 'replyToCommentId' }),
      field('playerComment.text', '评论内容', 'multiline string', { runtimePath: 'text' }),
      field('playerComment.keystrokes', '键盘按键序列', 'string', { runtimePath: 'keystrokes' }),
      field('playerComment.imageSrc', '评论图片', 'media path', { runtimePath: 'imageSrc', placeholder: '/media/文件名.后缀' }),
    ],
  },
  'moment-interaction-script': {
    label: '朋友圈互动剧情', runtimeCollection: 'momentInteractionScripts', itemPath: 'actions', itemLabel: '互动动作',
    scriptFields: [scriptId, scriptName],
    itemFields: [
      field('interaction.type', '互动类型', 'enum', { required: true, runtimePath: 'type', default: 'show-moment', options: [['show-moment', '显示朋友圈'], ['like', '点赞'], ['unlike', '取消赞'], ['comment', '评论']].map(([value, labelZh]) => ({ value, labelZh, labelEn: value })) }),
      field('interaction.momentId', '朋友圈 ID', 'string', { required: true, runtimePath: 'momentId' }),
      field('interaction.actorId', '互动人', 'reference', { referenceType: 'wechat-contact', runtimePath: 'actorId', visibleWhen: { path: 'interaction.type', in: ['like', 'unlike', 'comment'] }, requiredWhen: { path: 'interaction.type', in: ['like', 'unlike', 'comment'] } }),
      field('interaction.commentId', '生成的评论 ID', 'string', { runtimePath: 'commentId', visibleWhen: { path: 'interaction.type', equals: 'comment' }, requiredWhen: { path: 'interaction.type', equals: 'comment' } }),
      field('interaction.replyToCommentId', '回复的评论 ID', 'string', { runtimePath: 'replyToCommentId', visibleWhen: { path: 'interaction.type', equals: 'comment' } }),
      field('interaction.text', '评论内容', 'multiline string', { runtimePath: 'text', visibleWhen: { path: 'interaction.type', equals: 'comment' } }),
      field('interaction.imageSrc', '评论图片', 'media path', { runtimePath: 'imageSrc', placeholder: '/media/文件名.后缀', visibleWhen: { path: 'interaction.type', equals: 'comment' } }),
      field('interaction.afterSeconds', '互动延迟', 'seconds', { runtimePath: 'afterMs', storage: 'milliseconds', default: 0, min: 0, step: 0.1 }),
      field('interaction.notify', '生成朋友圈消息', 'boolean', { runtimePath: 'notify' }),
      field('interaction.notificationText', '朋友圈消息文案', 'string', { runtimePath: 'notificationText', visibleWhen: { path: 'interaction.notify', equals: true } }),
    ],
  },
}

for (const schema of Object.values(sequenceSchemas)) {
  schema.scriptFieldKeys = schema.scriptFields.map((item) => item.key)
  schema.itemFieldKeys = schema.itemFields.map((item) => item.key)
}

export const sequenceFieldDefinitions = Object.fromEntries(
  Object.values(sequenceSchemas).flatMap((schema) => [...schema.scriptFields, ...schema.itemFields].map((item) => [item.key, item])),
)

export function getSequenceSchema(type) {
  return sequenceSchemas[type] || null
}

export function sequenceTypes() {
  return Object.keys(sequenceSchemas)
}
