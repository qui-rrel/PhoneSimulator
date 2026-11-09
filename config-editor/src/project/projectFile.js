import { getNodeType, nodeTypes } from '../schema/nodeTypes.js'
import { getOrdinaryResourceSchema, getResourceSchema, ordinaryResourceSchemas, ordinaryTypesForSection } from '../schema/resources.js'
import { layoutStoryEvents } from '../graph/layout.js'
import { sequenceSchemas } from '../schema/sequences.js'
import { createSequenceEditorResource, sequenceResourceToRuntime } from './sequenceResources.js'

export const PROJECT_FORMAT = 'phonesimulator.visual-project'
export const PROJECT_SCHEMA_VERSION = 2
export const PROJECT_EXTENSION = '.phone-project.json'

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function nowIso() {
  return new Date().toISOString()
}

function millisecondsToSeconds(value) {
  if (value === '' || value === null || value === undefined) return undefined
  return Number(value) / 1000
}

function secondsToMilliseconds(value) {
  if (value === '' || value === null || value === undefined) return undefined
  const milliseconds = Number(value) * 1000
  return Number.isInteger(milliseconds) ? milliseconds : Number(milliseconds.toFixed(6))
}

function emptyRuntimeStory() {
  return {
    smsScripts: [], wechatScripts: [], momentPublishScripts: [], momentCommentScripts: [],
    momentInteractionScripts: [], phoneDialogues: [], outgoingCallRules: [], events: [],
  }
}

export function createDefaultProjectDocument(name = '示例项目', { empty = false } = {}) {
  const timestamp = nowIso()
  const content = {
    site: { title: 'PhoneSimulator' },
    device: { initialBatteryLevel: 86 },
    weather: { seed: 20261108 },
    owner: { name: empty ? '' : '林然' },
    theme: { accent: '#6f8fe8' },
    contacts: empty ? [] : [
      { id: 'contact-chen', name: '陈默', avatar: '/media/avatar-chen.jpg', initials: '', color: '', time: '', unread: 0, messages: [] },
      { id: 'contact-lin', name: '林然', avatar: '/media/avatar-lin.jpg', initials: '', color: '', time: '', unread: 0, messages: [] },
    ],
  }
  const story = emptyRuntimeStory()
  const graphNodes = {}
  const editorResources = {}

  if (!empty) {
    story.wechatScripts.push({ id: 'wx-airport', conversationId: '', messages: [] })
    story.phoneDialogues.push({
      id: 'call-chen-2', contactId: 'contact-chen', direction: 'incoming',
      hangupAfterMs: 3000, conversation: [],
    })
    story.events = [
      {
        id: 'event-start', initialActive: true,
        trigger: { type: 'timer', afterMs: 3000 }, action: { type: 'none' },
        nextByOutcome: { completed: 'event-message', accepted: '', rejected: '', missed: '' },
        retry: { enabled: false, afterMs: 30000, outcomes: [] },
      },
      {
        id: 'event-message', initialActive: false,
        trigger: { type: 'operation', action: 'content-open', appId: 'wechat', targetId: 'contact-lin' },
        action: { type: 'wechat-script', wechatScriptId: 'wx-airport' },
        nextByOutcome: { completed: 'event-call-chen', accepted: '', rejected: '', missed: '' },
        retry: { enabled: false, afterMs: 30000, outcomes: [] },
      },
      {
        id: 'event-call-chen', initialActive: false,
        trigger: { type: 'timer', afterMs: 5000 },
        action: { type: 'call', dialogueId: 'call-chen-2', timeoutMs: 15000 },
        nextByOutcome: { completed: '', accepted: 'event-ending-a', rejected: 'event-ending-b', missed: 'event-ending-b' },
        retry: { enabled: false, afterMs: 30000, outcomes: [] },
      },
      {
        id: 'event-ending-a', initialActive: false,
        trigger: { type: 'timer' }, action: { type: 'none' },
        nextByOutcome: { completed: '', accepted: '', rejected: '', missed: '' },
        retry: { enabled: false, afterMs: 30000, outcomes: [] },
      },
      {
        id: 'event-ending-b', initialActive: false,
        trigger: { type: 'timer' }, action: { type: 'none' },
        nextByOutcome: { completed: '', accepted: '', rejected: '', missed: '' },
        retry: { enabled: false, afterMs: 30000, outcomes: [] },
      },
    ]
    Object.assign(graphNodes, {
      'event-start': { x: 100, y: 210, expanded: false, name: '开场等待', type: 'timer' },
      'event-message': { x: 500, y: 160, expanded: true, name: '等待打开微信', type: 'operation' },
      'event-call-chen': { x: 950, y: 145, expanded: true, name: '陈默的来电', type: 'call' },
      'event-ending-a': { x: 1420, y: 90, expanded: false, name: '继续主线', type: 'terminal' },
      'event-ending-b': { x: 1420, y: 430, expanded: false, name: '等待后续操作', type: 'terminal' },
    })
    editorResources['wx-airport'] = { name: '机场重逢', messageCount: 12 }
    editorResources['call-chen-2'] = { name: '陈默 / 第二次来电', messageCount: 8 }
  }

  return {
    format: PROJECT_FORMAT,
    schemaVersion: PROJECT_SCHEMA_VERSION,
    meta: { name, createdAt: timestamp, updatedAt: timestamp },
    content,
    story,
    editor: { graph: { nodes: graphNodes, auxNodes: [], dataEdges: [], groups: [] }, resources: editorResources },
  }
}

