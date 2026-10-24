<script setup>
defineProps({
  app: { type: Object, required: true },
  compact: { type: Boolean, default: false },
  badge: { type: [Number, String], default: undefined },
})

defineEmits(['open'])
</script>

<template>
  <button
    class="app-icon-button"
    :class="{ 'app-icon-button--compact': compact }"
    type="button"
    :aria-label="app.label"
    @click="$emit('open', app.id)"
  >
    <span
      class="app-icon"
      :style="{ background: app.color, color: app.iconColor || '#fff' }"
    >
      <component :is="app.icon" :size="compact ? 29 : 30" :stroke-width="1.9" />
      <span v-if="badge ?? app.badge" class="app-badge">
        {{ Number(badge ?? app.badge) > 99 ? '99+' : (badge ?? app.badge) }}
      </span>
    </span>
    <span v-if="!compact" class="app-label">{{ app.label }}</span>
  </button>
</template>
