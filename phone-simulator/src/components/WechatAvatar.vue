<script setup>
import { computed } from 'vue'

const props = defineProps({
  person: { type: Object, default: null },
  members: { type: Array, default: () => [] },
  size: { type: Number, default: 46 },
})

const visibleMembers = computed(() => props.members.slice(0, 9))
const style = computed(() => ({ width: `${props.size}px`, height: `${props.size}px` }))
</script>

<template>
  <span class="wechat-avatar" :class="{ 'wechat-avatar--group': visibleMembers.length }" :style="style">
    <template v-if="visibleMembers.length">
      <span
        v-for="member in visibleMembers"
        :key="member.id"
        class="wechat-avatar__tile"
        :style="{ background: member.color || '#8b95a5' }"
      >
        <img v-if="member.avatar" :src="member.avatar" alt="" />
        <b v-else>{{ member.initials || member.nickname?.slice(0, 1) || member.name?.slice(0, 1) || '?' }}</b>
      </span>
    </template>
    <template v-else>
      <img v-if="person?.avatar" :src="person.avatar" alt="" />
      <b v-else :style="{ background: person?.color || '#8b95a5' }">
        {{ person?.initials || person?.nickname?.slice(0, 1) || person?.name?.slice(0, 1) || '?' }}
      </b>
    </template>
  </span>
</template>
