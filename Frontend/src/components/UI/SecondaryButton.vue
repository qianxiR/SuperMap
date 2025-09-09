<template>
  <button 
    class="btn"
    :class="[
      variant,
      { active: isActive, loading: loading }
    ]"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <span v-if="loading" class="loading-spinner"></span>
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
  active: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['click'])

const isActive = props.active

const handleClick = (event: MouseEvent) => {
  if (!props.disabled && !props.loading) {
    emit('click', event)
  }
}
</script>

<style scoped>
.btn { 
  border: 1px solid var(--border);
  background: transparent;
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
  padding: 5px 7px;
  font-size: 12px;
  min-height: 28px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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

.btn:hover:not(:disabled) {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
}

.btn:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(8px);
}

.btn.primary { 
  background: transparent;
  color: var(--btn-primary-bg);
  border-color: var(--btn-primary-bg);
}

.btn.primary:hover:not(:disabled) {
  background: var(--btn-primary-bg);
  color: var(--btn-primary-color);
  border-color: var(--btn-primary-bg);
}

.btn.secondary {
  background: transparent;
  color: var(--btn-secondary-color);
  border-color: var(--btn-secondary-bg);
}

.btn.secondary:hover:not(:disabled) {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}

.btn.danger {
  background: transparent;
  color: var(--btn-danger-bg);
  border-color: var(--btn-danger-bg);
}

.btn.danger:hover:not(:disabled) {
  background: var(--btn-danger-hover-bg);
  color: var(--btn-danger-hover-color);
  border-color: var(--btn-danger-hover-bg);
}

.btn.active {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
  backdrop-filter: blur(8px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

/* 加载动画 */
.loading-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.btn.loading {
  cursor: wait;
}
</style>
