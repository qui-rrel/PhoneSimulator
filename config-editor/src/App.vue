<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import BlueprintCanvas from './components/BlueprintCanvas.vue'
import DetailPanel from './components/DetailPanel.vue'
import EditorHeader from './components/EditorHeader.vue'
import ExcelImportDialog from './components/ExcelImportDialog.vue'
import GroupedResourceEditor from './components/GroupedResourceEditor.vue'
import IssuesPanel from './components/IssuesPanel.vue'
import JsonDebugDialog from './components/JsonDebugDialog.vue'
import NavigationPanel from './components/NavigationPanel.vue'
import RecoveryDialog from './components/RecoveryDialog.vue'
import ResourceTablePrototype from './components/ResourceTablePrototype.vue'
import RuntimeExportDialog from './components/RuntimeExportDialog.vue'
import SequenceEditor from './components/SequenceEditor.vue'
import { useProjectWorkspace } from './project/useProjectWorkspace'
import { createOrdinaryResource } from './project/projectFile.js'
import { moveOrdinaryResource, reorderOrdinaryResource, syncManagedOrder } from './project/resourceOrdering.js'
import { createSequenceItem, createSequenceResource } from './project/sequenceResources.js'
import { resolveFieldDefinitions } from './schema/fields'
import { getOrdinaryResourceSchema } from './schema/resources.js'
import { directoriesForSection, directoryForResource } from './schema/navigation.js'
import { validateRequiredFields } from './validators/schemaValidation'
import {
  collectReferences, collectReferenceTargets, describeReference, findReferencesTo, rewriteReferences,
} from './validators/referenceIndex.js'
import { layoutEditorNodes } from './graph/layout.js'
import {
  connectGraphPorts, createGraphGroup, createGraphNode, disconnectInlineField,
  duplicateGraphNodes, propagateReferenceValue, removeGraphNodes, synchronizeEventNodeType,
} from './graph/model.js'
import { getNodePorts, getNodeType } from './schema/nodeTypes.js'
import { Code2 } from 'lucide-vue-next'

const savedMode = window.localStorage.getItem('phone-config-editor:display-mode')
const displayMode = ref(['zh', 'dual', 'json'].includes(savedMode) ? savedMode : 'zh')
const selectedSectionId = ref('basics')
const selectedNodeId = ref('')
const selectedResourceId = ref('basic-device')
let savedDirectorySelections = {}
try { savedDirectorySelections = JSON.parse(window.localStorage.getItem('phone-config-editor:directories') || '{}') } catch { savedDirectorySelections = {} }
const directorySelections = ref(savedDirectorySelections)
const detailOpen = ref(true)
const issuesOpen = ref(true)
const focusFieldKey = ref('')
const focusItemId = ref('')
const focusResourceId = ref('')
const focusNodeRequest = ref(0)
const jsonDialogOpen = ref(false)
const runtimeExportDialogOpen = ref(false)

const {
  projectName, projectFileLabel, baseStory, sections, nodes, edges, groups,
  isDirty, isBusy, notice, recoveryCandidate, importSummary, workspaceRevision,
  newProject: createNewProject, openProject, importExcel, saveProject, saveProjectAs,
  downloadRuntimeFile, writeRuntimeDirectory,
  closeImportSummary,
  restoreRecovery, discardRecovery, buildDocument,
} = useProjectWorkspace()

async function newProject() {
  const created = await createNewProject()
  if (!created) return
  selectedSectionId.value = 'basics'
  selectedNodeId.value = ''
  selectedResourceId.value = 'basic-device'
  detailOpen.value = true
}

const graphUndoStack = ref([])
const graphRedoStack = ref([])
let graphHistoryTimer = null
let graphHistorySuspended = false
let lastGraphSnapshot = ''

function captureGraphSnapshot() {
  return JSON.stringify({ nodes: nodes.value, edges: edges.value, groups: groups.value })
}

function resetGraphHistory() {
  window.clearTimeout(graphHistoryTimer)
  graphUndoStack.value = []
  graphRedoStack.value = []
  lastGraphSnapshot = captureGraphSnapshot()
}

function commitGraphHistory() {
  window.clearTimeout(graphHistoryTimer)
  const current = captureGraphSnapshot()
  if (!lastGraphSnapshot) lastGraphSnapshot = current
  if (current !== lastGraphSnapshot) {
    graphUndoStack.value.push(lastGraphSnapshot)
    if (graphUndoStack.value.length > 80) graphUndoStack.value.shift()
    graphRedoStack.value = []
    lastGraphSnapshot = current
  }
}

