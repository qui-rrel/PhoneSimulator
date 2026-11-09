import { isFieldRequired, isFieldVisible } from '../schema/fields.js'
import { arePortTypesCompatible, getInputPort, getNodeType, getOutputPort } from '../schema/nodeTypes.js'
import { collectReferences, collectReferenceTargets, referenceTypeAcceptsTarget } from './referenceIndex.js'

function isEmpty(value) {
  return value === '' || value === null || value === undefined || (Array.isArray(value) && value.length === 0)
}

function requiredIssues({ nodes, sections, fieldDefinitions }) {
  const issues = []
  const inspect = (data, keys, source) => {
    for (const key of keys || []) {
      const field = fieldDefinitions[key]
      if (!field || !isFieldVisible(field, data) || !isFieldRequired(field, data) || !isEmpty(data[key])) continue
      issues.push({ id: `required:${source.nodeId || source.resourceId}:${source.itemId || ''}:${key}`, level: 'error', title: '缺少必填内容', fieldKey: key, detail: `${source.prefix}中的“${field.labelZh}”必须填写。`, ...source.location })
    }
  }
  for (const node of nodes) inspect(node.data, node.fieldKeys, { nodeId: node.id, prefix: `“${node.name}”`, location: { nodeId: node.id } })
  for (const section of sections) for (const resource of section.resources || []) {
    const location = { sectionId: section.id, resourceId: resource.id }
    inspect(resource.data, resource.fieldKeys, { resourceId: resource.id, prefix: `“${resource.name}”`, location })
    for (const [index, item] of (resource.items || []).entries()) inspect(item.data, resource.itemFieldKeys, {
      resourceId: resource.id, itemId: item.id, prefix: `“${resource.name}”第 ${index + 1} 项`, location: { ...location, itemId: item.id },
    })
  }
  return issues
}

function duplicateIssues(targets) {
  const issues = []
  const buckets = new Map()
  for (const target of targets) {
    const key = `${target.targetType}:${target.targetId}`
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(target)
  }
  for (const [key, matches] of buckets) {
    if (matches.length < 2) continue
    for (const target of matches) issues.push({
      id: `duplicate:${key}:${target.nodeId || target.resourceId}:${target.itemId || ''}`, level: 'error', title: 'ID 重复',
      detail: `“${target.targetId}”在同一类内容中出现了 ${matches.length} 次，必须改为唯一 ID。`,
      sectionId: target.sectionId, resourceId: target.resourceId, itemId: target.itemId, nodeId: target.nodeId,
    })
  }
  return issues
}

function referenceIssues(context, targets) {
  const issues = []
  for (const reference of collectReferences(context)) {
    const exists = targets.some((target) => target.targetId === reference.targetId && referenceTypeAcceptsTarget(reference.targetType, target.targetType))
    if (exists) continue
    issues.push({
      id: `reference:${reference.targetType}:${reference.targetId}:${reference.nodeId || reference.resourceId || reference.ruleIndex}:${reference.itemId || reference.conditionIndex || ''}:${reference.fieldKey || reference.edgeId || ''}`,
      level: 'error', title: '引用的内容不存在',
      detail: `“${reference.sourceTitle}”中的${reference.fieldLabel ? `“${reference.fieldLabel}”` : '引用'}指向了不存在的 ID“${reference.targetId}”。`,
      sectionId: reference.sectionId, resourceId: reference.resourceId, itemId: reference.itemId, nodeId: reference.nodeId, fieldKey: reference.fieldKey, edgeId: reference.edgeId,
    })
  }
  return issues
}

