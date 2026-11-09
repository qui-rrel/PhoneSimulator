const HEADER_ALIASES = {
  '填写值': 'value', '格式': 'type', '系统字段（不要修改）': 'field', '显示顺序': 'order',
  '应用 ID': 'id', '显示名称': 'label', '是否使用': 'enabled', '组件名（不要修改）': 'component',
  '图标路径（可空）': 'iconSrc', '图标名（不要修改）': 'icon', '背景色': 'color',
  '图标色': 'iconColor', '图标色（可空）': 'iconColor', '放在底部栏': 'dock',
  '照片 ID': 'id', '图片路径': 'src', '占位渐变': 'gradient', '显示日期': 'date',
  '备忘录 ID': 'id', '标题': 'title', '列表摘要': 'excerpt', '更新时间': 'updatedAt',
  '正文': 'body', '是否置顶': 'pinned', '闹钟 ID': 'id', '时间': 'time', '标签': 'label',
  '是否开启': 'enabled', '铃声路径（可空）': 'sound', '联系人 ID': 'contactId', '姓名': 'name',
  '头像路径（可空）': 'avatar', '默认头像文字': 'initials', '头像文字': 'initials',
  '头像颜色': 'color', '列表时间': 'time', '未读数量': 'unread', '消息 ID': 'id',
  '发送方': 'side', '消息内容': 'text', '显示时间': 'time', '是否已读': 'read',
  '记录 ID': 'id', '电话剧情 ID': 'dialogueId', '显示姓名': 'name', '方向': 'direction',
  '结果': 'outcome', '通话秒数': 'duration', '歌曲 ID': 'id', '歌曲名': 'title', '歌手': 'artist',
  'MP3 路径（可空）': 'src', '封面路径（可空）': 'cover', '主题颜色': 'color',
  '时长（秒）': 'duration', '网页标题': 'title', '网址': 'url', '搜索记录 ID': 'id',
  '搜索内容': 'text', '跳转链接（可空）': 'url', '通知 ID': 'id', '关联应用 ID': 'appId',
  '通知标题': 'title', '通知内容': 'body', '邮件 ID': 'id', '发件人': 'from', '主题': 'subject',
  '邮件列表摘要': 'preview', '是否未读': 'unread', '事件 ID': 'id', '日期': 'date',
  '事件名称': 'title', '颜色': 'color', '地点 ID': 'id', '地点名称': 'name', '地点类型': 'type',
  '地址': 'address', 'SVG 路径': 'mapSrc', '是否初始收藏': 'favorite', '是否初始最近': 'recent',
  '保存日期（初始收藏填写）': 'savedDate', '短信剧情 ID': 'smsScriptId', '消息序号': 'sequence',
  '键盘按键序列': 'keystrokes', '对方发送延迟（秒）': 'afterMs', '对白 ID': 'dialogueId',
  '电话对白 ID': 'dialogueId',
  '对白方向': 'direction', '对白结束后挂断等待（秒）': 'hangupAfterMs', '对白序号': 'sequence',
  '说话方': 'side', '对白内容': 'text', '出现延迟（秒）': 'afterMs', '出现延迟（毫秒）': 'afterMs',
  '触发方式': 'triggerType', '初始激活': 'initialActive', '触发延迟（秒）': 'afterMs',
  '触发延迟（毫秒）': 'afterMs', '玩家操作': 'triggerAction', '操作应用 ID': 'triggerAppId',
  '操作目标 ID': 'targetId', '触发对象 ID': 'targetId', '发生内容': 'actionType',
  '无人接听超时（秒）': 'timeoutMs', '无人接听超时（毫秒）': 'timeoutMs',
  '接听后事件 ID': 'acceptedNext', '拒接后事件 ID': 'rejectedNext', '未接后事件 ID': 'missedNext',
  '完成后事件 ID': 'completedNext', '线性模式是否重试': 'retryEnabled',
  '重试等待（秒）': 'retryAfterMs', '重试等待（毫秒）': 'retryAfterMs',
  '哪些结果需要重试（每项一行）': 'retryOutcomes', '规则序号': 'order',
  '条件剧情事件 ID': 'eventId', '剧情事件状态': 'eventState', '起始拨打次数': 'minDialCount',
  '结束拨打次数': 'maxDialCount', '对方是否接听': 'answer', '振铃时长（秒）': 'ringMs',
  '振铃时长（毫秒）': 'ringMs', '接通等待（秒）': 'connectAfterMs',
  '接通等待（毫秒）': 'connectAfterMs', '主动通话对白 ID': 'dialogueId', '规则 ID': 'ruleId',
  '条件序号': 'sequence', '条件类型': 'conditionType', '条件对象 ID': 'targetId', '条件值': 'conditionValue',
  '微信昵称': 'nickname', '微信号': 'wechatId', '朋友圈封面路径（可空）': 'momentsCover',
  '微信联系人 ID': 'contactId', '备注名（可空）': 'remark', '群聊 ID': 'groupId', '群聊名称': 'name',
  '成员序号': 'order', '会话 ID': 'conversationId', '会话类型': 'type', '会话目标 ID': 'targetId',
  '会话序号': 'order', '消息类型': 'type', '发送人 ID': 'senderId',
  '图片或表情路径（可空）': 'mediaSrc', '地图地点 ID（定位填写）': 'mapLocationId',
  '是否接通（可空）': 'connected', '通话时长（秒，可空）': 'duration', '朋友圈 ID': 'momentId',
  '发布人 ID': 'authorId', '朋友圈正文（可空）': 'text', '朋友圈图片（可空）': 'imageSrc',
  '朋友圈图片路径（每项一行，最多 9 张，可空）': 'imageSrc', '是否初始显示': 'initiallyVisible',
  '点赞人 ID': 'contactId', '评论 ID': 'id', '评论人 ID': 'authorId',
  '回复对象 ID（可空）': 'replyToCommentId', '回复的评论 ID（可空）': 'replyToCommentId',
  '评论内容（可空）': 'text', '评论图片路径（可空）': 'imageSrc', '微信剧情 ID': 'wechatScriptId',
  '发布剧情 ID': 'publishScriptId', '生成的朋友圈 ID': 'momentId', '发布正文（可空）': 'text',
  '发布时间（可空）': 'time', '玩家评论剧情 ID': 'commentScriptId', '生成的评论 ID': 'commentId',
  '互动剧情 ID': 'interactionScriptId', '互动类型': 'type', '互动人 ID（可空）': 'actorId',
  '互动延迟（秒）': 'afterMs', '是否生成朋友圈消息': 'notify',
  '朋友圈消息文案（可空）': 'notificationText',
}

