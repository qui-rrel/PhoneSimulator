import { visibleFieldsForKeys } from '../schema/fields'
import { getNodePorts } from '../schema/nodeTypes'

export const NODE_WIDTH = 292
export const NODE_HEADER_HEIGHT = 48
export const PORT_HEIGHT = 25
export const FIELD_HEIGHT = 54
export const NODE_FIELDS_PADDING = 14
export const NODE_FIELDS_MAX_HEIGHT = 320
export const NODE_PORT_PADDING = 6
export const TERMINAL_HEIGHT = 27

export function getVisibleNodeFields(node, fieldDefinitions, connectedFieldKeys = []) {
  const connected = new Set(connectedFieldKeys)
  return visibleFieldsForKeys(node.fieldKeys, node.data, fieldDefinitions)
    .filter((field) => !connected.has(field.key))
}

export function getNodeHeight(node, fieldDefinitions, connectedFieldKeys = []) {
  const ports = getNodePorts(node)
  const fieldCount = getVisibleNodeFields(node, fieldDefinitions, connectedFieldKeys).length
  const inputHeight = (ports.flowInputs.length + ports.dataInputs.length) * PORT_HEIGHT
  const fieldHeight = node.expanded
    ? Math.min(NODE_FIELDS_MAX_HEIGHT, NODE_FIELDS_PADDING + fieldCount * FIELD_HEIGHT)
    : 0
  const outputCount = ports.flowOutputs.length + ports.dataOutputs.length
  const outputHeight = outputCount ? NODE_PORT_PADDING + outputCount * PORT_HEIGHT : TERMINAL_HEIGHT
  return NODE_HEADER_HEIGHT + inputHeight + fieldHeight + outputHeight
}

export function getOutputAnchor(node, outputKey, fieldDefinitions, kind = 'flow', connectedFieldKeys = []) {
  const ports = getNodePorts(node)
  const outputs = [...ports.flowOutputs.map((port) => ({ ...port, kind: 'flow' })), ...ports.dataOutputs.map((port) => ({ ...port, kind: 'data' }))]
  const index = Math.max(0, outputs.findIndex((output) => output.key === outputKey && output.kind === kind))
  const height = getNodeHeight(node, fieldDefinitions, connectedFieldKeys)
  const outputCount = Math.max(1, outputs.length)
  return {
    x: node.x + NODE_WIDTH,
    y: node.y + height - outputCount * PORT_HEIGHT - NODE_PORT_PADDING / 2 + index * PORT_HEIGHT + PORT_HEIGHT / 2,
  }
}

export function getInputAnchor(node, inputKey, kind = 'flow') {
  const ports = getNodePorts(node)
  const inputs = [...ports.flowInputs.map((port) => ({ ...port, kind: 'flow' })), ...ports.dataInputs.map((port) => ({ ...port, kind: 'data' }))]
  const index = Math.max(0, inputs.findIndex((input) => input.key === inputKey && input.kind === kind))
  return {
    x: node.x,
    y: node.y + NODE_HEADER_HEIGHT + index * PORT_HEIGHT + PORT_HEIGHT / 2,
  }
}