export function createProjectFromRuntime({ name, content, story, sourceFileName = '' }) {
  const timestamp = nowIso()
  const nodes = {}
  const events = story?.events || []
  const positions = layoutStoryEvents(events)
  events.forEach((event, index) => {
    const type = inferNodeType(event)
    const position = positions.get(event.id) || { x: 90 + index * 420, y: 100 }
    nodes[event.id] = {
      x: position.x,
      y: position.y,
      expanded: false,
      name: event.id,
      type,
    }
  })
  return {
    format: PROJECT_FORMAT,
    schemaVersion: PROJECT_SCHEMA_VERSION,
    meta: { name, createdAt: timestamp, updatedAt: timestamp, importedAt: timestamp, sourceFileName },
    content: clone(content),
    story: clone(story),
    editor: { graph: { nodes, auxNodes: [], dataEdges: [], groups: [] }, resources: {} },
  }
}

export function parseProjectFile(text) {
  let document
  try {
    document = JSON.parse(text)
  } catch {
    throw new Error('文件不是有效的 JSON，无法作为可视化项目打开。')
  }
  if (document?.format === PROJECT_FORMAT && document.schemaVersion === 1) {
    document = migrateVersion1(document)
  }
  validateProjectDocument(document)
  return clone(document)
}

export function validateProjectDocument(document) {
  if (!document || typeof document !== 'object' || Array.isArray(document)) {
    throw new Error('项目文件内容必须是一个 JSON 对象。')
  }
  if (document.format !== PROJECT_FORMAT) {
    throw new Error('文件格式不正确，请选择 PhoneSimulator 可视化项目文件。')
  }
  if (document.schemaVersion !== PROJECT_SCHEMA_VERSION) {
    throw new Error(`暂不支持 schemaVersion ${document.schemaVersion ?? '（缺失）'}。`)
  }
  if (!document.meta || typeof document.meta.name !== 'string') {
    throw new Error('项目文件缺少作品名称。')
  }
  if (!document.content || typeof document.content !== 'object' || Array.isArray(document.content)) {
    throw new Error('项目文件缺少 content 内容区。')
  }
  if (document.content.contacts && !Array.isArray(document.content.contacts)) {
    throw new Error('项目文件中的联系人列表格式不正确。')
  }
  if (!document.story || !Array.isArray(document.story.events)) {
    throw new Error('项目文件缺少剧情事件数据。')
  }
  if (!document.editor?.graph?.nodes || typeof document.editor.graph.nodes !== 'object') {
    throw new Error('项目文件缺少蓝图布局数据。')
  }
  const ids = new Set()
  for (const event of document.story.events) {
    if (!event || typeof event.id !== 'string' || !event.id.trim()) {
      throw new Error('剧情事件中存在缺少 ID 的节点。')
    }
    if (ids.has(event.id)) throw new Error(`剧情事件 ID 重复：${event.id}`)
    ids.add(event.id)
    if (!event.trigger || !event.action || !event.nextByOutcome || !event.retry) {
      throw new Error(`节点“${event.id}”缺少触发、动作、分支或重试数据。`)
    }
  }
}

