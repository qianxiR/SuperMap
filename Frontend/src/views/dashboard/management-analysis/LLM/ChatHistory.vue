<template>
  <PanelWindow 
    :visible="true"
    :embed="true"
    :width="'100%'"
    :height="'100%'"
    class="chat-history-panel"
  >
    <!-- 聊天历史 -->
    <div class="analysis-section">
      <div class="section-title"></div>
      
      <!-- 操作按钮 -->
      <div class="action-buttons">
        <button class="icon-btn" @click="goBack" title="返回">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <button class="icon-btn" @click="refreshHistory" :disabled="isLoading" title="刷新">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 2v6h-6"></path>
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
            <path d="M3 22v-6h6"></path>
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
          </svg>
        </button>
        <button class="icon-btn danger" @click="clearAllHistory" :disabled="chatHistory.length === 0" title="清空">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18"></path>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
          </svg>
        </button>
      </div>

      <!-- 加载状态 -->
      <div v-if="isLoading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>加载中...</p>
      </div>

      <!-- 空状态 -->
      <div v-else-if="chatHistory.length === 0" class="empty-container">
        <div class="empty-text">暂无历史聊天记录</div>
        <div class="empty-desc">开始新的对话来创建聊天记录</div>
      </div>

      <!-- 聊天记录列表 -->
      <div v-else class="chat-records-container">
        <div 
          v-for="(record, index) in sortedHistory" 
          :key="record.id"
          class="chat-record-item"
          :class="{ 'active': selectedRecordId === record.id }"
          @click="selectRecord(record.id)"
        >
          <div class="record-info">
            <div class="record-title">第{{ sortedHistory.length - index }}次对话</div>
            <div class="record-desc">{{ formatDate(record.timestamp) }} · {{ record.messages ? record.messages.length : 0 }}条消息</div>
          </div>
          <div class="record-operations">
            <button class="record-icon-btn" @click.stop="toggleRecord(record.id)" title="切换">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 11l3 3L22 4"></path>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
            </button>
            <button class="record-icon-btn danger" @click.stop="deleteRecord(record.id)" title="删除">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18"></path>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 确认对话框 -->
    <ConfirmDialog
      :visible="confirmDialogVisible"
      :title="confirmDialogConfig.title"
      :message="confirmDialogConfig.message"
      confirm-text="确定"
      cancel-text="取消"
      @confirm="handleConfirmDialog"
      @cancel="handleCancelDialog"
      @close="handleCancelDialog"
    />
  </PanelWindow>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import PanelWindow from '@/components/UI/PanelWindow.vue'
import ConfirmDialog from '@/components/UI/ConfirmDialog.vue'
import { useModeStateStore } from '@/stores/modeStateStore'

const router = useRouter()
const modeStateStore = useModeStateStore()

// 响应式数据
const chatHistory = ref<any[]>([])
const selectedRecordId = ref<string | null>(null)
const isLoading = ref(false)

// 确认对话框状态
const confirmDialogVisible = ref(false)
const confirmDialogConfig = ref({
  title: '',
  message: '',
  action: '',
  recordId: ''
})

// 计算属性
const sortedHistory = computed(() => {
  return chatHistory.value
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
})

// 方法
const loadChatHistory = () => {
  isLoading.value = true
  try {
    const savedChatHistory = localStorage.getItem('chatHistory') || '[]'
    chatHistory.value = JSON.parse(savedChatHistory)
  } catch (error) {
    console.error('加载聊天历史失败:', error)
    chatHistory.value = []
  } finally {
    isLoading.value = false
  }
}

const refreshHistory = () => {
  loadChatHistory()
}

const clearAllHistory = () => {
  confirmDialogConfig.value = {
    title: '清空历史记录',
    message: '确定要清空所有聊天历史记录吗？此操作不可恢复。',
    action: 'clearAll',
    recordId: ''
  }
  confirmDialogVisible.value = true
}

const selectRecord = (recordId: string) => {
  selectedRecordId.value = recordId
}

const toggleRecord = (recordId: string) => {
  const record = chatHistory.value.find(r => r.id === recordId)
  if (!record) return

  // 将所选历史对话写入 LLM 模式状态
  const historyMessages = Array.isArray(record.messages) ? record.messages : []
  modeStateStore.saveLLMState({
    messages: historyMessages,
    inputText: '',
    scrollPosition: 0
  })

  // 发送自定义事件通知ChatAssistant组件状态已更新
  window.dispatchEvent(new CustomEvent('chatHistoryRestored', {
    detail: {
      messages: historyMessages,
      recordId: recordId
    }
  }))

  // 提示已切换
  window.dispatchEvent(new CustomEvent('showNotification', {
    detail: {
      title: '已切换对话',
      message: '已加载所选历史对话',
      type: 'success',
      duration: 2000
    }
  }))

  // 跳转回 LLM 聊天界面
  router.push('/dashboard/management-analysis/llm/chat')
}

const deleteRecord = (recordId: string) => {
  confirmDialogConfig.value = {
    title: '删除记录',
    message: '确定要删除这条聊天记录吗？',
    action: 'delete',
    recordId: recordId
  }
  confirmDialogVisible.value = true
}

