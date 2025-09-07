<template>
  <div class="view-layer-manager" :class="{ 'expanded': visible }">
    <!-- 图层管理面板 -->
    <div class="layer-panel" v-show="visible">
      <div class="panel-header">
        <h3 class="panel-title">图层管理</h3>
      </div>
      
      <div class="layer-list" ref="layerList">
        <!-- SuperMap 服务图层组 -->
        <div class="layer-group">
          <div class="group-header" @click="toggleGroup('supermap')">
            <button 
              class="group-toggle"
              :class="{ active: expandedGroups.supermap }"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
              </svg>
            </button>
            <span class="group-title">SuperMap 服务图层</span>
          </div>
          
          <LayerItem
            v-for="layer in getLayersBySource('supermap')" 
            :key="layer.key"
            :layer-name="layer.displayName"
            :layer-desc="layer.desc"
            :hidden="!layer.visible"
            v-show="expandedGroups.supermap"
            @toggle-visibility="handleToggleVisibility(layer)"
          />
        </div>

        <!-- 分析及绘制图层组 -->
        <div class="layer-group">
          <div class="group-header" @click="toggleGroup('draw')">
            <button 
              class="group-toggle"
              :class="{ active: expandedGroups.draw }"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
              </svg>
            </button>
            <span class="group-title">分析及绘制图层</span>
          </div>
          
          <LayerItem
            v-for="layer in getLayersBySource('draw')" 
            :key="layer.key"
            :layer-name="layer.displayName"
            :layer-desc="layer.desc"
            :hidden="!layer.visible"
            v-show="expandedGroups.draw"
            @toggle-visibility="handleToggleVisibility(layer)"
          >
            <template #controls>
              <button 
                class="control-btn delete-btn"
                @click="handleRemove(layer)"
                :title="`删除图层: ${layer.displayName}`"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </template>
          </LayerItem>
        </div>

        <!-- 查询图层组 -->
        <div class="layer-group">
          <div class="group-header" @click="toggleGroup('query')">
            <button 
              class="group-toggle"
              :class="{ active: expandedGroups.query }"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
              </svg>
            </button>
            <span class="group-title">查询图层</span>
          </div>
          
          <LayerItem
            v-for="layer in getLayersBySource('query')" 
            :key="layer.key"
            :layer-name="layer.displayName"
            :layer-desc="layer.desc"
            :hidden="!layer.visible"
            v-show="expandedGroups.query"
            @toggle-visibility="handleToggleVisibility(layer)"
          >
            <template #controls>
              <button 
                class="control-btn delete-btn"
                @click="handleRemove(layer)"
                :title="`删除图层: ${layer.displayName}`"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </template>
          </LayerItem>
        </div>

        <!-- 上传图层组 -->
        <div class="layer-group">
          <div class="group-header" @click="toggleGroup('upload')">
            <button 
              class="group-toggle"
              :class="{ active: expandedGroups.upload }"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
              </svg>
            </button>
            <span class="group-title">上传图层</span>
          </div>
          
          <LayerItem
            v-for="layer in getLayersBySource('upload')" 
            :key="layer.key"
            :layer-name="layer.displayName"
            :layer-desc="layer.desc"
            :hidden="!layer.visible"
            v-show="expandedGroups.upload"
            @toggle-visibility="handleToggleVisibility(layer)"
          >
            <template #controls>
              <button 
                class="control-btn delete-btn"
                @click="handleRemove(layer)"
                :title="`删除图层: ${layer.displayName}`"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </template>
          </LayerItem>
        </div>
      </div>
    </div>
    
    <!-- 删除确认对话框 -->
    <ConfirmDialog
      :visible="deleteDialog.visible"
      :title="deleteDialog.title"
      :message="deleteDialog.message"
      confirm-text="确定移除"
      cancel-text="取消"
      @confirm="handleConfirmRemove"
      @cancel="handleCancelRemove"
      @close="handleCancelRemove"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import { uselayermanager } from '@/composables/uselayermanager'
import ConfirmDialog from '@/components/UI/ConfirmDialog.vue'
import LayerItem from '@/components/UI/LayerItem.vue'
import type { Maplayer } from '@/types/map'

// 定义props
interface Props {
  visible?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  visible: false
})

const mapStore = useMapStore()
const layerManager = uselayermanager()

// 面板状态
const layerList = ref<HTMLElement>()

// 分组展开状态
const expandedGroups = ref({
  supermap: false,
  draw: false,
  query: false,
  upload: false
})

// 删除确认对话框
const deleteDialog = ref({
  visible: false,
  title: '',
  message: '',
  layerId: ''
})

// 定义图层项接口
interface LayerItem {
  key: string;
  name: string;
  displayName: string;
  desc: string;
  visible: boolean;
  source: string;
}

