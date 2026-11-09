<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import {
  CopyPlus, Frame, Maximize2, Minus, MousePointer2, Plus, Redo2, Search, Trash2, Undo2, Workflow,
} from 'lucide-vue-next'
import BlueprintNode from './BlueprintNode.vue'
import GraphGroup from './GraphGroup.vue'
import { getInputAnchor, getNodeHeight, getOutputAnchor, NODE_WIDTH } from '../graph/geometry'
import { arePortTypesCompatible, getNodePorts, graphNodePaletteItems, nodeTypes } from '../schema/nodeTypes'

const props = defineProps({
  nodes: { type: Array, required: true },
  edges: { type: Array, required: true },
  groups: { type: Array, default: () => [] },
  fieldDefinitions: { type: Object, required: true },
  selectedId: { type: String, required: true },
  displayMode: { type: String, required: true },
  canUndo: { type: Boolean, default: false },
  canRedo: { type: Boolean, default: false },
  focusRequest: { type: Number, default: 0 },
})

const emit = defineEmits([
  'select', 'toggle', 'move-many', 'update-field', 'arrange', 'connect', 'delete-edge',
  'create-node', 'create-connected-node', 'delete-nodes', 'duplicate-nodes',
  'create-group', 'move-group', 'resize-group', 'rename-group', 'delete-group',
  'undo', 'redo',
])

const viewportElement = ref(null)
const paletteSearch = ref(null)
const viewport = reactive({ x: 30, y: 20, scale: 0.76 })
const selectedNodeIds = ref(props.selectedId ? [props.selectedId] : [])
const selectedEdgeId = ref('')
const selectedGroupId = ref('')
const marquee = reactive({ active: false, startX: 0, startY: 0, x: 0, y: 0, width: 0, height: 0 })
const palette = reactive({ open: false, x: 0, y: 0, worldX: 0, worldY: 0, query: '', pending: null })
const connection = ref(null)
const pointerWorld = reactive({ x: 0, y: 0 })
let interaction = null
let spacePressed = false

watch(() => props.selectedId, (id) => {
  if (id && !selectedNodeIds.value.includes(id)) selectedNodeIds.value = [id]
})
watch(() => props.nodes.map((node) => node.id), (ids) => {
  const available = new Set(ids)
  selectedNodeIds.value = selectedNodeIds.value.filter((id) => available.has(id))
})
watch(() => props.edges.map((edge) => edge.id), (ids) => {
  if (selectedEdgeId.value && !ids.includes(selectedEdgeId.value)) selectedEdgeId.value = ''
})
watch(() => props.groups.map((group) => group.id), (ids) => {
  if (selectedGroupId.value && !ids.includes(selectedGroupId.value)) selectedGroupId.value = ''
})
watch(() => props.focusRequest, async (request) => {
  if (!request) return
  const node = props.nodes.find((item) => item.id === props.selectedId)
  if (!node) return
  await nextTick()
  fitItems([node])
}, { immediate: true })

const connectedFields = computed(() => {
  const result = new Map()
  for (const edge of props.edges.filter((item) => item.kind === 'data')) {
    const target = props.nodes.find((node) => node.id === edge.to)
    const port = target && getNodePorts(target).dataInputs.find((item) => item.key === edge.input)
    if (!port?.fieldKey) continue
    if (!result.has(edge.to)) result.set(edge.to, [])
    result.get(edge.to).push(port.fieldKey)
  }
  return result
})

function fieldsForNode(nodeId) {
  return connectedFields.value.get(nodeId) || []
}

const contentBounds = computed(() => {
  const items = [
    ...props.nodes.map((node) => ({
      minX: node.x, minY: node.y, maxX: node.x + NODE_WIDTH,
      maxY: node.y + getNodeHeight(node, props.fieldDefinitions, fieldsForNode(node.id)),
    })),
    ...props.groups.map((group) => ({
      minX: group.x, minY: group.y, maxX: group.x + group.width, maxY: group.y + group.height,
    })),
  ]
  if (!items.length) return { minX: 0, minY: 0, maxX: 1, maxY: 1, width: 1, height: 1 }
  const minX = Math.min(...items.map((item) => item.minX))
  const minY = Math.min(...items.map((item) => item.minY))
  const maxX = Math.max(...items.map((item) => item.maxX))
  const maxY = Math.max(...items.map((item) => item.maxY))
  return { minX, minY, maxX, maxY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) }
})