watch([nodes, edges, groups], () => {
  if (graphHistorySuspended) return
  window.clearTimeout(graphHistoryTimer)
  graphHistoryTimer = window.setTimeout(commitGraphHistory, 220)
}, { deep: true })

watch(workspaceRevision, () => nextTick(resetGraphHistory), { immediate: true })

async function applyGraphSnapshot(snapshot) {
  graphHistorySuspended = true
  const parsed = JSON.parse(snapshot)
  nodes.value = parsed.nodes
  edges.value = parsed.edges
  groups.value = parsed.groups
  lastGraphSnapshot = snapshot
  await nextTick()
  graphHistorySuspended = false
}

async function undoGraph() {
  commitGraphHistory()
  const previous = graphUndoStack.value.pop()
  if (!previous) return
  graphRedoStack.value.push(captureGraphSnapshot())
  await applyGraphSnapshot(previous)
}

async function redoGraph() {
  const next = graphRedoStack.value.pop()
  if (!next) return
  graphUndoStack.value.push(captureGraphSnapshot())
  await applyGraphSnapshot(next)
}

onBeforeUnmount(() => window.clearTimeout(graphHistoryTimer))

watch(displayMode, (mode) => {
  window.localStorage.setItem('phone-config-editor:display-mode', mode)
})
watch(directorySelections, (value) => {
  window.localStorage.setItem('phone-config-editor:directories', JSON.stringify(value))
}, { deep: true })

watch(nodes, (items) => {
  if (selectedNodeId.value && !items.some((node) => node.id === selectedNodeId.value)) {
    selectedNodeId.value = items[0]?.id || ''
  }
}, { deep: true })

watch(sections, (items) => {
  if (!items.some((section) => section.id === selectedSectionId.value)) {
    selectedSectionId.value = items[0]?.id || 'basics'
  }
  const section = items.find((item) => item.id === selectedSectionId.value)
  const directories = section ? directoriesForSection(section) : []
  if (!directories.some((item) => item.id === directorySelections.value[selectedSectionId.value])) {
    directorySelections.value[selectedSectionId.value] = directories[0]?.id || ''
  }
  const directory = directories.find((item) => item.id === directorySelections.value[selectedSectionId.value]) || directories[0]
  const selected = section?.resources.find((resource) => resource.id === selectedResourceId.value)
  if (selectedSectionId.value !== 'story' && (!selected || !directory?.types.includes(selected.resourceType))) {
    selectedResourceId.value = directory?.resources.find((resource) => resource.resourceType === directory.parentType)?.id
      || directory?.resources[0]?.id || ''
  }
}, { deep: true })

const resolvedFieldDefinitions = computed(() => resolveFieldDefinitions(sections.value))

const selectedSection = computed(() =>
  sections.value.find((section) => section.id === selectedSectionId.value) || sections.value[0],
)

const navigationSections = computed(() => sections.value.map((section) => ({
  ...section, directories: directoriesForSection(section),
})))

const selectedDirectories = computed(() => directoriesForSection(selectedSection.value || { id: '', resources: [] }))
const selectedDirectory = computed(() => selectedDirectories.value.find((item) => item.id === directorySelections.value[selectedSectionId.value])
  || selectedDirectories.value[0]
  || null)
const selectedDirectoryId = computed(() => selectedDirectory.value?.id || '')
const visibleSection = computed(() => {
  if (!selectedDirectory.value) return selectedSection.value
  const types = new Set(selectedDirectory.value.types)
  return {
    ...selectedSection.value,
    resources: selectedSection.value.resources.filter((resource) => types.has(resource.resourceType)),
    creatableTypes: (selectedSection.value.creatableTypes || selectedDirectory.value.types).filter((type) => types.has(type)),
  }
})

const selectedNode = computed(() =>
  nodes.value.find((node) => node.id === selectedNodeId.value) || null,
)

const selectedResource = computed(() => {
  if (selectedSectionId.value === 'story') return null
  return selectedSection.value?.resources.find((resource) => resource.id === selectedResourceId.value && selectedDirectory.value?.types.includes(resource.resourceType))
    || visibleSection.value?.resources.find((resource) => resource.resourceType === selectedDirectory.value?.parentType)
    || visibleSection.value?.resources[0]
    || null
})

const projectIssues = computed(() => validateRequiredFields({
  nodes: nodes.value,
  edges: edges.value,
  sections: sections.value,
  fieldDefinitions: resolvedFieldDefinitions.value,
  baseStory: baseStory.value,
}))
const exportErrorCount = computed(() => projectIssues.value.filter((issue) => issue.level === 'error').length)
const exportWarningCount = computed(() => projectIssues.value.filter((issue) => issue.level === 'warning').length)