export function projectToEditorState(document) {
  validateProjectDocument(document)
  const layout = document.editor.graph.nodes
  const eventNodes = document.story.events.map((event, index) => {
    const saved = layout[event.id] || {}
    const type = nodeTypes[saved.type] ? saved.type : inferNodeType(event)
    const nodeType = getNodeType({ type })
    return {
      id: event.id,
      name: saved.name || event.id,
      type,
      x: Number(saved.x) || 80 + index * 340,
      y: Number(saved.y) || 120,
      expanded: saved.expanded !== false,
      fieldKeys: [...nodeType.fieldKeys],
      kind: 'event',
      data: { ...eventToValues(event), 'editor.nodeName': saved.name || event.id },
    }
  })
  const auxiliaryNodes = (document.editor.graph.auxNodes || []).map((saved, index) => {
    const type = nodeTypes[saved.type] ? saved.type : 'content-reference'
    const nodeType = getNodeType({ type })
    return {
      id: saved.id || `reference-${index + 1}`, name: saved.name || nodeType.label,
      type, kind: nodeType.kind, x: Number(saved.x) || 120 + index * 48,
      y: Number(saved.y) || 120 + index * 48, expanded: saved.expanded !== false,
      fieldKeys: [...nodeType.fieldKeys], data: clone(saved.data || {}),
    }
  })
  const nodes = [...eventNodes, ...auxiliaryNodes]
  const edges = []
  for (const event of document.story.events) {
    for (const [outcome, targetId] of Object.entries(event.nextByOutcome || {})) {
      if (!targetId) continue
      const output = getNodeType(nodes.find((node) => node.id === event.id) || { type: 'timer' })
        .flowOutputs.find((port) => port.key === outcome)
      edges.push({
        id: `flow:${event.id}:${outcome}:${targetId}:in`, kind: 'flow',
        from: event.id,
        outcome,
        to: targetId,
        input: 'in',
        label: output?.label || outcome,
      })
    }
  }
  for (const edge of document.editor.graph.dataEdges || []) {
    if (!nodes.some((node) => node.id === edge.from) || !nodes.some((node) => node.id === edge.to)) continue
    edges.push({ ...clone(edge), kind: 'data' })
  }
  return {
    meta: clone(document.meta),
    baseContent: clone(document.content),
    baseStory: clone(document.story),
    sections: createSections(document),
    nodes,
    edges,
    groups: clone(document.editor.graph.groups || []),
  }
}

function inferNodeType(event) {
  const hasNext = Object.values(event.nextByOutcome || {}).some(Boolean)
  if (!hasNext && event.action?.type === 'none') return 'terminal'
  if (event.action?.type === 'call') return 'call'
  if (event.trigger?.type === 'operation') return 'operation'
  return 'timer'
}

