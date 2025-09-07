<template>
  <div v-if="visible" class="modal-intersect" @click="handleintersectClick">
    <div class="modal-container" @click.stop>
      <div class="modal-header">
        <h3 class="modal-title">{{ title }}</h3>
        <button class="close-btn" @click="handleClose" title="关闭">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
      
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">图层名称</label>
          <input
            ref="nameInput"
            v-model="layerName"
            type="text"
            class="form-input"
            :placeholder="placeholder"
            @keyup.enter="handleConfirm"
            @keyup.escape="handleClose"
          />
          <div class="form-hint">{{ hint }}</div>
        </div>
        
        <div class="modal-actions">
          <SecondaryButton text="取消" @click="handleClose" />
          <PrimaryButton 
            text="保存" 
            @click="handleConfirm"
            :disabled="!layerName.trim()"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import PrimaryButton from './PrimaryButton.vue'
import SecondaryButton from './SecondaryButton.vue'

interface Props {
  visible: boolean
  title?: string
  placeholder?: string
  hint?: string
  defaultName?: string
}

interface Emits {
  (e: 'confirm', name: string): void
  (e: 'close'): void
}

const props = withDefaults(defineProps<Props>(), {
  title: '保存图层',
  placeholder: '请输入图层名称',
  hint: '图层名称不能为空',
  defaultName: ''
})

const emit = defineEmits<Emits>()

const nameInput = ref<HTMLInputElement>()
const layerName = ref(props.defaultName)

// 监听弹窗显示状态，自动聚焦输入框
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    nextTick(() => {
      nameInput.value?.focus()
      nameInput.value?.select()
    })
  }
})

// 监听默认名称变化
watch(() => props.defaultName, (newDefaultName) => {
  layerName.value = newDefaultName
})

const handleConfirm = () => {
  const trimmedName = layerName.value.trim()
  if (trimmedName) {
    emit('confirm', trimmedName)
  }
}

const handleClose = () => {
  emit('close')
}

const handleintersectClick = () => {
  handleClose()
}
</script>

<style scoped>
.modal-intersect {
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
  backdrop-filter: blur(2px);
}

.modal-container {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--glow);
  min-width: 400px;
  max-width: 500px;
  max-height: 90vh;
  overflow: hidden;
  animation: modalSlideIn 0.2s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  background: var(--panel);
}

.modal-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: var(--hover);
  color: var(--text);
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--input-bg);
  color: var(--text);
  font-size: 14px;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.1);
}

.form-input::placeholder {
  color: var(--text-secondary);
}

.form-hint {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 6px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
</style>
