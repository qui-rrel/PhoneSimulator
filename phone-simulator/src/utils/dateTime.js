import { createDeviceDate } from '../config/phone.config'

const DATE_TIME_PATTERN = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:(?:\s+|T)(\d{1,2}):(\d{2})(?::\d{2})?)?$/
const CLOCK_PATTERN = /^(\d{1,2}):(\d{2})$/

function parseConfiguredDateTime(value) {
  const text = String(value || '').trim()
  const clock = text.match(CLOCK_PATTERN)
  if (clock) {
    return {
      text,
      clock: `${clock[1].padStart(2, '0')}:${clock[2]}`,
    }
  }

  const fullDate = text.match(DATE_TIME_PATTERN)
  if (!fullDate) return { text }
  const [, year, month, day, hour, minute] = fullDate
  return {
    text,
    year: Number(year),
    month: Number(month),
    day: Number(day),
    date: `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
    shortDate: `${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
    clock: hour === undefined ? '' : `${hour.padStart(2, '0')}:${minute}`,
  }
}

export function formatChatTimestamp(value) {
  const parsed = parseConfiguredDateTime(value)
  if (parsed.year === undefined) return parsed.clock || parsed.text

  const deviceDate = createDeviceDate()
  const date = parsed.year === deviceDate.getFullYear() ? parsed.shortDate : parsed.date
  return parsed.clock ? `${date} ${parsed.clock}` : date
}

export function formatListTimestamp(value) {
  const parsed = parseConfiguredDateTime(value)
  if (parsed.year === undefined) return parsed.clock || parsed.text

  const deviceDate = createDeviceDate()
  const sameYear = parsed.year === deviceDate.getFullYear()
  const sameDay = sameYear
    && parsed.month === deviceDate.getMonth() + 1
    && parsed.day === deviceDate.getDate()
  if (sameDay && parsed.clock) return parsed.clock
  return sameYear ? parsed.shortDate : parsed.date
}
