const flowInput = { key: 'in', label: '进入', valueType: 'flow', color: '#65b7ec', multiple: true }
const completedOutput = { key: 'completed', label: '完成', valueType: 'flow', color: '#65b7ec' }

const commonEventFields = [
  'editor.nodeName', 'event.initialActive',
  'trigger.type', 'trigger.afterSeconds', 'trigger.action', 'trigger.appId', 'trigger.targetId',
  'action.type', 'action.smsScriptId', 'action.wechatScriptId', 'action.publishScriptId',
  'action.commentScriptId', 'action.interactionScriptId', 'action.dialogueId', 'action.timeoutSeconds',
  'retry.enabled', 'retry.afterSeconds', 'retry.outcomes',
]

const eventDataInputs = [
  { key: 'target', label: '触发对象', valueType: 'content-reference', fieldKey: 'trigger.targetId', optional: true, visibleWhen: { path: 'trigger.type', equals: 'operation' } },
  { key: 'smsScript', label: '短信剧情', valueType: 'sms-script-reference', fieldKey: 'action.smsScriptId', visibleWhen: { path: 'action.type', equals: 'sms-script' } },
  { key: 'wechatScript', label: '微信剧情', valueType: 'wechat-script-reference', fieldKey: 'action.wechatScriptId', visibleWhen: { path: 'action.type', equals: 'wechat-script' } },
  { key: 'publishScript', label: '朋友圈发布', valueType: 'moment-publish-script-reference', fieldKey: 'action.publishScriptId', visibleWhen: { path: 'action.type', equals: 'moment-publish' } },
  { key: 'commentScript', label: '朋友圈评论', valueType: 'moment-comment-script-reference', fieldKey: 'action.commentScriptId', visibleWhen: { path: 'action.type', equals: 'moment-comment' } },
  { key: 'interactionScript', label: '朋友圈互动', valueType: 'moment-interaction-script-reference', fieldKey: 'action.interactionScriptId', visibleWhen: { path: 'action.type', equals: 'moment-interactions' } },
  { key: 'dialogue', label: '电话对白', valueType: 'phone-dialogue-reference', fieldKey: 'action.dialogueId', visibleWhen: { path: 'action.type', equals: 'call' } },
]

const referenceType = (type, label, color, fieldKey, valueType, outputLabel = label) => ({
  type, kind: 'reference', label, color, fieldKeys: [fieldKey],
  flowInputs: [], flowOutputs: [], dataInputs: [],
  dataOutputs: [{ key: 'value', label: outputLabel, valueType, fieldKey }],
  paletteCategory: '引用节点',
})

