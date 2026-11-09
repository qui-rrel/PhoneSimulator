import { isFieldVisible } from '../schema/fields.js'

const SPECIAL_VALUES = {
  'wechat-sender': new Set(['SELF']),
  'wechat-contact': new Set(['SELF']),
}

const BUILT_IN_CONTENT_IDS = ['moments', 'moments-compose', 'moments-activity', 'search']

export function referenceTypeAcceptsTarget(referenceType, targetType) {
  if (referenceType === targetType) return true
  if (referenceType === 'content') return !targetType.endsWith('-script') && !['phone-dialogue', 'event'].includes(targetType)
  if (referenceType === 'wechat-sender') return targetType === 'wechat-contact'
  return false
}

function addTarget(targets, targetType, targetId, location) {
  const id = String(targetId || '').trim()
  if (!id) return
  targets.push({ targetType, targetId: id, ...location })
}

export function collectReferenceTargets({ sections, nodes }) {
  const targets = []
  for (const id of BUILT_IN_CONTENT_IDS) addTarget(targets, 'virtual-content', id, { sectionId: 'story', title: id })
  for (const section of sections) {
    for (const resource of section.resources || []) {
      if (resource.runtimeId) addTarget(targets, resource.resourceType, resource.runtimeId, {
        sectionId: section.id, resourceId: resource.id, title: resource.name,
      })
      for (const item of resource.items || []) {
        if (resource.resourceType === 'moment-publish-script') {
          addTarget(targets, 'moment', item.data['publish.momentId'], { sectionId: section.id, resourceId: resource.id, itemId: item.id, title: resource.name })
        }
        if (resource.resourceType === 'moment-comment-script') {
          addTarget(targets, 'moment-comment', item.data['playerComment.commentId'], { sectionId: section.id, resourceId: resource.id, itemId: item.id, title: resource.name })
        }
        if (resource.resourceType === 'moment-interaction-script' && item.data['interaction.type'] === 'comment') {
          addTarget(targets, 'moment-comment', item.data['interaction.commentId'], { sectionId: section.id, resourceId: resource.id, itemId: item.id, title: resource.name })
        }
      }
    }
  }
  for (const node of nodes) {
    if (node.kind === 'event' || ['timer', 'operation', 'call', 'terminal'].includes(node.type)) {
      addTarget(targets, 'event', node.id, { sectionId: 'story', nodeId: node.id, title: node.name })
    }
  }
  return targets
}

function pushFieldReferences(output, { data, fieldKeys, fieldDefinitions, source }) {
  for (const fieldKey of fieldKeys || []) {
    const field = fieldDefinitions[fieldKey]
    if (!field?.referenceType || !isFieldVisible(field, data)) continue
    const values = Array.isArray(data[fieldKey]) ? data[fieldKey] : [data[fieldKey]]
    for (const value of values) {
      const targetId = String(value || '').trim()
      if (!targetId || SPECIAL_VALUES[field.referenceType]?.has(targetId)) continue
      output.push({
        targetType: field.referenceType,
        targetId,
        fieldKey,
        fieldLabel: field.labelZh,
        ...source,
      })
    }
  }
}