function eventToValues(event) {
  const values = {
    'event.initialActive': Boolean(event.initialActive),
    'trigger.type': event.trigger?.type || 'timer',
    'action.type': event.action?.type || 'none',
    'retry.enabled': Boolean(event.retry?.enabled),
    'retry.afterSeconds': millisecondsToSeconds(event.retry?.afterMs ?? 30000),
    'retry.outcomes': clone(event.retry?.outcomes || []),
  }
  if (event.trigger?.afterMs !== undefined) values['trigger.afterSeconds'] = millisecondsToSeconds(event.trigger.afterMs)
  if (event.trigger?.action !== undefined) values['trigger.action'] = event.trigger.action
  if (event.trigger?.appId !== undefined) values['trigger.appId'] = event.trigger.appId
  if (event.trigger?.targetId !== undefined) values['trigger.targetId'] = event.trigger.targetId
  for (const key of ['smsScriptId', 'wechatScriptId', 'publishScriptId', 'commentScriptId', 'interactionScriptId', 'dialogueId']) {
    if (event.action?.[key] !== undefined) values[`action.${key}`] = event.action[key]
  }
  if (event.action?.timeoutMs !== undefined) values['action.timeoutSeconds'] = millisecondsToSeconds(event.action.timeoutMs)
  return values
}

function getPath(target, path) {
  return path.split('.').reduce((value, key) => value?.[key], target)
}

function hasPath(target, path) {
  const keys = path.split('.')
  let cursor = target
  for (const key of keys) {
    if (!cursor || !Object.hasOwn(cursor, key)) return false
    cursor = cursor[key]
  }
  return true
}

function matchesFieldCondition(condition, data) {
  if (!condition) return true
  const value = data[condition.path]
  if (Object.hasOwn(condition, 'equals')) return value === condition.equals
  if (Array.isArray(condition.in)) return condition.in.includes(value)
  if (Object.hasOwn(condition, 'notEquals')) return value !== condition.notEquals
  return true
}

function setValueAtPath(target, path, value) {
  const keys = path.split('.')
  let cursor = target
  for (const key of keys.slice(0, -1)) cursor = (cursor[key] ||= {})
  cursor[keys.at(-1)] = value
}

function createOrdinaryEditorResource(type, source, index, extra = {}) {
  const schema = getOrdinaryResourceSchema(type)
  const data = {}
  for (const field of schema.fields) {
    if (extra.data && Object.hasOwn(extra.data, field.key)) data[field.key] = clone(extra.data[field.key])
    else {
      const value = getPath(source, field.runtimePath)
      data[field.key] = value === undefined ? undefined : clone(value)
    }
  }
  if (schema.special === 'conversation-target') {
    if (data['wxConversation.type'] === 'direct') data['wxConversation.targetGroupId'] = undefined
    else data['wxConversation.targetContactId'] = undefined
  }
  const runtimeId = schema.idField ? data[schema.idField] : extra.runtimeId || ''
  const name = data[schema.titleField] || data[schema.fallbackTitleField] || runtimeId || `${schema.label} ${index + 1}`
  return {
    id: extra.editorId || `${type}:${runtimeId || index}:${index}`,
    runtimeId: runtimeId || '', name: String(name), resourceType: type,
    typeLabel: schema.label, description: schema.description,
    orderHint: schema.orderHint || '',
    fieldKeys: [...schema.fieldKeys], data, source: clone(source || {}), sourceIndex: index,
    mutable: schema.mutable !== false,
  }
}

function collectionAt(content, path) {
  const value = getPath(content, path)
  return Array.isArray(value) ? value : []
}