export const nodeTypes = {
  timer: {
    type: 'timer', kind: 'event', label: '计时事件', color: '#3f7ab7', fieldKeys: commonEventFields,
    flowInputs: [flowInput], flowOutputs: [completedOutput], dataInputs: eventDataInputs, dataOutputs: [],
    paletteCategory: '剧情事件', defaults: { 'trigger.type': 'timer', 'action.type': 'none' },
  },
  operation: {
    type: 'operation', kind: 'event', label: '操作事件', color: '#7a62b8', fieldKeys: commonEventFields,
    flowInputs: [flowInput], flowOutputs: [completedOutput], dataInputs: eventDataInputs, dataOutputs: [],
    paletteCategory: '剧情事件', defaults: { 'trigger.type': 'operation', 'action.type': 'none' },
  },
  call: {
    type: 'call', kind: 'event', label: '电话事件', color: '#a95d66', fieldKeys: commonEventFields,
    flowInputs: [flowInput],
    flowOutputs: [
      { key: 'accepted', label: '接听', valueType: 'flow', color: '#68c895' },
      { key: 'rejected', label: '拒接', valueType: 'flow', color: '#e9a05f' },
      { key: 'missed', label: '未接', valueType: 'flow', color: '#d87575' },
    ],
    dataInputs: eventDataInputs, dataOutputs: [], paletteCategory: '剧情事件',
    defaults: { 'trigger.type': 'timer', 'action.type': 'call' },
  },
  terminal: {
    type: 'terminal', kind: 'event', label: '结束节点', color: '#4d846b',
    fieldKeys: ['editor.nodeName', 'event.initialActive', 'action.type'],
    flowInputs: [flowInput], flowOutputs: [], dataInputs: [], dataOutputs: [],
    paletteCategory: '剧情事件', defaults: { 'trigger.type': 'timer', 'action.type': 'none' },
  },
  'contact-reference': referenceType('contact-reference', '联系人引用', '#4f8a8b', 'reference.contactId', 'content-reference', '联系人'),
  'content-reference': referenceType('content-reference', '内容引用', '#507899', 'reference.contentId', 'content-reference', '内容'),
  'wechat-conversation-reference': referenceType('wechat-conversation-reference', '微信会话引用', '#4f8a72', 'reference.conversationId', 'content-reference', '微信会话'),
  'sms-script-reference': referenceType('sms-script-reference', '短信剧情引用', '#557ea5', 'reference.smsScriptId', 'sms-script-reference', '短信剧情'),
  'wechat-script-reference': referenceType('wechat-script-reference', '微信剧情引用', '#4f8a72', 'reference.wechatScriptId', 'wechat-script-reference', '微信剧情'),
  'moment-publish-script-reference': referenceType('moment-publish-script-reference', '朋友圈发布引用', '#8a6a9a', 'reference.publishScriptId', 'moment-publish-script-reference', '发布剧情'),
  'moment-comment-script-reference': referenceType('moment-comment-script-reference', '朋友圈评论引用', '#8b6680', 'reference.commentScriptId', 'moment-comment-script-reference', '评论剧情'),
  'moment-interaction-script-reference': referenceType('moment-interaction-script-reference', '朋友圈互动引用', '#7366a0', 'reference.interactionScriptId', 'moment-interaction-script-reference', '互动剧情'),
  'phone-dialogue-reference': referenceType('phone-dialogue-reference', '电话对白引用', '#8c6d62', 'reference.dialogueId', 'phone-dialogue-reference', '电话对白'),
}

export const nodeTypeMeta = Object.fromEntries(
  Object.entries(nodeTypes).map(([key, value]) => [key, { label: value.label, color: value.color }]),
)

function matchesCondition(condition, data) {
  if (!condition) return true
  const value = data?.[condition.path]
  if (Object.hasOwn(condition, 'equals')) return value === condition.equals
  if (Array.isArray(condition.in)) return condition.in.includes(value)
  if (Object.hasOwn(condition, 'notEquals')) return value !== condition.notEquals
  return true
}

export function getNodeType(node) {
  return nodeTypes[node.type] || nodeTypes.timer
}

export function getNodePorts(node) {
  const meta = getNodeType(node)
  return {
    flowInputs: meta.flowInputs.filter((port) => matchesCondition(port.visibleWhen, node.data)),
    flowOutputs: meta.flowOutputs.filter((port) => matchesCondition(port.visibleWhen, node.data)),
    dataInputs: meta.dataInputs.filter((port) => matchesCondition(port.visibleWhen, node.data)),
    dataOutputs: meta.dataOutputs.filter((port) => matchesCondition(port.visibleWhen, node.data)),
  }
}

export function getInputPort(node, key, kind = 'flow') {
  const ports = kind === 'data' ? getNodePorts(node).dataInputs : getNodePorts(node).flowInputs
  return ports.find((port) => port.key === key)
}

export function getOutputPort(node, key, kind = 'flow') {
  const ports = kind === 'data' ? getNodePorts(node).dataOutputs : getNodePorts(node).flowOutputs
  return ports.find((port) => port.key === key)
}

export function getFlowInput(node, key) {
  const ports = getNodePorts(node).flowInputs
  return ports.find((port) => port.key === key) || ports[0]
}

export function getFlowOutput(node, key) {
  const ports = getNodePorts(node).flowOutputs
  return ports.find((port) => port.key === key) || ports[0]
}

export function arePortTypesCompatible(output, input) {
  return Boolean(output && input && output.valueType === input.valueType)
}

export function graphNodePaletteItems() {
  return Object.values(nodeTypes).map((item) => ({
    type: item.type, label: item.label, category: item.paletteCategory, color: item.color, kind: item.kind,
  }))
}
