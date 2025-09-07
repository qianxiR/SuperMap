<template>
  <!-- 确认对话框 -->
  <div v-if="visible" class="confirm-dialog-intersect" @click="handleintersectClick">
    <div class="confirm-dialog" @click.stop>
      <div class="dialog-header">
        <h3 class="dialog-title">{{ title }}</h3>
        <button class="close-btn" @click="handleCancel" title="关闭">
          ×
        </button>
      </div>
      
      <div class="dialog-content">
        <div class="dialog-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M8 12l3 3 5-5"></path>
          </svg>
        </div>
        <p class="dialog-message">{{ message }}</p>
      </div>
      
      <div class="dialog-actions">
        <button class="btn btn-secondary" @click="handleCancel">
          {{ cancelText }}
        </button>
        <button class="btn btn-primary" @click="handleConfirm">
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  visible: boolean
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '确认操作',
  message: '您确定要执行此操作吗？',
  confirmText: '确定',
  cancelText: '取消'
})

const emit = defineEmits<{
  confirm: []
  cancel: []
  close: []
}>()

const handleConfirm = () => {
  emit('confirm')
}

const handleCancel = () => {
  emit('cancel')
}

const handleintersectClick = () => {
  emit('close')
}

// 监听visible变化，当对话框关闭时触发close事件
watch(() => props.visible, (newVisible) => {
  if (!newVisible) {
    emit('close')
  }
})
</script>

<style scoped>
.confirm-dialog-intersect {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  /* 移除 backdrop-filter 以提升性能 */
}

.confirm-dialog {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 400px;
  width: 90%;
  max-height: 90vh;
  overflow: hidden;
  /* 简化动画，只使用透明度变化 */
  animation: dialogFadeIn 0.2s ease-out;
  /* 启用GPU加速 */
  will-change: opacity;
  transform: translateZ(0);
}

/* 简化的动画，只使用透明度 */
@keyframes dialogFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0 24px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 16px;
}

.dialog-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--sub);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-size: 20px;
  /* 简化过渡动画 */
  transition: background-color 0.15s ease;
}

.close-btn:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.dialog-content {
  padding: 24px;
  text-align: center;
}

.dialog-icon {
  margin-bottom: 16px;
  color: var(--accent);
}

.dialog-message {
  font-size: 14px;
  color: var(--text);
  line-height: 1.5;
  margin: 0;
}

.dialog-actions {
  display: flex;
  gap: 12px;
  padding: 0 24px 24px 24px;
  justify-content: space-between;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  /* 简化过渡动画，只保留必要的属性 */
  transition: background-color 0.15s ease;
  min-width: 80px;
}

.btn-primary {
  background: var(--accent);
  color: white;
}

.btn-primary:hover {
  background: var(--accent);
  opacity: 0.9;
}

.btn-secondary {
  background: var(--btn-secondary-bg);
  color: var(--btn-secondary-color);
  border: 1px solid var(--border);
}

.btn-secondary:hover {
  background: var(--surface-hover);
}

/* 响应式设计 */
@media (max-width: 480px) {
  .confirm-dialog {
    width: 95%;
    margin: 20px;
  }
  
  .dialog-actions {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
  }
}
</style>
