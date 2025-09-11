<template>
  <teleport to="body">
  <div class="page-modal-intersect" @click="closeModal">
    <div class="page-modal-content" @click.stop>
      <div class="page-modal-header">
        <h2>Agent管理</h2>
        <button class="page-modal-close" @click="closeModal" aria-label="close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <PanelWindow 
        :visible="true"
        :embed="true"
        :width="'100%'"
        :height="'100%'"
        class="Agent-management"
      >
    <div class="management-header">
      <h1 class="management-title">Agent管理</h1>
      <p class="management-subtitle">管理Agent助手的配置和个性化设置</p>
    </div>

    <div class="management-content">
      <!-- 知识库管理 -->
      <div class="management-card">
        <div class="card-header">
          <h2 class="card-title">知识库管理</h2>
          <button class="add-btn" @click="openFileUpload">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            上传文件
          </button>
        </div>

        <div class="knowledge-base-content">
          <!-- 文件上传区域 -->
          <div 
            class="file-upload-area"
            :class="{ 'drag-over': isDragOver }"
            @drop="handleFileDrop"
            @dragover="handleDragOver"
            @dragleave="handleDragLeave"
            @click="triggerFileInput"
          >
            <div class="upload-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7,10 12,15 17,10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </div>
            <div class="upload-text">
              <p class="upload-title">拖拽文件到此处或点击上传</p>
              <p class="upload-subtitle">支持 docs、pdf、txt、md 等格式</p>
            </div>
            <input 
              ref="fileInput"
              type="file" 
              multiple 
              accept=".doc,.docx,.pdf,.txt,.md"
              @change="handleFileSelect"
              style="display: none;"
            />
          </div>

          <!-- 已上传文件列表 -->
          <div class="uploaded-files" v-if="uploadedFiles.length > 0">
            <div class="files-header">
              <h3>已上传文件</h3>
              <span class="file-count">{{ uploadedFiles.length }} 个文件</span>
            </div>
            <div class="files-list">
              <div v-for="file in uploadedFiles" :key="file.id" class="file-item">
                <div class="file-info">
                  <div class="file-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14,2 14,8 20,8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10,9 9,9 8,9"></polyline>
                    </svg>
                  </div>
                  <div class="file-details">
                    <div class="file-name">{{ file.name }}</div>
                    <div class="file-size">{{ formatFileSize(file.size) }}</div>
                    <div class="file-status" :class="file.status">
                      {{ getStatusText(file.status) }}
                    </div>
                  </div>
                </div>
                <div class="file-actions">
                  <button class="action-btn" @click="previewFile(file)" title="预览">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  </button>
                  <button class="action-btn delete" @click="deleteFile(file.id)" title="删除">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3,6 5,6 21,6"></polyline>
                      <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Agent管理 -->
      <div class="management-card">
        <div class="card-header">
          <h2 class="card-title">Agent管理</h2>
          <button class="add-btn" @click="openAgentModal()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            创建Agent
          </button>
        </div>

        <div class="agents-list">
          <div v-for="agent in agents" :key="agent.id" class="agent-item">
            <div class="agent-info">
              <div class="agent-avatar">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <div class="agent-details">
                <div class="agent-name">{{ agent.name }}</div>
                <div class="agent-description">{{ agent.description }}</div>
                <div class="agent-type">{{ getAgentTypeLabel(agent.type) }}</div>
                <div class="agent-status" :class="agent.status">
                  {{ agent.status === 'active' ? '运行中' : '已停止' }}
                </div>
              </div>
            </div>
            <div class="agent-actions">
              <button class="action-btn" @click="openAgentModal(agent)" title="编辑">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
              <button class="action-btn" @click="toggleAgentStatus(agent.id)" :title="agent.status === 'active' ? '停止' : '启动'">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path v-if="agent.status === 'active'" d="M6 4h4v16H6zM14 4h4v16h-4z"></path>
                  <path v-else d="M8 5v14l11-7z"></path>
                </svg>
              </button>
              <button class="action-btn" @click="chatWithAgent(agent)" title="对话">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </button>
              <button class="action-btn delete" @click="deleteAgent(agent.id)" title="删除">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3,6 5,6 21,6"></polyline>
                  <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                </svg>
              </button>
            </div>
          </div>
          
          <div v-if="agents.length === 0" class="empty-state">
            <p>暂无Agent</p>
            <button class="add-first-btn" @click="openAgentModal()">创建第一个Agent</button>
          </div>
        </div>
      </div>

    </div>

    <!-- 编辑弹窗 -->
    <EditModal
      :visible="showEditModal"
      :type="editModalType"
      :title="editModalTitle"
      :initial-data="editModalData"
      @close="closeEditModal"
      @save="handleSave"
    />
      </PanelWindow>
    </div>
  </div>
  </teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import PanelWindow from '@/components/UI/PanelWindow.vue'
import EditModal from '@/components/UI/EditModal.vue'
import { useGlobalModalStore } from '@/stores/modalStore'