const worldBounds = computed(() => {
  const padding = 700
  return {
    minX: contentBounds.value.minX - padding,
    minY: contentBounds.value.minY - padding,
    width: contentBounds.value.width + padding * 2,
    height: contentBounds.value.height + padding * 2,
  }
})

const worldStyle = computed(() => ({
  width: '1px', height: '1px',
  transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
}))

const edgeLayerStyle = computed(() => ({
  left: `${worldBounds.value.minX}px`, top: `${worldBounds.value.minY}px`,
  width: `${worldBounds.value.width}px`, height: `${worldBounds.value.height}px`,
}))

const gridStyle = computed(() => {
  const large = 80 * viewport.scale
  const small = 16 * viewport.scale
  const position = `${viewport.x}px ${viewport.y}px`
  return {
    backgroundSize: `${large}px ${large}px, ${large}px ${large}px, ${small}px ${small}px, ${small}px ${small}px`,
    backgroundPosition: `${position}, ${position}, ${position}, ${position}`,
  }
})

function edgePath(start, end) {
  const curve = Math.max(90, Math.abs(end.x - start.x) * 0.46)
  return `M ${start.x} ${start.y} C ${start.x + curve} ${start.y}, ${end.x - curve} ${end.y}, ${end.x} ${end.y}`
}

const edgePaths = computed(() => props.edges.map((edge) => {
  const from = props.nodes.find((node) => node.id === edge.from)
  const to = props.nodes.find((node) => node.id === edge.to)
  if (!from || !to) return null
  const kind = edge.kind === 'data' ? 'data' : 'flow'
  const start = getOutputAnchor(from, kind === 'data' ? edge.output : edge.outcome, props.fieldDefinitions, kind, fieldsForNode(from.id))
  const end = getInputAnchor(to, edge.input, kind)
  return {
    ...edge, kind, path: edgePath(start, end),
    labelX: start.x + (end.x - start.x) * 0.5,
    labelY: start.y + (end.y - start.y) * 0.5 - 8,
  }
}).filter(Boolean))

const pendingPath = computed(() => {
  if (!connection.value) return ''
  const node = props.nodes.find((item) => item.id === connection.value.nodeId)
  if (!node) return ''
  const fixed = connection.value.direction === 'output'
    ? getOutputAnchor(node, connection.value.port.key, props.fieldDefinitions, connection.value.kind, fieldsForNode(node.id))
    : getInputAnchor(node, connection.value.port.key, connection.value.kind)
  return connection.value.direction === 'output'
    ? edgePath(fixed, pointerWorld)
    : edgePath(pointerWorld, fixed)
})

const minimapNodes = computed(() => {
  const scale = Math.min(154 / contentBounds.value.width, 82 / contentBounds.value.height)
  const offsetX = 5 + (154 - contentBounds.value.width * scale) / 2
  const offsetY = 5 + (82 - contentBounds.value.height * scale) / 2
  return props.nodes.map((node) => ({
    ...node,
    miniX: offsetX + (node.x - contentBounds.value.minX) * scale,
    miniY: offsetY + (node.y - contentBounds.value.minY) * scale,
    miniWidth: Math.max(4, NODE_WIDTH * scale),
    miniHeight: Math.max(4, getNodeHeight(node, props.fieldDefinitions, fieldsForNode(node.id)) * scale),
  }))
})

function candidatePort(item) {
  if (!palette.pending) return null
  const meta = nodeTypes[item.type]
  const pending = palette.pending
  if (pending.direction === 'output') {
    const candidates = [
      ...meta.flowInputs.map((port) => ({ ...port, kind: 'flow' })),
      ...meta.dataInputs.map((port) => ({ ...port, kind: 'data' })),
    ]
    return candidates.find((port) => port.valueType === pending.port.valueType) || null
  }
  const candidates = [
    ...meta.flowOutputs.map((port) => ({ ...port, kind: 'flow' })),
    ...meta.dataOutputs.map((port) => ({ ...port, kind: 'data' })),
  ]
  return candidates.find((port) => port.valueType === pending.port.valueType) || null
}