const referenceRecords = computed(() => collectReferences({
  nodes: nodes.value, edges: edges.value, sections: sections.value,
  fieldDefinitions: resolvedFieldDefinitions.value, baseStory: baseStory.value,
}))

function rewriteTarget(targetType, previousId, nextId) {
  if (!previousId || !String(nextId || '').trim() || previousId === nextId) return
  rewriteReferences({
    nodes: nodes.value, sections: sections.value, baseStory: baseStory.value,
    fieldDefinitions: resolvedFieldDefinitions.value,
  }, targetType, previousId, String(nextId))
}

function blockReferencedDeletion(targets, excluded = {}) {
  const matches = targets.flatMap((target) => findReferencesTo(
    referenceRecords.value, target.targetType, target.targetId, excluded,
  )).filter((reference) => !excluded.nodeIds?.includes(reference.nodeId))
  if (!matches.length) return false
  const unique = [...new Map(matches.map((item) => [describeReference(item), item])).values()]
  const lines = unique.slice(0, 10).map((item) => `• ${describeReference(item)}`)
  if (unique.length > 10) lines.push(`• 另外还有 ${unique.length - 10} 处引用`)
  window.alert(`无法删除：仍有其他内容正在引用它。\n\n${lines.join('\n')}\n\n请先修改或删除这些引用。`)
  return true
}

const viewTitle = computed(() => selectedDirectory.value?.label || selectedSection.value?.labelZh || '配置')
const viewSubtitle = computed(() => {
  if (selectedSectionId.value === 'story') return '主线蓝图'
  if (selectedDirectory.value?.mode === 'linked') return '按所属对象整理内容，不需要手动填写关联 ID'
  return selectedSection.value?.description || ''
})
const debugDocument = computed(() => buildDocument())

function selectSection(sectionId) {
  selectedSectionId.value = sectionId
  if (sectionId !== 'story') {
    const section = sections.value.find((item) => item.id === sectionId)
    const directories = directoriesForSection(section)
    if (!directories.some((item) => item.id === directorySelections.value[sectionId])) {
      directorySelections.value[sectionId] = directories[0]?.id || ''
    }
    const directory = directories.find((item) => item.id === directorySelections.value[sectionId]) || directories[0]
    selectedResourceId.value = directory?.resources.find((resource) => resource.resourceType === directory.parentType)?.id
      || directory?.resources[0]?.id || ''
  }
}

function selectDirectory({ sectionId, directoryId }) {
  selectedSectionId.value = sectionId
  directorySelections.value[sectionId] = directoryId
  const section = sections.value.find((item) => item.id === sectionId)
  const directory = directoriesForSection(section).find((item) => item.id === directoryId)
  selectedResourceId.value = directory?.resources.find((resource) => resource.resourceType === directory.parentType)?.id
    || directory?.resources[0]?.id || ''
}

function updateNodeField({ nodeId, key, value }) {
  const node = nodes.value.find((item) => item.id === nodeId)
  if (!node) return
  if (getNodeType(node).kind === 'event') disconnectInlineField(nodes.value, edges.value, nodeId, key)
  node.data[key] = value
  if (key === 'editor.nodeName' && String(value).trim()) node.name = String(value)
  if (getNodeType(node).kind === 'reference') {
    const option = resolvedFieldDefinitions.value[key]?.options?.find((item) => item.value === value)
    node.name = option?.labelZh ? `${getNodeType(node).label} · ${option.labelZh}` : getNodeType(node).label
    propagateReferenceValue(nodes.value, edges.value, nodeId)
  }
  if (['trigger.type', 'action.type'].includes(key)) {
    synchronizeEventNodeType(node)
    const validOutputs = new Set(getNodePorts(node).flowOutputs.map((port) => port.key))
    const validInputs = new Set(getNodePorts(node).dataInputs.map((port) => port.key))
    for (let index = edges.value.length - 1; index >= 0; index -= 1) {
      const edge = edges.value[index]
      if (edge.kind !== 'data' && edge.from === node.id && !validOutputs.has(edge.outcome)) edges.value.splice(index, 1)
      else if (edge.kind === 'data' && edge.to === node.id && !validInputs.has(edge.input)) edges.value.splice(index, 1)
    }
  }
}