// 响应式数据
// 关闭页面级弹窗
const modal = useGlobalModalStore()
const closeModal = () => {
  modal.close()
}

const showEditModal = ref(false)
const editModalType = ref<'agent'>('agent')
const editModalTitle = ref('')
const editModalData = ref<any>(null)
const editingItem = ref<any>(null)

// 知识库管理数据
const fileInput = ref<HTMLInputElement>()
const isDragOver = ref(false)
const uploadedFiles = ref([
  {
    id: 1,
    name: '示例文档.pdf',
    size: 1024000,
    status: 'uploaded',
    type: 'pdf'
  }
])

// Agent管理数据
const agents = ref([
  {
    id: 1,
    name: '地图分析助手',
    description: '专门用于地图数据分析和可视化的AI助手',
    type: 'analysis',
    status: 'active',
    apiKeyId: 1, // 确保与apiKeys中的id匹配
    knowledgeBase: ['地图数据', '空间分析']
  }
])

// Agent类型标签映射
const agentTypeLabels = {
  analysis: '分析助手',
  chat: '对话助手',
  task: '任务助手',
  assistant: '通用助手'
}




// 关闭编辑弹窗
const closeEditModal = () => {
  showEditModal.value = false
  editModalData.value = null
  editingItem.value = null
}

// 处理保存
const handleSave = (data: any) => {
  switch (editModalType.value) {
    case 'agent':
      if (editingItem.value) {
        // 更新现有Agent
        const index = agents.value.findIndex(a => a.id === editingItem.value.id)
        if (index !== -1) {
          agents.value[index] = { ...editingItem.value, ...data }
        }
      } else {
        // 添加新Agent
        const newAgent = {
          id: Date.now(),
          ...data,
          status: 'active'
        }
        agents.value.push(newAgent)
      }
      break
  }
   
  // 显示成功通知
  window.dispatchEvent(new CustomEvent('showNotification', {
    detail: {
      title: '保存成功',
      message: '数据已成功保存',
      type: 'success',
      duration: 2000
    }
  }))
}


// 知识库管理方法
const openFileUpload = () => {
  fileInput.value?.click()
}

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = true
}

const handleDragLeave = (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = false
}

const handleFileDrop = (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = false
  
  const files = e.dataTransfer?.files
  if (files) {
    handleFiles(Array.from(files))
  }
}

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  const files = target.files
  if (files) {
    handleFiles(Array.from(files))
  }
}

const handleFiles = (files: File[]) => {
  files.forEach(file => {
    const newFile = {
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      status: 'uploading' as const,
      type: file.type
    }
    uploadedFiles.value.push(newFile)
    
    // 模拟上传过程
    setTimeout(() => {
      const index = uploadedFiles.value.findIndex(f => f.id === newFile.id)
      if (index !== -1) {
        uploadedFiles.value[index].status = 'uploaded'
      }
    }, 2000)
  })
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'uploading':
      return '上传中...'
    case 'uploaded':
      return '已上传'
    case 'error':
      return '上传失败'
    default:
      return status
  }
}

const previewFile = (file: any) => {
  // 这里可以实现文件预览功能
  window.dispatchEvent(new CustomEvent('showNotification', {
    detail: {
      title: '预览功能',
      message: `预览文件: ${file.name}`,
      type: 'info',
      duration: 2000
    }
  }))
}

const deleteFile = (id: number) => {
  uploadedFiles.value = uploadedFiles.value.filter(f => f.id !== id)
}

// Agent管理方法
const getAgentTypeLabel = (type: string) => {
  return agentTypeLabels[type as keyof typeof agentTypeLabels] || type
}

const openAgentModal = (agent?: any) => {
  editingItem.value = agent
  editModalType.value = 'agent'
  editModalTitle.value = agent ? '编辑Agent' : '创建Agent'
  editModalData.value = agent ? { ...agent } : null
  showEditModal.value = true
}

const toggleAgentStatus = (id: number) => {
  const agent = agents.value.find(a => a.id === id)
  if (agent) {
    agent.status = agent.status === 'active' ? 'inactive' : 'active'
  }
}

import { getLLMApiConfig, getAgentApiBaseUrl } from '@/utils/config'

