<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { ChevronDown, Code2, Copy, ListOrdered, X } from 'lucide-vue-next'
import FieldControl from './FieldControl.vue'
import { itemTitle } from '../utils/display'
import { isFieldRequired, visibleFieldsForKeys } from '../schema/fields'

const props = defineProps({
  node: { type: Object, default: null },
  resource: { type: Object, default: null },
  fieldDefinitions: { type: Object, required: true },
  displayMode: { type: String, required: true },
  focusFieldKey: { type: String, default: '' },
})

const emit = defineEmits(['close', 'update-node-field', 'update-resource-field'])
const jsonOpen = ref(false)

const selectedItem = computed(() => props.node || props.resource)
const isNode = computed(() => Boolean(props.node))
const fields = computed(() => visibleFieldsForKeys(
  selectedItem.value?.fieldKeys || [], selectedItem.value?.data || {}, props.fieldDefinitions,
))
const title = computed(() => itemTitle(selectedItem.value, props.displayMode))
const displayedId = computed(() => selectedItem.value?.runtimeId !== undefined
  ? selectedItem.value.runtimeId
  : selectedItem.value?.id || '')
const jsonPreview = computed(() => JSON.stringify({
  id: displayedId.value,
  ...(isNode.value
    ? { name: selectedItem.value?.name, ...unflattenNodeData(selectedItem.value?.data || {}) }
    : {
        ...selectedItem.value?.data,
        ...(selectedItem.value?.items ? { items: selectedItem.value.items.map((item) => item.data) } : {}),
      }),
}, null, 2))

function unflattenNodeData(data) {
  const output = {}
  for (const [path, value] of Object.entries(data)) {
    const keys = path.split('.')
    let cursor = output
    keys.forEach((key, index) => {
      if (index === keys.length - 1) cursor[key] = value
      else cursor = cursor[key] ||= {}
    })
  }
  return output
}

function updateField(key, value) {
  if (isNode.value) emit('update-node-field', { nodeId: props.node.id, key, value })
  else emit('update-resource-field', { resourceId: props.resource.id, key, value })
}

async function copyId() {
  if (displayedId.value) await navigator.clipboard?.writeText(displayedId.value)
}

watch([() => props.focusFieldKey, selectedItem], async ([fieldKey]) => {
  if (!fieldKey) return
  await nextTick()
  const block = document.querySelector(`.detail-panel [data-field-key="${CSS.escape(fieldKey)}"]`)
  block?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  block?.querySelector('input, textarea, select, button')?.focus({ preventScroll: true })
}, { immediate: true })
</script>

<template>
  <aside class="detail-panel" aria-label="详细设置">
    <header class="detail-header">
      <div>
        <p class="panel-kicker">{{ isNode ? '节点设置' : '内容设置' }}</p>
        <h2>{{ title }}</h2>
      </div>
      <button type="button" class="square-button" aria-label="关闭详细设置" @click="$emit('close')">
        <X :size="16" />
      </button>
    </header>

    <div v-if="selectedItem" class="detail-scroll">
      <section v-if="isNode || displayedId" class="detail-section id-section">
        <div class="section-title-row">
          <h3>基本信息</h3><span class="type-chip">{{ isNode ? (node.kind === 'reference' ? 'reference' : 'event') : 'object' }}</span>
        </div>
        <label class="field-control">
          <span class="field-label-row">
            <span class="field-label">{{ displayMode === 'json' ? 'id' : '内部 ID' }}</span>
            <span class="type-chip">string</span>
          </span>
          <span class="copy-field">
            <input type="text" :value="displayedId" readonly />
            <button type="button" aria-label="复制 ID" title="复制 ID" @click="copyId"><Copy :size="14" /></button>
          </span>
        </label>
      </section>

      <section class="detail-section">
        <div class="section-title-row"><h3>参数</h3><span>{{ fields.length }} 项</span></div>
        <div class="detail-fields">
          <div v-for="field in fields" :key="field.key" class="detail-field-block" :data-field-key="field.key">
            <FieldControl
              :field="field"
              :model-value="selectedItem.data[field.key]"
              :display-mode="displayMode"
              :required="isFieldRequired(field, selectedItem.data)"
              show-description
              @update:model-value="updateField(field.key, $event)"
            />
            <div v-if="displayMode !== 'zh'" class="developer-hint">
              <Code2 :size="13" /> JSON：{{ field.key }}
            </div>
          </div>
        </div>
      </section>

      <section v-if="resource?.orderHint" class="detail-section order-hint-section">
        <div class="order-hint-title"><ListOrdered :size="15" /><strong>顺序说明</strong></div>
        <p>{{ resource.orderHint }}</p>
      </section>

      <section class="detail-section json-section">
        <button type="button" class="section-toggle" @click="jsonOpen = !jsonOpen">
          <span><Code2 :size="15" /> 查看当前对象 JSON</span>
          <ChevronDown :size="15" :class="{ rotated: !jsonOpen }" />
        </button>
        <pre v-if="jsonOpen">{{ jsonPreview }}</pre>
      </section>

    </div>
    <div v-else class="detail-empty">
      <p>尚未选择内容</p>
      <span>从左侧分类或蓝图画布中选择一项后，可在这里查看详细设置。</span>
    </div>
  </aside>
</template>