function updateResourceField({ resourceId, key, value }) {
  const resource = selectedSection.value?.resources.find((item) => item.id === resourceId)
  if (!resource) return
  const schema = getOrdinaryResourceSchema(resource.resourceType)
  const previousId = resource.runtimeId
  if (schema?.idField === key || key === 'script.id') rewriteTarget(resource.resourceType, previousId, value)
  resource.data[key] = value
  if (schema?.idField === key) resource.runtimeId = String(value || '')
  if (schema && [schema.titleField, schema.fallbackTitleField].includes(key)) {
    resource.name = String(resource.data[schema.titleField] || resource.data[schema.fallbackTitleField] || resource.runtimeId || schema.label)
  } else if (key === 'script.name' && String(value).trim()) resource.name = String(value)
  if (key === 'script.id') resource.runtimeId = String(value || '')
  if (schema?.orderGroupField === key) syncManagedOrder(selectedSection.value.resources, resource.resourceType)
  if (key === 'wxConversation.type') {
    if (value === 'direct') resource.data['wxConversation.targetGroupId'] = undefined
    else resource.data['wxConversation.targetContactId'] = undefined
  }
  if (key === 'wxMessage.type') {
    resource.source = {}
    if (value === 'text') {
      resource.data['wxMessage.mediaSrc'] = undefined
      resource.data['wxMessage.mapLocationId'] = undefined
      resource.data['wxMessage.connected'] = undefined
      resource.data['wxMessage.duration'] = undefined
    } else if (['image', 'sticker', 'location'].includes(value)) {
      resource.data['wxMessage.text'] = ''
      resource.data['wxMessage.connected'] = undefined
      resource.data['wxMessage.duration'] = undefined
      if (value !== 'location') resource.data['wxMessage.mapLocationId'] = undefined
    } else {
      resource.data['wxMessage.text'] = ''
      resource.data['wxMessage.mediaSrc'] = ''
      resource.data['wxMessage.mapLocationId'] = undefined
      resource.data['wxMessage.connected'] = false
      resource.data['wxMessage.duration'] = undefined
    }
  }
  if (key === 'map.favorite' && !value) resource.data['map.savedDate'] = ''
}

function findScript(resourceId) {
  return sections.value.find((section) => section.id === 'scripts')?.resources.find((item) => item.id === resourceId)
}

function createScriptResource(type) {
  const resources = selectedSection.value.resources
  const resource = createSequenceResource(type, resources)
  const lastSameType = resources.findLastIndex((item) => item.resourceType === type)
  resources.splice(lastSameType + 1, 0, resource)
  selectedResourceId.value = resource.id
  detailOpen.value = true
}

function duplicateScriptResource(resourceId) {
  const resources = selectedSection.value.resources
  const source = resources.find((item) => item.id === resourceId)
  if (!source) return
  const resource = createSequenceResource(source.resourceType, resources, source)
  resources.splice(resources.indexOf(source) + 1, 0, resource)
  selectedResourceId.value = resource.id
  detailOpen.value = true
}

function deleteScriptResource(resourceId) {
  const resources = selectedSection.value.resources
  const resource = resources.find((item) => item.id === resourceId)
  if (!resource) return
  const targets = collectReferenceTargets({ sections: sections.value, nodes: nodes.value })
    .filter((target) => target.resourceId === resource.id)
  if (blockReferencedDeletion(targets, { resourceId: resource.id })) return
  if (!window.confirm(`确定删除脚本“${resource.name}”吗？`)) return
  const index = resources.indexOf(resource)
  resources.splice(index, 1)
  selectedResourceId.value = resources[index]?.id || resources[index - 1]?.id || ''
}

function addSequenceItem(resourceId) {
  const resource = findScript(resourceId)
  if (resource) resource.items.push(createSequenceItem(resource))
}

function toggleSequenceItem({ resourceId, itemId }) {
  const resource = findScript(resourceId)
  const item = resource?.items.find((entry) => entry.id === itemId)
  if (item) item.expanded = item.expanded === false
}

function duplicateSequenceItem({ resourceId, itemId }) {
  const resource = findScript(resourceId)
  const item = resource?.items.find((entry) => entry.id === itemId)
  if (!resource || !item) return
  resource.items.splice(resource.items.indexOf(item) + 1, 0, createSequenceItem(resource, item))
}

function deleteSequenceItem({ resourceId, itemId }) {
  const resource = findScript(resourceId)
  const item = resource?.items.find((entry) => entry.id === itemId)
  if (!resource || !item) return
  const targets = collectReferenceTargets({ sections: sections.value, nodes: nodes.value })
    .filter((target) => target.resourceId === resource.id && target.itemId === item.id)
  if (blockReferencedDeletion(targets, { resourceId: resource.id, itemId: item.id })) return
  if (!window.confirm('确定删除这一项吗？')) return
  resource.items.splice(resource.items.indexOf(item), 1)
}

