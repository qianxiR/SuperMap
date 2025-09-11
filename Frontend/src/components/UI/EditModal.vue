<template>
  <div v-if="visible" class="modal-intersect" @click="handleintersectClick">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>{{ title }}</h3>
        <button class="modal-close" @click="handleClose">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <div class="modal-body">
        <!-- API密钥表单 -->
        <div v-if="type === 'api-key'" class="form-content">
          <div class="form-item">
            <label>密钥名称</label>
            <input v-model="formData.name" type="text" disabled />
          </div>
          <div class="form-item">
            <label>服务提供商</label>
            <input value="通义千问 (Qwen)" type="text" disabled />
          </div>
          <div class="form-item">
            <label>API密钥</label>
            <input v-model="formData.key" type="password" placeholder="请输入API密钥" />
          </div>
          <div class="form-item">
            <label>服务地址</label>
            <input v-model="formData.url" type="url" disabled />
          </div>
        </div>

        <!-- 用户偏好表单 -->
        <div v-if="type === 'preference'" class="form-content">
          <div class="form-item">
            <label>偏好类别</label>
            <DropdownSelect
              v-model="formData.category"
              :options="[
                { value: 'language', label: '语言偏好' },
                { value: 'style', label: '风格偏好' },
                { value: 'domain', label: '专业领域' },
                { value: 'interaction', label: '交互方式' }
              ]"
            />
          </div>
          <div class="form-item">
            <label>偏好内容</label>
            <textarea v-model="formData.content" placeholder="请描述您的偏好" rows="3"></textarea>
          </div>
          <div class="form-item">
            <label>权重 (1-10)</label>
            <input v-model.number="formData.weight" type="number" min="1" max="10" />
          </div>
        </div>

        <!-- 提示词表单 -->
        <div v-if="type === 'prompt'" class="form-content">
          <div class="form-item">
            <label>提示词名称</label>
            <input v-model="formData.name" type="text" placeholder="请输入提示词名称" />
          </div>
          <div class="form-item">
            <label>描述</label>
            <input v-model="formData.description" type="text" placeholder="请输入描述" />
          </div>
          <div class="form-item">
            <label>提示词内容</label>
            <textarea v-model="formData.content" placeholder="请输入提示词内容" rows="4"></textarea>
          </div>
          <div class="form-item">
            <label>标签 (用逗号分隔)</label>
            <input v-model="formData.tagsInput" type="text" placeholder="例如: 地图,分析,查询" />
          </div>
        </div>

        <!-- Agent表单 -->
        <div v-if="type === 'agent'" class="form-content">
          <div class="form-item">
            <label>Agent名称</label>
            <input v-model="formData.name" type="text" placeholder="请输入Agent名称" />
          </div>
          <div class="form-item">
            <label>描述</label>
            <textarea v-model="formData.description" placeholder="请输入Agent描述" rows="3"></textarea>
          </div>
          <div class="form-item">
            <label>类型</label>
            <DropdownSelect
              v-model="formData.type"
              :options="[
                { value: 'analysis', label: '分析助手' },
                { value: 'chat', label: '对话助手' },
                { value: 'task', label: '任务助手' },
                { value: 'assistant', label: '通用助手' }
              ]"
            />
          </div>
          <div class="form-item">
            <label>API密钥</label>
            <DropdownSelect
              v-model="formData.apiKeyId"
              :options="apiKeyOptions"
              placeholder="请选择API密钥"
            />
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn-secondary" @click="handleClose">取消</button>
        <button class="btn-primary" @click="handleSave" :disabled="!isFormValid">保存</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import DropdownSelect from './DropdownSelect.vue'
import { getLLMApiConfig } from '@/utils/config'

interface Props {
  visible: boolean
  type: 'api-key' | 'preference' | 'prompt' | 'agent'
  title: string
  initialData?: any
  apiKeys?: Array<{ id: number; name: string; provider: string; status: string }>
}

