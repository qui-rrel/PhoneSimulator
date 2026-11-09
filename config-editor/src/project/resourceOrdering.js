import { getOrdinaryResourceSchema } from '../schema/resources.js'

export function syncManagedOrder(resources, type) {
  const schema = getOrdinaryResourceSchema(type)
  if (!schema?.orderField) return
  const typed = resources.filter((item) => item.resourceType === type)
  const groups = new Map()
  for (const item of typed) {
    const group = schema.orderGroupField ? String(item.data[schema.orderGroupField] ?? '') : '__all__'
    if (!groups.has(group)) groups.set(group, [])
    groups.get(group).push(item)
  }
  for (const reordered of groups.values()) {
    const existing = reordered.map((item) => Number(item.data[schema.orderField])).filter(Number.isFinite)
    const start = existing.length ? Math.min(...existing) : 0
    reordered.forEach((item, index) => {
      item.data[schema.orderField] = schema.orderDirection === 'descending'
        ? start + reordered.length - 1 - index
        : start + index
    })
  }
}

export function canOrderTogether(left, right) {
  if (!left || !right || left.resourceType !== right.resourceType) return false
  const schema = getOrdinaryResourceSchema(left.resourceType)
  if (!schema?.orderGroupField) return true
  return left.data[schema.orderGroupField] === right.data[schema.orderGroupField]
}

export function moveOrdinaryResource(resources, id, direction) {
  const resource = resources.find((item) => item.id === id)
  if (!resource?.mutable) return false
  const sameGroup = resources.filter((item) => canOrderTogether(item, resource))
  const target = sameGroup[sameGroup.indexOf(resource) + direction]
  if (!target) return false
  const sourceIndex = resources.indexOf(resource)
  const targetIndex = resources.indexOf(target)
  ;[resources[sourceIndex], resources[targetIndex]] = [resources[targetIndex], resources[sourceIndex]]
  syncManagedOrder(resources, resource.resourceType)
  return true
}

export function reorderOrdinaryResource(resources, id, targetId, position = 'before') {
  const resource = resources.find((item) => item.id === id)
  const target = resources.find((item) => item.id === targetId)
  if (!resource?.mutable || !target || !canOrderTogether(resource, target) || resource === target) return false
  resources.splice(resources.indexOf(resource), 1)
  const targetIndex = resources.indexOf(target)
  resources.splice(targetIndex + (position === 'after' ? 1 : 0), 0, resource)
  syncManagedOrder(resources, resource.resourceType)
  return true
}