const paletteItems = computed(() => {
  const keyword = palette.query.trim().toLowerCase()
  return graphNodePaletteItems()
    .map((item) => ({ ...item, autoPort: candidatePort(item) }))
    .filter((item) => (!palette.pending || item.autoPort) && (!keyword || `${item.label} ${item.type} ${item.category}`.toLowerCase().includes(keyword)))
})

const paletteGroups = computed(() => {
  const groups = new Map()
  for (const item of paletteItems.value) {
    if (!groups.has(item.category)) groups.set(item.category, [])
    groups.get(item.category).push(item)
  }
  return [...groups.entries()].map(([name, items]) => ({ name, items }))
})

function clampScale(value) { return Math.min(1.35, Math.max(0.38, value)) }
function screenToWorld(clientX, clientY) {
  const rect = viewportElement.value.getBoundingClientRect()
  return { x: (clientX - rect.left - viewport.x) / viewport.scale, y: (clientY - rect.top - viewport.y) / viewport.scale }
}

function zoomAt(clientX, clientY, nextScale) {
  const rect = viewportElement.value.getBoundingClientRect()
  const pointerX = clientX - rect.left
  const pointerY = clientY - rect.top
  const worldX = (pointerX - viewport.x) / viewport.scale
  const worldY = (pointerY - viewport.y) / viewport.scale
  viewport.scale = clampScale(nextScale)
  viewport.x = pointerX - worldX * viewport.scale
  viewport.y = pointerY - worldY * viewport.scale
}

function zoomBy(delta) {
  const rect = viewportElement.value.getBoundingClientRect()
  zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, viewport.scale + delta)
}

function handleWheel(event) {
  zoomAt(event.clientX, event.clientY, viewport.scale + (event.deltaY > 0 ? -0.08 : 0.08))
}

function handlePaletteWheel(event) {
  const scroller = event.currentTarget.querySelector('.node-palette-scroll')
  if (!scroller) return
  event.preventDefault()
  event.stopPropagation()
  const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 18
    : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? scroller.clientHeight
      : 1
  scroller.scrollTop += event.deltaY * unit
}

function fitItems(items = props.nodes) {
  if (!items.length) return
  const rect = viewportElement.value.getBoundingClientRect()
  const minX = Math.min(...items.map((node) => node.x))
  const minY = Math.min(...items.map((node) => node.y))
  const maxX = Math.max(...items.map((node) => node.x + NODE_WIDTH))
  const maxY = Math.max(...items.map((node) => node.y + getNodeHeight(node, props.fieldDefinitions, fieldsForNode(node.id))))
  const scale = clampScale(Math.min((rect.width - 100) / Math.max(300, maxX - minX), (rect.height - 100) / Math.max(240, maxY - minY)))
  viewport.scale = scale
  viewport.x = (rect.width - (maxX - minX) * scale) / 2 - minX * scale
  viewport.y = (rect.height - (maxY - minY) * scale) / 2 - minY * scale
}

function resetView() { fitItems() }

function addWindowInteractionListeners() {
  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', stopInteraction)
}

function beginCanvasInteraction(event) {
  if (event.target.closest('.blueprint-node, .canvas-controls, .minimap, .graph-toolbar, .node-palette, .graph-group')) return
  viewportElement.value.focus()
  closePalette()
  selectedEdgeId.value = ''
  selectedGroupId.value = ''
  if (event.button === 1 || (event.button === 0 && spacePressed)) {
    event.preventDefault()
    interaction = { kind: 'pan', startX: event.clientX, startY: event.clientY, originX: viewport.x, originY: viewport.y }
    addWindowInteractionListeners()
    return
  }
  if (event.button !== 0) return
  const rect = viewportElement.value.getBoundingClientRect()
  interaction = {
    kind: 'marquee', startX: event.clientX, startY: event.clientY,
    canvasX: event.clientX - rect.left, canvasY: event.clientY - rect.top,
    additive: event.ctrlKey || event.metaKey, baseSelection: [...selectedNodeIds.value],
  }
  marquee.active = true
  marquee.startX = interaction.canvasX
  marquee.startY = interaction.canvasY
  marquee.x = interaction.canvasX
  marquee.y = interaction.canvasY
  marquee.width = 0
  marquee.height = 0
  if (!event.ctrlKey && !event.metaKey) {
    selectedNodeIds.value = []
    emit('select', '')
  }
  addWindowInteractionListeners()
}

