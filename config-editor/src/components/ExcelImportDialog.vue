<script setup>
import { CheckCircle2, Save } from 'lucide-vue-next'

defineProps({ summary: { type: Object, required: true } })
defineEmits(['close', 'save'])
</script>

<template>
  <div class="dialog-backdrop" role="presentation" @click.self="$emit('close')">
    <section class="recovery-dialog import-dialog" role="dialog" aria-modal="true" aria-labelledby="import-title">
      <div class="dialog-icon success"><CheckCircle2 :size="22" /></div>
      <div class="dialog-copy">
        <h2 id="import-title">Excel 已导入</h2>
        <p>已用“{{ summary.fileName }}”替换当前项目内容。</p>
        <small>请检查内容，并保存为可视化项目文件。后续编辑应继续打开该项目文件。</small>
      </div>
      <dl class="import-summary">
        <div><dt>工作表</dt><dd>{{ summary.sheetCount }}</dd></div>
        <div><dt>内容资源</dt><dd>{{ summary.contentCount }}</dd></div>
        <div><dt>消息与对白</dt><dd>{{ summary.scriptCount }}</dd></div>
        <div><dt>剧情事件</dt><dd>{{ summary.eventCount }}</dd></div>
      </dl>
      <div class="dialog-actions">
        <button type="button" class="secondary-button" @click="$emit('close')">稍后保存</button>
        <button type="button" class="primary-button" @click="$emit('save')"><Save :size="14" />保存项目文件</button>
      </div>
    </section>
  </div>
</template>
