<script setup>
import { AlertTriangle, Download, FileJson2, FolderOutput, ShieldAlert, X } from 'lucide-vue-next'

defineProps({
  errorCount: { type: Number, required: true },
  warningCount: { type: Number, required: true },
  busy: { type: Boolean, required: true },
  directorySupported: { type: Boolean, required: true },
})

defineEmits(['close', 'show-errors', 'write-directory', 'download-content', 'download-story'])
</script>

<template>
  <div class="dialog-backdrop" @mousedown.self="$emit('close')">
    <section class="runtime-export-dialog" role="dialog" aria-modal="true" aria-label="导出运行时 JSON">
      <header class="runtime-export-header">
        <div class="dialog-icon"><FileJson2 :size="20" /></div>
        <div class="dialog-copy">
          <p class="panel-kicker">运行时文件</p>
          <h2>导出 content.json 与 story.json</h2>
        </div>
        <button type="button" class="square-button" aria-label="关闭" :disabled="busy" @click="$emit('close')">
          <X :size="17" />
        </button>
      </header>

      <div v-if="errorCount" class="runtime-export-blocked">
        <ShieldAlert :size="22" />
        <div>
          <strong>还有 {{ errorCount }} 个错误，暂时不能导出</strong>
          <p>请先修正问题列表中的红色项目，避免用不完整配置覆盖手机网页的数据。</p>
        </div>
        <button type="button" class="secondary-button danger" @click="$emit('show-errors')">查看错误</button>
      </div>

      <template v-else>
        <p class="runtime-export-intro">
          导出的两份文件会使用当前编辑器内容，不包含节点坐标、折叠状态、分组和其他编辑器信息。
        </p>

        <div v-if="warningCount" class="runtime-export-warning">
          <AlertTriangle :size="17" />
          <span>当前有 {{ warningCount }} 个警告，不会阻止导出，但建议确认剧情流程符合预期。</span>
        </div>

        <section class="runtime-export-option recommended">
          <div class="runtime-export-option-icon"><FolderOutput :size="22" /></div>
          <div>
            <span class="runtime-export-badge">推荐</span>
            <h3>写入手机项目数据文件夹</h3>
            <p>选择 <code>phone-simulator/src/data</code>，编辑器会写入并覆盖其中的两份同名 JSON。</p>
          </div>
          <button
            type="button"
            class="primary-button"
            :disabled="busy || !directorySupported"
            @click="$emit('write-directory')"
          >
            <FolderOutput :size="16" />{{ busy ? '正在写入…' : '选择文件夹并写入' }}
          </button>
          <small v-if="!directorySupported" class="runtime-export-unsupported">
            当前浏览器不支持直接写入文件夹，请使用下方下载方式。
          </small>
        </section>

        <section class="runtime-export-option">
          <div class="runtime-export-option-icon"><Download :size="22" /></div>
          <div>
            <h3>分别下载运行时文件</h3>
            <p>适合无法授权文件夹的浏览器。下载后手动放入 <code>phone-simulator/src/data</code>。</p>
          </div>
          <div class="runtime-download-actions">
            <button type="button" class="secondary-button" :disabled="busy" @click="$emit('download-content')">
              <Download :size="15" /> content.json
            </button>
            <button type="button" class="secondary-button" :disabled="busy" @click="$emit('download-story')">
              <Download :size="15" /> story.json
            </button>
          </div>
        </section>

        <p class="runtime-export-footnote">写入运行时 JSON 不会自动保存可视化项目文件；请继续使用顶部“保存”保留编辑状态。</p>
      </template>
    </section>
  </div>
</template>
