import { ref } from 'vue'

export function usePointerScroll() {
  const dragging = ref(false)
  let target = null
  let pointerId = null
  let startY = 0
  let startScrollTop = 0

  function beginPointerScroll(event) {
    if (event.pointerType !== 'mouse' || event.button !== 0) return
    if (event.currentTarget.scrollHeight <= event.currentTarget.clientHeight) return
    target = event.currentTarget
    pointerId = event.pointerId
    startY = event.clientY
    startScrollTop = target.scrollTop
    dragging.value = true
    target.setPointerCapture?.(pointerId)
  }

  function movePointerScroll(event) {
    if (!dragging.value || event.pointerId !== pointerId || !target) return
    event.preventDefault()
    target.scrollTop = startScrollTop - (event.clientY - startY)
  }

  function endPointerScroll(event) {
    if (!dragging.value || event.pointerId !== pointerId) return
    target?.releasePointerCapture?.(pointerId)
    dragging.value = false
    target = null
    pointerId = null
  }

  function wheelPointerScroll(event) {
    const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? event.currentTarget.clientHeight : 1
    event.currentTarget.scrollTop += event.deltaY * scale
  }

  return { dragging, beginPointerScroll, movePointerScroll, endPointerScroll, wheelPointerScroll }
}
