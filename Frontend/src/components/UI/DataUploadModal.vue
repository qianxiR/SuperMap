<template>
  <div v-if="visible" class="modal-intersect" @click="handleintersectClick">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3 class="modal-title">上传GeoJSON数据</h3>
        <button class="close-button" @click="closeModal">×</button>
      </div>
      
      <div class="modal-body">
        <!-- 文件选择区域 -->
        <div class="file-select-area">
          <div 
            class="drop-zone"
            :class="{ 'drag-over': isDragOver }"
            @drop="handleDrop"
            @dragover="handleDragOver"
            @dragleave="handleDragLeave"
            @click="triggerFileInput"
          >
            <div class="drop-zone-content">
              <div class="drop-zone-icon">📁</div>
              <div class="drop-zone-text">
                <p class="drop-zone-title">拖拽文件到此处</p>
                <p class="drop-zone-subtitle">或点击选择文件</p>
              </div>
            </div>
          </div>
          
          <input
            ref="fileInput"
            type="file"
            accept=".geojson,.json"
            multiple
            @change="handleFileSelect"
            style="display: none;"
          />
        </div>
        
        <!-- 文件信息显示 -->
        <div v-if="selectedFiles.length > 0" class="selected-files">
          <div class="files-header">
            <span class="files-title">已选择文件 ({{ selectedFiles.length }})</span>
            <button class="clear-files-btn" @click="clearSelectedFiles">清除</button>
          </div>
          
          <div class="files-list">
            <div 
              v-for="(file, index) in selectedFiles" 
              :key="index"
              class="file-item"
            >
              <div class="file-icon">📄</div>
              <div class="file-details">
                <div class="file-name">{{ file.name }}</div>
                <div class="file-size">{{ formatFileSize(file.size) }}</div>
              </div>
              <button class="remove-file-btn" @click="removeFile(index)">×</button>
            </div>
          </div>
        </div>
        
        <!-- 上传选项 -->
        <div class="upload-options">
          <div class="option-group">
            <label class="option-label">
              <input 
                type="checkbox" 
                v-model="options.autoAddToMap"
                class="option-checkbox"
              />
              <span class="option-text">自动添加到地图</span>
            </label>
          </div>
          
          <div class="option-group">
            <label class="option-label">
              <input 
                type="checkbox" 
                v-model="options.generateStyle"
                class="option-checkbox"
              />
              <span class="option-text">自动生成样式</span>
            </label>
          </div>
          
          <div class="option-group">
            <label class="option-label">
              <input 
                type="checkbox" 
                v-model="options.zoomTolayer"
                class="option-checkbox"
              />
              <span class="option-text">自动缩放到图层</span>
            </label>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <SecondaryButton 
          text="取消"
          @click="closeModal"
          variant="outline"
        />
        <SecondaryButton 
          text="上传"
          @click="handleUpload"
          :disabled="selectedFiles.length === 0 || isUploading"
          :loading="isUploading"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import SecondaryButton from './SecondaryButton.vue'

interface UploadOptions {
  autoAddToMap: boolean
  generateStyle: boolean
  zoomTolayer: boolean
}

interface Props {
  visible: boolean
  externalUploading?: boolean
}

interface Emits {
  (e: 'close'): void
  (e: 'upload', files: File[], options: UploadOptions): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const fileInput = ref<HTMLInputElement>()
const selectedFiles = ref<File[]>([])
const isDragOver = ref(false)
const isUploading = ref(false)

const options = reactive<UploadOptions>({
  autoAddToMap: true,
  generateStyle: true,
  zoomTolayer: true
})

// 处理遮罩层点击
const handleintersectClick = () => {
  if (!isUploading.value) {
    closeModal()
  }
}

// 关闭模态窗口
const closeModal = () => {
  if (!isUploading.value) {
    emit('close')
  }
}

// 触发文件选择
const triggerFileInput = () => {
  fileInput.value?.click()
}

// 处理文件选择
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files) {
    addFiles(Array.from(target.files))
  }
}

// 处理拖拽进入
const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = true
}

// 处理拖拽离开
const handleDragLeave = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = false
}

// 处理文件拖拽
const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = false
  
  if (event.dataTransfer?.files) {
    addFiles(Array.from(event.dataTransfer.files))
  }
}

// 添加文件
const addFiles = (files: File[]) => {
  const validFiles = files.filter(file => {
    const extension = file.name.toLowerCase().split('.').pop()
    return extension === 'geojson' || extension === 'json'
  })
  
  // 避免重复添加
  const newFiles = validFiles.filter(file => 
    !selectedFiles.value.some(existing => 
      existing.name === file.name && existing.size === file.size
    )
  )
  
  selectedFiles.value.push(...newFiles)
}

// 移除文件
const removeFile = (index: number) => {
  selectedFiles.value.splice(index, 1)
}

// 清除所有文件
const clearSelectedFiles = () => {
  selectedFiles.value = []
}

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 处理上传
const handleUpload = () => {
  if (selectedFiles.value.length > 0) {
    isUploading.value = true
    emit('upload', selectedFiles.value, { ...options })
  }
}

// 监听visible变化，重置状态
watch(() => props.visible, (newVisible) => {
  if (!newVisible) {
    selectedFiles.value = []
    isDragOver.value = false
    isUploading.value = false
  }
})

// 监听外部上传状态变化
watch(() => props.externalUploading, (newUploading) => {
  if (newUploading === false) {
    isUploading.value = false
  }
})
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
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--sub);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.close-button:hover {
  background: var(--surface);
  color: var(--text);
}

.modal-body {
  padding: 24px;
  max-height: 60vh;
  overflow-y: auto;
}

.file-select-area {
  margin-bottom: 24px;
}

.drop-zone {
  border: 2px dashed var(--upload-color);
  border-radius: 12px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--surface);
}

.drop-zone:hover,
.drop-zone.drag-over {
  border-color: var(--upload-color);
  background: rgba(var(--upload-rgb), 0.05);
}

.drop-zone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.drop-zone-icon {
  font-size: 48px;
  opacity: 0.6;
}

.drop-zone-text {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.drop-zone-title {
  font-size: 16px;
  color: var(--text);
  font-weight: 600;
  margin: 0;
}

.drop-zone-subtitle {
  font-size: 14px;
  color: var(--sub);
  margin: 0;
}

.selected-files {
  margin-bottom: 24px;
}

.files-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.files-title {
  font-size: 14px;
  color: var(--text);
  font-weight: 600;
}

.clear-files-btn {
  background: var(--btn-danger-bg);
  border: 1px solid var(--btn-danger-bg);
  color: var(--btn-danger-color);
  font-size: 12px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
  font-weight: 500;
}

.clear-files-btn:hover {
  background: var(--btn-danger-hover-bg);
  border-color: var(--btn-danger-hover-bg);
  color: var(--btn-danger-hover-color);
}

.files-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.file-icon {
  font-size: 20px;
  opacity: 0.7;
}

.file-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.file-name {
  font-size: 13px;
  color: var(--text);
  font-weight: 500;
}

.file-size {
  font-size: 11px;
  color: var(--sub);
}

.remove-file-btn {
  background: none;
  border: none;
  color: var(--sub);
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.remove-file-btn:hover {
  background: var(--panel);
  color: var(--text);
}

.upload-options {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.option-group {
  display: flex;
  align-items: center;
}

.option-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.option-checkbox {
  width: 16px;
  height: 16px;
  accent-color: var(--accent);
}

.option-text {
  font-size: 14px;
  color: var(--text);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid var(--border);
  background: var(--surface);
}
</style>
