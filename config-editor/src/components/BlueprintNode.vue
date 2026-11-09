<script setup>
import { computed } from 'vue'
import { ChevronDown, ChevronRight, CircleDot, GripHorizontal } from 'lucide-vue-next'
import FieldControl from './FieldControl.vue'
import { itemTitle } from '../utils/display'
import { getNodeHeight, getVisibleNodeFields, NODE_WIDTH } from '../graph/geometry'
import { isFieldRequired } from '../schema/fields'
import { getNodePorts, getNodeType } from '../schema/nodeTypes'

const props = defineProps({
  node: { type: Object, required: true },
  fieldDefinitions: { type: Object, required: true },
  displayMode: { type: String, required: true },
  selected: { type: Boolean, default: false },
  connectedFieldKeys: { type: Array, default: () => [] },
})

const emit = defineEmits(['select', 'toggle', 'drag-start', 'update-field', 'port-start', 'port-end'])
const meta = computed(() => getNodeType(props.node))
const ports = computed(() => getNodePorts(props.node))
const inputs = computed(() => [
  ...ports.value.flowInputs.map((port) => ({ ...port, kind: 'flow' })),
  ...ports.value.dataInputs.map((port) => ({ ...port, kind: 'data' })),
])
const outputs = computed(() => [
  ...ports.value.flowOutputs.map((port) => ({ ...port, kind: 'flow' })),
  ...ports.value.dataOutputs.map((port) => ({ ...port, kind: 'data' })),
])
const visibleFields = computed(() => getVisibleNodeFields(
  props.node, props.fieldDefinitions, props.connectedFieldKeys,
))
const nodeHeight = computed(() => getNodeHeight(props.node, props.fieldDefinitions, props.connectedFieldKeys))

function updateField(key, value) {
  emit('update-field', { nodeId: props.node.id, key, value })
}

function portColor(port) {
  return port.color || (port.kind === 'data' ? '#c69be8' : '#65b7ec')
}

function handleFieldsWheel(event) {
  const scroller = event.currentTarget
  if (scroller.scrollHeight <= scroller.clientHeight + 1) return
  event.preventDefault()
  event.stopPropagation()
  const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 18
    : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? scroller.clientHeight
      : 1
  scroller.scrollTop += event.deltaY * unit
}

function handleNodeDoubleClick(event) {
  if (event.target.closest('input, textarea, select, button, a')) return
  emit('toggle', props.node.id)
}
</script>

<template>
  <article
    class="blueprint-node"
    :class="[{ selected, collapsed: !node.expanded, reference: meta.kind === 'reference' }, `node-${node.type}`]"
    :style="{
      left: `${node.x}px`, top: `${node.y}px`, width: `${NODE_WIDTH}px`, height: `${nodeHeight}px`,
      '--node-color': meta.color,
    }"
    @pointerdown.stop="$emit('select', { nodeId: node.id, event: $event })"
    @dblclick.stop="handleNodeDoubleClick"
  >
    <header class="node-header" @pointerdown.stop="$emit('drag-start', node, $event)">
      <span class="node-grip"><GripHorizontal :size="15" /></span>
      <div class="node-title-copy">
        <strong>{{ itemTitle(node, displayMode) }}</strong>
        <small>
          {{ meta.label }} · {{ visibleFields.length }} 个参数
          <span v-if="node.data['event.initialActive']" class="initial-node-mark">初始</span>
        </small>
      </div>
      <button
        type="button"
        class="node-collapse"
        :aria-label="node.expanded ? '收起节点参数' : '展开节点参数'"
        @pointerdown.stop
        @click.stop="$emit('toggle', node.id)"
      >
        <ChevronDown v-if="node.expanded" :size="16" />
        <ChevronRight v-else :size="16" />
      </button>
    </header>

    <div v-if="inputs.length" class="node-inputs">
      <div v-for="input in inputs" :key="`${input.kind}:${input.key}`" class="node-input-row" :class="`port-${input.kind}`">
        <button
          type="button"
          class="input-port"
          :class="{ connected: connectedFieldKeys.includes(input.fieldKey) }"
          :style="{ '--port-color': portColor(input) }"
          :aria-label="`连接${input.label}`"
          :title="`${input.label} · ${input.valueType}`"
          @pointerdown.stop.prevent="$emit('port-start', { direction: 'input', nodeId: node.id, port: input, event: $event })"
          @pointerup.stop.prevent="$emit('port-end', { direction: 'input', nodeId: node.id, port: input, event: $event })"
        />
        <CircleDot v-if="input.kind === 'data'" :size="11" />
        <span>{{ displayMode === 'json' ? input.key : input.label }}</span>
        <small v-if="input.kind === 'data' && connectedFieldKeys.includes(input.fieldKey)">已连接</small>
      </div>
    </div>

    <div v-if="node.expanded && visibleFields.length" class="node-fields" @wheel="handleFieldsWheel">
      <FieldControl
        v-for="field in visibleFields"
        :key="field.key"
        :field="field"
        :model-value="node.data[field.key]"
        :display-mode="displayMode"
        :required="isFieldRequired(field, node.data)"
        compact
        @update:model-value="updateField(field.key, $event)"
      />
    </div>

    <div v-if="outputs.length" class="node-outputs">
      <div v-for="output in outputs" :key="`${output.kind}:${output.key}`" class="node-output-row" :class="`port-${output.kind}`">
        <CircleDot v-if="output.kind === 'data'" :size="11" />
        <span>{{ displayMode === 'json' ? output.key : output.label }}</span>
        <button
          type="button"
          class="output-port"
          :style="{ '--port-color': portColor(output) }"
          :aria-label="`连接${output.label}`"
          :title="`${output.label} · ${output.valueType}`"
          @pointerdown.stop.prevent="$emit('port-start', { direction: 'output', nodeId: node.id, port: output, event: $event })"
          @pointerup.stop.prevent="$emit('port-end', { direction: 'output', nodeId: node.id, port: output, event: $event })"
        />
      </div>
    </div>
    <div v-else-if="meta.kind === 'event'" class="node-terminal-label">无后续出口</div>
  </article>
</template>
