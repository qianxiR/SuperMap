<template>
  <div class="tip-window" :class="{ 'tip-visible': visible }">
    <div class="tip-content">
      <div class="tip-icon" v-if="showIcon">
        <slot name="icon">
          <span class="default-icon"></span>
        </slot>
      </div>
      <div class="tip-text">
        <slot>{{ text }}</slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  text?: string
  visible?: boolean
  showIcon?: boolean
  variant?: 'info' | 'warning' | 'success' | 'error'
}

const props = withDefaults(defineProps<Props>(), {
  text: '',
  visible: true,
  showIcon: false,
  variant: 'info'
})

const tipClass = computed(() => {
  return {
    'tip-info': props.variant === 'info',
    'tip-warning': props.variant === 'warning',
    'tip-success': props.variant === 'success',
    'tip-error': props.variant === 'error'
  }
})
</script>

<style scoped>
.tip-window {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text);
  padding: 12px;
  background: var(--surface);
  border-radius: 12px;
  border-left: 4px solid var(--accent);
  /* 禁用动画，防止主题切换闪烁 */
  animation: none !important;
  opacity: 1;
  transform: translateY(0);
}

.tip-window.tip-visible {
  opacity: 1;
  transform: translateY(0);
}

.tip-content {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.tip-icon {
  flex-shrink: 0;
  font-size: 14px;
  line-height: 1;
}

.tip-text {
  flex: 1;
  line-height: 1.4;
}

/* 变体样式 */
.tip-info {
  background: var(--surface);
  border-left-color: var(--accent);
  color: var(--text);
}

.tip-warning {
  background: var(--surface);
  border-left-color: #f59e0b;
  color: var(--text);
}

.tip-success {
  background: var(--surface);
  border-left-color: #10b981;
  color: var(--text);
}

.tip-error {
  background: var(--surface);
  border-left-color: #ef4444;
  color: var(--text);
}

/* 保留fadeIn动画定义但不使用 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