function graphIssues(nodes, edges) {
  const issues = []
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const flowOutputs = new Map()
  const dataInputs = new Map()
  for (const edge of edges) {
    const from = byId.get(edge.from)
    const to = byId.get(edge.to)
    const kind = edge.kind === 'data' ? 'data' : 'flow'
    if (!from || !to) {
      issues.push({ id: `edge-dangling:${edge.id}`, level: 'error', title: '连线端点不存在', detail: '这条连线连接了已经不存在的节点，请删除后重新连接。', nodeId: from?.id || to?.id, edgeId: edge.id })
      continue
    }
    const output = getOutputPort(from, kind === 'data' ? edge.output : edge.outcome, kind)
    const input = getInputPort(to, edge.input, kind)
    if (!output || !input || !arePortTypesCompatible(output, input)) {
      issues.push({ id: `edge-type:${edge.id}`, level: 'error', title: '端口类型不匹配', detail: `“${from.name}”到“${to.name}”的连线已经不符合当前节点类型，请重新连接。`, nodeId: to.id, edgeId: edge.id })
    }
    const bucket = kind === 'data' ? dataInputs : flowOutputs
    const key = kind === 'data' ? `${edge.to}:${edge.input}` : `${edge.from}:${edge.outcome}`
    if (bucket.has(key)) issues.push({ id: `edge-overwrite:${edge.id}`, level: 'error', title: '端口存在多条连线', detail: kind === 'data' ? '一个数据输入只能有一个来源。' : '一个流程出口只能连接一个后续节点。', nodeId: kind === 'data' ? edge.to : edge.from, edgeId: edge.id })
    else bucket.set(key, edge.id)
  }

  const eventNodes = nodes.filter((node) => getNodeType(node).kind === 'event')
  if (!eventNodes.length) return issues
  const eventIds = new Set(eventNodes.map((node) => node.id))
  let roots = eventNodes.filter((node) => node.data['event.initialActive'])
  if (!roots.length) {
    const incoming = new Set(edges.filter((edge) => edge.kind !== 'data' && eventIds.has(edge.from) && eventIds.has(edge.to)).map((edge) => edge.to))
    roots = eventNodes.filter((node) => !incoming.has(node.id))
  }
  const visited = new Set()
  const pending = roots.map((node) => node.id)
  while (pending.length) {
    const id = pending.pop()
    if (visited.has(id)) continue
    visited.add(id)
    for (const edge of edges) if (edge.kind !== 'data' && edge.from === id && eventIds.has(edge.to)) pending.push(edge.to)
  }
  for (const node of eventNodes) if (!visited.has(node.id)) issues.push({ id: `unreachable:${node.id}`, level: 'warning', title: '剧情节点不可到达', detail: `“${node.name}”没有从任何剧情入口连通，运行时不会执行。`, nodeId: node.id })
  return issues
}

function relationshipIssues(sections) {
  const issues = []
  const resources = sections.flatMap((section) => section.resources.map((resource) => ({ sectionId: section.id, resource })))
  const byTypeAndId = (type, id) => resources.find((item) => item.resource.resourceType === type && item.resource.runtimeId === id)?.resource
  for (const { sectionId, resource } of resources) {
    if (resource.resourceType === 'wechat-group') {
      const members = resource.data['wxGroup.memberIds'] || []
      if (members.length < 2 || !members.includes('SELF')) issues.push({
        id: `relationship:${resource.id}:members`, level: 'error', title: '群成员配置不完整',
        detail: `“${resource.name}”至少需要两名成员，并且必须包含玩家自己 SELF。`,
        sectionId, resourceId: resource.id, fieldKey: 'wxGroup.memberIds',
      })
    }
    if (resource.resourceType === 'wechat-message') {
      const conversation = byTypeAndId('wechat-conversation', resource.data['wxMessage.conversationId'])
      const sender = resource.data['wxMessage.senderId']
      if (!conversation || !sender) continue
      const allowed = conversation.data['wxConversation.type'] === 'group'
        ? byTypeAndId('wechat-group', conversation.data['wxConversation.targetGroupId'])?.data['wxGroup.memberIds'] || []
        : ['SELF', conversation.data['wxConversation.targetContactId']]
      if (!allowed.includes(sender)) issues.push({
        id: `relationship:${resource.id}:sender`, level: 'error', title: '发送人不属于当前会话',
        detail: `“${resource.name}”的发送人不在所属会话成员中。`,
        sectionId, resourceId: resource.id, fieldKey: 'wxMessage.senderId',
      })
    }
    if (resource.resourceType === 'moment-comment' && resource.data['momentComment.replyToCommentId']) {
      const replied = byTypeAndId('moment-comment', resource.data['momentComment.replyToCommentId'])
      if (replied && replied.data['momentComment.momentId'] !== resource.data['momentComment.momentId']) issues.push({
        id: `relationship:${resource.id}:reply`, level: 'error', title: '回复对象不在当前朋友圈',
        detail: `“${resource.name}”只能回复同一条朋友圈下的评论。`,
        sectionId, resourceId: resource.id, fieldKey: 'momentComment.replyToCommentId',
      })
    }
  }
  return issues
}

export function validateRequiredFields({ nodes, edges = [], sections, fieldDefinitions, baseStory = {} }) {
  const context = { nodes, edges, sections, fieldDefinitions, baseStory }
  const targets = collectReferenceTargets(context)
  return [...requiredIssues(context), ...duplicateIssues(targets), ...referenceIssues(context, targets), ...relationshipIssues(sections), ...graphIssues(nodes, edges)]
}
