const field = (key, labelZh, type = 'string', extra = {}) => ({
  key, labelZh, labelEn: extra.labelEn || key.split('.').at(-1), type,
  default: extra.default ?? (type === 'boolean' ? false : type === 'list' ? [] : ['int', 'number', 'seconds'].includes(type) ? 0 : ''),
  ...extra,
})

const collection = (label, collectionPath, fields, extra = {}) => ({
  label, collectionPath, fields, fieldKeys: fields.filter((item) => !item.editorManaged).map((item) => item.key),
  allowCreate: true, mutable: true, ...extra,
})

const appComponents = [
  'MessagesApp', 'PhoneApp', 'WechatApp', 'MapApp', 'XiaohongshuApp', 'MusicApp',
  'BrowserApp', 'PhotosApp', 'NotesApp', 'MailApp', 'CalendarApp', 'WeatherApp',
  'ClockApp', 'CalculatorApp', 'SettingsApp',
].map((value) => ({ value, labelZh: value.replace(/App$/, ''), labelEn: value }))

export const ordinaryResourceSchemas = {
  app: collection('桌面应用', 'apps', [
    field('app.id', '应用 ID', 'string', { required: true, runtimePath: 'id' }),
    field('app.label', '显示名称', 'string', { required: true, runtimePath: 'label' }),
    field('app.enabled', '是否使用', 'boolean', { default: true, runtimePath: 'enabled' }),
    field('app.component', '应用组件', 'enum', { required: true, runtimePath: 'component', options: appComponents }),
    field('app.iconSrc', '图标路径', 'media path', { runtimePath: 'iconSrc', placeholder: '/media/文件名.后缀' }),
    field('app.dock', '放在底部栏', 'boolean', { runtimePath: 'dock' }),
  ], { sectionId: 'content', idField: 'app.id', titleField: 'app.label', description: '桌面显示的应用入口及顺序', orderHint: '决定桌面应用的显示顺序。底部栏应用和桌面网格应用会分别保留它们在此表中的相对顺序。' }),
  gallery: collection('相册照片', 'gallery', [
    field('gallery.id', '照片 ID', 'string', { required: true, runtimePath: 'id' }),
    field('gallery.src', '图片路径', 'media path', { required: true, runtimePath: 'src', placeholder: '/media/文件名.后缀' }),
    field('gallery.gradient', '占位渐变', 'string', { runtimePath: 'gradient' }),
    field('gallery.date', '显示日期', 'string', { runtimePath: 'date', placeholder: 'LOCAL_TIME 或显示文字' }),
  ], { sectionId: 'content', idField: 'gallery.id', titleField: 'gallery.id', description: '照片应用中的图片', orderHint: '决定相册网格的照片顺序，也决定查看大图时上一张和下一张的顺序。' }),
  note: collection('备忘录', 'notes', [
    field('note.id', '备忘录 ID', 'string', { required: true, runtimePath: 'id' }),
    field('note.title', '标题', 'string', { required: true, runtimePath: 'title' }),
    field('note.excerpt', '列表摘要', 'string', { runtimePath: 'excerpt' }),
    field('note.updatedAt', '更新时间', 'string', { runtimePath: 'updatedAt', placeholder: 'LOCAL_TIME 或显示文字' }),
    field('note.body', '正文', 'multiline string', { required: true, runtimePath: 'body' }),
    field('note.pinned', '是否置顶', 'boolean', { runtimePath: 'pinned' }),
  ], { sectionId: 'content', idField: 'note.id', titleField: 'note.title', description: '备忘录列表和正文', orderHint: '只决定多个置顶备忘录之间的先后。未置顶备忘录仍按更新时间从新到旧排列。' }),
  alarm: collection('闹钟', 'alarms', [
    field('alarm.id', '闹钟 ID', 'string', { required: true, runtimePath: 'id' }),
    field('alarm.time', '时间', 'time', { required: true, runtimePath: 'time', placeholder: 'HH:MM' }),
    field('alarm.label', '标签', 'string', { runtimePath: 'label' }),
    field('alarm.enabled', '是否开启', 'boolean', { runtimePath: 'enabled' }),
    field('alarm.sound', '铃声路径', 'media path', { runtimePath: 'sound', placeholder: '/media/文件名.后缀' }),
  ], { sectionId: 'content', idField: 'alarm.id', titleField: 'alarm.label', description: '时钟应用中的闹钟', orderHint: '决定闹钟列表从上到下的显示顺序。' }),
  playlist: collection('音乐', 'playlist', [
    field('playlist.id', '歌曲 ID', 'string', { required: true, runtimePath: 'id' }),
    field('playlist.title', '歌曲名', 'string', { required: true, runtimePath: 'title' }),
    field('playlist.artist', '歌手', 'string', { runtimePath: 'artist' }),
    field('playlist.src', 'MP3 路径', 'media path', { runtimePath: 'src', placeholder: '/media/文件名.mp3' }),
    field('playlist.cover', '封面路径', 'media path', { runtimePath: 'cover', placeholder: '/media/文件名.后缀' }),
    field('playlist.color', '主题颜色', 'color', { runtimePath: 'color', default: '#666666' }),
    field('playlist.duration', '时长', 'seconds', { runtimePath: 'duration', min: 0, step: 1 }),
  ], { sectionId: 'content', idField: 'playlist.id', titleField: 'playlist.title', description: '音乐应用中的歌曲', orderHint: '决定歌曲列表顺序，也是顺序播放以及上一首、下一首使用的顺序。' }),
  'browser-history': collection('浏览记录', 'browserHistory', [
    field('browser.id', '记录 ID', 'string', { required: true, runtimePath: 'id' }),
    field('browser.title', '网页标题', 'string', { required: true, runtimePath: 'title' }),
    field('browser.url', '网址', 'string', { required: true, runtimePath: 'url', placeholder: 'https://...' }),
    field('browser.time', '显示时间', 'string', { runtimePath: 'time', placeholder: 'LOCAL_TIME 或显示文字' }),
  ], { sectionId: 'content', idField: 'browser.id', titleField: 'browser.title', description: '浏览器历史记录', orderHint: '决定浏览记录从上到下的显示顺序。' }),
  'xhs-search': collection('小红书搜索记录', 'xiaohongshu.searchHistory', [
    field('xhs.id', '记录 ID', 'string', { required: true, runtimePath: 'id' }),
    field('xhs.text', '搜索内容', 'string', { required: true, runtimePath: 'text' }),
    field('xhs.url', '跳转链接', 'string', { runtimePath: 'url', placeholder: 'https://...' }),
  ], { sectionId: 'content', idField: 'xhs.id', titleField: 'xhs.text', description: '小红书搜索页显示的历史记录', orderHint: '决定小红书搜索历史从前到后的显示顺序。' }),
  contact: collection('短信联系人', 'contacts', [
    field('contact.id', '联系人 ID', 'string', { required: true, runtimePath: 'id' }),
    field('contact.name', '姓名', 'string', { required: true, runtimePath: 'name' }),
    field('contact.avatar', '头像路径', 'media path', { runtimePath: 'avatar', placeholder: '/media/文件名.后缀' }),
    field('contact.initials', '头像文字', 'string', { runtimePath: 'initials' }),
    field('contact.color', '头像颜色', 'color', { runtimePath: 'color', default: '#667788' }),
    field('contact.time', '列表时间', 'string', { runtimePath: 'time', placeholder: 'LOCAL_TIME 或显示文字' }),
    field('contact.unread', '未读数量', 'int', { runtimePath: 'unread', min: 0, step: 1 }),
  ], { sectionId: 'communication', idField: 'contact.id', titleField: 'contact.name', description: '电话和短信使用的联系人', orderHint: '决定信息应用联系人列表从上到下的显示顺序。' }),
  'sms-message': collection('初始短信', 'contacts[].messages', [
    field('sms.id', '消息 ID', 'string', { required: true, runtimePath: 'id' }),
    field('sms.contactId', '联系人', 'reference', { required: true, referenceType: 'contact', runtimePath: 'contactId' }),
    field('sms.side', '发送方', 'enum', { required: true, runtimePath: 'side', default: 'them', options: [{ value: 'me', labelZh: '我', labelEn: 'Me' }, { value: 'them', labelZh: '对方', labelEn: 'Them' }] }),
    field('sms.text', '消息内容', 'multiline string', { required: true, runtimePath: 'text' }),
    field('sms.stamp', '显示时间', 'string', { runtimePath: 'stamp', placeholder: 'LOCAL_TIME 或显示文字' }),
    field('sms.read', '是否已读', 'boolean', { default: true, runtimePath: 'read' }),
  ], { sectionId: 'communication', idField: 'sms.id', titleField: 'sms.text', description: '手机初始存在的短信记录', special: 'contact-messages', orderGroupField: 'sms.contactId', orderHint: '决定同一联系人会话内消息从上到下的初始显示顺序。不同联系人的消息分别排序。' }),
  'call-history': collection('通话记录', 'callHistory', [
    field('callHistory.id', '记录 ID', 'string', { required: true, runtimePath: 'id' }),
    field('callHistory.contactId', '联系人', 'reference', { required: true, referenceType: 'contact', runtimePath: 'contactId' }),
    field('callHistory.direction', '方向', 'enum', { required: true, runtimePath: 'direction', default: 'incoming', options: [{ value: 'incoming', labelZh: '呼入', labelEn: 'Incoming' }, { value: 'outgoing', labelZh: '呼出', labelEn: 'Outgoing' }] }),
    field('callHistory.outcome', '结果', 'enum', { required: true, runtimePath: 'outcome', default: 'missed', options: [{ value: 'accepted', labelZh: '已接听', labelEn: 'Accepted' }, { value: 'rejected', labelZh: '已拒接', labelEn: 'Rejected' }, { value: 'missed', labelZh: '未接听', labelEn: 'Missed' }, { value: 'outgoing', labelZh: '已拨出', labelEn: 'Outgoing' }] }),
    field('callHistory.time', '显示时间', 'string', { runtimePath: 'time', placeholder: 'LOCAL_TIME 或显示文字' }),
    field('callHistory.duration', '通话秒数', 'seconds', { runtimePath: 'duration', min: 0, step: 1 }),
  ], { sectionId: 'communication', idField: 'callHistory.id', titleField: 'callHistory.id', description: '电话应用中的历史记录', orderHint: '决定电话应用最近通话列表从上到下的初始显示顺序。' }),
  'lock-notification': collection('锁屏通知', 'lockNotifications', [
    field('notification.id', '通知 ID', 'string', { required: true, runtimePath: 'id' }),
    field('notification.appId', '关联应用', 'reference', { required: true, referenceType: 'app', runtimePath: 'appId' }),
    field('notification.contactId', '关联联系人', 'reference', { referenceType: 'contact', runtimePath: 'contactId' }),
    field('notification.title', '通知标题', 'string', { runtimePath: 'title' }),
    field('notification.time', '显示时间', 'string', { runtimePath: 'time', placeholder: 'LOCAL_TIME 或显示文字' }),
    field('notification.body', '通知内容', 'multiline string', { required: true, runtimePath: 'body' }),
  ], { sectionId: 'communication', idField: 'notification.id', titleField: 'notification.title', description: '锁屏初始显示的通知', orderHint: '决定锁屏通知卡片从上到下的显示顺序。' }),
  mail: collection('邮件', 'mail', [
    field('mail.id', '邮件 ID', 'string', { required: true, runtimePath: 'id' }),
    field('mail.from', '发件人', 'string', { required: true, runtimePath: 'from' }),
    field('mail.subject', '主题', 'string', { required: true, runtimePath: 'subject' }),
    field('mail.preview', '列表摘要', 'string', { runtimePath: 'preview' }),
    field('mail.time', '显示时间', 'string', { runtimePath: 'time', placeholder: 'LOCAL_TIME 或显示文字' }),
    field('mail.unread', '是否未读', 'boolean', { runtimePath: 'unread' }),
    field('mail.body', '正文', 'multiline string', { runtimePath: 'body' }),
  ], { sectionId: 'communication', idField: 'mail.id', titleField: 'mail.subject', description: '邮件应用中的邮件内容', orderHint: '决定收件箱邮件从上到下的显示顺序。' }),
  'calendar-event': collection('日历事件', 'calendarEvents', [
    field('calendar.id', '事件 ID', 'string', { required: true, runtimePath: 'id' }),
    field('calendar.date', '日期', 'date', { required: true, runtimePath: 'date', placeholder: 'YYYY-MM-DD' }),
    field('calendar.title', '事件名称', 'string', { required: true, runtimePath: 'title' }),
    field('calendar.time', '显示时间', 'string', { runtimePath: 'time', placeholder: 'LOCAL_TIME 或显示文字' }),
    field('calendar.color', '颜色', 'color', { runtimePath: 'color', default: '#5b6df8' }),
  ], { sectionId: 'communication', idField: 'calendar.id', titleField: 'calendar.title', description: '日历应用中的事件', orderGroupField: 'calendar.date', orderHint: '决定同一天存在多个日程时的显示顺序。不同日期的日程分别排序。' }),
  'map-location': collection('地图地点', 'mapLocations', [
    field('map.order', '显示顺序', 'int', { runtimePath: 'order', min: 0, editorManaged: true }),
    field('map.id', '地点 ID', 'string', { required: true, runtimePath: 'id' }),
    field('map.name', '地点名称', 'string', { required: true, runtimePath: 'name' }),
    field('map.type', '地点类型', 'enum', { required: true, runtimePath: 'type', default: 'other', options: [['home', '住宅'], ['work', '工作地点'], ['dining', '餐饮'], ['cafe', '咖啡'], ['shop', '商店'], ['hotel', '酒店'], ['transport', '交通'], ['hospital', '医院'], ['school', '学校'], ['park', '公园'], ['landmark', '景点'], ['dance-studio', '舞蹈室'], ['recording-studio', '录音室'], ['other', '其他']].map(([value, labelZh]) => ({ value, labelZh, labelEn: value })) }),
    field('map.address', '地址', 'string', { required: true, runtimePath: 'address' }),
    field('map.mapSrc', 'SVG 路径', 'media path', { required: true, runtimePath: 'mapSrc', placeholder: '/media/文件名.svg' }),
    field('map.favorite', '初始收藏', 'boolean', { runtimePath: 'favorite' }),
    field('map.recent', '初始最近', 'boolean', { runtimePath: 'recent' }),
    field('map.savedDate', '保存日期', 'date', { runtimePath: 'savedDate', placeholder: 'YYYY-MM-DD', visibleWhen: { path: 'map.favorite', equals: true }, requiredWhen: { path: 'map.favorite', equals: true } }),
  ], { sectionId: 'content', idField: 'map.id', titleField: 'map.name', description: '地图应用和定位消息使用的地点', orderField: 'map.order', orderHint: '决定收藏地点、最近地点的初始排列顺序，也用于选择默认打开的第一个地点。' }),
  'wechat-profile': {
    label: '微信账号', singletonPath: 'wechat.profile', allowCreate: false, mutable: false, sectionId: 'wechat', description: '玩家自己的微信资料',
    fields: [
      field('wxProfile.nickname', '微信昵称', 'string', { required: true, runtimePath: 'nickname' }),
      field('wxProfile.wechatId', '微信号', 'string', { required: true, runtimePath: 'wechatId' }),
      field('wxProfile.avatar', '头像路径', 'media path', { runtimePath: 'avatar', placeholder: '/media/文件名.后缀' }),
      field('wxProfile.initials', '头像文字', 'string', { runtimePath: 'initials' }),
      field('wxProfile.color', '头像颜色', 'color', { runtimePath: 'color', default: '#667788' }),
      field('wxProfile.momentsCover', '朋友圈封面', 'media path', { runtimePath: 'momentsCover', placeholder: '/media/文件名.后缀' }),
    ], titleField: 'wxProfile.nickname', fieldKeys: [],
  },
  'wechat-contact': collection('微信联系人', 'wechat.contacts', [
    field('wxContact.id', '联系人 ID', 'string', { required: true, runtimePath: 'id' }),
    field('wxContact.nickname', '昵称', 'string', { required: true, runtimePath: 'nickname' }),
    field('wxContact.remark', '备注名', 'string', { runtimePath: 'remark' }),
    field('wxContact.wechatId', '微信号', 'string', { runtimePath: 'wechatId' }),
    field('wxContact.avatar', '头像路径', 'media path', { runtimePath: 'avatar', placeholder: '/media/文件名.后缀' }),
    field('wxContact.initials', '头像文字', 'string', { runtimePath: 'initials' }),
    field('wxContact.color', '头像颜色', 'color', { runtimePath: 'color', default: '#667788' }),
  ], { sectionId: 'wechat', idField: 'wxContact.id', titleField: 'wxContact.remark', fallbackTitleField: 'wxContact.nickname', description: '微信中的单聊联系人' }),
  'wechat-group': collection('微信群聊', 'wechat.groups', [
    field('wxGroup.id', '群聊 ID', 'string', { required: true, runtimePath: 'id' }),
    field('wxGroup.name', '群聊名称', 'string', { required: true, runtimePath: 'name' }),
    field('wxGroup.memberIds', '群成员', 'list', { required: true, runtimePath: 'memberIds', referenceType: 'wechat-contact', description: '每行填写一个微信联系人 ID；玩家自己填写 SELF。' }),
  ], { sectionId: 'wechat', idField: 'wxGroup.id', titleField: 'wxGroup.name', description: '微信群聊及成员' }),
  'wechat-conversation': collection('微信会话', 'wechat.conversations', [
    field('wxConversation.id', '会话 ID', 'string', { required: true, runtimePath: 'id' }),
    field('wxConversation.type', '会话类型', 'enum', { required: true, runtimePath: 'type', default: 'direct', options: [{ value: 'direct', labelZh: '单聊', labelEn: 'Direct' }, { value: 'group', labelZh: '群聊', labelEn: 'Group' }] }),
    field('wxConversation.targetContactId', '单聊联系人', 'reference', { referenceType: 'wechat-contact', runtimePath: 'targetId', visibleWhen: { path: 'wxConversation.type', equals: 'direct' }, requiredWhen: { path: 'wxConversation.type', equals: 'direct' } }),
    field('wxConversation.targetGroupId', '目标群聊', 'reference', { referenceType: 'wechat-group', runtimePath: 'targetId', visibleWhen: { path: 'wxConversation.type', equals: 'group' }, requiredWhen: { path: 'wxConversation.type', equals: 'group' } }),
    field('wxConversation.pinned', '是否置顶', 'boolean', { runtimePath: 'pinned' }),
  ], { sectionId: 'wechat', idField: 'wxConversation.id', titleField: 'wxConversation.id', description: '微信首页显示的会话入口', special: 'conversation-target', orderHint: '微信会话优先按置顶状态和最新消息时间排列；当这些条件相同时，使用此表中的顺序作为稳定的先后顺序。' }),
  'wechat-message': collection('微信初始消息', 'wechat.messages', [
    field('wxMessage.id', '消息 ID', 'string', { required: true, runtimePath: 'id' }),
    field('wxMessage.conversationId', '所属会话', 'reference', { required: true, referenceType: 'wechat-conversation', runtimePath: 'conversationId' }),
    field('wxMessage.order', '消息顺序', 'int', { required: true, runtimePath: 'order', min: 0, editorManaged: true }),
    field('wxMessage.senderId', '发送人', 'reference', { required: true, referenceType: 'wechat-sender', runtimePath: 'senderId' }),
    field('wxMessage.type', '消息类型', 'enum', { required: true, runtimePath: 'type', default: 'text', options: [['text', '文字'], ['image', '图片'], ['sticker', '表情图片'], ['location', '定位'], ['voice-call', '语音通话'], ['video-call', '视频通话']].map(([value, labelZh]) => ({ value, labelZh, labelEn: value })) }),
    field('wxMessage.text', '消息内容', 'multiline string', { runtimePath: 'text', visibleWhen: { path: 'wxMessage.type', equals: 'text' }, requiredWhen: { path: 'wxMessage.type', equals: 'text' } }),
    field('wxMessage.mediaSrc', '图片或表情路径', 'media path', { runtimePath: 'mediaSrc', placeholder: '/media/文件名.后缀', visibleWhen: { path: 'wxMessage.type', in: ['image', 'sticker', 'location'] }, requiredWhen: { path: 'wxMessage.type', in: ['image', 'sticker', 'location'] } }),
    field('wxMessage.mapLocationId', '地图地点', 'reference', { referenceType: 'map-location', runtimePath: 'mapLocationId', visibleWhen: { path: 'wxMessage.type', equals: 'location' }, requiredWhen: { path: 'wxMessage.type', equals: 'location' } }),
    field('wxMessage.connected', '是否接通', 'boolean', { runtimePath: 'connected', visibleWhen: { path: 'wxMessage.type', in: ['voice-call', 'video-call'] } }),
    field('wxMessage.duration', '通话时长', 'seconds', { runtimePath: 'duration', min: 0, visibleWhen: { path: 'wxMessage.connected', equals: true }, requiredWhen: { path: 'wxMessage.connected', equals: true } }),
    field('wxMessage.time', '显示时间', 'string', { runtimePath: 'time', placeholder: 'LOCAL_TIME 或显示文字' }),
    field('wxMessage.read', '是否已读', 'boolean', { default: true, runtimePath: 'read' }),
  ], { sectionId: 'wechat', idField: 'wxMessage.id', titleField: 'wxMessage.text', description: '微信会话中的初始聊天记录', orderField: 'wxMessage.order', orderGroupField: 'wxMessage.conversationId', preserveStorageOrder: true, orderHint: '决定同一个微信会话内消息从上到下的初始显示顺序。不同会话的消息分别排序。' }),
  moment: collection('朋友圈', 'wechat.moments', [
    field('moment.id', '朋友圈 ID', 'string', { required: true, runtimePath: 'id' }),
    field('moment.authorId', '发布人', 'reference', { required: true, referenceType: 'wechat-sender', runtimePath: 'authorId' }),
    field('moment.text', '朋友圈正文', 'multiline string', { runtimePath: 'text' }),
    field('moment.imageSrc', '朋友圈图片', 'list', { runtimePath: 'imageSrc', placeholder: '每行一个 /media/... 路径' }),
    field('moment.time', '发布时间', 'string', { runtimePath: 'time', placeholder: 'LOCAL_TIME 或显示文字' }),
    field('moment.order', '显示顺序', 'int', { required: true, runtimePath: 'order', min: 0, editorManaged: true }),
    field('moment.initiallyVisible', '初始显示', 'boolean', { default: true, runtimePath: 'initiallyVisible' }),
  ], { sectionId: 'wechat', idField: 'moment.id', titleField: 'moment.text', description: '朋友圈初始内容', orderField: 'moment.order', orderDirection: 'descending', storageOrderDirection: 'ascending', orderHint: '决定朋友圈动态从上到下的初始显示顺序。编辑器会自动让越靠上的动态获得越大的 order 值。' }),
  'moment-like': collection('朋友圈点赞', 'wechat.momentLikes', [
    field('momentLike.momentId', '朋友圈', 'reference', { required: true, referenceType: 'moment', runtimePath: 'momentId' }),
    field('momentLike.contactId', '点赞人', 'reference', { required: true, referenceType: 'wechat-sender', runtimePath: 'contactId' }),
    field('momentLike.order', '显示顺序', 'int', { required: true, runtimePath: 'order', min: 0, editorManaged: true }),
  ], { sectionId: 'wechat', titleField: 'momentLike.contactId', description: '朋友圈初始点赞', orderField: 'momentLike.order', orderGroupField: 'momentLike.momentId', preserveStorageOrder: true, orderHint: '决定同一条朋友圈中点赞人的显示顺序。不同朋友圈的点赞分别排序。' }),
  'moment-comment': collection('朋友圈评论', 'wechat.momentComments', [
    field('momentComment.id', '评论 ID', 'string', { required: true, runtimePath: 'id' }),
    field('momentComment.momentId', '朋友圈', 'reference', { required: true, referenceType: 'moment', runtimePath: 'momentId' }),
    field('momentComment.authorId', '评论人', 'reference', { required: true, referenceType: 'wechat-sender', runtimePath: 'authorId' }),
    field('momentComment.replyToCommentId', '回复评论', 'reference', { referenceType: 'moment-comment', runtimePath: 'replyToCommentId' }),
    field('momentComment.text', '评论内容', 'multiline string', { runtimePath: 'text' }),
    field('momentComment.imageSrc', '评论图片', 'media path', { runtimePath: 'imageSrc', placeholder: '/media/文件名.后缀' }),
    field('momentComment.order', '显示顺序', 'int', { required: true, runtimePath: 'order', min: 0, editorManaged: true }),
  ], { sectionId: 'wechat', idField: 'momentComment.id', titleField: 'momentComment.text', description: '朋友圈初始评论', orderField: 'momentComment.order', orderGroupField: 'momentComment.momentId', preserveStorageOrder: true, orderHint: '决定同一条朋友圈下评论从上到下的显示顺序。不同朋友圈的评论分别排序。' }),
}

