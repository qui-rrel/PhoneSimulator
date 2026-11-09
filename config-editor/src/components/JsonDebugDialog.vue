<script setup>
import { computed, ref } from 'vue'
import { Check, Copy, X } from 'lucide-vue-next'

const props = defineProps({ document: { type: Object, required: true } })
defineEmits(['close'])

const tab = ref('content')
const copied = ref(false)
const tabs = [
  { id: 'content', label: 'content.json' },
  { id: 'story', label: 'story.json' },
  { id: 'editor', label: '编辑器元数据' },
]
const preview = computed(() => JSON.stringify(props.document[tab.value] || {}, null, 2))

async function copyJson() {
  await navigator.clipboard?.writeText(preview.value)
  copied.value = true
  window.setTimeout(() => { copied.value = false }, 1600)
}
</script>

<template>
  <div class="dialog-backdrop" @mousedown.self="$emit('close')">
    <section class="json-debug-dialog" role="dialog" aria-modal="true" aria-label="只读 JSON 调试视图">
      <header>
        <div><p class="panel-kicker">调试视图</p><h2>运行时 JSON 预览</h2></div>
        <button type="button" class="square-button" aria-label="关闭" @click="$emit('close')"><X :size="17" /></button>
      </header>
      <div class="json-debug-toolbar">
        <div class="json-debug-tabs">
          <button v-for="item in tabs" :key="item.id" type="button" :class="{ active: tab === item.id }" @click="tab = item.id">{{ item.label }}</button>
        </div>
        <button type="button" class="secondary-button" @click="copyJson">
          <Check v-if="copied" :size="15" /><Copy v-else :size="15" />{{ copied ? '已复制' : '复制当前 JSON' }}
        </button>
      </div>
      <p class="json-debug-note">这里只用于检查编译后的结构，不能直接编辑。节点坐标、分组等编辑器信息不会写入运行时 JSON。</p>
      <pre>{{ preview }}</pre>
    </section>
  </div>
</template>