export function collectReferences({ sections, nodes, edges = [], fieldDefinitions, baseStory = {} }) {
  const references = []
  for (const section of sections) {
    for (const resource of section.resources || []) {
      const common = { sectionId: section.id, resourceId: resource.id, sourceTitle: resource.name }
      pushFieldReferences(references, { data: resource.data, fieldKeys: resource.fieldKeys, fieldDefinitions, source: common })
      for (const [itemIndex, item] of (resource.items || []).entries()) {
        pushFieldReferences(references, {
          data: item.data,
          fieldKeys: resource.itemFieldKeys,
          fieldDefinitions,
          source: { ...common, itemId: item.id, itemIndex },
        })
        const custom = []
        if (resource.resourceType === 'moment-comment-script') custom.push(
          ['moment', item.data['playerComment.momentId'], 'playerComment.momentId', '朋友圈 ID'],
          ['moment-comment', item.data['playerComment.replyToCommentId'], 'playerComment.replyToCommentId', '回复的评论 ID'],
        )
        if (resource.resourceType === 'moment-interaction-script') custom.push(
          ['moment', item.data['interaction.momentId'], 'interaction.momentId', '朋友圈 ID'],
          ['moment-comment', item.data['interaction.replyToCommentId'], 'interaction.replyToCommentId', '回复的评论 ID'],
        )
        for (const [targetType, targetId, fieldKey, fieldLabel] of custom) {
          if (String(targetId || '').trim()) references.push({ targetType, targetId: String(targetId), fieldKey, fieldLabel, ...common, itemId: item.id, itemIndex })
        }
      }
    }
  }

  for (const node of nodes) {
    pushFieldReferences(references, {
      data: node.data,
      fieldKeys: node.fieldKeys,
      fieldDefinitions,
      source: { sectionId: 'story', nodeId: node.id, sourceTitle: node.name },
    })
  }

  for (const edge of edges.filter((item) => item.kind !== 'data')) {
    references.push({
      targetType: 'event', targetId: edge.to, nodeId: edge.from,
      sourceTitle: nodes.find((node) => node.id === edge.from)?.name || edge.from,
      fieldLabel: `流程出口“${edge.outcome || '完成'}”`, edgeId: edge.id, sectionId: 'story',
    })
  }

  for (const [ruleIndex, rule] of (baseStory.outgoingCallRules || []).entries()) {
    const common = { sectionId: 'story', sourceTitle: `主动通话规则 ${rule.id || ruleIndex + 1}`, ruleIndex }
    if (rule.contactId) references.push({ ...common, targetType: 'contact', targetId: String(rule.contactId), fieldLabel: '联系人' })
    if (rule.dialogueId) references.push({ ...common, targetType: 'phone-dialogue', targetId: String(rule.dialogueId), fieldLabel: '电话对白' })
    for (const [conditionIndex, condition] of (rule.conditions || []).entries()) {
      if (condition.targetId) references.push({ ...common, conditionIndex, targetType: 'event', targetId: String(condition.targetId), fieldLabel: '剧情条件' })
    }
  }
  return references
}

export function findReferencesTo(references, targetType, targetId, excluded = {}) {
  return references.filter((reference) =>
    reference.targetId === String(targetId || '')
      && referenceTypeAcceptsTarget(reference.targetType, targetType)
      && !(excluded.nodeId && reference.nodeId === excluded.nodeId)
      && !(excluded.resourceId && reference.resourceId === excluded.resourceId && (!excluded.itemId || reference.itemId === excluded.itemId)),
  )
}

export function describeReference(reference) {
  const item = Number.isInteger(reference.itemIndex) ? `第 ${reference.itemIndex + 1} 项` : ''
  return `${reference.sourceTitle || reference.nodeId || reference.resourceId}${item ? ` · ${item}` : ''}${reference.fieldLabel ? ` · ${reference.fieldLabel}` : ''}`
}

export function rewriteReferences({ sections, nodes, baseStory = {}, fieldDefinitions = {} }, targetType, previousId, nextId) {
  if (!previousId || previousId === nextId) return
  const rewrite = (data, fieldKeys, definitions) => {
    for (const key of fieldKeys || []) {
      const field = definitions[key]
      if (!field?.referenceType || !referenceTypeAcceptsTarget(field.referenceType, targetType)) continue
      if (Array.isArray(data[key])) data[key] = data[key].map((value) => value === previousId ? nextId : value)
      else if (data[key] === previousId) data[key] = nextId
    }
  }
  for (const section of sections) for (const resource of section.resources || []) {
    rewrite(resource.data, resource.fieldKeys, fieldDefinitions)
    for (const item of resource.items || []) {
      rewrite(item.data, resource.itemFieldKeys, fieldDefinitions)
      const pairs = targetType === 'moment'
        ? ['playerComment.momentId', 'interaction.momentId']
        : targetType === 'moment-comment'
          ? ['playerComment.replyToCommentId', 'interaction.replyToCommentId'] : []
      for (const key of pairs) if (item.data[key] === previousId) item.data[key] = nextId
    }
  }
  for (const node of nodes) rewrite(node.data, node.fieldKeys, fieldDefinitions)
  for (const rule of baseStory.outgoingCallRules || []) {
    if (targetType === 'contact' && rule.contactId === previousId) rule.contactId = nextId
    if (targetType === 'phone-dialogue' && rule.dialogueId === previousId) rule.dialogueId = nextId
    if (targetType === 'event') for (const condition of rule.conditions || []) if (condition.targetId === previousId) condition.targetId = nextId
  }
}
