<script setup>
import { computed, ref, watch } from 'vue'
import { Dices } from 'lucide-vue-next'
import { fieldLabel, optionLabel } from '../utils/display'

const props = defineProps({
  field: { type: Object, required: true },
  modelValue: { required: false, default: '' },
  displayMode: { type: String, required: true },
  compact: { type: Boolean, default: false },
  showDescription: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])
const label = computed(() => fieldLabel(props.field, props.displayMode))
const mediaPreviewFailed = ref(false)
const canPreviewImage = computed(() => props.field.type === 'media path'
  && /^\/media\/.+\.(?:png|jpe?g|gif|webp|svg)$/i.test(String(props.modelValue || '')))

watch(() => props.modelValue, () => { mediaPreviewFailed.value = false })

function randomize() {
  emit('update:modelValue', Math.floor(Math.random() * 1_000_000_000))
}

function toggleMultiValue(value, checked) {
  const next = new Set(Array.isArray(props.modelValue) ? props.modelValue : [])
  if (checked) next.add(value)
  else next.delete(value)
  emit('update:modelValue', [...next])
}
</script>

<template>
  <label class="field-control" :class="{ compact }">
    <span class="field-label-row">
      <span class="field-label">{{ label }}<span v-if="required" class="required-mark" title="必填"> *</span></span>
      <span class="type-chip">{{ field.type }}</span>
    </span>

    <span v-if="field.type === 'boolean'" class="boolean-control">
      <input
        type="checkbox"
      :required="required"
        :checked="Boolean(modelValue)"
        @change="emit('update:modelValue', $event.target.checked)"
      />
      <span>{{ modelValue ? '是' : '否' }}</span>
    </span>

    <span v-else-if="field.type === 'multi-enum'" class="multi-enum-control">
      <label v-for="option in field.options" :key="option.value">
        <input
          type="checkbox"
          :checked="Array.isArray(modelValue) && modelValue.includes(option.value)"
          @change="toggleMultiValue(option.value, $event.target.checked)"
        />
        <span>{{ optionLabel(field, option.value, displayMode) }}</span>
      </label>
    </span>

    <select
      v-else-if="field.type === 'enum' || field.type === 'reference'"
      :value="modelValue"
      :required="required"
      @change="emit('update:modelValue', $event.target.value)"
    >
      <option v-if="field.type === 'reference'" value="" :disabled="required">{{ required ? '请选择' : '不选择' }}</option>
      <option v-for="option in field.options" :key="option.value" :value="option.value">
        {{ optionLabel(field, option.value, displayMode) }}
      </option>
    </select>

    <span v-else-if="field.type === 'color'" class="color-control">
      <input type="color" :value="modelValue" @input="emit('update:modelValue', $event.target.value)" />
      <input type="text" :value="modelValue" :required="required" @input="emit('update:modelValue', $event.target.value)" />
    </span>

    <span v-else-if="['int', 'number', 'seconds'].includes(field.type)" class="number-control">
      <input
        type="number"
        :value="modelValue"
        :min="field.min"
        :max="field.max"
        :step="field.step || 1"
        :placeholder="field.placeholder || ''"
        :required="required"
        @input="emit('update:modelValue', $event.target.value === '' ? '' : Number($event.target.value))"
      />
      <span v-if="field.type === 'seconds'" class="unit-label">秒</span>
      <span v-else-if="field.unit" class="unit-label">{{ field.unit }}</span>
      <button
        v-if="field.generateRandom"
        type="button"
        class="field-action"
        title="生成随机种子"
        aria-label="生成随机种子"
        @click.prevent="randomize"
      >
        <Dices :size="15" />
      </button>
    </span>

    <textarea
      v-else-if="field.type === 'multiline string'"
      :value="modelValue"
      :placeholder="field.placeholder || ''"
      :required="required"
      rows="5"
      @input="emit('update:modelValue', $event.target.value)"
    />

    <textarea
      v-else-if="field.type === 'list'"
      :value="Array.isArray(modelValue) ? modelValue.join('\n') : modelValue"
      :placeholder="field.placeholder || '每行一项'"
      :required="required"
      rows="5"
      @input="emit('update:modelValue', $event.target.value.split(/\r?\n/).map(item => item.trim()).filter(Boolean))"
    />

    <input
      v-else-if="field.type === 'date' || field.type === 'time'"
      :type="field.type"
      :value="modelValue"
      :required="required"
      @input="emit('update:modelValue', $event.target.value)"
    />

    <span v-else-if="field.type === 'media path'" class="media-path-control">
      <input
        type="text"
        :value="modelValue"
        :placeholder="field.placeholder || '/media/文件名.后缀'"
        :required="required"
        @input="emit('update:modelValue', $event.target.value)"
      />
      <img
        v-if="canPreviewImage && !mediaPreviewFailed"
        :src="modelValue"
        alt="素材预览"
        @error="mediaPreviewFailed = true"
      />
      <small v-else-if="canPreviewImage && mediaPreviewFailed" class="media-preview-error">当前环境无法预览该素材</small>
    </span>

    <input
      v-else
      type="text"
      :value="modelValue"
      :placeholder="field.placeholder || ''"
      :required="required"
      :pattern="field.pattern"
      @input="emit('update:modelValue', $event.target.value)"
    />

    <small v-if="showDescription" class="field-description">{{ field.description }}</small>
  </label>
</template>