ordinaryResourceSchemas['wechat-profile'].fieldKeys = ordinaryResourceSchemas['wechat-profile'].fields.map((item) => item.key)

export const ordinaryFieldDefinitions = Object.fromEntries(
  Object.values(ordinaryResourceSchemas).flatMap((schema) => schema.fields.map((item) => [item.key, item])),
)

export const resourceSchemas = {
  'basic-device': { label: '页面与设备', fieldKeys: ['site.title', 'device.width', 'device.height', 'device.radius', 'device.fixedDate', 'device.initialBatteryLevel', 'device.batteryDrainIntervalSeconds', 'device.powerOffDelaySeconds'] },
  'basic-owner': { label: '手机主人', fieldKeys: ['owner.name', 'owner.signature', 'owner.wifiName', 'security.passcode'] },
  'basic-theme': { label: '主题与壁纸', fieldKeys: ['theme.accent', 'theme.lockWallpaper', 'theme.homeWallpaper', 'theme.wallpaperOverlay'] },
  'basic-weather': { label: '天气', fieldKeys: ['weather.location', 'weather.seed'] },
  'basic-home': { label: '桌面设置', fieldKeys: ['home.showGreetingWidget', 'xiaohongshu.homeImageSrc'] },
  ...ordinaryResourceSchemas,
  'sms-script': { label: '短信剧情', fieldKeys: ['script.name', 'script.messageCount'], description: '按顺序执行的完整短信剧情' },
  'wechat-script': { label: '微信剧情', fieldKeys: ['script.name', 'script.messageCount'] },
  'phone-dialogue': { label: '电话对白', fieldKeys: ['script.name', 'script.messageCount'] },
  'moment-publish-script': { label: '朋友圈发布剧情', fieldKeys: ['script.name', 'script.messageCount'] },
  'moment-comment-script': { label: '朋友圈评论剧情', fieldKeys: ['script.name', 'script.messageCount'] },
  'moment-interaction-script': { label: '朋友圈互动剧情', fieldKeys: ['script.name', 'script.messageCount'] },
}

export function getResourceSchema(type) {
  return resourceSchemas[type] || { label: type, fieldKeys: [] }
}

export function getOrdinaryResourceSchema(type) {
  return ordinaryResourceSchemas[type] || null
}

export function ordinaryTypesForSection(sectionId) {
  return Object.entries(ordinaryResourceSchemas)
    .filter(([, schema]) => schema.sectionId === sectionId && schema.allowCreate)
    .map(([type]) => type)
}
