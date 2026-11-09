import { getSequenceSchema } from '../schema/sequences.js'

const clone = (value) => JSON.parse(JSON.stringify(value))
const getPath = (target, path) => path.split('.').reduce((value, key) => value?.[key], target)

function setPath(target, path, value) {
  const keys = path.split('.')
  let cursor = target
  for (const key of keys.slice(0, -1)) cursor = (cursor[key] ||= {})
  cursor[keys.at(-1)] = value
}

function fromRuntime(field, source) {
  const value = getPath(source, field.runtimePath)
  if (value === undefined) return undefined
  return field.storage === 'milliseconds' ? Number(value) / 1000 : clone(value)
}

function toRuntime(field, value) {
  if (value === undefined) return undefined
  return field.storage === 'milliseconds' ? Number(value) * 1000 : clone(value)
}

function editorKey(prefix) {
  return `${prefix}:${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`}`
}

function createItem(type, source, index, extraData, metadata = {}) {
  const schema = getSequenceSchema(type)
  const data = {}
  for (const field of schema.itemFields) {
    data[field.key] = extraData && Object.hasOwn(extraData, field.key)
      ? clone(extraData[field.key])
      : fromRuntime(field, source)
  }
  return {
    id: editorKey(`sequence-item:${type}:${index}`),
    data,
    source: clone(source || {}),
    expanded: metadata.expanded !== false,
  }
}

export function createSequenceEditorResource(type, runtime, index, metadata = {}) {
  const schema = getSequenceSchema(type)
  const data = {}
  for (const field of schema.scriptFields) {
    data[field.key] = field.editorOnly ? (metadata.name || runtime.id) : fromRuntime(field, runtime)
  }
  const items = schema.rootItem
    ? [createItem(type, runtime, 0, null, metadata.itemStates?.[0])]
    : (getPath(runtime, schema.itemPath) || []).map((item, itemIndex) =>
        createItem(type, item, itemIndex, null, metadata.itemStates?.[itemIndex]))
  return {
    id: editorKey(`sequence:${type}:${runtime.id || index}`),
    runtimeId: runtime.id || '', name: metadata.name || runtime.id || `${schema.label} ${index + 1}`,
    resourceType: type, typeLabel: schema.label, description: `可由剧情事件引用的${schema.label}`,
    fieldKeys: [...schema.scriptFieldKeys], itemFieldKeys: [...schema.itemFieldKeys],
    data, items, source: clone(runtime || {}), mutable: true,
  }
}

function applyFields(output, fields, data) {
  for (const field of fields) {
    if (field.editorOnly) continue
    const value = toRuntime(field, data[field.key])
    if (value !== undefined) setPath(output, field.runtimePath, value)
  }
}

export function sequenceResourceToRuntime(resource) {
  const schema = getSequenceSchema(resource.resourceType)
  const output = clone(resource.source || {})
  applyFields(output, schema.scriptFields, resource.data)
  if (schema.rootItem) {
    applyFields(output, schema.itemFields, resource.items[0]?.data || {})
  } else {
    setPath(output, schema.itemPath, resource.items.map((item) => {
      const result = clone(item.source || {})
      applyFields(result, schema.itemFields, item.data)
      return result
    }))
  }
  return output
}

function nextId(type, resources) {
  const used = new Set(resources.filter((item) => item.resourceType === type).map((item) => item.runtimeId))
  let index = 1
  while (used.has(`new-${type}-${index}`)) index += 1
  return `new-${type}-${index}`
}

export function createSequenceResource(type, resources, copyFrom = null) {
  const schema = getSequenceSchema(type)
  const runtimeId = nextId(type, resources)
  const data = Object.fromEntries(schema.scriptFields.map((field) => [field.key, clone(field.default)]))
  data['script.id'] = runtimeId
  data['script.name'] = copyFrom ? `${copyFrom.name} 副本` : runtimeId
  if (copyFrom) Object.assign(data, clone(copyFrom.data), { 'script.id': runtimeId, 'script.name': `${copyFrom.name} 副本` })
  const resource = createSequenceEditorResource(type, { id: runtimeId }, resources.length, { name: data['script.name'] })
  resource.data = data
  resource.runtimeId = runtimeId
  resource.name = data['script.name']
  resource.source = {}
  resource.items = copyFrom
    ? copyFrom.items.map((item, index) => createItem(type, {}, index, item.data, { expanded: item.expanded }))
    : schema.rootItem ? [createItem(type, {}, 0, Object.fromEntries(schema.itemFields.map((field) => [field.key, clone(field.default)])))] : []
  return resource
}

export function createSequenceItem(resource, copyFrom = null) {
  const schema = getSequenceSchema(resource.resourceType)
  if (schema.rootItem) throw new Error('该脚本只有一个固定内容项。')
  const defaults = Object.fromEntries(schema.itemFields.map((field) => [field.key, clone(field.default)]))
  return createItem(resource.resourceType, {}, resource.items.length, copyFrom ? copyFrom.data : defaults)
}
