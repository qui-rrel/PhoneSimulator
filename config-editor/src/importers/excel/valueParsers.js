export const LOCAL_TIME_INPUT = 'LOCAL_TIME'
export const LOCAL_TIME_TOKEN = '$localTime'

export function asText(value) {
  if (value === null || value === undefined || value === '') return ''
  if (value instanceof Date) {
    const year = value.getUTCFullYear()
    const month = String(value.getUTCMonth() + 1).padStart(2, '0')
    const day = String(value.getUTCDate()).padStart(2, '0')
    const hours = String(value.getUTCHours()).padStart(2, '0')
    const minutes = String(value.getUTCMinutes()).padStart(2, '0')
    return value.getUTCHours() || value.getUTCMinutes() || value.getUTCSeconds()
      ? `${year}-${month}-${day} ${hours}:${minutes}`
      : `${year}-${month}-${day}`
  }
  if (typeof value === 'number' && Number.isInteger(value)) return String(value)
  return String(value).replace(/\r\n?/g, '\n').trim()
}

export function asBool(value) {
  if (typeof value === 'boolean') return value
  return ['true', '1', '是', '开', '开启', 'yes'].includes(asText(value).toLowerCase())
}

export function asNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback
  const number = Number(value)
  if (!Number.isFinite(number)) throw new Error(`数值 ${JSON.stringify(value)} 无法识别。`)
  return number
}

export function secondsToMs(value, fallbackSeconds = 0) {
  const seconds = asNumber(value, fallbackSeconds)
  if (seconds < 0) throw new Error('剧情时间不能为负数，请按秒填写 0 或正数。')
  return seconds * 1000
}

export function asDisplayTime(value) {
  const text = asText(value)
  return text === LOCAL_TIME_INPUT ? LOCAL_TIME_TOKEN : text
}

export function asTimeText(value, label, allowBlank = false) {
  if (value === null || value === undefined || value === '') {
    if (allowBlank) return ''
    throw new Error(`${label}：时间不能为空，请按 HH:MM 填写。`)
  }
  if (value instanceof Date) {
    return `${String(value.getUTCHours()).padStart(2, '0')}:${String(value.getUTCMinutes()).padStart(2, '0')}`
  }
  if (typeof value === 'number') {
    const minutes = Math.round((value % 1) * 24 * 60) % (24 * 60)
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
  }
  const candidate = asText(value)
  if (/^\d+(?:\.\d+)?$/.test(candidate) && Number(candidate) < 1) {
    return asTimeText(Number(candidate), label, allowBlank)
  }
  const match = candidate.match(/^(\d{1,2})[:：](\d{1,2})$/)
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) {
    throw new Error(`${label}：${JSON.stringify(candidate)} 不是有效时间，请按 HH:MM 填写。`)
  }
  return `${String(Number(match[1])).padStart(2, '0')}:${String(Number(match[2])).padStart(2, '0')}`
}

export function asDateText(value, label) {
  if (value instanceof Date) {
    const year = value.getUTCFullYear()
    const month = String(value.getUTCMonth() + 1).padStart(2, '0')
    const day = String(value.getUTCDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  const match = asText(value).match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if (!match) throw new Error(`${label}：${JSON.stringify(asText(value))} 不是有效日期，请按 YYYY-MM-DD 填写。`)
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  if (date.getFullYear() !== Number(match[1]) || date.getMonth() !== Number(match[2]) - 1 || date.getDate() !== Number(match[3])) {
    throw new Error(`${label}：${JSON.stringify(asText(value))} 不是有效日期。`)
  }
  return `${match[1]}-${String(Number(match[2])).padStart(2, '0')}-${String(Number(match[3])).padStart(2, '0')}`
}

export function asLineList(value, label, maxItems) {
  const items = asText(value).split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
  if (maxItems !== undefined && items.length > maxItems) {
    throw new Error(`${label}：最多填写 ${maxItems} 项，当前填写了 ${items.length} 项。`)
  }
  return items
}

export function setPath(target, keyPath, value) {
  const keys = keyPath.split('.')
  let cursor = target
  for (const key of keys.slice(0, -1)) cursor = (cursor[key] ||= {})
  cursor[keys.at(-1)] = value
}

export function uniqueIds(items, key, label) {
  const seen = new Set()
  for (const item of items) {
    const value = item[key] ?? ''
    if (!value) throw new Error(`${label}：ID 不能为空。`)
    if (seen.has(value)) throw new Error(`${label}：ID ${JSON.stringify(value)} 重复。`)
    seen.add(value)
  }
  return seen
}

export function deepClone(value) {
  return JSON.parse(JSON.stringify(value))
}
