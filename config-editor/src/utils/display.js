export function fieldLabel(field, mode) {
  if (mode === 'json') return field.key
  if (mode === 'dual') return `${field.labelZh} · ${field.key}`
  return field.labelZh
}

export function optionLabel(field, value, mode) {
  const option = field.options?.find((item) => item.value === value)
  if (!option) return String(value ?? '')
  if (mode === 'json') return option.value
  if (mode === 'dual') return `${option.labelZh} · ${option.value}`
  return option.labelZh
}

export function itemTitle(item, mode) {
  if (!item) return ''
  const identifier = item.runtimeId !== undefined ? (item.runtimeId || item.name) : item.id
  if (mode === 'json') return identifier
  if (mode === 'dual') return `${item.name} · ${identifier}`
  return item.name
}