// 所有图层的扁平化列表
const allLayers = computed(() => {
  const layers: LayerItem[] = []
  
  mapStore.vectorlayers.forEach(vl => {
    const source = vl.source || 'external'
    const item: LayerItem = {
      key: vl.id,
      name: vl.name,
      displayName: vl.name,
      desc: '矢量数据',
      visible: vl.layer.getVisible(),
      source: source
    }
    
    // 特殊处理本地图层的显示名称和分组
    if (source === 'local') {
      const layerName = vl.layer.get('layerName') || vl.name
      const sourceType = vl.layer.get('sourceType') || 'draw'
      
      // 直接显示保存的图层名称，不添加前缀
      item.displayName = layerName
      
      // 根据sourceType设置描述信息
      const sourceTypeDescs: Record<string, string> = {
        draw: '用户创建的图层',
        area: '区域选择图层',
        query: '属性查询图层',
        buffer: '缓冲区分析结果图层',
        path: '最短路径分析结果图层',
        upload: '上传的GeoJSON图层',
        intersect: '相交分析结果图层',
        erase: '擦除分析结果图层'
      }
      item.desc = sourceTypeDescs[sourceType] || '用户创建的图层'
      
      // 根据sourceType确定分组
      if (sourceType === 'draw' || sourceType === 'buffer' || sourceType === 'path' || sourceType === 'intersect' || sourceType === 'erase') {
        item.source = 'draw' // 绘制图层、缓冲区分析及绘制图层、相交分析及绘制图层、擦除分析及绘制图层都归类到绘制图层组
      } else if (sourceType === 'area' || sourceType === 'query') {
        item.source = 'query' // 查询图层（区域选择 + 属性查询）
      } else if (sourceType === 'upload') {
        item.source = 'upload' // 上传图层分组
      }
    }
    
    layers.push(item)
  })
  
  return layers
})


// 获取指定来源的图层列表
const getLayersBySource = (source: string): LayerItem[] => {
  return allLayers.value.filter(item => item.source === source)
}


// 切换分组展开状态
const toggleGroup = (groupName: keyof typeof expandedGroups.value) => {
  expandedGroups.value[groupName] = !expandedGroups.value[groupName]
}

// 处理图层可见性切换
const handleToggleVisibility = (item: LayerItem) => {
  layerManager.togglelayerVisibility(item.key)
}

// 处理图层删除
const handleRemove = (item: LayerItem) => {
  deleteDialog.value = {
    visible: true,
    title: '删除图层',
    message: `确定要删除图层"${item.displayName}"吗？此操作不可撤销。`,
    layerId: item.key
  }
}

// 处理删除确认
const handleConfirmRemove = () => {
  layerManager.removeLayer(deleteDialog.value.layerId)
  deleteDialog.value.visible = false
}

// 处理删除取消
const handleCancelRemove = () => {
  deleteDialog.value.visible = false
}

// 暴露关闭面板的方法
const emit = defineEmits<{
  close: []
}>()
</script>

<style scoped>
.view-layer-manager {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  max-height: calc(100vh - 120px);
}


.layer-panel {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--glow);
  width: 280px;
  max-height: calc(100vh - 200px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideIn 0.2s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.panel-header {
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
  transition: none !important;
  animation: none !important;
}

.layer-count {
  font-size: 11px;
  color: var(--sub);
  background: var(--surface);
  padding: 2px 6px;
  border-radius: 10px;
  transition: none !important;
  animation: none !important;
}

.layer-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: calc(100vh - 200px);
  min-height: 200px;
}

.layer-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 8px;
}

.group-header {
  padding: 6px 10px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  user-select: none;
  transition: none !important;
  animation: none !important;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 32px;
  margin-bottom: 4px;
  box-shadow: var(--glow);
}

.group-header:hover {
  background: var(--accent);
  color: white;
}

.group-header:active {
  background: var(--accent);
  color: white;
}

.group-toggle {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: none !important;
  animation: none !important;
  flex-shrink: 0;
}

.group-toggle:hover {
  background: rgba(255, 255, 255, 0.1);
}

.group-toggle.active {
  transform: rotate(90deg);
}

.group-title {
  font-size: 13px;
  font-weight: 600;
  color: inherit;
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  text-align: left;
  transition: none !important;
  animation: none !important;
}




.control-btn {
  font-size: 10px;
  padding: 4px 8px;
  min-width: auto;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-btn {
  background: var(--btn-danger-bg);
  color: var(--btn-danger-color);
}

.delete-btn:hover {
  background: var(--btn-danger-hover-bg);
  color: var(--btn-danger-hover-color);
}


/* 响应式设计 */
@media (max-width: 768px) {
  .view-layer-manager {
    top: 12px;
    right: 12px;
  }
  
  .layer-panel {
    width: 280px;
  }
  
  .toggle-btn {
    width: 36px;
    height: 36px;
  }
}

/* 滚动条样式 */
.layer-list::-webkit-scrollbar {
  width: 4px;
}

.layer-list::-webkit-scrollbar-track {
  background: var(--scrollbar-track, rgba(200, 200, 200, 0.1));
  border-radius: 2px;
}

.layer-list::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb, rgba(150, 150, 150, 0.3));
  border-radius: 2px;
}

.layer-list::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover, rgba(150, 150, 150, 0.5));
}
</style>
