import {
  asBool, asDateText, asDisplayTime, asLineList, asNumber, asText, asTimeText,
  deepClone, secondsToMs, setPath, uniqueIds,
} from './valueParsers.js'

const alias = (pairs) => Object.fromEntries(pairs)
const SIDE = alias([['我', 'me'], ['对方', 'them'], ['me', 'me'], ['them', 'them']])
const DIRECTION = alias([['呼入', 'incoming'], ['呼出', 'outgoing'], ['incoming', 'incoming'], ['outgoing', 'outgoing']])
const DIALOGUE_DIRECTION = alias([['来电', 'incoming'], ['主动拨打', 'outgoing'], ['通用', 'any'], ['incoming', 'incoming'], ['outgoing', 'outgoing'], ['any', 'any']])
const CALL_OUTCOME = alias([['已接听', 'accepted'], ['已拒接', 'rejected'], ['未接听', 'missed'], ['已拨出', 'outgoing'], ['accepted', 'accepted'], ['rejected', 'rejected'], ['missed', 'missed'], ['outgoing', 'outgoing']])
const MAP_TYPE = alias([
  ['住宅', 'home'], ['工作地点', 'work'], ['餐饮', 'dining'], ['咖啡', 'cafe'], ['商店', 'shop'],
  ['酒店', 'hotel'], ['交通', 'transport'], ['医院', 'hospital'], ['学校', 'school'], ['公园', 'park'],
  ['景点', 'landmark'], ['舞蹈室', 'dance-studio'], ['录音室', 'recording-studio'], ['其他', 'other'],
  ...['home', 'work', 'dining', 'cafe', 'shop', 'hotel', 'transport', 'hospital', 'school', 'park', 'landmark', 'dance-studio', 'recording-studio', 'other'].map((item) => [item, item]),
])
const CONVERSATION_TYPE = alias([['单聊', 'direct'], ['群聊', 'group'], ['direct', 'direct'], ['group', 'group']])
const MESSAGE_TYPE = alias([['文字', 'text'], ['图片', 'image'], ['表情图片', 'sticker'], ['定位', 'location'], ['语音通话', 'voice-call'], ['视频通话', 'video-call'], ['text', 'text'], ['image', 'image'], ['sticker', 'sticker'], ['location', 'location'], ['voice-call', 'voice-call'], ['video-call', 'video-call']])
const INTERACTION_TYPE = alias([['显示朋友圈', 'show-moment'], ['点赞', 'like'], ['取消赞', 'unlike'], ['评论', 'comment'], ['show-moment', 'show-moment'], ['like', 'like'], ['unlike', 'unlike'], ['comment', 'comment']])
const TRIGGER_TYPE = alias([['计时触发', 'timer'], ['操作触发', 'operation'], ['timer', 'timer'], ['operation', 'operation']])
const TRIGGER_ACTION = alias([
  ['点击短信输入框', 'message-input'], ['点击聊天输入框', 'message-input'], ['打开应用', 'app-open'], ['打开具体内容', 'content-open'],
  ['主动拨打电话', 'outgoing-call'], ['主动电话接通', 'outgoing-call-accepted'], ['主动电话未接', 'outgoing-call-missed'],
  ['接听来电', 'incoming-call-accepted'], ['拒接来电', 'incoming-call-rejected'], ['错过来电', 'incoming-call-missed'], ['通话结束', 'call-ended'],
  ['朋友圈已点赞', 'moment-liked'], ['朋友圈已取消赞', 'moment-unliked'], ['朋友圈评论已发送', 'moment-comment-sent'], ['朋友圈已发布', 'moment-published'],
  ...['message-input', 'app-open', 'content-open', 'outgoing-call', 'outgoing-call-accepted', 'outgoing-call-missed', 'incoming-call-accepted', 'incoming-call-rejected', 'incoming-call-missed', 'call-ended', 'moment-liked', 'moment-unliked', 'moment-comment-sent', 'moment-published', ''].map((item) => [item, item]),
])
const ACTION_TYPE = alias([
  ['收到电话', 'call'], ['执行短信剧情', 'sms-script'], ['执行微信剧情', 'wechat-script'], ['执行朋友圈发布剧情', 'moment-publish'],
  ['执行朋友圈玩家评论剧情', 'moment-comment'], ['执行朋友圈互动剧情', 'moment-interactions'], ['仅衔接下一节点', 'none'],
  ...['call', 'sms-script', 'wechat-script', 'moment-publish', 'moment-comment', 'moment-interactions', 'none'].map((item) => [item, item]),
])
const EVENT_STATE = alias([['任意', 'any'], ['已触发', 'completed'], ['未触发', 'not-triggered'], ['进行中', 'in-progress'], ['已完成', 'completed'], ['any', 'any'], ['triggered', 'completed'], ['not-triggered', 'not-triggered'], ['in-progress', 'in-progress'], ['completed', 'completed'], ['', 'any']])
const CONDITION_TYPE = alias([['剧情事件状态', 'event-state'], ['剧情事件结果', 'event-outcome'], ['event-state', 'event-state'], ['event-outcome', 'event-outcome']])
const CONDITION_OUTCOME = alias([['接听', 'accepted'], ['拒接', 'rejected'], ['未接', 'missed'], ['完成', 'completed'], ['accepted', 'accepted'], ['rejected', 'rejected'], ['missed', 'missed'], ['completed', 'completed']])
const RETRY_OUTCOME = alias([['接听', 'accepted'], ['拒接', 'rejected'], ['未接', 'missed']])
const SELF = 'SELF'

