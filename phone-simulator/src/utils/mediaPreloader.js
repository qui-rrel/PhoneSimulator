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

function preloadImage(src) {
  return new Promise((resolve) => {
    const image = new Image()
    let settled = false
    const finish = async () => {
      if (settled) return
      settled = true
      image.onload = null
      image.onerror = null
      if (image.decode) await image.decode().catch(() => {})
      resolve()
    }
    image.decoding = 'async'
    image.fetchPriority = 'low'
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
  const pending = []
  for (const src of uniqueSources(sources)) {
    if (state.cancelled || warmedSources.has(src)) continue
    await waitForLoadingSlice()
    if (state.cancelled) break
    warmedSources.add(src)
    pending.push(loader(src))
  }
  await Promise.allSettled(pending)
}

export function startProgressiveMediaPreload(config) {
  const state = { cancelled: false }
  const appIcons = uniqueSources(config.apps?.filter((app) => app.enabled !== false).map((app) => app.iconSrc) || [])
  const galleryImages = uniqueSources(config.gallery?.map((photo) => photo.src) || [])
  const configuredSources = uniqueSources(collectMediaPaths(config))
  const reservedImages = new Set([...appIcons, ...galleryImages])
  const otherUiImages = uniqueSources([
    ...CALL_UI_ASSETS,
    ...configuredSources.filter((src) => IMAGE_EXTENSION.test(src) && !reservedImages.has(src)),
  ])
  const playableMedia = configuredSources.filter((src) => MEDIA_EXTENSION.test(src))

  void (async () => {
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
