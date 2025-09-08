<template>
  <Transition name="toast">
    <div v-if="visible" class="notification-toast" :class="type">
      <div class="toast-icon">
        <svg v-if="type === 'success'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22,4 12,14.01 9,11.01"></polyline>
        </svg>
        <svg v-else-if="type === 'error'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
        <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <div class="toast-content">
        <div class="toast-title">{{ title }}</div>
        <div v-if="message" class="toast-message">{{ message }}</div>
      </div>
      <button class="toast-close" @click="close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface Props {
  title: string
  message?: string
  type?: 'success' | 'error' | 'info'
  duration?: number
  onClose?: () => void
}

const props = withDefaults(defineProps<Props>(), {
  type: 'success',
  duration: 3000,
  message: ''
})

const visible = ref(false)
let timer: number | null = null

const close = () => {
  visible.value = false
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  props.onClose?.()
}

const show = () => {
  visible.value = true
  if (props.duration > 0) {
    timer = setTimeout(() => {
      close()
    }, props.duration)
  }
}

onMounted(() => {
  show()
})

onUnmounted(() => {
  if (timer) {
    clearTimeout(timer)
  }
})

// 暴露方法给父组件
defineExpose({
  show,
  close
})
</script>

<style scoped>
.notification-toast {
  position: fixed;
  bottom: 24px;
  left: 24px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--ui-shadow-medium);
  padding: 16px;
  min-width: 300px;
  max-width: 400px;
  z-index: 9999;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  backdrop-filter: var(--ui-backdrop-blur);
  border-left: 4px solid var(--accent);
  font-family: "Segoe UI", PingFang SC, Microsoft YaHei, Arial, sans-serif;
}

.notification-toast.success {
  border-left-color: var(--accent);
  background: rgba(var(--accent-rgb), 0.08);
}

.notification-toast.error {
  border-left-color: var(--accent);
  background: rgba(var(--accent-rgb), 0.08);
}

.notification-toast.info {
  border-left-color: var(--accent);
  background: rgba(var(--accent-rgb), 0.08);
}

.toast-icon {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: var(--surface);
  color: var(--accent);
}

.toast-content {
  flex: 1;
  min-width: 0;
}

.toast-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 4px;
  line-height: 1.3;
  font-family: "Segoe UI", PingFang SC, Microsoft YaHei, Arial, sans-serif;
}

.toast-message {
  font-size: 13px;
  color: var(--sub);
  line-height: 1.4;
  font-family: "Segoe UI", PingFang SC, Microsoft YaHei, Arial, sans-serif;
}

/* 针对不同主题类型的文字颜色 */
.notification-toast.success .toast-title {
  color: var(--text);
}

.notification-toast.error .toast-title {
  color: var(--text);
}

.notification-toast.info .toast-title {
  color: var(--text);
}

.toast-close {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--sub);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.toast-close:hover {
  background: var(--surface-hover);
  color: var(--text);
}

/* 动画效果 */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(100%);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .notification-toast {
    bottom: 16px;
    left: 16px;
    right: 16px;
    min-width: auto;
    max-width: none;
  }
}
</style>
