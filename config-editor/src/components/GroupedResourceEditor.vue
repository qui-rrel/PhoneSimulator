<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import {
  ArrowDown, ArrowUp, ChevronDown, CopyPlus, GripVertical, MessageSquareText,
  Plus, Search, Trash2, UserRound,
} from 'lucide-vue-next'
import FieldControl from './FieldControl.vue'
import { isFieldRequired, visibleFieldsForKeys } from '../schema/fields.js'
import { getOrdinaryResourceSchema } from '../schema/resources.js'

const props = defineProps({
  section: { type: Object, required: true },
  directory: { type: Object, required: true },
  selectedId: { type: String, required: true },
  fieldDefinitions: { type: Object, required: true },
  displayMode: { type: String, required: true },
  focusResourceId: { type: String, default: '' },
  focusFieldKey: { type: String, default: '' },
})

const emit = defineEmits([
  'select', 'create-parent', 'duplicate-parent', 'delete-parent',
  'create-child', 'duplicate-child', 'delete-child', 'move-child', 'reorder-child', 'update-child-field',
])

const search = ref('')
const activeChildType = ref(props.directory.childGroups[0]?.type || '')
const expandedIds = ref(new Set())
const draggingId = ref('')
const dragOverId = ref('')
const dragOverPosition = ref('')

const parents = computed(() => props.section.resources.filter((item) => item.resourceType === props.directory.parentType))
const selectedParent = computed(() => {
  const direct = parents.value.find((item) => item.id === props.selectedId)
  if (direct) return direct
  const child = props.section.resources.find((item) => item.id === props.selectedId)
  const group = props.directory.childGroups.find((item) => item.type === child?.resourceType)
  const parentRuntimeId = group && child?.data[group.groupField]
  return parents.value.find((item) => item.runtimeId === parentRuntimeId) || parents.value[0] || null
})
const filteredParents = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return parents.value.filter((parent) => !keyword || `${parentLabel(parent)} ${parent.runtimeId}`.toLowerCase().includes(keyword))
})
const activeGroup = computed(() => props.directory.childGroups.find((item) => item.type === activeChildType.value) || props.directory.childGroups[0])
const children = computed(() => {
  if (!selectedParent.value || !activeGroup.value) return []
  return props.section.resources.filter((item) => item.resourceType === activeGroup.value.type
    && item.data[activeGroup.value.groupField] === selectedParent.value.runtimeId)
})

watch(() => props.directory.id, () => {
  search.value = ''
  activeChildType.value = props.directory.childGroups[0]?.type || ''
  expandedIds.value = new Set()
})

watch(() => props.focusResourceId, async (id) => {
  if (!id) return
  const child = props.section.resources.find((item) => item.id === id)
  if (!child || child.resourceType === props.directory.parentType) return
  const group = props.directory.childGroups.find((item) => item.type === child.resourceType)
  if (group) activeChildType.value = group.type
  expandedIds.value = new Set([...expandedIds.value, id])
  await nextTick()
  const card = document.querySelector(`.grouped-resource-editor [data-resource-id="${CSS.escape(id)}"]`)
  card?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  if (props.focusFieldKey) card?.querySelector(`[data-field-key="${CSS.escape(props.focusFieldKey)}"] input, [data-field-key="${CSS.escape(props.focusFieldKey)}"] textarea, [data-field-key="${CSS.escape(props.focusFieldKey)}"] select`)?.focus({ preventScroll: true })
}, { immediate: true })

function parentLabel(parent) {
  if (parent.resourceType === 'wechat-conversation') {
    const direct = parent.data['wxConversation.type'] === 'direct'
    const targetId = direct ? parent.data['wxConversation.targetContactId'] : parent.data['wxConversation.targetGroupId']
    const targetType = direct ? 'wechat-contact' : 'wechat-group'
    const target = props.section.resources.find((item) => item.resourceType === targetType && item.runtimeId === targetId)
    return target?.name || parent.name || parent.runtimeId
  }
  return parent.name || parent.runtimeId
}

function childCount(parent, type = null) {
  return props.directory.childGroups
    .filter((group) => !type || group.type === type)
    .reduce((count, group) => count + props.section.resources.filter((item) => item.resourceType === group.type && item.data[group.groupField] === parent.runtimeId).length, 0)
}