export const EXPECTED_HEADERS = {
  '基础设置': ['field', 'value'], '桌面应用': ['id', 'label', 'component'], '相册': ['id', 'src'],
  '备忘录': ['id', 'title', 'body'], '闹钟': ['id', 'time', 'enabled'],
  '联系人': ['contactId', 'name', 'unread'], '短信记录': ['contactId', 'id', 'text'],
  '通话记录': ['id', 'contactId'], '音乐': ['id', 'title'], '浏览记录': ['id', 'title', 'url'],
  '小红书搜索记录': ['id', 'text', 'url'], '锁屏通知': ['id', 'appId', 'body'],
  '邮件': ['id', 'from', 'subject'], '日历': ['id', 'date', 'title'],
  '地图地点': ['id', 'name', 'type', 'address', 'mapSrc'],
  '短信剧情': ['smsScriptId', 'contactId', 'sequence', 'side', 'text'],
  '电话剧情': ['dialogueId', 'direction', 'contactId', 'hangupAfterMs'],
  '电话剧情内容': ['dialogueId', 'sequence', 'side', 'text'],
  '剧情事件': ['id', 'triggerType', 'actionType'], '剧情分支': ['id', 'retryEnabled'],
  '主动通话规则': ['contactId', 'order', 'answer'],
  '主动通话条件': ['ruleId', 'sequence', 'conditionType', 'targetId', 'conditionValue'],
  '微信账号': ['nickname', 'wechatId'], '微信联系人': ['contactId', 'nickname'],
  '微信群聊': ['groupId', 'name'], '微信群成员': ['groupId', 'contactId', 'order'],
  '微信会话': ['conversationId', 'type', 'targetId', 'pinned'],
  '微信消息': ['conversationId', 'id', 'sequence', 'senderId', 'type'],
  '朋友圈': ['momentId', 'authorId', 'order'], '朋友圈点赞': ['momentId', 'contactId', 'order'],
  '朋友圈评论': ['id', 'momentId', 'authorId', 'order'],
  '微信剧情': ['wechatScriptId', 'conversationId', 'sequence', 'senderId', 'type'],
  '朋友圈发布剧情': ['publishScriptId', 'momentId'],
  '朋友圈玩家评论剧情': ['commentScriptId', 'commentId', 'momentId'],
  '朋友圈互动剧情': ['interactionScriptId', 'sequence', 'type', 'momentId'],
}

const SHEET_ALIASES = { '短信记录': ['短信记录', '聊天记录'], '短信剧情': ['短信剧情', '聊天剧情'] }

function normalizeHeader(header) {
  const label = String(header ?? '').trim()
  const lines = label.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const possibleField = lines.length > 1 ? lines.at(-1) : ''
  const fieldName = /^[A-Za-z][A-Za-z0-9_.]*$/.test(possibleField) ? possibleField : ''
  const chineseLabel = lines[0] || ''
  const baseLabel = chineseLabel.replace(/[，,]可空(?=）)/g, '').replace('（可空）', '')
  return fieldName || HEADER_ALIASES[chineseLabel] || HEADER_ALIASES[baseLabel] || chineseLabel
}

export function createWorkbookReader(sheets) {
  const sheetMap = new Map(sheets.map((item) => [item.sheet, item.data]))
  return {
    has(sheetName) {
      return (SHEET_ALIASES[sheetName] || [sheetName]).some((name) => sheetMap.has(name))
    },
    names() {
      return [...sheetMap.keys()]
    },
    rows(sheetName) {
      const actualName = (SHEET_ALIASES[sheetName] || [sheetName]).find((name) => sheetMap.has(name))
      if (!actualName) return []
      const data = sheetMap.get(actualName)
      const required = EXPECTED_HEADERS[sheetName]
      let headerIndex = -1
      let headers = []
      for (let index = 0; index < Math.min(data.length, 10); index += 1) {
        const normalized = (data[index] || []).map(normalizeHeader)
        if (required.every((field) => normalized.includes(field))) {
          headerIndex = index
          headers = normalized
          break
        }
      }
      if (headerIndex < 0) {
        throw new Error(`${sheetName}：未找到可识别的表头，请不要修改表头中的英文字段名。`)
      }
      return data.slice(headerIndex + 1).map((values, offset) => {
        const record = { __sheet: sheetName, __row: headerIndex + offset + 2 }
        headers.forEach((header, index) => {
          if (header) record[header] = values?.[index] ?? ''
        })
        return record
      }).filter((record) => Object.entries(record).some(([key, value]) => !key.startsWith('__') && value !== ''))
    },
  }
}
