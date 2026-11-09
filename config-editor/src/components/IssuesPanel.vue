<script setup>
import { computed } from 'vue'
import { AlertTriangle, ChevronDown, ChevronUp, CircleX, Info } from 'lucide-vue-next'

const props = defineProps({
  issues: { type: Array, required: true },
  open: { type: Boolean, required: true },
})

defineEmits(['toggle', 'select'])

const warningCount = computed(() => props.issues.filter((issue) => issue.level === 'warning').length)
const errorCount = computed(() => props.issues.filter((issue) => issue.level === 'error').length)
const infoCount = computed(() => props.issues.filter((issue) => issue.level === 'info').length)
</script>

<template>
  <footer class="issues-panel" :class="{ open }">
    <button type="button" class="issues-heading" @click="$emit('toggle')">
      <span class="issues-title">问题列表</span>
      <span v-if="errorCount" class="issue-count error"><CircleX :size="13" /> {{ errorCount }}</span>
      <span v-if="warningCount" class="issue-count warning"><AlertTriangle :size="13" /> {{ warningCount }}</span>
      <span v-if="infoCount" class="issue-count info"><Info :size="13" /> {{ infoCount }}</span>
      <ChevronDown v-if="open" :size="16" /><ChevronUp v-else :size="16" />
    </button>
    <div v-if="open" class="issues-list">
      <div v-if="!issues.length" class="issues-empty">未发现需要处理的问题</div>
      <button
        v-for="issue in issues"
        :key="issue.id"
        type="button"
        class="issue-row"
        :class="issue.level"
        @click="$emit('select', issue)"
      >
        <CircleX v-if="issue.level === 'error'" :size="15" /><AlertTriangle v-else-if="issue.level === 'warning'" :size="15" /><Info v-else :size="15" />
        <strong>{{ issue.title }}</strong>
        <span>{{ issue.detail }}</span>
        <code v-if="issue.nodeId || issue.resourceId">{{ issue.nodeId || issue.resourceId }}</code>
      </button>
    </div>
  </footer>
</template>