function childFields(child) {
  const schema = getOrdinaryResourceSchema(child.resourceType)
  return visibleFieldsForKeys(child.fieldKeys, child.data, props.fieldDefinitions)
    .filter((field) => field.key !== activeGroup.value?.groupField && !field.editorManaged && field.key !== schema?.orderField)
    .map((field) => contextualField(field, child))
}

function contextualField(field, child) {
  if (field.key === 'wxMessage.senderId' && selectedParent.value) {
    const direct = selectedParent.value.data['wxConversation.type'] === 'direct'
    let allowed = direct
      ? [selectedParent.value.data['wxConversation.targetContactId']]
      : props.section.resources.find((item) => item.resourceType === 'wechat-group'
        && item.runtimeId === selectedParent.value.data['wxConversation.targetGroupId'])?.data['wxGroup.memberIds'] || []
    allowed = new Set(['SELF', ...allowed])
    return { ...field, options: (field.options || []).filter((option) => allowed.has(option.value)) }
  }
  if (field.key === 'momentComment.replyToCommentId' && selectedParent.value) {
    const allowed = new Set(props.section.resources.filter((item) => item.resourceType === 'moment-comment'
      && item.id !== child.id
      && item.data['momentComment.momentId'] === selectedParent.value.runtimeId).map((item) => item.runtimeId))
    return { ...field, options: (field.options || []).filter((option) => allowed.has(option.value)) }
  }
  return field
}

function childSummary(child, index) {
  const textKeys = ['sms.text', 'wxMessage.text', 'momentComment.text', 'momentLike.contactId']
  const text = textKeys.map((key) => child.data[key]).find((value) => String(value || '').trim())
  const prefix = child.data['sms.side'] || child.data['wxMessage.senderId'] || child.data['momentComment.authorId'] || child.typeLabel
  return text ? `${prefix} · ${String(text).replace(/\s+/g, ' ').slice(0, 72)}` : `${prefix} ${index + 1}`
}