function moveSequenceItem({ resourceId, itemId, direction }) {
  const resource = findScript(resourceId)
  const index = resource?.items.findIndex((item) => item.id === itemId) ?? -1
  const target = index + direction
  if (!resource || index < 0 || target < 0 || target >= resource.items.length) return
  const [item] = resource.items.splice(index, 1)
  resource.items.splice(target, 0, item)
}

function reorderSequenceItem({ resourceId, itemId, targetId, position }) {
  const resource = findScript(resourceId)
  if (!resource || itemId === targetId) return
  const sourceIndex = resource.items.findIndex((item) => item.id === itemId)
  if (sourceIndex < 0) return
  const [item] = resource.items.splice(sourceIndex, 1)
  const targetIndex = resource.items.findIndex((entry) => entry.id === targetId)
  if (targetIndex < 0) {
    resource.items.splice(sourceIndex, 0, item)
    return
  }
  resource.items.splice(targetIndex + (position === 'after' ? 1 : 0), 0, item)
}

function updateSequenceItemField({ resourceId, itemId, key, value }) {
  const resource = findScript(resourceId)
  const item = resource?.items.find((entry) => entry.id === itemId)
  if (!resource || !item) return
  const generatedType = {
    'publish.momentId': 'moment',
    'playerComment.commentId': 'moment-comment',
    'interaction.commentId': 'moment-comment',
  }[key]
  if (generatedType) rewriteTarget(generatedType, item.data[key], value)
  item.data[key] = value
  item.source = {}

  if (key === 'smsLine.side') {
    if (value === 'me') item.data['smsLine.afterSeconds'] = undefined
    else item.data['smsLine.keystrokes'] = undefined
  }
  if (key === 'wechatLine.senderId') {
    if (value === 'SELF') item.data['wechatLine.afterSeconds'] = undefined
    else item.data['wechatLine.keystrokes'] = undefined
  }
  if (key === 'wechatLine.type') {
    if (value === 'text') {
      item.data['wechatLine.mediaSrc'] = undefined
      item.data['wechatLine.mapLocationId'] = undefined
    } else {
      item.data['wechatLine.text'] = undefined
      if (value !== 'location') item.data['wechatLine.mapLocationId'] = undefined
    }
  }
  if (key === 'interaction.type' && value !== 'comment') {
    for (const fieldKey of ['interaction.commentId', 'interaction.replyToCommentId', 'interaction.text', 'interaction.imageSrc']) {
      item.data[fieldKey] = undefined
    }
  }
  if (key === 'interaction.notify' && !value) item.data['interaction.notificationText'] = undefined
}

function createContentResource(type) {
  const resource = createOrdinaryResource(type, selectedSection.value.resources)
  const schema = getOrdinaryResourceSchema(type)
  if (schema?.orderField) {
    const sameType = selectedSection.value.resources.filter((item) => item.resourceType === type)
    const orders = sameType.map((item) => Number(item.data[schema.orderField])).filter(Number.isFinite)
    resource.data[schema.orderField] = orders.length ? Math.max(...orders) + 1 : 0
  }
  const lastSameType = selectedSection.value.resources.findLastIndex((item) => item.resourceType === type)
  selectedSection.value.resources.splice(lastSameType + 1, 0, resource)
  syncManagedOrder(selectedSection.value.resources, type)
  selectedResourceId.value = resource.id
  detailOpen.value = true
  return resource
}

function duplicateContentResource(resourceId) {
  const source = selectedSection.value.resources.find((item) => item.id === resourceId)
  if (!source?.mutable) return
  const resource = createOrdinaryResource(source.resourceType, selectedSection.value.resources, source)
  selectedSection.value.resources.splice(selectedSection.value.resources.indexOf(source) + 1, 0, resource)
  syncManagedOrder(selectedSection.value.resources, source.resourceType)
  selectedResourceId.value = resource.id
  detailOpen.value = true
  return resource
}

function deleteContentResource(resourceId) {
  const resource = selectedSection.value.resources.find((item) => item.id === resourceId)
  if (!resource?.mutable) return false
  const targets = collectReferenceTargets({ sections: sections.value, nodes: nodes.value })
    .filter((target) => target.resourceId === resource.id)
  if (blockReferencedDeletion(targets, { resourceId: resource.id })) return false
  if (!window.confirm(`确定删除“${resource.name}”吗？`)) return false
  const index = selectedSection.value.resources.indexOf(resource)
  selectedSection.value.resources.splice(index, 1)
  syncManagedOrder(selectedSection.value.resources, resource.resourceType)
  selectedResourceId.value = selectedSection.value.resources[index]?.id || selectedSection.value.resources[index - 1]?.id || ''
  return true
}

