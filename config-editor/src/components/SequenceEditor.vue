<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  ArrowDown, ArrowUp, ChevronDown, CopyPlus, FilePlus2, GripVertical,
  MessageSquareText, Plus, Search, Trash2,
} from 'lucide-vue-next'
import FieldControl from './FieldControl.vue'
import { getSequenceSchema, sequenceSchemas } from '../schema/sequences.js'
import { isFieldRequired, visibleFieldsForKeys } from '../schema/fields.js'
import { itemTitle } from '../utils/display.js'

const props = defineProps({
  section: { type: Object, required: true },
  selectedId: { type: String, required: true },
  fieldDefinitions: { type: Object, required: true },
  displayMode: { type: String, required: true },
  focusItemId: { type: String, default: '' },
  focusFieldKey: { type: String, default: '' },
  allowedTypes: { type: Array, default: () => [] },
})

const emit = defineEmits([
  'select', 'create-script', 'duplicate-script', 'delete-script',
  'create-item', 'toggle-item', 'duplicate-item', 'delete-item', 'move-item', 'reorder-item', 'update-item-field',
])

const search = ref('')
const typeFilter = ref('all')
const createMenuOpen = ref(false)
const createMenu = ref(null)
const draggingItemId = ref('')
const dragOverItemId = ref('')
const dragOverPosition = ref('')

const availableTypes = computed(() => Object.entries(sequenceSchemas)
  .filter(([type]) => !props.allowedTypes.length || props.allowedTypes.includes(type))
  .map(([type, schema]) => ({ type, label: schema.label })))
const selectedScript = computed(() => props.section.resources.find((item) => item.id === props.selectedId) || props.section.resources[0] || null)
const selectedSchema = computed(() => getSequenceSchema(selectedScript.value?.resourceType))
const filteredScripts = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return props.section.resources.filter((resource) => {
    if (typeFilter.value !== 'all' && resource.resourceType !== typeFilter.value) return false
    if (!keyword) return true
    return `${resource.name} ${resource.runtimeId} ${resource.typeLabel}`.toLowerCase().includes(keyword)
  })
})

watch(() => props.section.id, () => {
  search.value = ''
  typeFilter.value = 'all'
  createMenuOpen.value = false
})
watch(() => props.allowedTypes.join('|'), () => {
  search.value = ''
  typeFilter.value = 'all'
  createMenuOpen.value = false
})

watch([() => props.focusItemId, selectedScript], async ([itemId]) => {
  if (!itemId) return
  const item = selectedScript.value?.items.find((entry) => entry.id === itemId)
  if (!item) return
  item.expanded = true
  await nextTick()
  const card = document.querySelector(`.sequence-editor [data-item-id="${CSS.escape(itemId)}"]`)
  card?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  if (props.focusFieldKey) card?.querySelector(`[data-field-key="${CSS.escape(props.focusFieldKey)}"] input, [data-field-key="${CSS.escape(props.focusFieldKey)}"] textarea, [data-field-key="${CSS.escape(props.focusFieldKey)}"] select`)?.focus({ preventScroll: true })
}, { immediate: true })

function itemFields(item) {
  return visibleFieldsForKeys(selectedSchema.value?.itemFieldKeys || [], item.data, props.fieldDefinitions)
}

function itemSummary(item, index) {
  const data = item.data
  const textKey = Object.keys(data).find((key) => key.endsWith('.text'))
  const text = String(data[textKey] || '').replace(/\s+/g, ' ').trim()
  const typeKey = Object.keys(data).find((key) => key.endsWith('.type'))
  const sideKey = Object.keys(data).find((key) => key.endsWith('.side') || key.endsWith('.senderId'))
  const prefix = data[sideKey] || data[typeKey] || selectedSchema.value?.itemLabel || '内容'
  return text ? `${prefix} · ${text}` : `${prefix} ${index + 1}`
}

function handleOutsidePointer(event) {
  if (createMenuOpen.value && !createMenu.value?.contains(event.target)) createMenuOpen.value = false
}

