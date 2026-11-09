<script setup>
import {
  Braces,
  FilePlus2,
  FileJson2,
  FileSpreadsheet,
  FolderOpen,
  PanelRightClose,
  PanelRightOpen,
  Redo2,
  Save,
  SaveAll,
  Undo2,
} from 'lucide-vue-next'

defineProps({
  displayMode: { type: String, required: true },
  detailOpen: { type: Boolean, required: true },
  projectName: { type: String, required: true },
  fileLabel: { type: String, required: true },
  dirty: { type: Boolean, required: true },
  busy: { type: Boolean, required: true },
  exportErrorCount: { type: Number, default: 0 },
})

defineEmits([
  'update:display-mode', 'toggle-detail', 'new-project', 'open-project',
  'import-excel', 'save-project', 'save-project-as', 'export-runtime',
])

const modes = [
  { id: 'zh', label: '中文' },
  { id: 'dual', label: '中英对照' },
  { id: 'json', label: 'JSON 字段' },
]
</script>

<template>
  <header class="topbar">
    <div class="brand-block">
      <div class="brand-mark"><Braces :size="18" /></div>
      <div>
        <p class="eyebrow">PhoneSimulator</p>
        <div class="brand-title-row">
          <h1>可视化配置编辑器</h1>
        </div>
      </div>
    </div>

    <div class="toolbar" aria-label="项目工具栏">
      <div class="toolbar-group">
        <button type="button" class="icon-button" :disabled="busy" title="新建项目" @click="$emit('new-project')">
          <FilePlus2 :size="16" /><span>新建</span>
        </button>
        <button type="button" class="icon-button" :disabled="busy" title="打开项目" @click="$emit('open-project')">
          <FolderOpen :size="16" /><span>打开</span>
        </button>
        <button type="button" class="icon-button" :disabled="busy" title="导入旧版 Excel" @click="$emit('import-excel')">
          <FileSpreadsheet :size="16" /><span>导入 Excel</span>
        </button>
        <button type="button" class="icon-button" :disabled="busy || !dirty" title="保存项目" @click="$emit('save-project')">
          <Save :size="16" /><span>保存</span>
        </button>
        <button type="button" class="icon-button" :disabled="busy" title="另存为" @click="$emit('save-project-as')">
          <SaveAll :size="16" /><span>另存为</span>
        </button>
        <button
          type="button"
          class="icon-button runtime-export-button"
          :class="{ 'has-errors': exportErrorCount > 0 }"
          :disabled="busy"
          :title="exportErrorCount ? `导出运行时 JSON（还有 ${exportErrorCount} 个错误）` : '导出运行时 JSON'"
          @click="$emit('export-runtime')"
        >
          <FileJson2 :size="16" /><span>导出 JSON</span>
          <b v-if="exportErrorCount" class="toolbar-error-badge">{{ exportErrorCount }}</b>
        </button>
      </div>
      <div class="toolbar-divider" />
      <div class="toolbar-group compact">
        <button type="button" class="square-button" disabled aria-label="撤销" title="撤销">
          <Undo2 :size="16" />
        </button>
        <button type="button" class="square-button" disabled aria-label="重做" title="重做">
          <Redo2 :size="16" />
        </button>
      </div>
      <div class="toolbar-divider" />
      <div class="project-identity" :title="fileLabel">
        <span class="dirty-dot" :class="{ active: dirty }" />
        <span>
          <strong>{{ projectName }}</strong>
          <small>{{ dirty ? '有未保存修改' : fileLabel }}</small>
        </span>
      </div>
    </div>

    <div class="topbar-right">
      <div class="mode-switcher" aria-label="字段显示方式">
        <button
          v-for="mode in modes"
          :key="mode.id"
          type="button"
          :class="{ active: displayMode === mode.id }"
          @click="$emit('update:display-mode', mode.id)"
        >
          {{ mode.label }}
        </button>
      </div>
      <button
        type="button"
        class="square-button panel-toggle"
        :aria-label="detailOpen ? '隐藏详细设置' : '显示详细设置'"
        :title="detailOpen ? '隐藏详细设置' : '显示详细设置'"
        @click="$emit('toggle-detail')"
      >
        <PanelRightClose v-if="detailOpen" :size="17" />
        <PanelRightOpen v-else :size="17" />
      </button>
    </div>
  </header>
</template>
