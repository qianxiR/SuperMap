<template>
  <button 
    class="btn"
    :class="[
      variant,
      { active: isActive }
    ]"
    :disabled="disabled"
    @click="handleClick"
  >
    <slot>{{ text }}</slot>
  </button>
</template>
<!-- 次按钮 -->
<script setup lang="ts">
const props = defineProps({
  text: {
    type: String,
    default: ''
  },
  variant: {
    type: String,
    default: 'secondary',
    validator: (value: string) => ['primary', 'secondary', 'danger'].includes(value)
  },
  disabled: {
    type: Boolean,
    default: false
  },
  active: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['click'])

import { computed } from 'vue'

const isActive = computed(() => props.active)

const handleClick = (event: MouseEvent) => {
  if (!props.disabled) {
    emit('click', event)
  }
}
</script>

<style scoped>
.btn { 
  border: none;
  background: var(--panel);
  color: var(--text);
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  transition: all 0.2s ease;
  flex-shrink: 0;
  font-family: inherit;
  font-weight: 500;
  outline: none;
  gap: 6px;
  padding: 6px 8px;
  font-size: 12px;
  min-height: 32px;
  min-width: 100px;
  flex: 1;
  text-align: center;
  white-space: nowrap;
}

.btn:hover:not(:disabled) {
  background: var(--accent);
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.btn:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

.btn:disabled { 
  opacity: 0.5; 
  cursor: not-allowed;
  transform: none;
}

.btn:disabled:hover {
  background: var(--panel);
  color: var(--text);
  box-shadow: none;
}

.btn.primary { 
  background: var(--btn-primary-bg); 
  color: var(--btn-primary-color);
}

.btn.primary:hover:not(:disabled) {
  background: var(--btn-primary-bg);
  color: var(--btn-primary-color);
}

.btn.secondary {
  background: var(--btn-secondary-bg);
  color: var(--btn-secondary-color);
}

.btn.secondary:hover:not(:disabled) {
  background: var(--accent);
  color: white;
}

.btn.danger {
  background: var(--btn-danger-bg);
  color: var(--btn-danger-color);
}

.btn.danger:hover:not(:disabled) {
  background: var(--btn-danger-hover-bg);
  color: var(--btn-danger-hover-color);
}

.btn.active {
  background: var(--accent);
  color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.btn.active:hover:not(:disabled) {
  background: var(--accent);
  color: white;
}
</style>