function createScript(type) {
  emit('create-script', type)
  createMenuOpen.value = false
}

function startItemDrag(item, event) {
  draggingItemId.value = item.id
  dragOverItemId.value = ''
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', item.id)
}

function dragOverItem(item, event) {
  if (!draggingItemId.value || draggingItemId.value === item.id) return
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
  dragOverItemId.value = item.id
  const rect = event.currentTarget.getBoundingClientRect()
  dragOverPosition.value = event.clientY > rect.top + rect.height / 2 ? 'after' : 'before'
}

function dropItem(item, event) {
  event.preventDefault()
  if (draggingItemId.value && draggingItemId.value !== item.id) {
    emit('reorder-item', {
      resourceId: selectedScript.value.id,
      itemId: draggingItemId.value,
      targetId: item.id,
      position: dragOverPosition.value || 'before',
    })
  }
  finishItemDrag()
}

function finishItemDrag() {
  draggingItemId.value = ''
  dragOverItemId.value = ''
  dragOverPosition.value = ''
}

onMounted(() => document.addEventListener('pointerdown', handleOutsidePointer))
onBeforeUnmount(() => document.removeEventListener('pointerdown', handleOutsidePointer))
</script>

<template>
  <section class="sequence-editor">
    <aside class="sequence-script-panel">
      <div class="sequence-script-toolbar">
        <label class="search-box wide">
          <Search :size="15" />
          <input v-model="search" type="search" placeholder="搜索脚本名称或 ID" />
        </label>
        <select v-model="typeFilter" class="toolbar-select" aria-label="筛选脚本类型">
          <option value="all">全部类型</option>
          <option v-for="item in availableTypes" :key="item.type" :value="item.type">{{ item.label }}</option>
        </select>
        <div ref="createMenu" class="create-menu">
          <button type="button" class="secondary-button create-button" :aria-expanded="createMenuOpen" @click="createMenuOpen = !createMenuOpen">
            <FilePlus2 :size="15" /> 新建 <ChevronDown :size="14" />
          </button>
          <div v-if="createMenuOpen" class="create-menu-popover sequence-create-menu" role="menu">
            <button v-for="item in availableTypes" :key="item.type" type="button" role="menuitem" @click="createScript(item.type)">
              <strong>{{ item.label }}</strong><small>{{ item.type }}</small>
            </button>
          </div>
        </div>
      </div>

      <div class="sequence-script-list">
        <button
          v-for="resource in filteredScripts"
          :key="resource.id"
          type="button"
          class="sequence-script-row"
          :class="{ active: resource.id === selectedScript?.id }"
          @click="emit('select', resource.id)"
        >
          <span class="sequence-script-icon"><MessageSquareText :size="15" /></span>
          <span class="sequence-script-copy">
            <strong>{{ itemTitle(resource, displayMode) }}</strong>
            <small>{{ resource.typeLabel }} · {{ resource.items.length }} 项</small>
          </span>
        </button>
        <div v-if="!filteredScripts.length" class="sequence-list-empty">没有符合条件的脚本</div>
      </div>
      <div class="sequence-list-footer">共 {{ filteredScripts.length }} 个脚本</div>
    </aside>

    <main v-if="selectedScript" class="sequence-content">
      <header class="sequence-content-header">
        <div>
          <p class="view-kicker">{{ selectedScript.typeLabel }}</p>
          <h3>{{ itemTitle(selectedScript, displayMode) }}</h3>
          <span>{{ selectedSchema.rootItem ? '固定内容' : `${selectedScript.items.length} 个顺序项` }}</span>
        </div>
        <div class="sequence-header-actions">
          <button type="button" class="square-button" aria-label="创建脚本副本" title="创建当前脚本的副本（类似 Ctrl+D）" @click="emit('duplicate-script', selectedScript.id)">
            <CopyPlus :size="15" />
          </button>
          <button type="button" class="square-button danger-button" aria-label="删除脚本" title="删除当前脚本" @click="emit('delete-script', selectedScript.id)">
            <Trash2 :size="15" />
          </button>
          <button v-if="!selectedSchema.rootItem" type="button" class="primary-button" @click="emit('create-item', selectedScript.id)">
            <Plus :size="15" /> 添加{{ selectedSchema.itemLabel }}
          </button>
        </div>
      </header>

      <div class="sequence-scroll">
        <article
          v-for="(item, index) in selectedScript.items"
          :key="item.id"
          :data-item-id="item.id"
          class="sequence-item-card"
          :class="{
            collapsed: item.expanded === false,
            dragging: draggingItemId === item.id,
            'drag-over-before': dragOverItemId === item.id && dragOverPosition === 'before',
            'drag-over-after': dragOverItemId === item.id && dragOverPosition === 'after',
          }"
          @dragover="dragOverItem(item, $event)"
          @drop="dropItem(item, $event)"
        >
          <header class="sequence-item-header">
            <button
              v-if="!selectedSchema.rootItem"
              type="button"
              class="sequence-item-handle"
              draggable="true"
              aria-label="拖动排序"
              title="按住并上下拖动排序"
              @dragstart="startItemDrag(item, $event)"
              @dragend="finishItemDrag"
            ><GripVertical :size="17" /></button>
            <span class="sequence-index">{{ index + 1 }}</span>
            <strong>{{ itemSummary(item, index) }}</strong>
            <div class="sequence-item-actions">
              <template v-if="!selectedSchema.rootItem">
                <button type="button" class="square-button" aria-label="上移" title="上移一项" :disabled="index === 0" @click="emit('move-item', { resourceId: selectedScript.id, itemId: item.id, direction: -1 })"><ArrowUp :size="14" /></button>
                <button type="button" class="square-button" aria-label="下移" title="下移一项" :disabled="index === selectedScript.items.length - 1" @click="emit('move-item', { resourceId: selectedScript.id, itemId: item.id, direction: 1 })"><ArrowDown :size="14" /></button>
                <button type="button" class="square-button" aria-label="创建副本" title="创建该项的副本（类似 Ctrl+D）" @click="emit('duplicate-item', { resourceId: selectedScript.id, itemId: item.id })"><CopyPlus :size="14" /></button>
                <button type="button" class="square-button danger-button" aria-label="删除" title="删除该项" @click="emit('delete-item', { resourceId: selectedScript.id, itemId: item.id })"><Trash2 :size="14" /></button>
              </template>
              <button
                type="button"
                class="square-button sequence-collapse-button"
                :aria-expanded="item.expanded !== false"
                :aria-label="item.expanded === false ? '展开参数' : '收起参数'"
                :title="item.expanded === false ? '展开参数' : '收起参数'"
                @click="emit('toggle-item', { resourceId: selectedScript.id, itemId: item.id })"
              ><ChevronDown :size="15" :class="{ rotated: item.expanded === false }" /></button>
            </div>
          </header>
          <div v-if="item.expanded !== false" class="sequence-item-fields">
            <div v-for="field in itemFields(item)" :key="field.key" :data-field-key="field.key">
              <FieldControl
                :field="field"
                :model-value="item.data[field.key]"
                :display-mode="displayMode"
                :required="isFieldRequired(field, item.data)"
                @update:model-value="emit('update-item-field', { resourceId: selectedScript.id, itemId: item.id, key: field.key, value: $event })"
              />
            </div>
          </div>
        </article>

        <div v-if="!selectedScript.items.length" class="sequence-empty">
          <MessageSquareText :size="30" />
          <strong>这个脚本还没有内容</strong>
          <span>添加第一项后，手机会按这里的顺序执行。</span>
          <button type="button" class="primary-button" @click="emit('create-item', selectedScript.id)"><Plus :size="15" /> 添加{{ selectedSchema.itemLabel }}</button>
        </div>
      </div>
    </main>

    <div v-else class="sequence-empty sequence-empty-full">
      <MessageSquareText :size="34" />
      <strong>还没有消息或对白脚本</strong>
      <span>点击左上角“新建”，选择需要的脚本类型。</span>
    </div>
  </section>
</template>
