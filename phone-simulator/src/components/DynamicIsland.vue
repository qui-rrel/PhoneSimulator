<script setup>
import { computed } from 'vue'
import { Music2 } from 'lucide-vue-next'
import { usePhoneStore } from '../stores/phone'

const phone = usePhoneStore()
const expanded = computed(() => phone.activeAppId === 'music')
</script>

<template>
  <div class="dynamic-island" :class="{ 'dynamic-island--expanded': expanded }">
    <Music2 v-if="expanded" :size="14" />
    <span v-if="expanded" class="island-wave"><i></i><i></i><i></i><i></i></span>
  </div>
</template>
