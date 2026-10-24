const conditions = [
  { label: '晴', icon: 'sun' },
  { label: '晴间多云', icon: 'cloud-sun' },
  { label: '多云', icon: 'cloud' },
  { label: '阵雨', icon: 'rain' },
]

const hashText = (text) => [...text].reduce((sum, char) => sum + char.charCodeAt(0), 0)

export function createWeatherSnapshot(config, date = new Date()) {
  const seed = (config.seed || 0) + hashText(config.location || '') + Number(`${date.getFullYear()}${date.getMonth() + 1}${date.getDate()}`)
  const condition = conditions[Math.abs(seed) % conditions.length]
  const temperature = 14 + (Math.abs(seed * 17) % 12)
  const high = temperature + 3 + (Math.abs(seed) % 3)
  const low = temperature - 4 - (Math.abs(seed) % 2)
  const hourly = Array.from({ length: 6 }, (_, index) => ({
    time: index === 0 ? '现在' : `${(date.getHours() + index) % 24}时`,
    value: temperature - Math.floor(index / 2),
    icon: index > 3 && condition.icon === 'rain' ? 'rain' : condition.icon,
  }))
  const days = Array.from({ length: 7 }, (_, index) => {
    const next = new Date(date)
    next.setDate(date.getDate() + index)
    const daySeed = seed + index * 7
    return {
      label: index === 0 ? '今天' : new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(next),
      low: low + (daySeed % 3),
      high: high + ((daySeed + 1) % 3) - 1,
      icon: conditions[Math.abs(daySeed) % conditions.length].icon,
    }
  })
  return { location: config.location || '本地', condition: condition.label, temperature, high, low, hourly, days }
}