function selectNode({ nodeId, event }) {
  if (event?.ctrlKey || event?.metaKey) {
    selectedNodeIds.value = selectedNodeIds.value.includes(nodeId)
      ? selectedNodeIds.value.filter((id) => id !== nodeId)
      : [...selectedNodeIds.value, nodeId]
  } else if (!selectedNodeIds.value.includes(nodeId)) selectedNodeIds.value = [nodeId]
  selectedEdgeId.value = ''
  selectedGroupId.value = ''
  const primary = selectedNodeIds.value.at(-1) || nodeId
  emit('select', primary)
}

function startNodeDrag(node, event) {
  if (event.button !== 0) return
  if (event.ctrlKey || event.metaKey) {
    selectNode({ nodeId: node.id, event })
    if (!selectedNodeIds.value.includes(node.id)) return
  } else if (!selectedNodeIds.value.includes(node.id)) {
    selectedNodeIds.value = [node.id]
    emit('select', node.id)
  }
  const origins = props.nodes.filter((item) => selectedNodeIds.value.includes(item.id))
    .map((item) => ({ id: item.id, x: item.x, y: item.y }))
  interaction = { kind: 'nodes', startX: event.clientX, startY: event.clientY, origins }
  addWindowInteractionListeners()
}

function startGroupDrag(group, event) {
  if (event.button !== 0) return
  selectedGroupId.value = group.id
  selectedNodeIds.value = []
  selectedEdgeId.value = ''
  emit('select', '')
  const contained = props.nodes.filter((node) => node.x >= group.x && node.y >= group.y
    && node.x + NODE_WIDTH <= group.x + group.width
    && node.y + getNodeHeight(node, props.fieldDefinitions, fieldsForNode(node.id)) <= group.y + group.height)
    .map((node) => ({ id: node.id, x: node.x, y: node.y }))
  interaction = { kind: 'group', id: group.id, startX: event.clientX, startY: event.clientY, x: group.x, y: group.y, contained }
  addWindowInteractionListeners()
}

function startGroupResize(group, event) {
  selectedGroupId.value = group.id
  selectedNodeIds.value = []
  selectedEdgeId.value = ''
  emit('select', '')
  interaction = { kind: 'group-resize', id: group.id, startX: event.clientX, startY: event.clientY, width: group.width, height: group.height }
  addWindowInteractionListeners()
}

function handlePointerMove(event) {
  if (!interaction) return
  const dx = (event.clientX - interaction.startX) / viewport.scale
  const dy = (event.clientY - interaction.startY) / viewport.scale
  if (interaction.kind === 'pan') {
    viewport.x = interaction.originX + event.clientX - interaction.startX
    viewport.y = interaction.originY + event.clientY - interaction.startY
  } else if (interaction.kind === 'nodes') {
    emit('move-many', interaction.origins.map((item) => ({ id: item.id, x: item.x + dx, y: item.y + dy })))
  } else if (interaction.kind === 'group') {
    emit('move-group', {
      id: interaction.id, x: interaction.x + dx, y: interaction.y + dy,
      nodes: interaction.contained.map((item) => ({ id: item.id, x: item.x + dx, y: item.y + dy })),
    })
  } else if (interaction.kind === 'group-resize') {
    emit('resize-group', { id: interaction.id, width: interaction.width + dx, height: interaction.height + dy })
  } else if (interaction.kind === 'marquee') {
    const rect = viewportElement.value.getBoundingClientRect()
    const currentX = event.clientX - rect.left
    const currentY = event.clientY - rect.top
    marquee.x = Math.min(interaction.canvasX, currentX)
    marquee.y = Math.min(interaction.canvasY, currentY)
    marquee.width = Math.abs(currentX - interaction.canvasX)
    marquee.height = Math.abs(currentY - interaction.canvasY)
  }
}

