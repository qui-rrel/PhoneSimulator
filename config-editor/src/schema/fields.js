import { ordinaryFieldDefinitions } from './resources.js'
import { sequenceFieldDefinitions } from './sequences.js'

export const fieldDefinitions = {
  'editor.nodeName': {
    key: 'editor.nodeName', labelZh: '节点名称', labelEn: 'Node name', type: 'string', default: '', required: true,
    description: '只用于编辑器中辨认节点，不会写入手机运行时 JSON。',
  },
  'event.initialActive': {
    key: 'event.initialActive', labelZh: '初始激活', labelEn: 'Initially active', type: 'boolean', default: false,
    description: '作品开始时立即激活这个事件。可以有多个互相独立的初始事件。',
  },
  'trigger.type': {
    key: 'trigger.type', labelZh: '触发方式', labelEn: 'Trigger type', type: 'enum', default: 'timer',
    description: '决定事件是等待一段时间，还是等待玩家完成指定操作。',
    options: [
      { value: 'timer', labelZh: '计时触发', labelEn: 'Timer' },
      { value: 'operation', labelZh: '操作触发', labelEn: 'Operation' },
    ],
  },
  'trigger.afterSeconds': {
    key: 'trigger.afterSeconds', labelZh: '触发延迟', labelEn: 'Trigger delay', type: 'seconds',
    default: 0, min: 0, step: 0.1, visibleWhen: { path: 'trigger.type', equals: 'timer' },
    requiredWhen: { path: 'trigger.type', equals: 'timer' },
    description: '事件激活后等待的秒数。运行时导出为毫秒。',
  },
  'trigger.action': {
    key: 'trigger.action', labelZh: '玩家操作', labelEn: 'Player operation', type: 'enum',
    default: 'app-open', visibleWhen: { path: 'trigger.type', equals: 'operation' },
    requiredWhen: { path: 'trigger.type', equals: 'operation' },
    description: '玩家完成这个操作后，事件才会执行。',
    options: [
      { value: 'app-open', labelZh: '打开应用', labelEn: 'Open app' },
      { value: 'content-open', labelZh: '打开具体内容', labelEn: 'Open content' },
      { value: 'message-input', labelZh: '进入消息输入', labelEn: 'Open message input' },
      { value: 'outgoing-call', labelZh: '拨打电话', labelEn: 'Outgoing call' },
      { value: 'outgoing-call-accepted', labelZh: '主动通话接通', labelEn: 'Outgoing call accepted' },
      { value: 'outgoing-call-missed', labelZh: '主动通话未接', labelEn: 'Outgoing call missed' },
      { value: 'incoming-call-accepted', labelZh: '接听来电', labelEn: 'Incoming call accepted' },
      { value: 'incoming-call-rejected', labelZh: '拒接来电', labelEn: 'Incoming call rejected' },
      { value: 'incoming-call-missed', labelZh: '来电未接', labelEn: 'Incoming call missed' },
      { value: 'call-ended', labelZh: '通话结束', labelEn: 'Call ended' },
      { value: 'moment-liked', labelZh: '点赞朋友圈', labelEn: 'Moment liked' },
      { value: 'moment-unliked', labelZh: '取消朋友圈点赞', labelEn: 'Moment unliked' },
      { value: 'moment-comment-sent', labelZh: '发送朋友圈评论', labelEn: 'Moment comment sent' },
      { value: 'moment-published', labelZh: '发布朋友圈', labelEn: 'Moment published' },
    ],
  },
  'trigger.appId': {
    key: 'trigger.appId', labelZh: '操作应用', labelEn: 'Target app', type: 'reference',
    referenceType: 'app', default: 'messages', visibleWhen: { path: 'trigger.type', equals: 'operation' },
    requiredWhen: { path: 'trigger.type', equals: 'operation' },
    description: '限定玩家需要操作的手机应用。',
    options: [
      { value: 'messages', labelZh: '信息', labelEn: 'Messages' },
      { value: 'wechat', labelZh: '微信', labelEn: 'WeChat' },
      { value: 'phone', labelZh: '电话', labelEn: 'Phone' },
    ],
  },
  'trigger.targetId': {
    key: 'trigger.targetId', labelZh: '触发对象', labelEn: 'Target content', type: 'reference',
    referenceType: 'content', default: '', visibleWhen: { path: 'trigger.type', equals: 'operation' },
    requiredWhen: { path: 'trigger.action', in: ['content-open', 'message-input'] },
    description: '选择玩家需要打开或操作的具体联系人、会话或内容。', options: [],
  },
  'action.type': {
    key: 'action.type', labelZh: '发生内容', labelEn: 'Action type', type: 'enum', default: 'none',
    description: '事件触发后实际执行的剧情内容。',
    options: [
      { value: 'none', labelZh: '仅衔接下一节点', labelEn: 'Continue only' },
      { value: 'sms-script', labelZh: '执行短信剧情', labelEn: 'Run SMS script' },
      { value: 'wechat-script', labelZh: '执行微信剧情', labelEn: 'Run WeChat script' },
      { value: 'moment-publish', labelZh: '执行朋友圈发布', labelEn: 'Run moment publish' },
      { value: 'moment-comment', labelZh: '执行朋友圈玩家评论', labelEn: 'Run moment comment' },
      { value: 'moment-interactions', labelZh: '执行朋友圈互动', labelEn: 'Run moment interactions' },
      { value: 'call', labelZh: '收到电话', labelEn: 'Incoming call' },
    ],
  },
  'action.smsScriptId': {
    key: 'action.smsScriptId', labelZh: '短信剧情', labelEn: 'SMS script', type: 'reference',
    referenceType: 'sms-script', default: '', visibleWhen: { path: 'action.type', equals: 'sms-script' },
    requiredWhen: { path: 'action.type', equals: 'sms-script' }, options: [],
  },
  'action.wechatScriptId': {
    key: 'action.wechatScriptId', labelZh: '微信剧情', labelEn: 'WeChat script', type: 'reference',
    referenceType: 'wechat-script', default: '', visibleWhen: { path: 'action.type', equals: 'wechat-script' },
    requiredWhen: { path: 'action.type', equals: 'wechat-script' },
    description: '选择本节点需要执行的完整微信消息脚本。', options: [],
  },
  'action.dialogueId': {
    key: 'action.dialogueId', labelZh: '电话对白', labelEn: 'Phone dialogue', type: 'reference',
    referenceType: 'phone-dialogue', default: '', visibleWhen: { path: 'action.type', equals: 'call' },
    requiredWhen: { path: 'action.type', equals: 'call' },
    description: '选择玩家接听后按顺序播放的完整电话对白。', options: [],
  },
  'action.publishScriptId': {
    key: 'action.publishScriptId', labelZh: '朋友圈发布剧情', labelEn: 'Moment publish script', type: 'reference',
    referenceType: 'moment-publish-script', default: '', visibleWhen: { path: 'action.type', equals: 'moment-publish' },
    requiredWhen: { path: 'action.type', equals: 'moment-publish' }, options: [],
  },
  'action.commentScriptId': {
    key: 'action.commentScriptId', labelZh: '朋友圈评论剧情', labelEn: 'Moment comment script', type: 'reference',
    referenceType: 'moment-comment-script', default: '', visibleWhen: { path: 'action.type', equals: 'moment-comment' },
    requiredWhen: { path: 'action.type', equals: 'moment-comment' }, options: [],
  },
  'action.interactionScriptId': {
    key: 'action.interactionScriptId', labelZh: '朋友圈互动剧情', labelEn: 'Moment interaction script', type: 'reference',
    referenceType: 'moment-interaction-script', default: '', visibleWhen: { path: 'action.type', equals: 'moment-interactions' },
    requiredWhen: { path: 'action.type', equals: 'moment-interactions' }, options: [],
  },
  'action.timeoutSeconds': {
    key: 'action.timeoutSeconds', labelZh: '未接超时', labelEn: 'Missed-call timeout', type: 'seconds',
    default: 15, min: 1, step: 1, visibleWhen: { path: 'action.type', equals: 'call' },
    requiredWhen: { path: 'action.type', equals: 'call' },
    description: '玩家没有接听或拒接时，等待多少秒后判定为未接。',
  },
  'retry.enabled': {
    key: 'retry.enabled', labelZh: '允许重试', labelEn: 'Retry enabled', type: 'boolean', default: false,
    description: '指定结果发生后，等待一段时间再次运行当前事件。',
  },
  'retry.afterSeconds': {
    key: 'retry.afterSeconds', labelZh: '重试等待', labelEn: 'Retry delay', type: 'seconds', default: 30,
    min: 0, step: 0.1, visibleWhen: { path: 'retry.enabled', equals: true },
    requiredWhen: { path: 'retry.enabled', equals: true },
  },
  'retry.outcomes': {
    key: 'retry.outcomes', labelZh: '需要重试的结果', labelEn: 'Retry outcomes', type: 'multi-enum', default: [],
    visibleWhen: { path: 'retry.enabled', equals: true }, requiredWhen: { path: 'retry.enabled', equals: true },
    options: [
      { value: 'accepted', labelZh: '接听', labelEn: 'Accepted' },
      { value: 'rejected', labelZh: '拒接', labelEn: 'Rejected' },
      { value: 'missed', labelZh: '未接', labelEn: 'Missed' },
    ],
  },
  'reference.contactId': { key: 'reference.contactId', labelZh: '联系人', labelEn: 'Contact', type: 'reference', referenceType: 'contact', default: '', required: true, options: [] },
  'reference.contentId': { key: 'reference.contentId', labelZh: '内容', labelEn: 'Content', type: 'reference', referenceType: 'content', default: '', required: true, options: [] },
  'reference.conversationId': { key: 'reference.conversationId', labelZh: '微信会话', labelEn: 'WeChat conversation', type: 'reference', referenceType: 'wechat-conversation', default: '', required: true, options: [] },
  'reference.smsScriptId': { key: 'reference.smsScriptId', labelZh: '短信剧情', labelEn: 'SMS script', type: 'reference', referenceType: 'sms-script', default: '', required: true, options: [] },
  'reference.wechatScriptId': { key: 'reference.wechatScriptId', labelZh: '微信剧情', labelEn: 'WeChat script', type: 'reference', referenceType: 'wechat-script', default: '', required: true, options: [] },
  'reference.publishScriptId': { key: 'reference.publishScriptId', labelZh: '朋友圈发布剧情', labelEn: 'Moment publish script', type: 'reference', referenceType: 'moment-publish-script', default: '', required: true, options: [] },
  'reference.commentScriptId': { key: 'reference.commentScriptId', labelZh: '朋友圈评论剧情', labelEn: 'Moment comment script', type: 'reference', referenceType: 'moment-comment-script', default: '', required: true, options: [] },
  'reference.interactionScriptId': { key: 'reference.interactionScriptId', labelZh: '朋友圈互动剧情', labelEn: 'Moment interaction script', type: 'reference', referenceType: 'moment-interaction-script', default: '', required: true, options: [] },
  'reference.dialogueId': { key: 'reference.dialogueId', labelZh: '电话对白', labelEn: 'Phone dialogue', type: 'reference', referenceType: 'phone-dialogue', default: '', required: true, options: [] },
  'site.title': {
    key: 'site.title', labelZh: '网页名称', labelEn: 'Page title', type: 'string', default: 'PhoneSimulator',
    required: true, description: '浏览器标签页显示的名称，不会出现在手机界面中。',
  },
  'device.initialBatteryLevel': {
    key: 'device.initialBatteryLevel', labelZh: '初始手机电量', labelEn: 'Initial battery level', type: 'int',
    default: 86, min: 1, max: 100, step: 1, unit: '%', placeholder: '1～100 的整数', required: true,
    description: '玩家打开网页时手机显示的初始电量。',
  },
  'device.width': {
    key: 'device.width', labelZh: '手机画布宽度', labelEn: 'Device width', type: 'int', default: 393,
    min: 240, step: 1, unit: 'px', required: true, description: '手机内容画布的逻辑宽度。',
  },
  'device.height': {
    key: 'device.height', labelZh: '手机画布高度', labelEn: 'Device height', type: 'int', default: 852,
    min: 480, step: 1, unit: 'px', required: true, description: '手机内容画布的逻辑高度。',
  },
  'device.radius': {
    key: 'device.radius', labelZh: '手机圆角', labelEn: 'Device radius', type: 'int', default: 58,
    min: 0, step: 1, unit: 'px', required: true, description: '手机外壳和内容区域使用的圆角大小。',
  },
  'device.fixedDate': {
    key: 'device.fixedDate', labelZh: '固定显示日期', labelEn: 'Fixed date', type: 'date', default: '',
    placeholder: 'YYYY-MM-DD', description: '留空时使用玩家本地日期；填写后只固定界面显示的年月日。',
  },
  'device.batteryDrainIntervalSeconds': {
    key: 'device.batteryDrainIntervalSeconds', labelZh: '每格电量耗时', labelEn: 'Battery drain interval', type: 'seconds',
    default: 45, min: 1, step: 1, required: true, description: '剧情运行时每降低一格电量需要等待的秒数。',
  },
  'device.powerOffDelaySeconds': {
    key: 'device.powerOffDelaySeconds', labelZh: '剧情完成后关机等待', labelEn: 'Power-off delay', type: 'seconds',
    default: 30, min: 0, step: 1, required: true, description: '全部剧情完成后等待多少秒再关机。',
  },
  'weather.seed': {
    key: 'weather.seed', labelZh: '天气随机种子', labelEn: 'Weather seed', type: 'int',
    default: 0, min: 0, step: 1, generateRandom: true, placeholder: '输入非负整数', required: true,
    description: '相同日期和随机种子会生成相同天气。可以手动填写或点击生成。',
  },
  'owner.name': {
    key: 'owner.name', labelZh: '手机主人姓名', labelEn: 'Owner name', type: 'string', default: '',
    required: true, description: '用于设置和部分系统页面显示的手机主人名称。',
  },
  'owner.signature': { key: 'owner.signature', labelZh: '个性签名', labelEn: 'Signature', type: 'string', default: '', description: '设置等页面显示的个性签名。' },
  'owner.wifiName': { key: 'owner.wifiName', labelZh: 'Wi-Fi 名称', labelEn: 'Wi-Fi name', type: 'string', default: '', description: '设置页面显示的当前 Wi-Fi 名称。' },
  'security.passcode': { key: 'security.passcode', labelZh: '锁屏密码', labelEn: 'Passcode', type: 'string', default: '', required: true, placeholder: '4 位数字', pattern: '^\\d{4}$', description: '必须恰好填写四位数字，允许以 0 开头。' },
  'theme.accent': {
    key: 'theme.accent', labelZh: '强调色', labelEn: 'Accent color', type: 'color', default: '#6f8fe8',
    required: true, description: '手机界面中按钮和选中状态使用的主题颜色。',
  },
  'theme.lockWallpaper': { key: 'theme.lockWallpaper', labelZh: '锁屏壁纸', labelEn: 'Lock wallpaper', type: 'media path', default: '', placeholder: '/media/文件名.后缀', description: '锁屏页面使用的壁纸路径。' },
  'theme.homeWallpaper': { key: 'theme.homeWallpaper', labelZh: '桌面壁纸', labelEn: 'Home wallpaper', type: 'media path', default: '', placeholder: '/media/文件名.后缀', description: '手机桌面使用的壁纸路径。' },
  'theme.wallpaperOverlay': { key: 'theme.wallpaperOverlay', labelZh: '壁纸遮罩', labelEn: 'Wallpaper overlay', type: 'string', default: '', description: '可选的 CSS 颜色或渐变遮罩。' },
  'weather.location': { key: 'weather.location', labelZh: '天气地点', labelEn: 'Weather location', type: 'string', default: '', required: true, description: '天气组件显示的地点名称。' },
  'home.showGreetingWidget': { key: 'home.showGreetingWidget', labelZh: '显示问候组件', labelEn: 'Show greeting widget', type: 'boolean', default: true, description: '控制桌面问候组件是否显示。' },
  'xiaohongshu.homeImageSrc': { key: 'xiaohongshu.homeImageSrc', labelZh: '小红书首页长图', labelEn: 'Xiaohongshu home image', type: 'media path', default: '', placeholder: '/media/文件名.后缀', description: '小红书首页滚动区域显示的长图。' },
  'contact.name': {
    key: 'contact.name', labelZh: '联系人姓名', labelEn: 'Contact name', type: 'string', default: '',
    required: true, description: '联系人列表和通话、短信界面显示的姓名。',
  },
  'contact.avatar': {
    key: 'contact.avatar', labelZh: '头像路径', labelEn: 'Avatar path', type: 'media path', default: '',
    placeholder: '/media/文件名.后缀', description: '头像素材应放在手机网页的 public/media 目录中。',
  },
  'script.name': {
    key: 'script.name', labelZh: '脚本名称', labelEn: 'Script name', type: 'string', default: '',
    required: true, description: '用于在编辑器中查找和引用这段剧情。',
  },
  'script.messageCount': {
    key: 'script.messageCount', labelZh: '消息数量', labelEn: 'Message count', type: 'int',
    default: 0, min: 0, step: 1, description: '脚本中包含的消息条目数量。',
  },
  ...ordinaryFieldDefinitions,
  ...sequenceFieldDefinitions,
}