function resourcesForType(content, type) {
  const schema = getOrdinaryResourceSchema(type)
  if (schema.special === 'contact-messages') {
    return (content.contacts || []).flatMap((contact) => (contact.messages || []).map((message) => ({ ...message, contactId: contact.id })))
      .map((item, index) => createOrdinaryEditorResource(type, item, index))
  }
  if (schema.singletonPath) return [createOrdinaryEditorResource(type, getPath(content, schema.singletonPath) || {}, 0)]
  const resources = collectionAt(content, schema.collectionPath).map((item, index) => createOrdinaryEditorResource(type, item, index))
  if (schema.orderField) {
    const direction = schema.orderDirection === 'descending' ? -1 : 1
    if (schema.orderGroupField) {
      const groupOrder = new Map()
      resources.forEach((item) => {
        const group = String(item.data[schema.orderGroupField] ?? '')
        if (!groupOrder.has(group)) groupOrder.set(group, groupOrder.size)
      })
      resources.sort((left, right) => {
        const leftGroup = String(left.data[schema.orderGroupField] ?? '')
        const rightGroup = String(right.data[schema.orderGroupField] ?? '')
        return groupOrder.get(leftGroup) - groupOrder.get(rightGroup)
          || direction * (Number(left.data[schema.orderField] || 0) - Number(right.data[schema.orderField] || 0))
      })
    } else {
      resources.sort((left, right) => direction * (Number(left.data[schema.orderField] || 0) - Number(right.data[schema.orderField] || 0)))
    }
  }
  return resources
}

function createContentSection(content, id, labelZh, labelEn, description) {
  const resources = Object.keys(ordinaryResourceSchemas)
    .filter((type) => ordinaryResourceSchemas[type].sectionId === id)
    .flatMap((type) => resourcesForType(content, type))
  return { id, labelZh, labelEn, description, resources, creatableTypes: ordinaryTypesForSection(id) }
}

function createSections(document) {
  const content = document.content
  const story = document.story
  const editorResources = document.editor.resources || {}
  const scriptResources = Object.entries(sequenceSchemas).flatMap(([type, schema]) =>
    (story[schema.runtimeCollection] || []).map((script, index) =>
      createSequenceEditorResource(type, script, index, editorResources[script.id] || {})))
  return [
    {
      id: 'basics', labelZh: '基础设置', labelEn: 'Basics', description: '页面、设备、玩家和主题参数',
      resources: [
        createResource('basic-device', '页面与设备', 'basic-device', '网页名称、初始电量和剧情计时相关参数', {
          'site.title': content.site?.title ?? '',
          'device.width': content.device?.width ?? 393,
          'device.height': content.device?.height ?? 852,
          'device.radius': content.device?.radius ?? 58,
          'device.fixedDate': content.device?.fixedDate ?? '',
          'device.initialBatteryLevel': content.device?.initialBatteryLevel ?? 86,
          'device.batteryDrainIntervalSeconds': content.device?.batteryDrainIntervalSeconds ?? 45,
          'device.powerOffDelaySeconds': content.device?.powerOffDelaySeconds ?? 30,
        }),
        createResource('basic-owner', '手机主人', 'basic-owner', '手机主人姓名与系统页面资料', {
          'owner.name': content.owner?.name ?? '',
          'owner.signature': content.owner?.signature ?? '',
          'owner.wifiName': content.owner?.wifiName ?? '',
          'security.passcode': content.security?.passcode ?? '',
        }),
        createResource('basic-theme', '主题与壁纸', 'basic-theme', '手机界面的颜色、壁纸和遮罩', {
          'theme.accent': content.theme?.accent ?? '#6f8fe8',
          'theme.lockWallpaper': content.theme?.lockWallpaper ?? '',
          'theme.homeWallpaper': content.theme?.homeWallpaper ?? '',
          'theme.wallpaperOverlay': content.theme?.wallpaperOverlay ?? '',
        }),
        createResource('basic-weather', '天气', 'basic-weather', '天气地点和稳定生成种子', {
          'weather.location': content.weather?.location ?? '',
          'weather.seed': content.weather?.seed ?? 0,
        }),
        createResource('basic-home', '桌面设置', 'basic-home', '桌面组件和应用首页素材', {
          'home.showGreetingWidget': content.home?.showGreetingWidget ?? true,
          'xiaohongshu.homeImageSrc': content.xiaohongshu?.homeImageSrc ?? '',
        }),
      ],
    },
    createContentSection(content, 'content', '内容资源', 'Content', '应用、相册、备忘录、音乐、浏览记录和地图'),
    createContentSection(content, 'communication', '通信与日程', 'Communication', '联系人、短信、通话、通知、邮件和日历'),
    createContentSection(content, 'wechat', '微信内容', 'WeChat content', '微信账号、联系人、群聊、消息和朋友圈初始内容'),
    {
      id: 'scripts', labelZh: '消息与对白', labelEn: 'Scripts', description: '短信、微信和电话脚本',
      resources: scriptResources,
    },
    { id: 'story', labelZh: '剧情流程', labelEn: 'Story graph', description: '事件节点、结果分支与重试关系', resources: [] },
  ]
}

