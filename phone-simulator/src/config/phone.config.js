import { Calculator, CalendarDays, Clock3, CloudSun, Compass, Image, Mail, MessageCircle, Music2, NotebookPen, Phone, Settings } from 'lucide-vue-next'
import content from '../data/content.json'

const appFallbacks = {
  messages: { icon: MessageCircle, color: '#31c45d' },
  phone: { icon: Phone, color: '#36c568' },
  music: { icon: Music2, color: '#f24666' },
  browser: { icon: Compass, color: '#ffffff', iconColor: '#248bf0' },
  photos: { icon: Image, color: '#ffffff', iconColor: '#ef556d' },
  notes: { icon: NotebookPen, color: '#f6c846' },
  mail: { icon: Mail, color: '#247eea' },
  calendar: { icon: CalendarDays, color: '#ffffff', iconColor: '#ef3d45' },
  weather: { icon: CloudSun, color: '#4fa2f5' },
  clock: { icon: Clock3, color: '#111318' },
  settings: { icon: Settings, color: '#9096a2' },
  wechat: { icon: MessageCircle, color: '#07c160' },
  calculator: { icon: Calculator, color: '#f2f2f4', iconColor: '#25262a' },
}
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
  apps: contentConfig.apps.map((app) => {
    const fallback = appFallbacks[app.id] || { icon: Compass, color: '#667085' }
    return { ...fallback, ...app, icon: fallback.icon }
  }),
}