const handleConfirmDialog = () => {
  const { action, recordId } = confirmDialogConfig.value
  
  if (action === 'clearAll') {
    localStorage.removeItem('chatHistory')
    chatHistory.value = []
    selectedRecordId.value = null
    
    // 显示通知
    window.dispatchEvent(new CustomEvent('showNotification', {
      detail: {
        title: '清空成功',
        message: '所有聊天历史记录已清空',
        type: 'success',
        duration: 3000
      }
    }))
  } else if (action === 'delete') {
    const index = chatHistory.value.findIndex(r => r.id === recordId)
    if (index !== -1) {
      chatHistory.value.splice(index, 1)
      localStorage.setItem('chatHistory', JSON.stringify(chatHistory.value))
      
      if (selectedRecordId.value === recordId) {
        selectedRecordId.value = null
      }
      
      // 显示通知
      window.dispatchEvent(new CustomEvent('showNotification', {
        detail: {
          title: '删除成功',
          message: '聊天记录已删除',
          type: 'success',
          duration: 3000
        }
      }))
    }
  }
  
  confirmDialogVisible.value = false
}

const handleCancelDialog = () => {
  confirmDialogVisible.value = false
}

const formatDate = (timestamp: string) => {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const goBack = () => {
  router.push('/dashboard/management-analysis/llm/chat')
}



// 生命周期
onMounted(() => {
  loadChatHistory()
})
</script>

<style scoped>
.chat-history-panel {
  height: 100%;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.analysis-section {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
  /* 禁用动画，防止主题切换闪烁 */
  animation: none !important;
  /* 确保内容可以滚动 */
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.section-title {
  font-size: 13px;
  color: var(--text);
  margin-bottom: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.action-buttons {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  background: var(--btn-secondary-bg);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.icon-btn:hover:not(:disabled) {
  background: var(--surface-hover);
  /* 移除黑色边框效果 */
  transform: translateY(-1px);
}

.icon-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.icon-btn.danger {
  background: var(--surface);
  color: var(--text);
  border-color: var(--border);
}

.icon-btn.danger:hover:not(:disabled) {
  background: var(--surface-hover);
  border-color: var(--border);
}

/* 聊天记录列表样式 */
.chat-records-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  overflow-y: auto;
  padding-right: 4px;
}

.chat-record-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--btn-secondary-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px 14px;
  /* 禁用动画，防止主题切换闪烁 */
  animation: none !important;
  cursor: pointer;
  /* 禁用过渡动画 */
  transition: none !important;
}

.chat-record-item:hover {
  background: var(--surface-hover);
  /* 移除黑色边框效果 */
}

.chat-record-item.active {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
}

.record-info {
  display: flex;
  flex-direction: column;
}

.record-title {
  font-size: 13px;
  color: var(--text);
  font-weight: 500;
}

.chat-record-item.active .record-title {
  color: white;
}

.record-desc {
  font-size: 11px;
  color: var(--sub);
  margin-top: 2px;
}

.chat-record-item.active .record-desc {
  color: rgba(255, 255, 255, 0.9);
}

.record-operations {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.record-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  background: var(--btn-secondary-bg);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}



.record-icon-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.record-icon-btn.danger {
  background: var(--btn-secondary-bg);
  color: var(--text);
  border-color: var(--border);
}


/* 加载状态样式 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  color: var(--sub);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border);
  border-top: 3px solid var(--accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 空状态样式 */
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  color: var(--sub);
}


.empty-text {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--text);
}

.empty-desc {
  font-size: 12px;
  opacity: 0.8;
}

/* 滚动条样式 */
.chat-records-container::-webkit-scrollbar {
  width: 3px;
}

.chat-records-container::-webkit-scrollbar-track {
  background: var(--scrollbar-track, rgba(200, 200, 200, 0.1));
  border-radius: 1.5px;
}

.chat-records-container::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb, rgba(150, 150, 150, 0.3));
  border-radius: 1.5px;
}

.chat-records-container::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover, rgba(150, 150, 150, 0.5));
}

.action-btn.small {
  padding: 4px 8px;
  font-size: 12px;
}

.loading-container,
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  color: var(--sub);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border);
  border-top: 3px solid var(--accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.history-table {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--glow);
}

.table-header {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr 1fr;
  gap: 12px;
  padding: 12px 16px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
}

.table-body {
  max-height: min(400px, 45vh);
  overflow-y: auto;
}

.table-row {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr 1fr;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--divider);
  cursor: pointer;
  font-size: 12px;
  background: var(--panel);
  /* 禁用过渡动画，防止主题切换闪烁 */
  transition: none !important;
}

.table-row.active {
  background: var(--surface-hover);
  border-left: 2px solid var(--accent);
}

.table-row:hover {
  background: var(--surface-hover);
}

.table-row:last-child {
  border-bottom: none;
}

.table-cell {
  display: flex;
  align-items: center;
}

.table-cell.actions {
  display: flex;
  gap: 4px;
  justify-content: flex-end;
}

.chat-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-info {
  display: flex;
  gap: 24px;
  padding: 16px;
  background: var(--surface);
  border-radius: 8px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-label {
  font-weight: 500;
  color: var(--text);
}

.info-value {
  color: var(--sub);
}

.messages-container {
  max-height: min(400px, 45vh);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message-item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.message-item.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  background: var(--accent);
  color: white;
  flex-shrink: 0;
}

.message-item.user .message-avatar {
  background: var(--text);
}

.message-content {
  flex: 1;
  max-width: 80%;
}

.message-text {
  padding: 8px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.4;
  color: var(--text);
  word-wrap: break-word;
}

.message-item.user .message-text {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}

/* 滚动条样式 */
.table-body::-webkit-scrollbar {
  width: 3px;
}

.table-body::-webkit-scrollbar-track {
  background: var(--scrollbar-track, rgba(200, 200, 200, 0.1));
  border-radius: 1.5px;
}

.table-body::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb, rgba(150, 150, 150, 0.3));
  border-radius: 1.5px;
}

.table-body::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover, rgba(150, 150, 150, 0.5));
}
</style>
