<script setup>
import AppGlyph from './AppGlyph.vue'

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
    <span class="app-icon">
      <AppGlyph :app="app" :size="compact ? 29 : 30" />
      <span v-if="badge ?? app.badge" class="app-badge">
        {{ Number(badge ?? app.badge) > 99 ? '99+' : (badge ?? app.badge) }}
      </span>
    </span>
    <span v-if="!compact" class="app-label">{{ app.label }}</span>
  </button>
</template>
