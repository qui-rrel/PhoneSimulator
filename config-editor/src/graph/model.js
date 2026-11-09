import { fieldDefinitions } from '../schema/fields.js'
import { arePortTypesCompatible, getInputPort, getNodeType, getOutputPort } from '../schema/nodeTypes.js'

const clone = (value) => JSON.parse(JSON.stringify(value))

function uniqueId(prefix, usedIds) {
  let index = 1
  while (usedIds.has(`${prefix}-${index}`)) index += 1
  return `${prefix}-${index}`
}

export function createGraphNode(type, nodes, position = {}) {
  const meta = getNodeType({ type })
  const usedIds = new Set(nodes.map((node) => node.id))
  const prefix = meta.kind === 'event' ? 'event' : `ref-${type.replace(/-reference$/, '')}`
  const id = uniqueId(prefix, usedIds)
  const data = {}
  for (const key of meta.fieldKeys) {
    if (key === 'editor.nodeName') continue
    const value = fieldDefinitions[key]?.default
    data[key] = value === undefined ? '' : clone(value)
  }
  Object.assign(data, clone(meta.defaults || {}))
  const name = meta.kind === 'event' ? `${meta.label} ${id.split('-').at(-1)}` : meta.label
  if (meta.kind === 'event') data['editor.nodeName'] = name
  return {
    id, name, type, kind: meta.kind,
    x: Math.round(Number.isFinite(position.x) ? position.x : 90),
    y: Math.round(Number.isFinite(position.y) ? position.y : 100), expanded: true,
    fieldKeys: [...meta.fieldKeys], data,
  }
}

export function createGraphGroup(groups, position = {}) {
  const id = uniqueId('group', new Set(groups.map((group) => group.id)))
  return {
    id, title: `剧情分组 ${id.split('-').at(-1)}`,
    x: Math.round(Number.isFinite(position.x) ? position.x : 60),
    y: Math.round(Number.isFinite(position.y) ? position.y : 70),
    width: 820, height: 340, color: '#426786',
  }
}

export function synchronizeEventNodeType(node) {
  if (node.kind !== 'event') return
  const actionType = node.data['action.type']
  let type
  if (actionType === 'call') type = 'call'
  else if (node.type === 'terminal' && actionType === 'none') type = 'terminal'
  else type = node.data['trigger.type'] === 'operation' ? 'operation' : 'timer'
  if (type === node.type) return
  node.type = type
  node.kind = getNodeType(node).kind
  node.fieldKeys = [...getNodeType(node).fieldKeys]
}

export function connectGraphPorts(nodes, edges, request) {
  const fromNode = nodes.find((node) => node.id === request.from)
  const toNode = nodes.find((node) => node.id === request.to)
  if (!fromNode || !toNode || fromNode.id === toNode.id) return null
  const kind = request.kind === 'data' ? 'data' : 'flow'
  const output = getOutputPort(fromNode, request.output, kind)
  const input = getInputPort(toNode, request.input, kind)
  if (!arePortTypesCompatible(output, input)) return null

  if (kind === 'flow') {
    const existing = edges.findIndex((edge) => edge.kind !== 'data' && edge.from === fromNode.id && edge.outcome === output.key)
    if (existing >= 0) edges.splice(existing, 1)
  } else {
    const existing = edges.findIndex((edge) => edge.kind === 'data' && edge.to === toNode.id && edge.input === input.key)
    if (existing >= 0) edges.splice(existing, 1)
    if (output.fieldKey && input.fieldKey) toNode.data[input.fieldKey] = fromNode.data[output.fieldKey]
  }

  const edge = kind === 'data'
    ? {
        id: `data:${fromNode.id}:${output.key}:${toNode.id}:${input.key}`,
        kind, from: fromNode.id, output: output.key, to: toNode.id, input: input.key,
        label: output.label, valueType: output.valueType,
      }
    : {
        id: `flow:${fromNode.id}:${output.key}:${toNode.id}:${input.key}`,
        kind, from: fromNode.id, outcome: output.key, to: toNode.id, input: input.key,
        label: output.label,
      }
  edges.push(edge)
  return edge
}

export function propagateReferenceValue(nodes, edges, sourceNodeId) {
  const source = nodes.find((node) => node.id === sourceNodeId)
  if (!source) return
  for (const edge of edges.filter((item) => item.kind === 'data' && item.from === sourceNodeId)) {
    const target = nodes.find((node) => node.id === edge.to)
    const output = getOutputPort(source, edge.output, 'data')
    const input = target && getInputPort(target, edge.input, 'data')
    if (target && output?.fieldKey && input?.fieldKey) target.data[input.fieldKey] = source.data[output.fieldKey]
  }
}

export function disconnectInlineField(nodes, edges, nodeId, fieldKey) {
  const node = nodes.find((item) => item.id === nodeId)
  if (!node) return
  const inputs = getNodeType(node).dataInputs.filter((input) => input.fieldKey === fieldKey)
  if (!inputs.length) return
  const inputKeys = new Set(inputs.map((item) => item.key))
  for (let index = edges.length - 1; index >= 0; index -= 1) {
    if (edges[index].kind === 'data' && edges[index].to === nodeId && inputKeys.has(edges[index].input)) edges.splice(index, 1)
  }
}

export function duplicateGraphNodes(nodes, selectedIds) {
  const selected = nodes.filter((node) => selectedIds.includes(node.id))
  const copies = []
  for (const source of selected) {
    const copy = createGraphNode(source.type, [...nodes, ...copies], { x: source.x + 42, y: source.y + 42 })
    copy.data = clone(source.data)
    copy.name = `${source.name} 副本`
    if (copy.kind === 'event') copy.data['editor.nodeName'] = copy.name
    copy.expanded = source.expanded
    copies.push(copy)
  }
  nodes.push(...copies)
  return copies
}

export function removeGraphNodes(nodes, edges, nodeIds) {
  const idSet = new Set(nodeIds)
  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    if (idSet.has(nodes[index].id)) nodes.splice(index, 1)
  }
  for (let index = edges.length - 1; index >= 0; index -= 1) {
    if (idSet.has(edges[index].from) || idSet.has(edges[index].to)) edges.splice(index, 1)
  }
}