const NUMBER_FIELDS = new Set(['device.width', 'device.height', 'device.radius', 'security.digits', 'weather.seed', 'device.initialBatteryLevel', 'device.batteryDrainIntervalSeconds', 'device.powerOffDelaySeconds'])
const BOOLEAN_FIELDS = new Set(['home.showGreetingWidget'])
const byOrder = (a, b) => asNumber(a.order, 0) - asNumber(b.order, 0)
const mapped = (map, value) => map[asText(value)] ?? asText(value)
const required = (condition, message) => { if (!condition) throw new Error(message) }

function asPasscode(value) {
  let candidate = ''
  if (typeof value === 'number' && Number.isInteger(value)) candidate = value >= 0 && value <= 9999 ? String(value).padStart(4, '0') : String(value)
  else if (typeof value !== 'boolean') candidate = String(value ?? '')
  required(/^\d{4}$/.test(candidate), '基础设置中的锁屏密码必须恰好填写 4 位数字，例如 2799 或 0123。')
  return candidate
}

function retryOutcomes(value, eventId) {
  const raw = String(value || '')
  required(!raw.includes('||'), `剧情分支 ${JSON.stringify(eventId)}：重试结果只允许用 Alt+Enter 换行分隔，不能使用 ||。`)
  const items = raw.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
  required(items.length, `剧情分支 ${JSON.stringify(eventId)}：启用重试后，至少填写一个需要重试的结果。`)
  required(items.every((item) => RETRY_OUTCOME[item]), `剧情分支 ${JSON.stringify(eventId)}：重试结果无效。`)
  required(new Set(items).size === items.length, `剧情分支 ${JSON.stringify(eventId)}：重试结果不能重复填写。`)
  return items.map((item) => RETRY_OUTCOME[item])
}

function convertBasics(reader, content, story) {
  const basicFields = new Set()
  for (const row of reader.rows('基础设置')) {
    const field = asText(row.field)
    basicFields.add(field)
    let value = row.value
    if (field === 'security.passcode') value = asPasscode(value)
    else if (field === 'device.fixedDate') value = value === '' ? '' : asDateText(value, '基础设置中的固定日期')
    else if (NUMBER_FIELDS.has(field)) value = asNumber(value)
    else if (BOOLEAN_FIELDS.has(field)) value = asBool(value)
    else value = asText(value)
    if (field === 'device.initialBatteryLevel') required(Number.isInteger(value) && value >= 1 && value <= 100, '基础设置中的初始手机电量必须填写 1 到 100 的整数。')
    if (field === 'device.batteryDrainIntervalSeconds') required(Number.isInteger(value) && value > 0, '基础设置中的每格电量耗时必须填写大于 0 的整数秒数。')
    if (field === 'device.powerOffDelaySeconds') required(Number.isInteger(value) && value >= 0, '基础设置中的剧情完成后关机等待必须填写大于或等于 0 的整数秒数。')
    if (field === 'security.digits') required(value === 4, '密码位数固定为 4，请不要修改。')
    setPath(field.startsWith('story.') ? story : content, field.startsWith('story.') ? field.slice(6) : field, value)
  }
  const title = asText(content.site?.title)
  if (basicFields.has('site.title')) required(title, '基础设置中的网页名称不能为空。')
  if (!title) setPath(content, 'site.title', 'PhoneSimulator')
  if (content.home) delete content.home.pageLabel
  delete story.mode
}