function finishMarquee() {
  const rect = viewportElement.value.getBoundingClientRect()
  if (marquee.width < 4 && marquee.height < 4) {
    selectedNodeIds.value = []
    emit('select', '')
    marquee.active = false
    return
  }
  const left = (marquee.x - viewport.x) / viewport.scale
  const top = (marquee.y - viewport.y) / viewport.scale
  const right = (marquee.x + marquee.width - viewport.x) / viewport.scale
  const bottom = (marquee.y + marquee.height - viewport.y) / viewport.scale
  const found = props.nodes.filter((node) => {
    const height = getNodeHeight(node, props.fieldDefinitions, fieldsForNode(node.id))
    return node.x < right && node.x + NODE_WIDTH > left && node.y < bottom && node.y + height > top
  }).map((node) => node.id)
  selectedNodeIds.value = interaction.additive ? [...new Set([...interaction.baseSelection, ...found])] : found
  if (selectedNodeIds.value.length) emit('select', selectedNodeIds.value.at(-1))
  else emit('select', '')
  marquee.active = false
  void rect
}

function stopInteraction() {
  if (interaction?.kind === 'marquee') finishMarquee()
  interaction = null
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', stopInteraction)
}

function startConnection(payload) {
  if (connection.value) return
  const kind = payload.port.valueType === 'flow' ? 'flow' : 'data'
  connection.value = { direction: payload.direction, nodeId: payload.nodeId, port: payload.port, kind }
  Object.assign(pointerWorld, screenToWorld(payload.event.clientX, payload.event.clientY))
  window.addEventListener('pointermove', moveConnection)
  window.addEventListener('pointerup', finishConnection)
}

function moveConnection(event) { Object.assign(pointerWorld, screenToWorld(event.clientX, event.clientY)) }

function endConnection(payload) {
  const pending = connection.value
  if (!pending || pending.direction === payload.direction || pending.nodeId === payload.nodeId) return
  const outputSide = pending.direction === 'output' ? pending : { ...payload, kind: payload.port.valueType === 'flow' ? 'flow' : 'data' }
  const inputSide = pending.direction === 'input' ? pending : { ...payload, kind: payload.port.valueType === 'flow' ? 'flow' : 'data' }
  if (!arePortTypesCompatible(outputSide.port, inputSide.port)) return
  emit('connect', {
    kind: outputSide.kind, from: outputSide.nodeId, output: outputSide.port.key,
    to: inputSide.nodeId, input: inputSide.port.key,
  })
  clearConnection()
}

function finishConnection(event) {
  if (!connection.value) return
  const world = screenToWorld(event.clientX, event.clientY)
  openPalette(event.clientX, event.clientY, world, connection.value)
  clearConnection()
}

function clearConnection(removeListeners = true) {
  connection.value = null
  if (removeListeners) {
    window.removeEventListener('pointermove', moveConnection)
    window.removeEventListener('pointerup', finishConnection)
  }
}

function openPalette(clientX, clientY, world = screenToWorld(clientX, clientY), pending = null) {
  const rect = viewportElement.value.getBoundingClientRect()
  palette.open = true
  palette.x = Math.min(rect.width - 300, Math.max(8, clientX - rect.left))
  palette.y = Math.min(rect.height - 390, Math.max(8, clientY - rect.top))
  palette.worldX = world.x
  palette.worldY = world.y
  palette.query = ''
  palette.pending = pending ? { ...pending } : null
  nextTick(() => paletteSearch.value?.focus())
}

function openPaletteFromToolbar() {
  const rect = viewportElement.value.getBoundingClientRect()
  openPalette(rect.left + rect.width / 2, rect.top + 80)
}

function handleContextMenu(event) {
  if (event.target.closest('.blueprint-node, .graph-group')) return
  event.preventDefault()
  openPalette(event.clientX, event.clientY)
}

function handleDoubleClick(event) {
  if (event.target.closest('.blueprint-node, .graph-group, .graph-toolbar, .canvas-controls, .minimap, .node-palette')) return
  openPalette(event.clientX, event.clientY)
}

function closePalette() { palette.open = false; palette.pending = null; palette.query = '' }

