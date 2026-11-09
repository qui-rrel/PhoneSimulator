<script setup>
import { computed, ref } from 'vue'
import { Boxes, ChevronDown, GitBranch, MessageCircle, MessageSquareText, Search, Settings2, Smartphone } from 'lucide-vue-next'

const props = defineProps({
  sections: { type: Array, required: true },
  selectedId: { type: String, required: true },
  selectedDirectoryId: { type: String, required: true },
})

defineEmits(['select', 'select-directory'])

const search = ref('')
const icons = { basics: Settings2, content: Boxes, communication: Smartphone, wechat: MessageCircle, scripts: MessageSquareText, story: GitBranch }

const filteredSections = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  if (!keyword) return props.sections
  return props.sections.map((section) => {
    const sectionMatches = `${section.labelZh} ${section.labelEn}`.toLowerCase().includes(keyword)
    const directories = sectionMatches ? section.directories : section.directories.filter((item) => item.label.toLowerCase().includes(keyword))
    return { ...section, directories }
  }).filter((section) => section.directories.length)
})
</script>

<template>
  <aside class="navigation-panel" aria-label="配置分类">
    <div class="panel-heading">
      <div>
        <p class="panel-kicker">资源浏览器</p>
        <h2>配置分类</h2>
      </div>
      <span class="count-pill">{{ sections.length }}</span>
    </div>

    <label class="search-box">
      <Search :size="15" />
      <input v-model="search" type="search" placeholder="搜索配置分类" />
    </label>

    <nav class="section-list">
      <div v-for="section in filteredSections" :key="section.id" class="section-tree-item">
        <button
          type="button"
          class="section-button"
          :class="{ active: selectedId === section.id }"
          @click="$emit('select', section.id)"
        >
          <span class="section-icon"><component :is="icons[section.id]" :size="17" /></span>
          <span class="section-copy">
            <strong>{{ section.labelZh }}</strong>
            <small>{{ section.labelEn }}</small>
          </span>
          <span v-if="section.resources.length" class="section-count">{{ section.resources.length }}</span>
          <ChevronDown v-if="section.directories.length > 1" :size="14" class="section-chevron" :class="{ expanded: selectedId === section.id || search }" />
        </button>
        <div v-if="section.directories.length > 1 && (selectedId === section.id || search)" class="section-children">
          <button
            v-for="item in section.directories"
            :key="item.id"
            type="button"
            class="section-child-button"
            :class="{ active: selectedDirectoryId === item.id }"
            @click="$emit('select-directory', { sectionId: section.id, directoryId: item.id })"
          >
            <span>{{ item.label }}</span><small>{{ item.countLabel }}</small>
          </button>
        </div>
      </div>
    </nav>

  </aside>
</template>
