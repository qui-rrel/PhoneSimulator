<script setup>
import { History, RotateCcw, Trash2 } from 'lucide-vue-next'

const props = defineProps({
  candidate: { type: Object, required: true },
})

defineEmits(['restore', 'discard'])

function formatTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '时间未知'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(date)
}
</script>

<template>
  <div class="dialog-backdrop" role="presentation">
    <section class="recovery-dialog" role="dialog" aria-modal="true" aria-labelledby="recovery-title">
      <div class="dialog-icon"><History :size="22" /></div>
      <div class="dialog-copy">
        <h2 id="recovery-title">发现未保存的内容</h2>
        <p>浏览器保留了“{{ props.candidate.document.meta.name }}”的恢复副本。</p>
        <small>保存时间：{{ formatTime(props.candidate.savedAt) }}</small>
      </div>
      <div class="dialog-actions">
        <button type="button" class="secondary-button danger" @click="$emit('discard')">
          <Trash2 :size="15" /> 放弃副本
        </button>
        <button type="button" class="primary-button" autofocus @click="$emit('restore')">
          <RotateCcw :size="15" /> 恢复内容
        </button>
      </div>
    </section>
  </div>
</template>