function createGroupedChild({ type, parentId }) {
  const parent = selectedSection.value.resources.find((item) => item.id === parentId)
  const group = selectedDirectory.value?.childGroups.find((item) => item.type === type)
  if (!parent || !group) return
  const resource = createContentResource(type)
  resource.data[group.groupField] = parent.runtimeId
  syncManagedOrder(selectedSection.value.resources, type)
  selectedResourceId.value = parent.id
}

function duplicateGroupedChild({ id, parentId }) {
  const copy = duplicateContentResource(id)
  if (copy) selectedResourceId.value = parentId
}

function deleteGroupedChild({ id, parentId }) {
  if (deleteContentResource(id)) selectedResourceId.value = parentId
}

function moveContentResource({ id, direction }) {
  moveOrdinaryResource(selectedSection.value.resources, id, direction)
}

function reorderContentResource({ id, targetId, position }) {
  reorderOrdinaryResource(selectedSection.value.resources, id, targetId, position)
}

function toggleNode(nodeId) {
  const node = nodes.value.find((item) => item.id === nodeId)
  if (node) node.expanded = !node.expanded
}

function moveGraphNodes(moves) {
  for (const move of moves) {
    const node = nodes.value.find((item) => item.id === move.id)
    if (!node) continue
    node.x = Math.round(move.x)
    node.y = Math.round(move.y)
  }
}

function arrangeStoryNodes() {
  nodes.value = layoutEditorNodes(nodes.value, edges.value)
}

function createStoryNode({ type, x, y }) {
  const node = createGraphNode(type, nodes.value, { x, y })
  nodes.value.push(node)
  selectedNodeId.value = node.id
  detailOpen.value = true
  return node
}

function prepareNodeForInput(node, inputKey) {
  const actionByInput = {
    smsScript: 'sms-script', wechatScript: 'wechat-script', publishScript: 'moment-publish',
    commentScript: 'moment-comment', interactionScript: 'moment-interactions', dialogue: 'call',
  }
  if (inputKey === 'target') node.data['trigger.type'] = 'operation'
  if (actionByInput[inputKey]) node.data['action.type'] = actionByInput[inputKey]
  synchronizeEventNodeType(node)
}

function connectStoryPorts(request) {
  const edge = connectGraphPorts(nodes.value, edges.value, request)
  if (edge) selectedNodeId.value = edge.to
}

function createConnectedStoryNode({ type, x, y, pending, autoPort }) {
  const node = createStoryNode({ type, x, y })
  if (autoPort.direction === 'input') prepareNodeForInput(node, autoPort.key)
  if (pending.direction === 'output') {
    connectStoryPorts({ kind: pending.kind, from: pending.nodeId, output: pending.port.key, to: node.id, input: autoPort.key })
  } else {
    connectStoryPorts({ kind: pending.kind, from: node.id, output: autoPort.key, to: pending.nodeId, input: pending.port.key })
  }
}

function deleteStoryEdge(edgeId) {
  const index = edges.value.findIndex((edge) => edge.id === edgeId)
  if (index >= 0) edges.value.splice(index, 1)
}

function deleteStoryNodes(nodeIds) {
  const names = nodes.value.filter((node) => nodeIds.includes(node.id)).map((node) => node.name)
  if (!names.length) return
  const targets = nodes.value.filter((node) => nodeIds.includes(node.id) && getNodeType(node).kind === 'event')
    .map((node) => ({ targetType: 'event', targetId: node.id }))
  if (blockReferencedDeletion(targets, { nodeIds })) return
  if (!window.confirm(`确定删除所选的 ${names.length} 个节点吗？`)) return
  removeGraphNodes(nodes.value, edges.value, nodeIds)
  selectedNodeId.value = nodes.value.find((node) => getNodeType(node).kind === 'event')?.id || nodes.value[0]?.id || ''
}

function duplicateStoryNodes(nodeIds) {
  const copies = duplicateGraphNodes(nodes.value, nodeIds)
  selectedNodeId.value = copies.at(-1)?.id || selectedNodeId.value
}

function addStoryGroup(position) {
  groups.value.push(createGraphGroup(groups.value, position))
}