function choosePaletteItem(item) {
  const payload = { type: item.type, x: palette.worldX, y: palette.worldY }
  if (palette.pending) emit('create-connected-node', { ...payload, pending: palette.pending, autoPort: item.autoPort })
  else emit('create-node', payload)
  closePalette()
}

function createGroupAtCenter() {
  const rect = viewportElement.value.getBoundingClientRect()
  emit('create-group', screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2))
}

function selectEdge(edgeId) {
  selectedEdgeId.value = edgeId
  selectedNodeIds.value = []
  selectedGroupId.value = ''
  emit('select', '')
}

function selectGroup(groupId) {
  selectedGroupId.value = groupId
  selectedNodeIds.value = []
  selectedEdgeId.value = ''
  emit('select', '')
}

function deleteSelection() {
  if (selectedEdgeId.value) {
    emit('delete-edge', selectedEdgeId.value)
  } else if (selectedGroupId.value) {
    emit('delete-group', selectedGroupId.value)
  } else if (selectedNodeIds.value.length) {
    emit('delete-nodes', [...selectedNodeIds.value])
  }
}

function duplicateSelection() {
  if (selectedNodeIds.value.length) emit('duplicate-nodes', [...selectedNodeIds.value])
}

function handleKeyDown(event) {
  if (event.target.matches('input, textarea, select')) return
  if (event.code === 'Space') { spacePressed = true; event.preventDefault() }
  if (event.key === 'Delete') { event.preventDefault(); deleteSelection() }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') { event.preventDefault(); duplicateSelection() }
  if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'z') { event.preventDefault(); emit('undo') }
  if ((event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === 'y' || (event.shiftKey && event.key.toLowerCase() === 'z'))) { event.preventDefault(); emit('redo') }
  if (event.key.toLowerCase() === 'f' && selectedNodeIds.value.length) {
    event.preventDefault(); fitItems(props.nodes.filter((node) => selectedNodeIds.value.includes(node.id)))
  }
  if (event.key === 'Home') { event.preventDefault(); fitItems() }
  if (event.key === 'Tab') { event.preventDefault(); openPaletteFromToolbar() }
  if (event.key === 'Escape') { closePalette(); clearConnection(); marquee.active = false }
}

function handleKeyUp(event) { if (event.code === 'Space') spacePressed = false }

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
})

onBeforeUnmount(() => {
  stopInteraction()
  clearConnection()
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
})
</script>

