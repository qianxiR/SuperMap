<template>
  <div class="llm-input-window">
    <div class="input-container">
      <LLMInputGroup
        v-model="inputValue"
        :placeholder="placeholder"
        as="textarea"
        :rows="rows"
        :disabled="disabled"
        @enter="handleSend"
        @update:modelValue="handleInputChange"
      />
      <button 
        class="action-button" 
        @click="handleSend" 
        :disabled="!inputValue.trim() || disabled"
        :title="sendButtonTitle"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import LLMInputGroup from '@/components/UI/LLMInputGroup.vue';

interface Props {
  modelValue?: string;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  sendButtonTitle?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: '请输入您的需求...',
  rows: 3,
  disabled: false,
  sendButtonTitle: '发送消息'
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'send': [message: string];
  'input-change': [value: string];
}>();

const inputValue = ref(props.modelValue);

// 监听外部modelValue变化
watch(() => props.modelValue, (newValue) => {
  inputValue.value = newValue;
});

// 监听内部inputValue变化，同步到外部
watch(inputValue, (newValue) => {
  emit('update:modelValue', newValue);
});

const handleInputChange = (value: string) => {
  inputValue.value = value;
  emit('input-change', value);
};

const handleSend = () => {
  const message = inputValue.value.trim();
  if (message && !props.disabled) {
    emit('send', message);
    inputValue.value = '';
  }
};

// 暴露方法给父组件
defineExpose({
  clear: () => {
    inputValue.value = '';
  },
  focus: () => {
    // 可以通过ref访问LLMInputGroup的focus方法
  },
  setValue: (value: string) => {
    inputValue.value = value;
  }
});
</script>

<style scoped>
.llm-input-window {
  width: 100%;
}

.input-container {
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 8px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  position: relative;
  z-index: 1;
  animation: none; /* 禁用动画，防止主题切换闪烁 */
  margin-top: 2px;
}

.action-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--accent);
  border: none;
  color: white;
  cursor: pointer;
  flex-shrink: 0;
  position: absolute;
  bottom: 12px;
  right: 8px;
  z-index: 10;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(var(--accent-rgb), 0.3);
}

.action-button:hover:not(:disabled) {
  background: var(--accent);
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(var(--accent-rgb), 0.4);
}

.action-button:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(var(--accent-rgb), 0.3);
}

.action-button:disabled {
  background: rgba(var(--accent-rgb), 0.3);
  cursor: not-allowed;
  opacity: 0.6;
  box-shadow: none;
}
</style>
