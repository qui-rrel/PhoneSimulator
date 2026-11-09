<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ArrowDown, ArrowUp, ChevronDown, CopyPlus, FilePlus2, GripVertical, Search, Trash2 } from 'lucide-vue-next'
import { itemTitle } from '../utils/display'
import { getResourceSchema } from '../schema/resources.js'
import { canOrderTogether } from '../project/resourceOrdering.js'

const props = defineProps({
  section: { type: Object, required: true },
  selectedId: { type: String, required: true },
  displayMode: { type: String, required: true },
  groupByField: { type: String, default: '' },
})

const emit = defineEmits(['select', 'create', 'duplicate', 'delete', 'move', 'reorder'])
const search = ref('')
const typeFilter = ref('all')
const createMenuOpen = ref(false)
const createMenu = ref(null)
const draggingId = ref('')
const dragOverId = ref('')
const dragOverPosition = ref('')

watch(() => props.section.id, () => {
  search.value = ''
  typeFilter.value = 'all'
  createMenuOpen.value = false
})
watch(() => props.selectedId, async (id) => {
  if (!id) return
  await nextTick()
  document.querySelector(`.resource-view [data-resource-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'nearest' })
}, { immediate: true })

const availableTypes = computed(() => {
  const types = new Set([
    ...(props.section.creatableTypes || []),
    ...props.section.resources.map((resource) => resource.resourceType),
  ])
  return [...types].map((type) => ({ type, label: getResourceSchema(type).label }))
})
const selectedResource = computed(() => props.section.resources.find((item) => item.id === props.selectedId) || null)
const createTypes = computed(() => availableTypes.value.filter((item) => props.section.creatableTypes?.includes(item.type)))

const filteredResources = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return props.section.resources.filter((resource) => {
    if (typeFilter.value !== 'all' && resource.resourceType !== typeFilter.value) return false
    if (!keyword) return true
    return `${resource.name} ${resource.runtimeId || resource.id} ${resource.typeLabel}`.toLowerCase().includes(keyword)
  })
})
const resourceGroups = computed(() => {
  if (!props.groupByField) return [{ key: '__all__', label: '', resources: filteredResources.value }]
  const groups = new Map()
  for (const resource of filteredResources.value) {
    const key = String(resource.data[props.groupByField] || '未设置日期')
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(resource)
  }
  return [...groups.entries()].map(([key, resources]) => ({ key, label: key, resources }))
})

function createResource(type) {
  emit('create', type)
  createMenuOpen.value = false
}

function handleOutsidePointer(event) {
  if (createMenuOpen.value && !createMenu.value?.contains(event.target)) createMenuOpen.value = false
}

function startDrag(resource, event) {
  if (!resource.mutable) return
  draggingId.value = resource.id
  dragOverId.value = ''
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', resource.id)
  emit('select', resource.id)
}

function dragOver(resource, event) {
  const source = props.section.resources.find((item) => item.id === draggingId.value)
  if (!source || !canOrderTogether(source, resource) || source.id === resource.id) return
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
  dragOverId.value = resource.id
  const rect = event.currentTarget.getBoundingClientRect()
  dragOverPosition.value = event.clientY > rect.top + rect.height / 2 ? 'after' : 'before'
}

function dropOn(resource, event) {
  event.preventDefault()
  const source = props.section.resources.find((item) => item.id === draggingId.value)
  if (source && canOrderTogether(source, resource) && source.id !== resource.id) {
    emit('reorder', {
      id: source.id,
      targetId: resource.id,
      position: dragOverPosition.value || 'before',
    })
  }
  finishDrag()
}

function finishDrag() {
  draggingId.value = ''
  dragOverId.value = ''
  dragOverPosition.value = ''
}

onMounted(() => document.addEventListener('pointerdown', handleOutsidePointer))
onBeforeUnmount(() => document.removeEventListener('pointerdown', handleOutsidePointer))
</script>

<template>
  <section class="resource-view">
    <div class="resource-toolbar">
      <label class="search-box wide">
        <Search :size="15" />
        <input v-model="search" type="search" placeholder="搜索名称、类型或 ID" />
      </label>
      <select v-if="availableTypes.length > 1" v-model="typeFilter" class="toolbar-select filter-select" aria-label="筛选内容类型">
        <option value="all">全部类型</option>
        <option v-for="item in availableTypes" :key="item.type" :value="item.type">{{ item.label }}</option>
      </select>
      <div class="resource-actions">
        <div v-if="createTypes.length" ref="createMenu" class="create-menu">
          <button type="button" class="secondary-button create-button" :aria-expanded="createMenuOpen" title="选择要新建的内容类型" @click="createMenuOpen = !createMenuOpen">
            <FilePlus2 :size="15" /> 新建 <ChevronDown :size="14" />
          </button>
          <div v-if="createMenuOpen" class="create-menu-popover" role="menu">
            <button v-for="item in createTypes" :key="item.type" type="button" role="menuitem" @click="createResource(item.type)">
              <strong>{{ item.label }}</strong><small>{{ item.type }}</small>
            </button>
          </div>
        </div>
        <button type="button" class="square-button" :disabled="!selectedResource?.mutable" aria-label="创建副本" title="创建选中内容的副本（类似 Ctrl+D）" @click="emit('duplicate', selectedResource.id)">
          <CopyPlus :size="15" />
        </button>
        <button type="button" class="square-button" :disabled="!selectedResource?.mutable" aria-label="上移" title="将选中内容上移一项" @click="emit('move', { id: selectedResource.id, direction: -1 })">
          <ArrowUp :size="15" />
        </button>
        <button type="button" class="square-button" :disabled="!selectedResource?.mutable" aria-label="下移" title="将选中内容下移一项" @click="emit('move', { id: selectedResource.id, direction: 1 })">
          <ArrowDown :size="15" />
        </button>
        <button type="button" class="square-button danger-button" :disabled="!selectedResource?.mutable" aria-label="删除" title="删除选中内容" @click="emit('delete', selectedResource.id)">
          <Trash2 :size="15" />
        </button>
      </div>
    </div>

    <div class="table-shell">
      <table>
        <thead>
          <tr>
            <th class="drag-column" aria-label="排序" /><th>名称</th><th>类型</th><th>说明</th><th class="number-column">字段</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="group in resourceGroups" :key="group.key">
            <tr v-if="group.label" class="table-group-row"><td colspan="5">{{ group.label }}<small>{{ group.resources.length }} 项</small></td></tr>
            <tr
              v-for="resource in group.resources"
              :key="resource.id"
              :data-resource-id="resource.id"
              :class="{
                selected: selectedId === resource.id,
                dragging: draggingId === resource.id,
                'drag-over-before': dragOverId === resource.id && dragOverPosition === 'before',
                'drag-over-after': dragOverId === resource.id && dragOverPosition === 'after',
              }"
              tabindex="0"
              @click="$emit('select', resource.id)"
              @keydown.enter="$emit('select', resource.id)"
              @dragover="dragOver(resource, $event)"
              @drop="dropOn(resource, $event)"
            >
              <td class="drag-column">
                <button
                  v-if="resource.mutable"
                  type="button"
                  class="row-drag-handle"
                  draggable="true"
                  aria-label="拖动排序"
                  title="按住并上下拖动排序"
                  @click.stop="$emit('select', resource.id)"
                  @dragstart="startDrag(resource, $event)"
                  @dragend="finishDrag"
                ><GripVertical :size="16" /></button>
              </td>
              <td>
                <strong>{{ itemTitle(resource, displayMode) }}</strong>
                <small v-if="displayMode === 'zh' && resource.runtimeId">{{ resource.runtimeId }}</small>
              </td>
              <td><span class="table-type-pill">{{ resource.typeLabel }}</span></td>
              <td>{{ resource.description }}</td>
              <td class="number-column">{{ resource.fieldKeys.length }}</td>
            </tr>
          </template>
        </tbody>
      </table>
      <div class="table-footer">
        <span>共 {{ filteredResources.length }} 项</span>
      </div>
    </div>
  </section>
</template>
