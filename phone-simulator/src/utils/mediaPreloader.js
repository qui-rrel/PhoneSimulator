const CALL_UI_ASSETS = [
  '/media/UI/CallIcon/accept-call-icon.png',
  '/media/UI/CallIcon/decline-call-icon.png',
  '/media/UI/CallIcon/mute-call-icon.png',
  '/media/UI/CallIcon/speaker-call-icon.png',
]

const IMAGE_EXTENSION = /\.(?:avif|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i
const MEDIA_EXTENSION = /\.(?:aac|m4a|mp3|mp4|ogg|ogv|wav|webm)(?:[?#].*)?$/i
const CSS_URL_PATTERN = /url\(\s*(?:"([^"]+)"|'([^']+)'|([^\s)]+))\s*\)/gi
const warmedSources = new Set()

function uniqueSources(items) {
  return [...new Set(items.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim()))]
}

function collectMediaPaths(value, result = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectMediaPaths(item, result))
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectMediaPaths(item, result))
  } else if (typeof value === 'string') {
    const directPath = value.trim()
    if (directPath.startsWith('/media/') && (IMAGE_EXTENSION.test(directPath) || MEDIA_EXTENSION.test(directPath))) {
      result.push(directPath)
    }
    for (const match of value.matchAll(CSS_URL_PATTERN)) {
      const path = match[1] || match[2] || match[3]
      if (path?.startsWith('/media/') && (IMAGE_EXTENSION.test(path) || MEDIA_EXTENSION.test(path))) result.push(path)
    }
  }
  return result
}

function waitForLoadingSlice() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(resolve, { timeout: 500 })
      } else {
        window.setTimeout(resolve, 0)
      }
    })
  })
}

function preloadImage(src, { fetchPriority = 'low', timeoutMs = 12000 } = {}) {
  return new Promise((resolve) => {
    const image = new Image()
    let settled = false
    let timeout
    const finish = async () => {
      if (settled) return
      settled = true
      window.clearTimeout(timeout)
      image.onload = null
      image.onerror = null
      if (image.decode) await image.decode().catch(() => {})
      resolve()
    }
    timeout = window.setTimeout(finish, timeoutMs)
    image.decoding = 'async'
    image.fetchPriority = fetchPriority
    image.onload = finish
    image.onerror = finish
    image.src = src
    if (image.complete) finish()
  })
}

function preloadPlayableMedia(src) {
  return new Promise((resolve) => {
    const isVideo = /\.(?:mp4|ogv|webm)(?:[?#].*)?$/i.test(src)
    const media = document.createElement(isVideo ? 'video' : 'audio')
    let settled = false
    const timeout = window.setTimeout(finish, 12000)
    function finish() {
      if (settled) return
      settled = true
      window.clearTimeout(timeout)
      media.removeEventListener('canplaythrough', finish)
      media.removeEventListener('error', finish)
      resolve()
    }
    media.preload = 'auto'
    media.addEventListener('canplaythrough', finish, { once: true })
    media.addEventListener('error', finish, { once: true })
    media.src = src
    media.load()
  })
}

async function preloadStage(sources, loader, state) {
  const queue = uniqueSources(sources).filter((src) => !warmedSources.has(src))
  let cursor = 0
  async function worker() {
    while (!state.cancelled && cursor < queue.length) {
      const src = queue[cursor]
      cursor += 1
      await waitForLoadingSlice()
      if (state.cancelled) return
      warmedSources.add(src)
      await loader(src)
    }
  }
  const workerCount = Math.min(3, queue.length)
  await Promise.allSettled(Array.from({ length: workerCount }, worker))
}

export async function preloadLockScreenMedia(config) {
  const apps = new Map((config.apps || []).map((app) => [app.id, app]))
  const contacts = new Map((config.contacts || []).map((contact) => [contact.id, contact]))
  const notificationImages = (config.lockNotifications || []).flatMap((item) => {
    const contact = contacts.get(item.contactId)
    if (['messages', 'phone'].includes(item.appId) && contact?.avatar) return [contact.avatar]
    return [apps.get(item.appId)?.iconSrc]
  })
  const sources = uniqueSources([
    ...collectMediaPaths(config.theme?.lockWallpaper || config.theme?.homeWallpaper),
    ...notificationImages,
  ]).filter((src) => IMAGE_EXTENSION.test(src))

  await Promise.allSettled(sources.map((src) => {
    warmedSources.add(src)
    return preloadImage(src, { fetchPriority: 'high' })
  }))
}

export function startProgressiveMediaPreload(config) {
  const state = { cancelled: false }
  const homeWallpaperImages = uniqueSources(collectMediaPaths(config.theme?.homeWallpaper))
  const appIcons = uniqueSources(config.apps?.filter((app) => app.enabled !== false).map((app) => app.iconSrc) || [])
  const galleryImages = uniqueSources(config.gallery?.map((photo) => photo.src) || [])
  const configuredSources = uniqueSources(collectMediaPaths(config))
  const reservedImages = new Set([...homeWallpaperImages, ...appIcons, ...galleryImages])
  const otherUiImages = uniqueSources([
    ...CALL_UI_ASSETS,
    ...configuredSources.filter((src) => IMAGE_EXTENSION.test(src) && !reservedImages.has(src)),
  ])
  const playableMedia = configuredSources.filter((src) => MEDIA_EXTENSION.test(src))

  void (async () => {
    await preloadStage(homeWallpaperImages, (src) => preloadImage(src, { fetchPriority: 'auto' }), state)
    if (state.cancelled) return
    await preloadStage(appIcons, preloadImage, state)
    if (state.cancelled) return
    await preloadStage(otherUiImages, preloadImage, state)
    if (state.cancelled) return
    await preloadStage(galleryImages, preloadImage, state)
    if (state.cancelled) return
    await preloadStage(playableMedia, preloadPlayableMedia, state)
  })()

  return () => { state.cancelled = true }
}