const chatWithAgent = async (agent: any) => {
  try {
    const llm = getLLMApiConfig()
    const convId = sessionStorage.getItem('agent_conv_id') || (() => {
      const v = `conv-${Date.now()}`
      sessionStorage.setItem('agent_conv_id', v)
      return v
    })()
    const payload = {
      model: 'qwen-max',
      temperature: llm.temperature,
      prompt: `你好，我是 ${agent.name}`,
      stream: false,
      conversation_id: convId
    }
    const resp = await fetch(`${getAgentApiBaseUrl()}/agent/tool-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!resp.ok) throw new Error(await resp.text())
    const data = await resp.json()
    window.dispatchEvent(new CustomEvent('showNotification', {
      detail: {
        title: '对话成功',
        message: data?.data?.final_answer || '已连接LLM',
        type: 'success',
        duration: 3000
      }
    }))
  } catch (e: any) {
    window.dispatchEvent(new CustomEvent('showNotification', {
      detail: {
        title: '对话失败',
        message: e?.message || '请求失败',
        type: 'error',
        duration: 3000
      }
    }))
  }
}

const deleteAgent = (id: number) => {
  agents.value = agents.value.filter(a => a.id !== id)
}
</script>

<style scoped>
.page-modal-intersect {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
}

.page-modal-content {
  width: 90%;
  max-width: 40vw;
  max-height: 70vh;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.page-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}

.page-modal-header h2 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.page-modal-close {
  border: none;
  background: transparent;
  color: var(--sub);
  cursor: pointer;
  border-radius: 6px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.page-modal-close:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.Agent-management {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.Agent-management .panel-content {
  padding: 8px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  max-height: calc(70vh - 120px);
}

.management-header {
  text-align: center;
  margin-bottom: 20px;
}

.management-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 8px;
}

.management-subtitle {
  font-size: 13px;
  color: var(--sub);
  margin: 0;
}

.management-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.management-card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  box-shadow: var(--glow);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: var(--btn-primary-bg);
  color: var(--btn-primary-color);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
  min-height: 32px;
}

.add-btn:hover {
  opacity: 0.9;
}

/* 列表样式 */
.agents-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.agent-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--surface);
  border-radius: 8px;
  border: 1px solid var(--border);
}

.agent-info {
  flex: 1;
}

.agent-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 4px;
}

.agent-description {
  font-size: 12px;
  color: var(--sub);
  margin-bottom: 4px;
}

/* Agent特有样式 */
.agent-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.agent-avatar {
  color: var(--accent);
}

.agent-details {
  flex: 1;
}

.agent-type {
  font-size: 12px;
  color: var(--sub);
  margin-bottom: 4px;
}

.agent-api-key {
  font-size: 12px;
  color: var(--accent);
  margin-bottom: 4px;
}

.agent-status {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  display: inline-block;
}

.agent-status.active {
  background: var(--selection-bg);
  color: var(--text);
}

.agent-status.inactive {
  background: var(--surface);
  color: var(--sub);
}

.agent-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 28px;
  height: 28px;
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

.action-btn:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.action-btn.delete {
  background: var(--btn-danger-bg);
  color: var(--btn-danger-color);
  border-color: var(--btn-danger-bg);
}

.action-btn.delete:hover {
  background: var(--btn-danger-hover-bg);
  color: var(--btn-danger-hover-color);
  border-color: var(--btn-danger-hover-bg);
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--sub);
}

.empty-state p {
  margin-bottom: 16px;
  font-size: 14px;
}

.add-first-btn {
  padding: 6px 8px;
  background: var(--btn-primary-bg);
  color: var(--btn-primary-color);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
  min-height: 32px;
}

.add-first-btn:hover {
  opacity: 0.9;
}

/* 知识库管理样式 */
.knowledge-base-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.file-upload-area {
  border: 2px dashed var(--border);
  border-radius: 8px;
  padding: 30px 16px;
  text-align: center;
  cursor: pointer;
  background: var(--surface);
}

.file-upload-area:hover {
  border-color: var(--accent);
  background: var(--surface-hover);
}

.file-upload-area.drag-over {
  border-color: var(--accent);
  background: var(--surface-hover);
  transform: scale(1.02);
}

.upload-icon {
  margin-bottom: 16px;
  color: var(--sub);
}

.upload-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 8px;
}

.upload-subtitle {
  font-size: 12px;
  color: var(--sub);
  margin: 0;
}

.uploaded-files {
  margin-top: 20px;
}

.files-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.files-header h3 {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.file-count {
  font-size: 11px;
  color: var(--sub);
  background: var(--surface);
  padding: 4px 8px;
  border-radius: 12px;
}

.files-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--surface);
  border-radius: 8px;
  border: 1px solid var(--border);
}

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.file-icon {
  color: var(--sub);
}

.file-details {
  flex: 1;
}

.file-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--text);
  margin-bottom: 4px;
}

.file-size {
  font-size: 11px;
  color: var(--sub);
  margin-bottom: 4px;
}

.file-status {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 12px;
  display: inline-block;
}

.file-status.uploading {
  background: var(--surface);
  color: var(--sub);
}

.file-status.uploaded {
  background: var(--selection-bg);
  color: var(--text);
}

.file-status.error {
  background: var(--surface);
  color: var(--sub);
}

.file-actions {
  display: flex;
  gap: 8px;
}

@media (max-width: 768px) {
  .page-modal-content {
    max-width: 95vw;
    max-height: 80vh;
  }
  
  .Agent-management .panel-content {
    padding: 16px;
  }
  
  .management-title {
    font-size: 24px;
  }
  
  .agent-item,
  .file-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .agent-actions,
  .file-actions {
    width: 100%;
    justify-content: flex-end;
  }
  
  .file-upload-area {
    padding: 30px 16px;
  }
  
  .upload-icon svg {
    width: 36px;
    height: 36px;
  }
}
</style>
