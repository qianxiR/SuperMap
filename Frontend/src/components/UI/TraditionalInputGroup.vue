<template>
  <input 
    v-if="type !== 'textarea' && type !== 'select'"
    :value="modelValue"
    @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    :type="type"
    :placeholder="placeholder"
    :disabled="disabled"
    :min="min"
    :max="max"
    :step="step"
    @keyup.enter="$emit('enter')"
    class="traditional-input"
  />
  <textarea 
    v-else-if="type === 'textarea'"
    :value="modelValue"
    @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    :placeholder="placeholder"
    :rows="rows"
    :disabled="disabled"
    @keyup.enter.exact="$emit('enter')"
    class="traditional-input"
  />
  <select 
    v-else-if="type === 'select'"
    :value="modelValue"
    @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    :disabled="disabled"
    class="traditional-input"
  >
    <slot></slot>
  </select>
</template>

<script setup lang="ts">
interface Props {
  modelValue?: string | number;
  placeholder?: string;
  type?: string;
  rows?: number;
  disabled?: boolean;
  min?: number | string;
  max?: number | string;
  step?: number | string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: '',
  type: 'text',
  rows: 1,
  disabled: false,
  min: undefined,
  max: undefined,
  step: undefined
});

defineEmits(['update:modelValue', 'enter']);
</script>

<style scoped>
/* 传统输入框样式 */
.traditional-input {
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 12px;
  outline: none;
  width: 100%;
  font-family: inherit;
  box-sizing: border-box;
  min-height: 36px;
}

.traditional-input:focus {
  border-color: var(--accent);
  background: rgba(255, 255, 255, 0.06);
  box-shadow: 0 0 0 2px rgba(var(--accent-rgb), 0.1);
}

.traditional-input::placeholder {
  color: var(--sub);
  opacity: 0.7;
}

.traditional-input[disabled] {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 隐藏数字输入框的上下箭头 */
.traditional-input[type="number"]::-webkit-outer-spin-button,
.traditional-input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.traditional-input[type="number"] {
  -moz-appearance: textfield;
  appearance: textfield;
}

/* textarea特殊样式 */
.traditional-input[as="textarea"] {
  resize: vertical;
  min-height: 60px;
}
</style>
