<template>
  <div class="dropdown-container">
    <div 
      class="dropdown-select"
      :class="{ 'dropdown-open': isOpen, 'dropdown-disabled': disabled }"
      @click="toggleDropdown"
      @blur="closeDropdown"
      tabindex="0"
    >
      <span class="dropdown-value" :class="{ 'placeholder': !displayValue }">
        {{ displayValue || placeholder }}
      </span>
    </div>
    
    <div v-if="isOpen" class="dropdown-options">
      <div 
        v-for="option in options" 
        :key="option.value"
        class="dropdown-option"
        :class="{ 
          'option-selected': option.value === modelValue,
          'option-disabled': option.disabled 
        }"
        @click="selectOption(option)"
      >
        {{ option.label }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Option {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface Props {
  modelValue?: string | number;
  placeholder?: string;
  disabled?: boolean;
  options?: Option[];
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: '请选择',
  disabled: false,
  options: () => []
});

const emit = defineEmits(['update:modelValue']);

const isOpen = ref(false);

// 从slot中解析选项
const options = computed(() => {
  if (props.options && props.options.length > 0) {
    return props.options;
  }
  
  // 如果没有提供options，尝试从slot中解析
  // 这里简化处理，实际使用时建议直接传入options数组
  return [];
});

const displayValue = computed(() => {
  if (props.modelValue === undefined || props.modelValue === null || props.modelValue === '') return '';
  const selectedOption = options.value.find(opt => opt.value === props.modelValue);
  return selectedOption ? selectedOption.label : '';
});

const toggleDropdown = () => {
  if (props.disabled) return;
  isOpen.value = !isOpen.value;
};

const closeDropdown = () => {
  setTimeout(() => {
    isOpen.value = false;
  }, 100);
};

const selectOption = (option: Option) => {
  if (option.disabled) return;
  emit('update:modelValue', option.value);
  isOpen.value = false;
};

// 监听外部点击关闭下拉框
const handleClickOutside = (event: Event) => {
  const target = event.target as Element;
  if (!target.closest('.dropdown-container')) {
    isOpen.value = false;
  }
};

// 监听键盘事件
const handleKeydown = (event: KeyboardEvent) => {
  if (!isOpen.value) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleDropdown();
    }
  } else {
    if (event.key === 'Escape') {
      isOpen.value = false;
    }
  }
};

// 组件挂载时添加事件监听
import { onMounted, onUnmounted } from 'vue';

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
.dropdown-container {
  position: relative;
  width: 100%;
}

.dropdown-select {
  width: 100%;
  padding: 8px 12px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 12px;
  outline: none;
  font-family: inherit;
  box-sizing: border-box;
  cursor: pointer;
  display: flex;
  align-items: center;
  min-height: 36px;
  transition: all 0.2s ease;
  position: relative;
}

.dropdown-select:focus {
  outline: none !important;
  border-color: var(--accent);
  background: var(--bg);
  box-shadow: var(--ui-focus-ring);
}

.dropdown-select:focus-visible {
  outline: none !important;
  border-color: var(--accent);
  background: var(--bg);
  box-shadow: var(--ui-focus-ring);
}

.dropdown-select:hover:not(.dropdown-disabled) {
  outline: none !important;
  border-color: var(--accent);
  background: var(--surface-hover);
}

.dropdown-select.dropdown-open {
  outline: none !important;
  border-color: var(--accent);
  background: var(--bg);
  box-shadow: var(--ui-focus-ring);
}

.dropdown-select.dropdown-open:hover {
  outline: none !important;
  background: var(--bg);
}

.dropdown-select.dropdown-open:focus {
  outline: none !important;
  border-color: var(--accent);
  background: var(--bg);
  box-shadow: var(--ui-focus-ring);
}

.dropdown-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.dropdown-value {
  flex: 1;
  color: var(--text);
}

.dropdown-value.placeholder {
  color: var(--sub);
  opacity: 0.7;
}

.dropdown-options {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: var(--glow);
  max-height: 200px;
  overflow-y: auto;
  z-index: 1000;
  margin-top: 4px;
  /* 禁用动画，防止主题切换闪烁 */
  animation: none !important;
}

/* 保留dropdownFadeIn动画定义但不使用 */
@keyframes dropdownFadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dropdown-option {
  padding: 8px 12px;
  color: var(--text);
  font-size: 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--divider);
}

.dropdown-option:last-child {
  border-bottom: none;
}

.dropdown-option:hover:not(.option-disabled) {
  background: var(--surface-hover);
  color: var(--text);
}

.dropdown-option.option-selected {
  background: var(--selection-bg);
  color: var(--text);
}

.dropdown-option.option-disabled {
  color: var(--border);
  opacity: 0.6;
  cursor: not-allowed;
}

/* 滚动条样式 */
.dropdown-options::-webkit-scrollbar {
  width: 3px;
}

.dropdown-options::-webkit-scrollbar-track {
  background: var(--scrollbar-track, rgba(200, 200, 200, 0.1));
  border-radius: 1.5px;
}

.dropdown-options::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb, rgba(150, 150, 150, 0.3));
  border-radius: 1.5px;
}

.dropdown-options::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover, rgba(150, 150, 150, 0.5));
}
</style>