function moveStoryGroup({ id, x, y, nodes: nodeMoves }) {
  const group = groups.value.find((item) => item.id === id)
  if (!group) return
  group.x = Math.round(x)
  group.y = Math.round(y)
  moveGraphNodes(nodeMoves)
}

function resizeStoryGroup({ id, width, height }) {
  const group = groups.value.find((item) => item.id === id)
  if (!group) return
  group.width = Math.max(360, Math.round(width))
  group.height = Math.max(180, Math.round(height))
}

function renameStoryGroup(id) {
  const group = groups.value.find((item) => item.id === id)
  if (!group) return
  const title = window.prompt('请输入分组名称', group.title)
  if (title?.trim()) group.title = title.trim()
}

function deleteStoryGroup(id) {
  const group = groups.value.find((item) => item.id === id)
  if (!group || !window.confirm(`确定删除分组“${group.title}”吗？分组内节点不会被删除。`)) return
  groups.value.splice(groups.value.indexOf(group), 1)
}

function selectIssue(issue) {
  focusFieldKey.value = issue.fieldKey || ''
  focusItemId.value = issue.itemId || ''
  focusResourceId.value = issue.resourceId || ''
  if (issue.nodeId) {
    selectedSectionId.value = 'story'
    selectedNodeId.value = issue.nodeId
    focusNodeRequest.value += 1
  } else if (issue.resourceId) {
    selectedSectionId.value = issue.sectionId
    const section = sections.value.find((item) => item.id === issue.sectionId)
    const resource = section?.resources.find((item) => item.id === issue.resourceId)
    const directory = resource && directoryForResource(issue.sectionId, resource.resourceType)
    if (directory) directorySelections.value[issue.sectionId] = directory.id
    selectedResourceId.value = issue.resourceId
  } else return
  detailOpen.value = true
}

function showExportErrors() {
  runtimeExportDialogOpen.value = false
  issuesOpen.value = true
}

async function exportRuntimeDirectory() {
  const written = await writeRuntimeDirectory(projectIssues.value)
  if (written) runtimeExportDialogOpen.value = false
}
</script>

