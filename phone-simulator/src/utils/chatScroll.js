function afterLayoutFrames() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(resolve))
  })
}

function waitForPendingImages(container) {
  const pendingImages = [...container.querySelectorAll('img')].filter((image) => !image.complete)
  if (!pendingImages.length) return Promise.resolve()

  const loaded = Promise.all(pendingImages.map((image) => new Promise((resolve) => {
    image.addEventListener('load', resolve, { once: true })
    image.addEventListener('error', resolve, { once: true })
  })))
  const timeout = new Promise((resolve) => window.setTimeout(resolve, 1800))
  return Promise.race([loaded, timeout])
}

export async function settleChatScrollAtBottom(container, isActive = () => true) {
  if (!container || !isActive()) return
  const align = () => {
    if (isActive()) container.scrollTop = container.scrollHeight
  }

  align()
  await afterLayoutFrames()
  align()
  await waitForPendingImages(container)
  align()
}