function convertCommonContent(reader, content) {
  if (reader.has('桌面应用')) {
    content.apps = reader.rows('桌面应用').sort(byOrder).map((row) => {
      const item = { id: asText(row.id), label: asText(row.label), enabled: asBool(row.enabled ?? true), component: asText(row.component), iconSrc: asText(row.iconSrc) }
      if (asBool(row.dock)) item.dock = true
      return item
    })
  }
  const appIds = uniqueIds(content.apps || [], 'id', '桌面应用')
  content.gallery = reader.rows('相册').map((row) => ({ id: asText(row.id), src: asText(row.src), gradient: asText(row.gradient), date: asDisplayTime(row.date) }))
  content.notes = reader.rows('备忘录').map((row) => ({ id: asText(row.id), title: asText(row.title), excerpt: asText(row.excerpt), updatedAt: asDisplayTime(row.updatedAt), body: asText(row.body), pinned: asBool(row.pinned) }))
  content.alarms = reader.rows('闹钟').map((row) => ({ id: asText(row.id), time: asTimeText(row.time, '闹钟'), label: asText(row.label), enabled: asBool(row.enabled), sound: asText(row.sound) }))
  content.playlist = reader.rows('音乐').map((row) => ({ id: asText(row.id), title: asText(row.title), artist: asText(row.artist), src: asText(row.src), cover: asText(row.cover), color: asText(row.color), duration: asNumber(row.duration, 0) }))
  content.browserHistory = reader.rows('浏览记录').map((row) => ({ id: asText(row.id), title: asText(row.title), url: asText(row.url), time: asDisplayTime(row.time) }))
  if (reader.has('小红书搜索记录')) {
    content.xiaohongshu ||= {}
    content.xiaohongshu.searchHistory = reader.rows('小红书搜索记录').sort(byOrder).map((row) => {
      const item = { id: asText(row.id), text: asText(row.text), url: asText(row.url) }
      required(item.id && item.text, '小红书搜索记录：搜索记录 ID 和搜索内容均为必填项。')
      required(!item.url || /^https?:\/\/\S+$/i.test(item.url), `小红书搜索记录 ${JSON.stringify(item.id)}：跳转链接格式不正确。`)
      return item
    })
  } else {
    content.xiaohongshu ||= {}
    content.xiaohongshu.searchHistory ||= []
  }
  uniqueIds(content.xiaohongshu.searchHistory, 'id', '小红书搜索记录')
  content.lockNotifications = reader.rows('锁屏通知').map((row) => ({ id: asText(row.id), appId: asText(row.appId), contactId: asText(row.contactId), title: asText(row.title), time: asDisplayTime(row.time), body: asText(row.body) }))
  content.callHistory = reader.rows('通话记录').map((row) => ({ id: asText(row.id), contactId: asText(row.contactId), direction: mapped(DIRECTION, row.direction), outcome: mapped(CALL_OUTCOME, row.outcome), time: asDisplayTime(row.time), duration: asNumber(row.duration) }))
  content.mail = reader.rows('邮件').map((row) => ({ id: asText(row.id), from: asText(row.from), subject: asText(row.subject), preview: asText(row.preview), time: asDisplayTime(row.time), unread: asBool(row.unread), body: asText(row.body) }))
  content.calendarEvents = reader.rows('日历').map((row) => ({ id: asText(row.id), date: asDateText(row.date, '日历'), title: asText(row.title), time: asDisplayTime(row.time), color: asText(row.color) }))
  content.mapLocations = reader.has('地图地点') ? reader.rows('地图地点').sort(byOrder).map((row) => {
    const id = asText(row.id); const name = asText(row.name); const address = asText(row.address); const type = mapped(MAP_TYPE, row.type); const mapSrc = asText(row.mapSrc)
    required(id && name && address, '地图地点：地点 ID、地点名称和地址均为必填项。')
    required(MAP_TYPE[type], `地图地点 ${JSON.stringify(id)}：地点类型无效。`)
    required(/^\/media\/.+\.svg(?:[?#].*)?$/i.test(mapSrc), `地图地点 ${JSON.stringify(id)}：SVG 路径必须填写 /media/...svg 本地路径。`)
    const favorite = asBool(row.favorite); const savedDate = row.savedDate === '' ? '' : asDateText(row.savedDate, `地图地点 ${JSON.stringify(id)} 的保存日期`)
    required(!favorite || savedDate, `地图地点 ${JSON.stringify(id)}：初始收藏为“是”时必须填写保存日期。`)
    required(favorite || !savedDate, `地图地点 ${JSON.stringify(id)}：未初始收藏时请留空保存日期。`)
    return { id, order: asNumber(row.order, 0), name, type, address, mapSrc, favorite, recent: asBool(row.recent), savedDate }
  }) : []
  for (const [key, label] of [['gallery', '相册'], ['notes', '备忘录'], ['alarms', '闹钟'], ['playlist', '音乐'], ['browserHistory', '浏览记录'], ['lockNotifications', '锁屏通知'], ['callHistory', '通话记录'], ['mail', '邮件'], ['calendarEvents', '日历'], ['mapLocations', '地图地点']]) uniqueIds(content[key], 'id', label)

  const messages = new Map()
  for (const row of reader.rows('短信记录')) {
    const contactId = asText(row.contactId)
    if (!messages.has(contactId)) messages.set(contactId, [])
    messages.get(contactId).push({ id: asText(row.id), side: mapped(SIDE, row.side), text: asText(row.text), stamp: asDisplayTime(row.time ?? row.stamp), read: asBool(row.read) })
  }
  content.contacts = reader.rows('联系人').map((row) => ({ id: asText(row.contactId), name: asText(row.name), avatar: asText(row.avatar), initials: asText(row.initials), color: asText(row.color), time: asDisplayTime(row.time), unread: asNumber(row.unread, 0), messages: messages.get(asText(row.contactId)) || [] }))
  const contactIds = uniqueIds(content.contacts, 'id', '联系人')
  for (const id of messages.keys()) required(contactIds.has(id), `短信记录：联系人 ID ${JSON.stringify(id)} 在“联系人”中不存在。`)
  for (const item of content.lockNotifications) {
    required(appIds.has(item.appId), `锁屏通知 ${JSON.stringify(item.id)}：应用 ID ${JSON.stringify(item.appId)} 不存在。`)
    required(!item.contactId || !['messages', 'phone'].includes(item.appId) || contactIds.has(item.contactId), `锁屏通知 ${JSON.stringify(item.id)}：联系人 ID 不存在。`)
  }
  for (const item of content.callHistory) required(!item.contactId || contactIds.has(item.contactId), `通话记录 ${JSON.stringify(item.id)}：联系人 ID 不存在。`)
  return { appIds, contactIds, mapLocationIds: uniqueIds(content.mapLocations, 'id', '地图地点') }
}

function convertWechat(reader, content, story, mapLocationIds) {
  const accounts = reader.rows('微信账号')
  required(accounts.length === 1, '微信账号：必须且只能填写一行玩家自己的微信账号。')
  const account = accounts[0]
  const wechat = {
    profile: { nickname: asText(account.nickname), wechatId: asText(account.wechatId), avatar: asText(account.avatar), initials: asText(account.initials), color: asText(account.color), momentsCover: asText(account.momentsCover) },
    contacts: [], groups: [], conversations: [], messages: [], moments: [], momentLikes: [], momentComments: [],
  }
  required(wechat.profile.nickname && wechat.profile.wechatId, '微信账号：昵称和微信号不能为空。')
  wechat.contacts = reader.rows('微信联系人').map((row) => ({ id: asText(row.contactId), nickname: asText(row.nickname), remark: asText(row.remark), wechatId: asText(row.wechatId), avatar: asText(row.avatar), initials: asText(row.initials), color: asText(row.color) }))
  const contactIds = uniqueIds(wechat.contacts, 'id', '微信联系人')
  for (const item of wechat.contacts) required(item.nickname, `微信联系人 ${JSON.stringify(item.id)}：昵称不能为空。`)

  const groupMembers = new Map(); const memberOrder = new Set(); const memberKeys = new Set()
  for (const row of reader.rows('微信群成员')) {
    const groupId = asText(row.groupId); const contactId = asText(row.contactId); const order = asNumber(row.order, 0)
    required(!memberOrder.has(`${groupId}\0${order}`), `微信群成员 ${JSON.stringify(groupId)}：成员序号重复。`); memberOrder.add(`${groupId}\0${order}`)
    required(!memberKeys.has(`${groupId}\0${contactId}`), `微信群成员 ${JSON.stringify(groupId)}：成员重复。`); memberKeys.add(`${groupId}\0${contactId}`)
    required(contactId === SELF || contactIds.has(contactId), `微信群成员 ${JSON.stringify(groupId)}：成员 ID 不存在。`)
    if (!groupMembers.has(groupId)) groupMembers.set(groupId, [])
    groupMembers.get(groupId).push({ order, contactId })
  }
  wechat.groups = reader.rows('微信群聊').map((row) => {
    const id = asText(row.groupId); const name = asText(row.name); const memberIds = (groupMembers.get(id) || []).sort(byOrder).map((item) => item.contactId)
    required(memberIds.length >= 2 && memberIds.includes(SELF), `微信群聊 ${JSON.stringify(id)}：至少需要两名成员且必须包含 SELF。`)
    required(name, `微信群聊 ${JSON.stringify(id)}：群聊名称不能为空。`)
    return { id, name, memberIds }
  })
  const groupIds = uniqueIds(wechat.groups, 'id', '微信群聊')
  for (const id of groupMembers.keys()) required(groupIds.has(id), `微信群成员：群聊 ID ${JSON.stringify(id)} 不存在。`)
  const groupMap = new Map(wechat.groups.map((item) => [item.id, item]))

  wechat.conversations = reader.rows('微信会话').map((row) => {
    const type = mapped(CONVERSATION_TYPE, row.type); const targetId = asText(row.targetId)
    required(['direct', 'group'].includes(type), '微信会话：会话类型必须选择“单聊”或“群聊”。')
    required(type === 'direct' ? contactIds.has(targetId) : groupIds.has(targetId), `微信会话：目标 ${JSON.stringify(targetId)} 不存在。`)
    return { id: asText(row.conversationId), type, targetId, pinned: asBool(row.pinned) }
  })
  const conversationIds = uniqueIds(wechat.conversations, 'id', '微信会话')
  const conversationMap = new Map(wechat.conversations.map((item) => [item.id, item]))
  const sequences = new Set()
  for (const row of reader.rows('微信消息')) {
    const conversationId = asText(row.conversationId); const order = asNumber(row.sequence, 0); const senderId = asText(row.senderId); const type = mapped(MESSAGE_TYPE, row.type)
    required(conversationIds.has(conversationId), `微信消息：会话 ID ${JSON.stringify(conversationId)} 不存在。`)
    required(!sequences.has(`${conversationId}\0${order}`), `微信消息 ${JSON.stringify(conversationId)}：消息序号重复。`); sequences.add(`${conversationId}\0${order}`)
    required(['text', 'image', 'sticker', 'location', 'voice-call', 'video-call'].includes(type), '微信消息：消息类型无效。')
    required(senderId === SELF || contactIds.has(senderId), `微信消息：发送人 ID ${JSON.stringify(senderId)} 不存在。`)
    const conversation = conversationMap.get(conversationId)
    required(conversation.type === 'direct' ? [SELF, conversation.targetId].includes(senderId) : groupMap.get(conversation.targetId).memberIds.includes(senderId), `微信消息 ${JSON.stringify(conversationId)}：发送人不属于该会话。`)
    const text = asText(row.text); const mediaSrc = asText(row.mediaSrc); const mapLocationId = asText(row.mapLocationId); const call = ['voice-call', 'video-call'].includes(type)
    required(type !== 'text' || text, `微信消息 ${JSON.stringify(conversationId)}：文字消息内容不能为空。`)
    required(!['image', 'sticker', 'location'].includes(type) || mediaSrc, `微信消息 ${JSON.stringify(conversationId)}：必须填写素材路径。`)
    required(type !== 'location' || (mapLocationId && mapLocationIds.has(mapLocationId)), `微信消息 ${JSON.stringify(conversationId)}：地图地点 ID 不存在。`)
    required(type === 'location' || !mapLocationId, `微信消息 ${JSON.stringify(conversationId)}：只有定位消息可以填写地图地点 ID。`)
    const connectedRaw = row.connected; const durationRaw = row.duration
    required(!call || asText(connectedRaw) !== '', `微信消息 ${JSON.stringify(conversationId)}：通话记录必须填写“是否接通”。`)
    required(!call || (!text && !mediaSrc), `微信消息 ${JSON.stringify(conversationId)}：通话记录不需要填写消息内容或素材路径。`)
    const connected = call && asBool(connectedRaw); let duration
    if (call && connected) { required(asText(durationRaw) !== '', `微信消息 ${JSON.stringify(conversationId)}：已接通记录必须填写通话时长。`); duration = asNumber(durationRaw); required(Number.isInteger(duration) && duration >= 0, '通话时长必须填写非负整数秒。') }
    required(!(call && !connected) || asText(durationRaw) === '', `微信消息 ${JSON.stringify(conversationId)}：未接通记录请留空通话时长。`)
    required(call || (asText(connectedRaw) === '' && asText(durationRaw) === ''), `微信消息 ${JSON.stringify(conversationId)}：只有通话记录可以填写接通状态和时长。`)
    const message = { id: asText(row.id), conversationId, order, senderId, type, text, mediaSrc, time: asDisplayTime(row.time), read: asBool(row.read ?? true) }
    if (call) { message.connected = connected; if (connected) message.duration = duration }
    if (type === 'location') message.mapLocationId = mapLocationId
    wechat.messages.push(message)
  }
  uniqueIds(wechat.messages, 'id', '微信消息')

  wechat.moments = reader.rows('朋友圈').map((row) => {
    const authorId = asText(row.authorId); const text = asText(row.text); const imageSrc = asLineList(row.imageSrc, '朋友圈图片', 9)
    required(authorId === SELF || contactIds.has(authorId), `朋友圈：发布人 ID ${JSON.stringify(authorId)} 不存在。`)
    required(text || imageSrc.length, '朋友圈：正文和图片至少填写一项。')
    return { id: asText(row.momentId), authorId, text, imageSrc, time: asDisplayTime(row.time), order: asNumber(row.order, 0), initiallyVisible: asBool(row.initiallyVisible ?? true) }
  }).sort(byOrder)
  const initialMomentIds = uniqueIds(wechat.moments, 'id', '朋友圈')

  story.momentPublishScripts = reader.rows('朋友圈发布剧情').map((row) => {
    const text = asText(row.text); const imageSrc = asLineList(row.imageSrc, '朋友圈发布剧情图片', 9)
    required(text || imageSrc.length, '朋友圈发布剧情：发布正文和图片至少填写一项。')
    return { id: asText(row.publishScriptId), momentId: asText(row.momentId), text, keystrokes: asText(row.keystrokes), imageSrc, time: asDisplayTime(row.time) }
  })
  const publishScriptIds = uniqueIds(story.momentPublishScripts, 'id', '朋友圈发布剧情')
  const publishedMomentIds = uniqueIds(story.momentPublishScripts, 'momentId', '朋友圈发布剧情生成的朋友圈')
  required(![...initialMomentIds].some((id) => publishedMomentIds.has(id)), '朋友圈发布剧情：生成的朋友圈 ID 与初始朋友圈重复。')
  const momentIds = new Set([...initialMomentIds, ...publishedMomentIds])
  story.momentCommentScripts = reader.rows('朋友圈玩家评论剧情').map((row) => {
    const momentId = asText(row.momentId); const text = asText(row.text); const imageSrc = asText(row.imageSrc)
    required(momentIds.has(momentId), `朋友圈玩家评论剧情：朋友圈 ID ${JSON.stringify(momentId)} 不存在。`); required(text || imageSrc, '朋友圈玩家评论剧情：文字和图片至少填写一项。')
    return { id: asText(row.commentScriptId), commentId: asText(row.commentId), momentId, replyToCommentId: asText(row.replyToCommentId), text, keystrokes: asText(row.keystrokes), imageSrc }
  })
  const commentScriptIds = uniqueIds(story.momentCommentScripts, 'id', '朋友圈玩家评论剧情')
  const playerCommentIds = uniqueIds(story.momentCommentScripts, 'commentId', '朋友圈玩家评论剧情生成的评论')

  const interactions = new Map(); const interactionSequence = new Set()
  for (const row of reader.rows('朋友圈互动剧情')) {
    const id = asText(row.interactionScriptId); const order = asNumber(row.sequence, 0); const type = mapped(INTERACTION_TYPE, row.type); const momentId = asText(row.momentId); const actorId = asText(row.actorId); const text = asText(row.text); const imageSrc = asText(row.imageSrc)
    required(!interactionSequence.has(`${id}\0${order}`), `朋友圈互动剧情 ${JSON.stringify(id)}：互动序号重复。`); interactionSequence.add(`${id}\0${order}`)
    required(['show-moment', 'like', 'unlike', 'comment'].includes(type) && momentIds.has(momentId), `朋友圈互动剧情 ${JSON.stringify(id)}：互动类型或朋友圈无效。`)
    required(type === 'show-moment' || contactIds.has(actorId), `朋友圈互动剧情 ${JSON.stringify(id)}：互动人不存在。`)
    required(type !== 'comment' || text || imageSrc, `朋友圈互动剧情 ${JSON.stringify(id)}：评论文字和图片至少填写一项。`)
    if (!interactions.has(id)) interactions.set(id, { id, actions: [] })
    interactions.get(id).actions.push({ order, type, momentId, actorId, commentId: asText(row.commentId), replyToCommentId: asText(row.replyToCommentId), text, imageSrc, afterMs: secondsToMs(row.afterMs, 0), notify: asBool(row.notify), notificationText: asText(row.notificationText) })
  }
  story.momentInteractionScripts = [...interactions.values()].map((script) => ({ ...script, actions: script.actions.sort(byOrder).map(({ order, ...action }) => action) }))
  const interactionScriptIds = uniqueIds(story.momentInteractionScripts, 'id', '朋友圈互动剧情')
  const interactionComments = story.momentInteractionScripts.flatMap((script) => script.actions).filter((item) => item.type === 'comment')
  const interactionCommentIds = interactionComments.length ? uniqueIds(interactionComments, 'commentId', '朋友圈互动剧情生成的评论') : new Set()

  const likeKeys = new Set()
  for (const row of reader.rows('朋友圈点赞')) {
    const momentId = asText(row.momentId); const contactId = asText(row.contactId); const key = `${momentId}\0${contactId}`
    required(momentIds.has(momentId) && (contactId === SELF || contactIds.has(contactId)), '朋友圈点赞：朋友圈或联系人不存在。'); required(!likeKeys.has(key), '朋友圈点赞：存在重复点赞。'); likeKeys.add(key)
    wechat.momentLikes.push({ momentId, contactId, order: asNumber(row.order, 0) })
  }
  wechat.momentComments = reader.rows('朋友圈评论').map((row) => {
    const momentId = asText(row.momentId); const authorId = asText(row.authorId); const text = asText(row.text); const imageSrc = asText(row.imageSrc)
    required(momentIds.has(momentId) && (authorId === SELF || contactIds.has(authorId)), '朋友圈评论：朋友圈或评论人不存在。'); required(text || imageSrc, '朋友圈评论：评论文字和图片至少填写一项。')
    return { id: asText(row.id), momentId, authorId, replyToCommentId: asText(row.replyToCommentId), text, imageSrc, order: asNumber(row.order, 0) }
  })
  const initialCommentIds = uniqueIds(wechat.momentComments, 'id', '朋友圈评论')
  const allCommentIds = new Set([...initialCommentIds, ...playerCommentIds, ...interactionCommentIds])
  required(allCommentIds.size === initialCommentIds.size + playerCommentIds.size + interactionCommentIds.size, '朋友圈评论：各类评论 ID 不能重复。')
  for (const item of [...wechat.momentComments, ...story.momentCommentScripts, ...interactionComments]) required(!item.replyToCommentId || allCommentIds.has(item.replyToCommentId), `朋友圈评论：回复的评论 ID ${JSON.stringify(item.replyToCommentId)} 不存在。`)
  content.wechat = wechat
  return { contactIds, groupMap, conversationIds, conversationMap, momentIds, publishScriptIds, commentScriptIds, interactionScriptIds }
}

function convertScripts(reader, story, refs) {
  delete story.conversationScripts; delete story.calls
  const sms = new Map(); const smsSeq = new Set()
  for (const row of reader.rows('短信剧情')) {
    const id = asText(row.smsScriptId); const contactId = asText(row.contactId); const order = asNumber(row.sequence); const side = mapped(SIDE, row.side)
    required(['me', 'them'].includes(side), `短信剧情 ${JSON.stringify(id)}：发送方无效。`); required(!smsSeq.has(`${id}\0${order}`), `短信剧情 ${JSON.stringify(id)}：消息序号重复。`); smsSeq.add(`${id}\0${order}`)
    if (!sms.has(id)) sms.set(id, { id, contactId, messages: [] })
    required(sms.get(id).contactId === contactId, `短信剧情 ${JSON.stringify(id)}：联系人 ID 必须保持一致。`)
    sms.get(id).messages.push(side === 'me' ? { order, side, text: asText(row.text), keystrokes: asText(row.keystrokes) } : { order, side, text: asText(row.text), afterMs: secondsToMs(row.afterMs, 1.2) })
  }
  story.smsScripts = [...sms.values()].map((script) => ({ ...script, messages: script.messages.sort(byOrder).map(({ order, ...message }) => message) }))
  const smsScriptIds = uniqueIds(story.smsScripts, 'id', '短信剧情')
  for (const script of story.smsScripts) required(refs.phoneContactIds.has(script.contactId), `短信剧情 ${JSON.stringify(script.id)}：联系人 ID 不存在。`)

  const wx = new Map(); const wxSeq = new Set()
  for (const row of reader.rows('微信剧情')) {
    const id = asText(row.wechatScriptId); const conversationId = asText(row.conversationId); const order = asNumber(row.sequence, 0); const senderId = asText(row.senderId); const type = mapped(MESSAGE_TYPE, row.type)
    required(refs.conversationIds.has(conversationId), `微信剧情 ${JSON.stringify(id)}：会话 ID 不存在。`); required(!wxSeq.has(`${id}\0${order}`), `微信剧情 ${JSON.stringify(id)}：消息序号重复。`); wxSeq.add(`${id}\0${order}`)
    if (!wx.has(id)) wx.set(id, { id, conversationId, messages: [] }); required(wx.get(id).conversationId === conversationId, `微信剧情 ${JSON.stringify(id)}：会话 ID 必须保持一致。`)
    required(senderId === SELF || refs.wechatContactIds.has(senderId), `微信剧情 ${JSON.stringify(id)}：发送人不存在。`)
    const conversation = refs.conversationMap.get(conversationId)
    required(conversation.type === 'direct' ? [SELF, conversation.targetId].includes(senderId) : refs.groupMap.get(conversation.targetId).memberIds.includes(senderId), `微信剧情 ${JSON.stringify(id)}：发送人不属于会话。`)
    required(['text', 'image', 'sticker', 'location'].includes(type), `微信剧情 ${JSON.stringify(id)}：消息类型无效。`)
    const text = asText(row.text); const mediaSrc = asText(row.mediaSrc); const mapLocationId = asText(row.mapLocationId)
    required(type !== 'text' || text, `微信剧情 ${JSON.stringify(id)}：文字消息不能为空。`); required(!['image', 'sticker', 'location'].includes(type) || mediaSrc, `微信剧情 ${JSON.stringify(id)}：必须填写素材路径。`)
    required(type !== 'location' || (senderId !== SELF && mapLocationId && refs.mapLocationIds.has(mapLocationId)), `微信剧情 ${JSON.stringify(id)}：定位消息配置不正确。`); required(type === 'location' || !mapLocationId, `微信剧情 ${JSON.stringify(id)}：只有定位消息可以填写地图地点 ID。`)
    const message = { order, senderId, type, text, mediaSrc }
    if (type === 'location') message.mapLocationId = mapLocationId
    if (senderId === SELF) message.keystrokes = asText(row.keystrokes); else message.afterMs = secondsToMs(row.afterMs, 1.2)
    wx.get(id).messages.push(message)
  }
  story.wechatScripts = [...wx.values()].map((script) => ({ ...script, messages: script.messages.sort(byOrder).map(({ order, ...message }) => message) }))
  const wechatScriptIds = uniqueIds(story.wechatScripts, 'id', '微信剧情')
  return { smsScriptIds, wechatScriptIds }
}

function convertCallsAndEvents(reader, story, refs) {
  story.phoneDialogues = reader.rows('电话剧情').map((row) => {
    const id = asText(row.dialogueId); const direction = mapped(DIALOGUE_DIRECTION, row.direction)
    required(id && ['incoming', 'outgoing', 'any'].includes(direction), '电话剧情：对白 ID 或方向无效。')
    return { id, contactId: asText(row.contactId), direction, hangupAfterMs: secondsToMs(row.hangupAfterMs, 3), conversation: [] }
  })
  const dialogueIds = uniqueIds(story.phoneDialogues, 'id', '电话剧情'); const dialogues = new Map(story.phoneDialogues.map((item) => [item.id, item])); const dialogueSeq = new Set()
  for (const row of reader.rows('电话剧情内容')) {
    const id = asText(row.dialogueId); const order = asNumber(row.sequence); const side = mapped(SIDE, row.side)
    required(dialogues.has(id), `电话剧情内容：对白 ID ${JSON.stringify(id)} 不存在。`); required(!dialogueSeq.has(`${id}\0${order}`), `电话剧情内容 ${JSON.stringify(id)}：对白序号重复。`); dialogueSeq.add(`${id}\0${order}`); required(['me', 'them'].includes(side), '电话剧情内容：说话方无效。')
    dialogues.get(id).conversation.push({ order, side, text: asText(row.text), afterMs: secondsToMs(row.afterMs, 1.2) })
  }
  for (const item of story.phoneDialogues) { required(refs.phoneContactIds.has(item.contactId) && item.conversation.length, `电话剧情 ${JSON.stringify(item.id)}：联系人不存在或没有对白。`); item.conversation = item.conversation.sort(byOrder).map(({ order, ...line }) => line) }

  story.outgoingCallRules = reader.has('主动通话规则') ? reader.rows('主动通话规则').map((row) => {
    const contactId = asText(row.contactId); const order = asNumber(row.order); const conditions = []; const state = mapped(EVENT_STATE, row.eventState)
    if (asText(row.eventId) && state !== 'any') conditions.push({ order: 0, type: 'event-state', targetId: asText(row.eventId), value: state })
    return { id: asText(row.ruleId) || `${contactId}-rule-${order}`, contactId, order, minDialCount: asNumber(row.minDialCount, 0), maxDialCount: asNumber(row.maxDialCount, 0), answer: asBool(row.answer), dialogueId: asText(row.dialogueId), ringMs: secondsToMs(row.ringMs, 6.5), connectAfterMs: secondsToMs(row.connectAfterMs, 1.2), conditions }
  }) : []
  const ruleIds = uniqueIds(story.outgoingCallRules, 'id', '主动通话规则'); const ruleMap = new Map(story.outgoingCallRules.map((item) => [item.id, item])); const conditionSeq = new Set()
  if (reader.has('主动通话条件')) for (const row of reader.rows('主动通话条件')) {
    const id = asText(row.ruleId); const order = asNumber(row.sequence); const type = mapped(CONDITION_TYPE, row.conditionType); const raw = asText(row.conditionValue); const value = type === 'event-state' ? mapped(EVENT_STATE, raw) : type === 'event-outcome' ? mapped(CONDITION_OUTCOME, raw) : raw
    required(ruleIds.has(id), `主动通话条件：规则 ID ${JSON.stringify(id)} 不存在。`); required(!conditionSeq.has(`${id}\0${order}`), `主动通话条件 ${JSON.stringify(id)}：条件序号重复。`); conditionSeq.add(`${id}\0${order}`)
    ruleMap.get(id).conditions.push({ order, type, targetId: asText(row.targetId), value })
  }
  for (const rule of story.outgoingCallRules) rule.conditions = rule.conditions.sort(byOrder).map(({ order, ...condition }) => condition)
  story.outgoingCallRules.sort((a, b) => a.contactId.localeCompare(b.contactId) || a.order - b.order)

  const branchRows = reader.has('剧情分支') ? reader.rows('剧情分支') : []; uniqueIds(branchRows, 'id', '剧情分支'); const branches = new Map(branchRows.map((item) => [item.id, item]))
  story.events = reader.rows('剧情事件').map((row) => {
    const id = asText(row.id); const branch = branches.get(id) || {}; const trigger = { type: mapped(TRIGGER_TYPE, row.triggerType) }
    if (row.afterMs !== '') trigger.afterMs = secondsToMs(row.afterMs)
    const triggerAction = mapped(TRIGGER_ACTION, row.triggerAction); if (triggerAction) trigger.action = triggerAction
    if (row.triggerAppId) trigger.appId = asText(row.triggerAppId); if (row.targetId) trigger.targetId = asText(row.targetId)
    const actionType = mapped(ACTION_TYPE, row.actionType); required(['call', 'sms-script', 'wechat-script', 'moment-publish', 'moment-comment', 'moment-interactions', 'none'].includes(actionType), `剧情事件 ${JSON.stringify(id)}：发生内容无效。`)
    const action = { type: actionType }
    for (const key of ['smsScriptId', 'wechatScriptId', 'publishScriptId', 'commentScriptId', 'interactionScriptId', 'dialogueId']) if (row[key]) action[key] = asText(row[key])
    if (row.timeoutMs !== '') action.timeoutMs = secondsToMs(row.timeoutMs)
    const retryEnabled = asBool(branch.retryEnabled)
    return { id, initialActive: asBool(row.initialActive), trigger, action, nextByOutcome: { completed: asText(branch.completedNext), accepted: branch.acceptedNext || '', rejected: branch.rejectedNext || '', missed: branch.missedNext || '' }, retry: { enabled: retryEnabled, afterMs: secondsToMs(branch.retryAfterMs, 30), outcomes: retryEnabled ? retryOutcomes(branch.retryOutcomes, id) : [] } }
  })
  const eventIds = uniqueIds(story.events, 'id', '剧情事件')
  for (const rule of story.outgoingCallRules) {
    required(refs.phoneContactIds.has(rule.contactId), `主动通话规则：联系人 ID ${JSON.stringify(rule.contactId)} 不存在。`)
    for (const condition of rule.conditions) { required(['event-state', 'event-outcome'].includes(condition.type) && eventIds.has(condition.targetId), `主动通话条件 ${JSON.stringify(rule.id)}：类型或对象无效。`); required(condition.type !== 'event-state' || ['not-triggered', 'in-progress', 'completed'].includes(condition.value), `主动通话条件 ${JSON.stringify(rule.id)}：事件状态无效。`); required(condition.type !== 'event-outcome' || ['accepted', 'rejected', 'missed', 'completed'].includes(condition.value), `主动通话条件 ${JSON.stringify(rule.id)}：事件结果无效。`) }
    required(!rule.answer || rule.dialogueId, `主动通话规则 ${JSON.stringify(rule.contactId)}：对方接听时必须填写电话对白 ID。`)
    if (rule.dialogueId) { const dialogue = dialogues.get(rule.dialogueId); required(dialogue && dialogue.contactId === rule.contactId && ['outgoing', 'any'].includes(dialogue.direction), `主动通话规则 ${JSON.stringify(rule.contactId)}：电话对白不匹配。`) }
  }
  for (const event of story.events) {
    const action = event.action
    if (action.type === 'call') required(action.dialogueId && dialogues.has(action.dialogueId) && ['incoming', 'any'].includes(dialogues.get(action.dialogueId).direction), `剧情事件 ${JSON.stringify(event.id)}：来电对白无效。`)
    for (const [type, key, ids, label] of [['sms-script', 'smsScriptId', refs.smsScriptIds, '短信剧情'], ['wechat-script', 'wechatScriptId', refs.wechatScriptIds, '微信剧情'], ['moment-publish', 'publishScriptId', refs.publishScriptIds, '朋友圈发布剧情'], ['moment-comment', 'commentScriptId', refs.commentScriptIds, '朋友圈玩家评论剧情'], ['moment-interactions', 'interactionScriptId', refs.interactionScriptIds, '朋友圈互动剧情']]) {
      required(action.type !== type || (action[key] && ids.has(action[key])), `剧情事件 ${JSON.stringify(event.id)}：${label} ID 无效。`)
      required(!action[key] || ids.has(action[key]), `剧情事件 ${JSON.stringify(event.id)}：${label} ID 不存在。`)
    }
    required(!event.trigger.appId || refs.appIds.has(event.trigger.appId), `剧情事件 ${JSON.stringify(event.id)}：操作应用 ID 不存在。`)
    const contactActions = new Set(['outgoing-call', 'outgoing-call-accepted', 'outgoing-call-missed', 'incoming-call-accepted', 'incoming-call-rejected', 'incoming-call-missed', 'call-ended'])
    required(!contactActions.has(event.trigger.action) || !event.trigger.targetId || refs.phoneContactIds.has(event.trigger.targetId), `剧情事件 ${JSON.stringify(event.id)}：触发对象不是有效联系人。`)
    if (event.trigger.action === 'message-input' && event.trigger.targetId) required((event.trigger.appId === 'wechat' ? refs.conversationIds : refs.phoneContactIds).has(event.trigger.targetId), `剧情事件 ${JSON.stringify(event.id)}：触发对象与聊天应用不匹配。`)
    for (const nextId of Object.values(event.nextByOutcome)) required(!nextId || eventIds.has(nextId), `剧情事件 ${JSON.stringify(event.id)}：后续事件 ID ${JSON.stringify(nextId)} 不存在。`)
  }
}

export function convertWorkbook(reader, { baseContent, baseStory }) {
  const content = deepClone(baseContent)
  const story = deepClone(baseStory)
  convertBasics(reader, content, story)
  const common = convertCommonContent(reader, content)
  const wechat = convertWechat(reader, content, story, common.mapLocationIds)
  const scripts = convertScripts(reader, story, { phoneContactIds: common.contactIds, wechatContactIds: wechat.contactIds, conversationIds: wechat.conversationIds, conversationMap: wechat.conversationMap, groupMap: wechat.groupMap, mapLocationIds: common.mapLocationIds })
  convertCallsAndEvents(reader, story, { appIds: common.appIds, phoneContactIds: common.contactIds, conversationIds: wechat.conversationIds, ...wechat, ...scripts })
  return { content, story }
}