function createResource(id, name, resourceType, description, data) {
  const schema = getResourceSchema(resourceType)
  return {
    id, runtimeId: id, name, resourceType, typeLabel: schema.label, description,
    fieldKeys: [...schema.fieldKeys], data, mutable: false,
  }
}

function nextRuntimeId(type, schema, resources) {
  if (!schema.idField) return ''
  const used = new Set(resources.filter((item) => item.resourceType === type).map((item) => item.data[schema.idField]))
  const prefix = `new-${type}`
  let index = 1
  while (used.has(`${prefix}-${index}`)) index += 1
  return `${prefix}-${index}`
}

export function createOrdinaryResource(type, resources, copyFrom = null) {
  const schema = getOrdinaryResourceSchema(type)
  if (!schema?.allowCreate) throw new Error('该内容类型不能新建。')
  const data = Object.fromEntries(schema.fields.map((item) => [item.key, clone(item.default)]))
  if (copyFrom) Object.assign(data, clone(copyFrom.data))
  const runtimeId = nextRuntimeId(type, schema, resources)
  if (schema.idField) data[schema.idField] = runtimeId
  if (copyFrom && schema.titleField && typeof data[schema.titleField] === 'string' && data[schema.titleField]) {
    data[schema.titleField] = `${data[schema.titleField]} 副本`
  }
  return createOrdinaryEditorResource(type, {}, resources.length, {
    editorId: `editor:${type}:${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`}`,
    runtimeId,
    data,
  })
}

function resourceToRuntime(resource, schema) {
  const output = clone(resource.source || {})
  for (const field of schema.fields) {
    if (schema.special === 'conversation-target') {
      const type = resource.data['wxConversation.type']
      if (field.key === 'wxConversation.targetContactId' && type !== 'direct') continue
      if (field.key === 'wxConversation.targetGroupId' && type !== 'group') continue
    }
    if (!matchesFieldCondition(field.visibleWhen, resource.data) && !hasPath(output, field.runtimePath)) continue
    const value = resource.data[field.key]
    if (value !== undefined) setValueAtPath(output, field.runtimePath, clone(value))
  }
  return output
}

function applyOrdinaryContent(content, sections) {
  const resources = sections
    .filter((section) => ['content', 'communication', 'wechat'].includes(section.id))
    .flatMap((section) => section.resources)

  for (const [type, schema] of Object.entries(ordinaryResourceSchemas)) {
    const typed = resources.filter((item) => item.resourceType === type)
    if (schema.special === 'contact-messages') continue
    if (schema.singletonPath) {
      if (typed[0]) setValueAtPath(content, schema.singletonPath, resourceToRuntime(typed[0], schema))
      continue
    }
    const storageResources = schema.preserveStorageOrder
      ? [...typed].sort((left, right) => left.sourceIndex - right.sourceIndex)
      : typed
    const output = storageResources.map((item) => resourceToRuntime(item, schema))
    if (schema.storageOrderDirection && schema.orderField) {
      const orderField = schema.fields.find((field) => field.key === schema.orderField)
      const direction = schema.storageOrderDirection === 'descending' ? -1 : 1
      output.sort((left, right) => direction * (Number(getPath(left, orderField.runtimePath) || 0) - Number(getPath(right, orderField.runtimePath) || 0)))
    }
    setValueAtPath(content, schema.collectionPath, output)
  }

  const messages = new Map()
  const messageSchema = getOrdinaryResourceSchema('sms-message')
  for (const resource of resources.filter((item) => item.resourceType === 'sms-message')) {
    const message = resourceToRuntime(resource, messageSchema)
    const contactId = message.contactId
    delete message.contactId
    if (!messages.has(contactId)) messages.set(contactId, [])
    messages.get(contactId).push(message)
  }
  content.contacts = (content.contacts || []).map((contact) => ({ ...contact, messages: messages.get(contact.id) || [] }))
}

export function editorStateToProject({ meta, baseContent, baseStory, sections, nodes, edges, groups = [] }) {
  const content = clone(baseContent || {})
  const story = clone(baseStory || emptyRuntimeStory())
  const basicResources = sections.find((section) => section.id === 'basics')?.resources || []
  const scriptResources = sections.find((section) => section.id === 'scripts')?.resources || []
  for (const resource of basicResources) {
    for (const [path, value] of Object.entries(resource.data)) setValueAtPath(content, path, clone(value))
  }
  applyOrdinaryContent(content, sections)

  for (const [type, schema] of Object.entries(sequenceSchemas)) {
    story[schema.runtimeCollection] = scriptResources
      .filter((resource) => resource.resourceType === type)
      .map(sequenceResourceToRuntime)
  }

  const eventNodes = nodes.filter((node) => getNodeType(node).kind === 'event')
  const auxiliaryNodes = nodes.filter((node) => getNodeType(node).kind !== 'event')
  const baseEventMap = new Map((story.events || []).map((event) => [event.id, event]))
  story.events = eventNodes.map((node) => valuesToEvent(node, baseEventMap.get(node.id)))
  const edgesByNode = new Map()
  for (const edge of edges.filter((item) => item.kind !== 'data')) {
    if (!edgesByNode.has(edge.from)) edgesByNode.set(edge.from, {})
    edgesByNode.get(edge.from)[edge.outcome] = edge.to
  }
  for (const event of story.events) {
    event.nextByOutcome = {
      completed: '', accepted: '', rejected: '', missed: '',
      ...(edgesByNode.get(event.id) || {}),
    }
  }

  const editorResources = Object.fromEntries(scriptResources.map((item) => [item.runtimeId || item.id, {
    name: item.data['script.name'] ?? item.name,
    itemStates: item.items.map((entry) => ({ expanded: entry.expanded !== false })),
  }]))
  const document = {
    format: PROJECT_FORMAT,
    schemaVersion: PROJECT_SCHEMA_VERSION,
    meta: clone(meta),
    content,
    story,
    editor: {
      graph: {
        nodes: Object.fromEntries(eventNodes.map((node) => [node.id, {
          x: Math.round(node.x), y: Math.round(node.y), expanded: node.expanded !== false,
          name: node.name, type: node.type,
        }])),
        auxNodes: auxiliaryNodes.map((node) => ({
          id: node.id, type: node.type, name: node.name,
          x: Math.round(node.x), y: Math.round(node.y), expanded: node.expanded !== false,
          data: clone(node.data || {}),
        })),
        dataEdges: edges.filter((edge) => edge.kind === 'data').map((edge) => clone(edge)),
        groups: groups.map((group) => ({
          id: group.id, title: group.title, color: group.color,
          x: Math.round(group.x), y: Math.round(group.y),
          width: Math.round(group.width), height: Math.round(group.height),
        })),
      },
      resources: editorResources,
    },
  }
  validateProjectDocument(document)
  return document
}

function valuesToEvent(node, sourceEvent) {
  const event = clone(sourceEvent || {
    id: node.id, initialActive: false, trigger: {}, action: {}, nextByOutcome: {},
    retry: { enabled: false, afterMs: 30000, outcomes: [] },
  })
  const values = node.data || {}
  event.id = node.id
  event.initialActive = Boolean(values['event.initialActive'])
  event.trigger = { type: values['trigger.type'] || 'timer' }
  if (values['trigger.afterSeconds'] !== undefined) event.trigger.afterMs = secondsToMilliseconds(values['trigger.afterSeconds'])
  if (values['trigger.action']) event.trigger.action = values['trigger.action']
  if (values['trigger.appId']) event.trigger.appId = values['trigger.appId']
  if (values['trigger.targetId']) event.trigger.targetId = values['trigger.targetId']
  event.action = { type: values['action.type'] || 'none' }
  for (const key of ['smsScriptId', 'wechatScriptId', 'publishScriptId', 'commentScriptId', 'interactionScriptId', 'dialogueId']) {
    if (values[`action.${key}`]) event.action[key] = values[`action.${key}`]
  }
  if (values['action.timeoutSeconds'] !== undefined) event.action.timeoutMs = secondsToMilliseconds(values['action.timeoutSeconds'])
  event.retry = {
    enabled: Boolean(values['retry.enabled']),
    afterMs: secondsToMilliseconds(values['retry.afterSeconds'] ?? 30),
    outcomes: clone(values['retry.outcomes'] || []),
  }
  return event
}

function migrateVersion1(document) {
  const migrated = clone(document)
  const connections = migrated.story.connections || []
  const nextByEvent = new Map()
  for (const connection of connections) {
    if (!nextByEvent.has(connection.from.nodeId)) nextByEvent.set(connection.from.nodeId, {})
    nextByEvent.get(connection.from.nodeId)[connection.from.port] = connection.to.nodeId
  }
  const oldScripts = migrated.story.scripts || []
  const runtimeStory = emptyRuntimeStory()
  for (const script of oldScripts) {
    if (script.resourceType === 'phone-dialogue') {
      runtimeStory.phoneDialogues.push({ id: script.id, contactId: '', direction: 'any', hangupAfterMs: 3000, conversation: [] })
    } else if (script.resourceType === 'wechat-script') {
      runtimeStory.wechatScripts.push({ id: script.id, conversationId: '', messages: [] })
    } else {
      runtimeStory.smsScripts.push({ id: script.id, contactId: '', messages: [] })
    }
  }
  runtimeStory.events = (migrated.story.events || []).map((event) => valuesToEvent({
    id: event.id, data: event.values || {},
  }, {
    id: event.id, initialActive: false, trigger: {}, action: {},
    nextByOutcome: { completed: '', accepted: '', rejected: '', missed: '', ...(nextByEvent.get(event.id) || {}) },
    retry: { enabled: false, afterMs: 30000, outcomes: [] },
  }))
  migrated.story = runtimeStory
  migrated.schemaVersion = PROJECT_SCHEMA_VERSION
  migrated.editor.resources = Object.fromEntries(oldScripts.map((script) => [script.id, {
    name: script.name || script.id,
    messageCount: script.messageCount || 0,
  }]))
  for (const event of migrated.story.events) {
    migrated.editor.graph.nodes[event.id] ||= { x: 80, y: 120, expanded: true }
    const oldEvent = document.story.events.find((item) => item.id === event.id)
    migrated.editor.graph.nodes[event.id].name = oldEvent?.name || event.id
    migrated.editor.graph.nodes[event.id].type = oldEvent?.type || inferNodeType(event)
  }
  return migrated
}

export function serializeProject(document) {
  validateProjectDocument(document)
  return `${JSON.stringify(document, null, 2)}\n`
}

export function normalizeProjectFileName(name) {
  const safeName = String(name || '未命名作品').trim().replace(/[\\/:*?"<>|]/g, '-') || '未命名作品'
  return safeName.endsWith(PROJECT_EXTENSION) ? safeName : `${safeName}${PROJECT_EXTENSION}`
}