<template>
  <section
    ref="viewportElement"
    class="canvas-viewport"
    :style="gridStyle"
    tabindex="0"
    @pointerdown="beginCanvasInteraction"
    @wheel.prevent="handleWheel"
    @contextmenu="handleContextMenu"
    @dblclick="handleDoubleClick"
  >
    <div class="canvas-hint"><MousePointer2 :size="14" /> 左键框选 · 中键平移 · 画布滚轮缩放 · 节点内滚动参数 · 双击节点展开/收起</div>

    <div class="graph-toolbar">
      <button type="button" class="secondary-button" @click="openPaletteFromToolbar"><Plus :size="15" /> 添加节点</button>
      <button type="button" class="square-button" title="添加分组" aria-label="添加分组" @click="createGroupAtCenter"><Frame :size="15" /></button>
      <button type="button" class="square-button" :disabled="!canUndo" title="撤销（Ctrl+Z）" aria-label="撤销" @click="$emit('undo')"><Undo2 :size="15" /></button>
      <button type="button" class="square-button" :disabled="!canRedo" title="重做（Ctrl+Y）" aria-label="重做" @click="$emit('redo')"><Redo2 :size="15" /></button>
      <button type="button" class="square-button" :disabled="!selectedNodeIds.length" title="创建所选节点副本（Ctrl+D）" aria-label="创建所选节点副本" @click="duplicateSelection"><CopyPlus :size="15" /></button>
      <button type="button" class="square-button danger-button" :disabled="!selectedNodeIds.length && !selectedEdgeId && !selectedGroupId" title="删除所选内容（Delete）" aria-label="删除所选内容" @click="deleteSelection"><Trash2 :size="15" /></button>
    </div>

    <div class="graph-world" :style="worldStyle">
      <GraphGroup
        v-for="group in groups"
        :key="group.id"
        :group="group"
        :selected="selectedGroupId === group.id"
        @select="selectGroup"
        @drag-start="startGroupDrag"
        @resize-start="startGroupResize"
        @rename="$emit('rename-group', $event)"
      />

      <svg
        class="edge-layer"
        :style="edgeLayerStyle"
        :viewBox="`${worldBounds.minX} ${worldBounds.minY} ${worldBounds.width} ${worldBounds.height}`"
        aria-hidden="true"
      >
        <g v-for="edge in edgePaths" :key="edge.id" class="edge-group" :class="[{ selected: selectedEdgeId === edge.id }, `edge-${edge.kind}`]">
          <path class="edge-hit" :d="edge.path" @pointerdown.stop="selectEdge(edge.id)" />
          <path class="edge-shadow" :d="edge.path" />
          <path class="edge-line" :d="edge.path" />
          <g :transform="`translate(${edge.labelX}, ${edge.labelY})`">
            <rect x="-25" y="-10" width="50" height="20" rx="5" />
            <text text-anchor="middle" dominant-baseline="middle">
              {{ displayMode === 'json' ? (edge.outcome || edge.output) : edge.label }}
            </text>
          </g>
        </g>
        <path v-if="pendingPath" class="pending-edge" :class="`edge-${connection?.kind}`" :d="pendingPath" />
      </svg>

      <BlueprintNode
        v-for="node in nodes"
        :key="node.id"
        :node="node"
        :field-definitions="fieldDefinitions"
        :display-mode="displayMode"
        :selected="selectedNodeIds.includes(node.id)"
        :connected-field-keys="fieldsForNode(node.id)"
        @select="selectNode"
        @toggle="$emit('toggle', $event)"
        @drag-start="startNodeDrag"
        @update-field="$emit('update-field', $event)"
        @port-start="startConnection"
        @port-end="endConnection"
      />
    </div>

    <div v-if="marquee.active" class="selection-marquee" :style="{ left: `${marquee.x}px`, top: `${marquee.y}px`, width: `${marquee.width}px`, height: `${marquee.height}px` }" />

    <div
      v-if="palette.open"
      class="node-palette"
      :style="{ left: `${palette.x}px`, top: `${palette.y}px` }"
      @pointerdown.stop
      @wheel="handlePaletteWheel"
    >
      <label class="node-palette-search"><Search :size="15" /><input ref="paletteSearch" v-model="palette.query" type="search" placeholder="搜索节点" @keydown.esc="closePalette" /></label>
      <div class="node-palette-scroll">
        <section v-for="group in paletteGroups" :key="group.name">
          <h3>{{ group.name }}</h3>
          <button v-for="item in group.items" :key="item.type" type="button" @click="choosePaletteItem(item)">
            <span class="palette-node-color" :style="{ background: item.color }" />
            <span><strong>{{ item.label }}</strong><small>{{ item.type }}</small></span>
          </button>
        </section>
        <div v-if="!paletteItems.length" class="palette-empty">没有兼容的节点</div>
      </div>
    </div>

    <div class="canvas-controls" aria-label="画布缩放">
      <button type="button" aria-label="缩小" title="缩小" @click="zoomBy(-0.1)"><Minus :size="16" /></button>
      <span>{{ Math.round(viewport.scale * 100) }}%</span>
      <button type="button" aria-label="放大" title="放大" @click="zoomBy(0.1)"><Plus :size="16" /></button>
      <button type="button" aria-label="适合视图" title="显示完整流程（Home）" @click="resetView"><Maximize2 :size="16" /></button>
      <button type="button" aria-label="整理节点布局" title="按剧情流程从左向右整理节点" @click="$emit('arrange')"><Workflow :size="16" /></button>
    </div>

    <div class="minimap" aria-label="蓝图小地图">
      <div class="minimap-title">小地图</div>
      <div class="minimap-world">
        <span
          v-for="node in minimapNodes"
          :key="node.id"
          class="minimap-node"
          :class="{ selected: selectedNodeIds.includes(node.id) }"
          :style="{ left: `${node.miniX}px`, top: `${node.miniY}px`, width: `${node.miniWidth}px`, height: `${node.miniHeight}px` }"
        />
      </div>
    </div>
  </section>
</template>
