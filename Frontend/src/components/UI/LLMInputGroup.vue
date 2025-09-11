<template>
  <textarea 
    v-if="as === 'textarea'"
    ref="textareaRef"
    :value="modelValue"
    @input="handleInput"
    :placeholder="placeholder"
    :rows="rows"
    :disabled="disabled"
    @keyup.enter.exact="$emit('enter')"
    class="input-element"
  />
  <input 
    v-else
    :value="modelValue"
    @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    :type="type"
    :placeholder="placeholder"
    :disabled="disabled"
    @keyup.enter="$emit('enter')"
    class="input-element"
  />
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue';

interface Props {
  modelValue?: string;
  placeholder?: string;
  as?: 'input' | 'textarea';
  type?: string;
  rows?: number;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: '',
  as: 'input',
  type: 'text',
  rows: 1,
  disabled: false
});

const emit = defineEmits(['update:modelValue', 'enter']);
const textareaRef = ref<HTMLTextAreaElement | null>(null);

const handleInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement;
  emit('update:modelValue', target.value);
  adjustHeight();
};

const adjustHeight = () => {
  nextTick(() => {
    if (textareaRef.value) {
      // 重置高度为auto，然后设置为scrollHeight
      textareaRef.value.style.height = 'auto';
      const scrollHeight = textareaRef.value.scrollHeight;
      textareaRef.value.style.height = Math.max(100, scrollHeight) + 'px';
    }
  });
};

// 监听modelValue变化，自动调整高度
watch(() => props.modelValue, adjustHeight, { immediate: true });
</script>

<style scoped>
/* 输入元素样式 */
.input-element {
  flex: 1;
  font-size: 14px;
  padding: 8px 12px;
  background: transparent;
  border: none;
  color: var(--text);
  outline: none;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  resize: none;
  box-sizing: border-box;
  line-height: 1.5;
  word-wrap: break-word;
  white-space: pre-wrap;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.input-element::placeholder {
  color: var(--sub);
  opacity: 0.7;
}

.input-element:focus {
  border-color: transparent;
  background: transparent;
  box-shadow: none;
  color: var(--text);
}

.input-element[disabled] {
  opacity: 0.4;
  cursor: not-allowed;
  color: var(--sub);
}

/* 自定义滚动条样式 */
.input-element::-webkit-scrollbar {
  width: 4px;
}

.input-element::-webkit-scrollbar-track {
  background: transparent;
}

.input-element::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb, rgba(150, 150, 150, 0.3));
  border-radius: 2px;
}

.input-element::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover, rgba(150, 150, 150, 0.5));
}
</style>