function matchesCondition(condition, data) {
  if (!condition) return true
  const value = data?.[condition.path]
  if (Object.hasOwn(condition, 'equals')) return value === condition.equals
  if (Array.isArray(condition.in)) return condition.in.includes(value)
  if (Object.hasOwn(condition, 'notEquals')) return value !== condition.notEquals
  return true
}

export function isFieldVisible(field, data) {
  return matchesCondition(field.visibleWhen, data)
}

export function isFieldRequired(field, data) {
  return Boolean(field.required || (field.requiredWhen && matchesCondition(field.requiredWhen, data)))
}

export function visibleFieldsForKeys(fieldKeys, data, definitions = fieldDefinitions) {
  return fieldKeys
    .map((key) => definitions[key])
    .filter((field) => field && isFieldVisible(field, data))
}

export function resolveFieldDefinitions(sections) {
  const resolved = Object.fromEntries(
    Object.entries(fieldDefinitions).map(([key, field]) => [key, { ...field, options: field.options ? [...field.options] : undefined }]),
  )
  const contentResources = sections
    .filter((section) => !['scripts', 'story', 'basics'].includes(section.id))
    .flatMap((section) => section.resources)
  const scripts = sections.find((section) => section.id === 'scripts')?.resources || []

  resolved['trigger.targetId'].options = contentResources.map((resource) => ({
    value: resource.runtimeId || resource.id, labelZh: resource.name, labelEn: resource.runtimeId || resource.id,
  }))
  resolved['action.wechatScriptId'].options = scripts
    .filter((resource) => resource.resourceType === 'wechat-script')
    .map((resource) => ({ value: resource.runtimeId || resource.id, labelZh: resource.name, labelEn: resource.runtimeId || resource.id }))
  resolved['action.dialogueId'].options = scripts
    .filter((resource) => resource.resourceType === 'phone-dialogue')
    .map((resource) => ({ value: resource.runtimeId || resource.id, labelZh: resource.name, labelEn: resource.runtimeId || resource.id }))

  const references = new Map()
  for (const resource of [...contentResources, ...scripts]) {
    if (!references.has(resource.resourceType)) references.set(resource.resourceType, [])
    const value = resource.runtimeId || resource.id
    references.get(resource.resourceType).push({ value, labelZh: resource.name || value, labelEn: value })
  }
  const senderOptions = [
    { value: 'SELF', labelZh: '玩家自己', labelEn: 'SELF' },
    ...(references.get('wechat-contact') || []),
  ]
  for (const field of Object.values(resolved)) {
    if (field.type !== 'reference') continue
    if (field.referenceType === 'wechat-sender') field.options = senderOptions
    else if (field.referenceType === 'content') field.options = contentResources.map((resource) => ({
      value: resource.runtimeId || resource.id, labelZh: resource.name, labelEn: resource.runtimeId || resource.id,
    }))
    else if (field.referenceType) field.options = references.get(field.referenceType) || []
  }
  return resolved
}