<template>
  <div class="editor-shell">
    <EditorHeader
      :display-mode="displayMode"
      :detail-open="detailOpen"
      :project-name="projectName"
      :file-label="projectFileLabel"
      :dirty="isDirty"
      :busy="isBusy"
      :export-error-count="exportErrorCount"
      @update:display-mode="displayMode = $event"
      @toggle-detail="detailOpen = !detailOpen"
      @new-project="newProject"
      @open-project="openProject"
      @import-excel="importExcel"
      @save-project="saveProject"
      @save-project-as="saveProjectAs"
      @export-runtime="runtimeExportDialogOpen = true"
    />

    <div class="workspace" :class="{ 'detail-hidden': !detailOpen }">
      <NavigationPanel
        :sections="navigationSections"
        :selected-id="selectedSectionId"
        :selected-directory-id="selectedDirectoryId"
        @select="selectSection"
        @select-directory="selectDirectory"
      />

      <main class="editor-main">
        <div class="viewbar">
          <div>
            <p class="view-kicker">编辑视图</p>
            <div class="view-title-row">
              <h2>{{ viewTitle }}</h2>
              <span>{{ viewSubtitle }}</span>
            </div>
          </div>
          <div class="viewbar-actions" aria-label="视图切换">
            <button type="button" class="secondary-button" title="查看只读的运行时 JSON" @click="jsonDialogOpen = true">
              <Code2 :size="15" /> 查看 JSON
            </button>
            <button type="button" class="view-tab" :class="{ active: selectedSectionId === 'story' }">
              蓝图
            </button>
            <button type="button" class="view-tab" :class="{ active: selectedSectionId !== 'story' }">
              {{ selectedSectionId === 'scripts' || selectedDirectory?.mode === 'linked' ? '序列' : '表格' }}
            </button>
          </div>
        </div>

        <BlueprintCanvas
          v-if="selectedSectionId === 'story'"
          :nodes="nodes"
          :edges="edges"
          :groups="groups"
          :field-definitions="resolvedFieldDefinitions"
          :selected-id="selectedNodeId"
          :display-mode="displayMode"
          :can-undo="graphUndoStack.length > 0"
          :can-redo="graphRedoStack.length > 0"
          :focus-request="focusNodeRequest"
          @select="selectedNodeId = $event"
          @toggle="toggleNode"
          @move-many="moveGraphNodes"
          @arrange="arrangeStoryNodes"
          @update-field="updateNodeField"
          @connect="connectStoryPorts"
          @delete-edge="deleteStoryEdge"
          @create-node="createStoryNode"
          @create-connected-node="createConnectedStoryNode"
          @delete-nodes="deleteStoryNodes"
          @duplicate-nodes="duplicateStoryNodes"
          @create-group="addStoryGroup"
          @move-group="moveStoryGroup"
          @resize-group="resizeStoryGroup"
          @rename-group="renameStoryGroup"
          @delete-group="deleteStoryGroup"
          @undo="undoGraph"
          @redo="redoGraph"
        />

        <GroupedResourceEditor
          v-else-if="selectedDirectory?.mode === 'linked'"
          :section="selectedSection"
          :directory="selectedDirectory"
          :selected-id="selectedResource?.id || ''"
          :field-definitions="resolvedFieldDefinitions"
          :display-mode="displayMode"
          :focus-resource-id="focusResourceId"
          :focus-field-key="focusFieldKey"
          @select="selectedResourceId = $event"
          @create-parent="createContentResource"
          @duplicate-parent="duplicateContentResource"
          @delete-parent="deleteContentResource"
          @create-child="createGroupedChild"
          @duplicate-child="duplicateGroupedChild"
          @delete-child="deleteGroupedChild"
          @move-child="moveContentResource"
          @reorder-child="reorderContentResource"
          @update-child-field="updateResourceField"
        />

        <ResourceTablePrototype
          v-else-if="selectedSectionId !== 'scripts'"
          :section="visibleSection"
          :selected-id="selectedResource?.id || ''"
          :display-mode="displayMode"
          :group-by-field="selectedDirectory?.groupByField || ''"
          @select="selectedResourceId = $event"
          @create="createContentResource"
          @duplicate="duplicateContentResource"
          @delete="deleteContentResource"
          @move="moveContentResource"
          @reorder="reorderContentResource"
        />

        <SequenceEditor
          v-else
          :section="visibleSection"
          :selected-id="selectedResource?.id || ''"
          :field-definitions="resolvedFieldDefinitions"
          :display-mode="displayMode"
          :focus-item-id="focusItemId"
          :focus-field-key="focusFieldKey"
          :allowed-types="selectedDirectory?.types || []"
          @select="selectedResourceId = $event"
          @create-script="createScriptResource"
          @duplicate-script="duplicateScriptResource"
          @delete-script="deleteScriptResource"
          @create-item="addSequenceItem"
          @toggle-item="toggleSequenceItem"
          @duplicate-item="duplicateSequenceItem"
          @delete-item="deleteSequenceItem"
          @move-item="moveSequenceItem"
          @reorder-item="reorderSequenceItem"
          @update-item-field="updateSequenceItemField"
        />
      </main>

      <DetailPanel
        v-if="detailOpen"
        :node="selectedSectionId === 'story' ? selectedNode : null"
        :resource="selectedSectionId === 'story' ? null : selectedResource"
        :field-definitions="resolvedFieldDefinitions"
        :display-mode="displayMode"
        :focus-field-key="focusFieldKey"
        @close="detailOpen = false"
        @update-node-field="updateNodeField"
        @update-resource-field="updateResourceField"
      />
    </div>

    <IssuesPanel
      :issues="projectIssues"
      :open="issuesOpen"
      @toggle="issuesOpen = !issuesOpen"
      @select="selectIssue"
    />

    <Transition name="notice">
      <div v-if="notice" class="editor-notice" :class="notice.type" role="status">
        {{ notice.message }}
      </div>
    </Transition>

    <RecoveryDialog
      v-if="recoveryCandidate"
      :candidate="recoveryCandidate"
      @restore="restoreRecovery"
      @discard="discardRecovery"
    />

    <ExcelImportDialog
      v-if="importSummary"
      :summary="importSummary"
      @close="closeImportSummary"
      @save="closeImportSummary(); saveProjectAs()"
    />

    <JsonDebugDialog v-if="jsonDialogOpen" :document="debugDocument" @close="jsonDialogOpen = false" />
    <RuntimeExportDialog
      v-if="runtimeExportDialogOpen"
      :error-count="exportErrorCount"
      :warning-count="exportWarningCount"
      :busy="isBusy"
      :directory-supported="'showDirectoryPicker' in window"
      @close="runtimeExportDialogOpen = false"
      @show-errors="showExportErrors"
      @write-directory="exportRuntimeDirectory"
      @download-content="downloadRuntimeFile('content', projectIssues)"
      @download-story="downloadRuntimeFile('story', projectIssues)"
    />
  </div>
</template>