function toggleChild(id) {
  const next = new Set(expandedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedIds.value = next
}

function startDrag(child, event) {
  draggingId.value = child.id
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', child.id)
}

function dragOver(child, event) {
  if (!draggingId.value || draggingId.value === child.id) return
  event.preventDefault()
  dragOverId.value = child.id
  const rect = event.currentTarget.getBoundingClientRect()
  dragOverPosition.value = event.clientY > rect.top + rect.height / 2 ? 'after' : 'before'
}

function dropChild(child, event) {
  event.preventDefault()
  if (draggingId.value && draggingId.value !== child.id) emit('reorder-child', {
    id: draggingId.value, targetId: child.id, position: dragOverPosition.value || 'before',
  })
  finishDrag()
}

function finishDrag() {
  draggingId.value = ''
  dragOverId.value = ''
  dragOverPosition.value = ''
}

</script>

<template>
  <section class="grouped-resource-editor">
    <aside class="group-parent-panel">
      <div class="group-parent-toolbar">
        <label class="search-box wide"><Search :size="15" /><input v-model="search" type="search" placeholder="搜索名称或 ID" /></label>
        <button type="button" class="secondary-button" @click="emit('create-parent', directory.parentType)"><Plus :size="15" /> 新建</button>
      </div>
      <div class="group-parent-list">
        <button
          v-for="parent in filteredParents"
          :key="parent.id"
          type="button"
          class="group-parent-row"
          :class="{ active: parent.id === selectedParent?.id }"
          @click="emit('select', parent.id)"
        >
          <span class="sequence-script-icon"><UserRound :size="15" /></span>
          <span><strong>{{ parentLabel(parent) }}</strong><small>{{ parent.runtimeId }} · {{ childCount(parent) }} 项</small></span>
        </button>
        <div v-if="!filteredParents.length" class="sequence-list-empty">当前目录还没有内容</div>
      </div>
      <div class="sequence-list-footer">共 {{ filteredParents.length }} 个{{ directory.label }}</div>
    </aside>

    <main v-if="selectedParent" class="group-child-content">
      <header class="sequence-content-header">
        <div>
          <p class="view-kicker">{{ directory.label }}</p>
          <h3>{{ parentLabel(selectedParent) }}</h3>
          <span>{{ selectedParent.runtimeId }}</span>
        </div>
        <div class="sequence-header-actions">
          <button type="button" class="square-button" title="创建当前内容的副本" aria-label="创建当前内容的副本" @click="emit('duplicate-parent', selectedParent.id)"><CopyPlus :size="15" /></button>
          <button type="button" class="square-button danger-button" title="删除当前内容" aria-label="删除当前内容" @click="emit('delete-parent', selectedParent.id)"><Trash2 :size="15" /></button>
          <button type="button" class="primary-button" @click="emit('create-child', { type: activeGroup.type, parentId: selectedParent.id })"><Plus :size="15" /> 添加{{ activeGroup.label }}</button>
        </div>
      </header>

      <div v-if="directory.childGroups.length > 1" class="group-child-tabs">
        <button v-for="group in directory.childGroups" :key="group.type" type="button" :class="{ active: activeChildType === group.type }" @click="activeChildType = group.type">
          {{ group.label }} <small>{{ childCount(selectedParent, group.type) }}</small>
        </button>
      </div>

      <div class="sequence-scroll">
        <article
          v-for="(child, index) in children"
          :key="child.id"
          :data-resource-id="child.id"
          class="sequence-item-card"
          :class="{
            collapsed: !expandedIds.has(child.id), dragging: draggingId === child.id,
            'drag-over-before': dragOverId === child.id && dragOverPosition === 'before',
            'drag-over-after': dragOverId === child.id && dragOverPosition === 'after',
          }"
          @dragover="dragOver(child, $event)"
          @drop="dropChild(child, $event)"
        >
          <header class="sequence-item-header">
            <button type="button" class="sequence-item-handle" draggable="true" title="拖动排序" aria-label="拖动排序" @dragstart="startDrag(child, $event)" @dragend="finishDrag"><GripVertical :size="17" /></button>
            <span class="sequence-index">{{ index + 1 }}</span>
            <strong>{{ childSummary(child, index) }}</strong>
            <div class="sequence-item-actions">
              <button type="button" class="square-button" title="上移" aria-label="上移" :disabled="index === 0" @click="emit('move-child', { id: child.id, direction: -1 })"><ArrowUp :size="14" /></button>
              <button type="button" class="square-button" title="下移" aria-label="下移" :disabled="index === children.length - 1" @click="emit('move-child', { id: child.id, direction: 1 })"><ArrowDown :size="14" /></button>
              <button type="button" class="square-button" title="创建副本" aria-label="创建副本" @click="emit('duplicate-child', { id: child.id, parentId: selectedParent.id })"><CopyPlus :size="14" /></button>
              <button type="button" class="square-button danger-button" title="删除" aria-label="删除" @click="emit('delete-child', { id: child.id, parentId: selectedParent.id })"><Trash2 :size="14" /></button>
              <button type="button" class="square-button sequence-collapse-button" :title="expandedIds.has(child.id) ? '收起参数' : '展开参数'" :aria-label="expandedIds.has(child.id) ? '收起参数' : '展开参数'" @click="toggleChild(child.id)"><ChevronDown :size="15" :class="{ rotated: !expandedIds.has(child.id) }" /></button>
            </div>
          </header>
          <div v-if="expandedIds.has(child.id)" class="sequence-item-fields">
            <div v-for="field in childFields(child)" :key="field.key" :data-field-key="field.key">
              <FieldControl
                :field="field"
                :model-value="child.data[field.key]"
                :display-mode="displayMode"
                :required="isFieldRequired(field, child.data)"
                @update:model-value="emit('update-child-field', { resourceId: child.id, key: field.key, value: $event })"
              />
            </div>
          </div>
        </article>

        <div v-if="!children.length" class="sequence-empty">
          <MessageSquareText :size="30" /><strong>当前还没有{{ activeGroup.label }}</strong>
          <span>新增内容会自动归属“{{ parentLabel(selectedParent) }}”，不需要手动填写关联 ID。</span>
          <button type="button" class="primary-button" @click="emit('create-child', { type: activeGroup.type, parentId: selectedParent.id })"><Plus :size="15" /> 添加{{ activeGroup.label }}</button>
        </div>
      </div>
    </main>

    <div v-else class="sequence-empty sequence-empty-full">
      <UserRound :size="34" /><strong>当前目录还没有主体内容</strong><span>先新建联系人、会话或朋友圈，再添加其下的记录。</span>
    </div>
  </section>
</template>
