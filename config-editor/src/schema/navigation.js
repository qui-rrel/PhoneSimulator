const directory = (id, label, types, extra = {}) => ({ id, label, types, ...extra })

export const sectionDirectories = {
  basics: [directory('basics-all', '基础设置', ['basic-device', 'basic-owner', 'basic-theme', 'basic-weather', 'basic-home'])],
  content: [
    directory('content-apps', '桌面应用', ['app']),
    directory('content-gallery', '相册照片', ['gallery']),
    directory('content-notes', '备忘录', ['note']),
    directory('content-alarms', '闹钟', ['alarm']),
    directory('content-music', '音乐', ['playlist']),
    directory('content-browser', '浏览与搜索记录', ['browser-history', 'xhs-search']),
    directory('content-maps', '地图地点', ['map-location']),
  ],
  communication: [
    directory('communication-sms', '短信联系人与记录', ['contact', 'sms-message'], {
      mode: 'linked', parentType: 'contact',
      childGroups: [{ type: 'sms-message', label: '初始短信', groupField: 'sms.contactId' }],
    }),
    directory('communication-calls', '通话记录', ['call-history']),
    directory('communication-notifications', '锁屏通知', ['lock-notification']),
    directory('communication-mail', '邮件', ['mail']),
    directory('communication-calendar', '日历事件', ['calendar-event'], { groupByField: 'calendar.date' }),
  ],
  wechat: [
    directory('wechat-profile', '微信账号', ['wechat-profile']),
    directory('wechat-contacts', '微信联系人', ['wechat-contact']),
    directory('wechat-groups', '微信群聊', ['wechat-group']),
    directory('wechat-conversations', '会话与聊天记录', ['wechat-conversation', 'wechat-message'], {
      mode: 'linked', parentType: 'wechat-conversation',
      childGroups: [{ type: 'wechat-message', label: '初始消息', groupField: 'wxMessage.conversationId' }],
    }),
    directory('wechat-moments', '朋友圈', ['moment', 'moment-like', 'moment-comment'], {
      mode: 'linked', parentType: 'moment',
      childGroups: [
        { type: 'moment-like', label: '点赞', groupField: 'momentLike.momentId' },
        { type: 'moment-comment', label: '评论与回复', groupField: 'momentComment.momentId' },
      ],
    }),
  ],
  scripts: [
    directory('scripts-sms', '短信剧情', ['sms-script']),
    directory('scripts-wechat', '微信剧情', ['wechat-script']),
    directory('scripts-phone', '电话对白', ['phone-dialogue']),
    directory('scripts-publish', '朋友圈发布', ['moment-publish-script']),
    directory('scripts-comment', '玩家评论', ['moment-comment-script']),
    directory('scripts-interaction', '联系人互动', ['moment-interaction-script']),
  ],
  story: [directory('story-main', '主线蓝图', [])],
}

export function directoriesForSection(section) {
  const configured = sectionDirectories[section.id] || []
  return configured.map((item) => {
    const resources = section.resources.filter((resource) => item.types.includes(resource.resourceType))
    const parentCount = item.parentType
      ? resources.filter((resource) => resource.resourceType === item.parentType).length
      : resources.length
    const childCount = item.parentType ? resources.length - parentCount : 0
    return {
      ...item,
      count: resources.length,
      countLabel: item.parentType ? `${parentCount} / ${childCount}` : String(resources.length),
      resources,
    }
  })
}

export function directoryForResource(sectionId, resourceType) {
  return (sectionDirectories[sectionId] || []).find((item) => item.types.includes(resourceType)) || null
}