interface Emits {
  (e: 'close'): void
  (e: 'save', data: any): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 表单数据
const formData = ref({
  // API密钥字段
  name: (import.meta.env as any).VITE_LLM_NAME || '通义千问',
  provider: 'qwen',
  key: getLLMApiConfig().apiKey || '',
  url: getLLMApiConfig().baseUrl || '',
  
  // 用户偏好字段
  category: 'language',
  content: '',
  weight: 5,
  
  // 提示词字段
  description: '',
  tagsInput: '',
  
  // Agent字段
  type: 'analysis',
  apiKeyId: ''
})

// 重置表单
const resetForm = () => {
  const llm = getLLMApiConfig()
  formData.value = {
    name: (import.meta.env as any).VITE_LLM_NAME || '通义千问',
    provider: 'qwen',
    key: llm.apiKey || '',
    url: llm.baseUrl || '',
    category: 'language',
    content: '',
    weight: 5,
    description: '',
    tagsInput: '',
    type: 'analysis',
    apiKeyId: ''
  }
}

// API密钥选项
const apiKeyOptions = computed(() => {
  if (!props.apiKeys) return []
  return props.apiKeys
    .filter(key => key.status === 'active')
    .map(key => ({
      value: key.id.toString(),
      label: `${key.name} (${key.provider})`
    }))
})

// 表单验证
const isFormValid = computed(() => {
  switch (props.type) {
    case 'api-key':
      return formData.value.key.trim()
    case 'preference':
      return formData.value.category && formData.value.content.trim() && formData.value.weight >= 1 && formData.value.weight <= 10
    case 'prompt':
      return formData.value.name.trim() && formData.value.content.trim()
    case 'agent':
      return formData.value.name.trim() && formData.value.description.trim() && formData.value.type && formData.value.apiKeyId
    default:
      return false
  }
})

// 监听初始数据变化
watch(() => props.initialData, (newData) => {
  if (newData) {
    formData.value = { ...newData } as any
    if (props.type === 'api-key') {
      const llm = getLLMApiConfig()
      formData.value.provider = 'qwen'
      formData.value.name = (import.meta.env as any).VITE_LLM_NAME || '通义千问'
      formData.value.url = llm.baseUrl
      if (!formData.value.key) formData.value.key = llm.apiKey
    }
    // 处理标签的特殊情况
    if (props.type === 'prompt' && (newData as any).tags) {
      formData.value.tagsInput = (newData as any).tags.join(', ')
    }
  } else {
    resetForm()
  }
}, { immediate: true })

// 处理关闭
const handleClose = () => {
  emit('close')
  resetForm()
}

// 处理遮罩层点击
const handleintersectClick = () => {
  handleClose()
}

// 处理保存
const handleSave = () => {
  if (!isFormValid.value) return
  
  const saveData: any = { ...formData.value }
  
  // 处理提示词标签
  if (props.type === 'prompt') {
    saveData.tags = saveData.tagsInput.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag)
    delete saveData.tagsInput
  }
  
  emit('save', saveData)
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
  z-index: 5000;
}

.modal-content {
  background: var(--panel);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 500px;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
}

.modal-close {
  background: none;
  border: none;
  color: var(--sub);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.modal-body {
  padding: 24px;
}

.form-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-item label {
  font-size: 14px;
  color: var(--text);
  font-weight: 500;
}

.form-item input,
.form-item textarea {
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text);
  font-size: 14px;
  transition: all 0.2s ease;
}

.form-item input:focus,
.form-item textarea:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.1);
}

.form-item textarea {
  resize: vertical;
  min-height: 80px;
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid var(--border);
  justify-content: flex-end;
}

.btn-primary,
.btn-secondary {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-primary {
  background: var(--btn-primary-bg);
  color: var(--btn-primary-color);
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--btn-secondary-bg);
  color: var(--btn-secondary-color);
  border: 1px solid var(--border);
}

.btn-secondary:hover {
  background: var(--surface-hover);
}
</style>
