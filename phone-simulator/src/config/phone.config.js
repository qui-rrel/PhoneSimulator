import { CalendarDays, Clock3, CloudSun, Compass, Image, Mail, MessageCircle, Music2, NotebookPen, Phone, Settings } from 'lucide-vue-next'
import content from '../data/content.json'

const iconRegistry = { CalendarDays, Clock3, CloudSun, Compass, Image, Mail, MessageCircle, Music2, NotebookPen, Phone, Settings }
const LOCAL_TIME_TOKEN = '$localTime'
const pageOpenedTime = new Intl.DateTimeFormat('zh-CN', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
}).format(new Date())

function resolveLocalTime(value) {
  if (Array.isArray(value)) return value.map(resolveLocalTime)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveLocalTime(item)]))
  }
  return value === LOCAL_TIME_TOKEN ? pageOpenedTime : value
}

export const contentConfig = resolveLocalTime(content)
export const phoneConfig = {
  ...contentConfig,
  theme: { ...contentConfig.theme, wallpaper: contentConfig.theme.homeWallpaper },
  apps: contentConfig.apps.map((app) => ({ ...app, icon: iconRegistry[app.icon] || Compass })),
}
