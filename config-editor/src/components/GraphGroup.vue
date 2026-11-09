<script setup>
import { GripHorizontal, Maximize2 } from 'lucide-vue-next'

defineProps({
  group: { type: Object, required: true },
  selected: { type: Boolean, default: false },
})

defineEmits(['select', 'drag-start', 'resize-start', 'rename'])
</script>

<template>
  <section
    class="graph-group"
    :class="{ selected }"
    :style="{
      left: `${group.x}px`, top: `${group.y}px`, width: `${group.width}px`, height: `${group.height}px`,
      '--group-color': group.color,
    }"
    @pointerdown.stop="$emit('select', group.id)"
  >
    <header
      class="graph-group-header"
      title="拖动分组；双击修改名称"
      @pointerdown.stop="$emit('drag-start', group, $event)"
      @dblclick.stop="$emit('rename', group.id)"
    >
      <GripHorizontal :size="14" /><strong>{{ group.title }}</strong>
    </header>
    <button
      type="button"
      class="graph-group-resize"
      aria-label="调整分组大小"
      title="拖动调整分组大小"
      @pointerdown.stop.prevent="$emit('resize-start', group, $event)"
    ><Maximize2 :size="13" /></button>
  </section>
</template>
