<template>
  <PanelWindow 
    :visible="analysisStore.toolPanel.visible && analysisStore.toolPanel.activeTool === 'layer'"
    :embed="true"
    :width="'100%'"
    :height="'100%'"
    class="layer-manager-panel"
  >
    <!-- 地图图层管理 -->
    <div class="analysis-section">
      <div class="section-title">地图图层管理</div>
      
      <!-- 三个独立的图层容器 -->
      <div class="layer-containers">
        <!-- SuperMap 服务图层容器 -->
        <div class="layer-container">
          <div class="group-header" @click="toggleGroupCollapse('supermap')">
            <div class="group-title">
              SuperMap 服务图层
              <span class="group-count">{{ getLayersBySource('supermap').length }}</span>
            </div>
            <button 
              class="export-btn"
              @click.stop="handleExportGroup('supermap')"
              :title="`导出 ${getLayersBySource('supermap').length} 个图层为JSON`"
              :disabled="getLayersBySource('supermap').length === 0"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
              </svg>
            </button>
          </div>
          
          <!-- 可折叠的图层列表 -->
          <div class="group-content" v-show="!collapsedGroups.supermap">
            <div class="group-scroll-container">
              <LayerItem
                v-for="item in getLayersBySource('supermap')" 
                :key="item.key"
                :layer-name="item.displayName"
                :layer-desc="item.desc"
                :hidden="!item.visible"
                :class="{ 'active': selectedlayerKey === item.key }"
                @click="selectlayer(item.key)"
                @toggle-visibility="handleToggleVisibility(item)"
              />
            </div>
          </div>
        </div>

        <!-- 分析及绘制图层容器 -->
        <div class="layer-container">
          <div class="group-header" @click="toggleGroupCollapse('draw')">
            <div class="group-title">
              分析及绘制图层
              <span class="group-count">{{ getLayersBySource('draw').length }}</span>
            </div>
            <button 
              class="export-btn"
              @click.stop="handleExportGroup('draw')"
              :title="`导出 ${getLayersBySource('draw').length} 个图层为JSON`"
              :disabled="getLayersBySource('draw').length === 0"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
              </svg>
            </button>
          </div>
          
          <!-- 可折叠的图层列表 -->
          <div class="group-content" v-show="!collapsedGroups.draw">
            <div class="group-scroll-container">
              <LayerItem
                v-for="item in getLayersBySource('draw')" 
                :key="item.key"
                :layer-name="item.displayName"
                :layer-desc="item.desc"
                :hidden="!item.visible"
                :class="{ 'active': selectedlayerKey === item.key }"
                @click="selectlayer(item.key)"
                @toggle-visibility="handleToggleVisibility(item)"
              >
                <template #controls>
                  <button 
                    class="control-btn delete-btn"
                    @click="handleRemove(item)"
                    :title="`删除图层: ${item.displayName}`"
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

        <!-- 查询图层容器 -->
        <div class="layer-container">
          <div class="group-header" @click="toggleGroupCollapse('query')">
            <div class="group-title">
              查询图层
              <span class="group-count">{{ getLayersBySource('query').length }}</span>
            </div>
            <button 
              class="export-btn"
              @click.stop="handleExportGroup('query')"
              :title="`导出 ${getLayersBySource('query').length} 个图层为JSON`"
              :disabled="getLayersBySource('query').length === 0"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
              </svg>
            </button>
          </div>
          
          <!-- 可折叠的图层列表 -->
          <div class="group-content" v-show="!collapsedGroups.query">
            <div class="group-scroll-container">
              <LayerItem
                v-for="item in getLayersBySource('query')" 
                :key="item.key"
                :layer-name="item.displayName"
                :layer-desc="item.desc"
                :hidden="!item.visible"
                :class="{ 'active': selectedlayerKey === item.key }"
                @click="selectlayer(item.key)"
                @toggle-visibility="handleToggleVisibility(item)"
              >
                <template #controls>
                  <button 
                    class="control-btn delete-btn"
                    @click="handleRemove(item)"
                    :title="`删除图层: ${item.displayName}`"
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

        <!-- 上传图层容器 -->
        <div class="layer-container">
          <div class="group-header" @click="toggleGroupCollapse('upload')">
            <div class="group-title">
              上传图层
              <span class="group-count">{{ getLayersBySource('upload').length }}</span>
            </div>
            <button 
              class="export-btn"
              @click.stop="handleExportGroup('upload')"
              :title="`导出 ${getLayersBySource('upload').length} 个图层为JSON`"
              :disabled="getLayersBySource('upload').length === 0"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
              </svg>
            </button>
          </div>
          
          <!-- 可折叠的图层列表 -->
          <div class="group-content" v-show="!collapsedGroups.upload">
            <div class="group-scroll-container">
              <LayerItem
                v-for="item in getLayersBySource('upload')" 
                :key="item.key"
                :layer-name="item.displayName"
                :layer-desc="item.desc"
                :hidden="!item.visible"
                :class="{ 'active': selectedlayerKey === item.key }"
                @click="selectlayer(item.key)"
                @toggle-visibility="handleToggleVisibility(item)"
              >
                <template #controls>
                  <button 
                    class="control-btn delete-btn"
                    @click="handleRemove(item)"
                    :title="`删除图层: ${item.displayName}`"
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
  </PanelWindow>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import { useAnalysisStore } from '@/stores/analysisStore'
import { uselayermanager } from '@/composables/uselayermanager'
import { useLayerExport } from '@/composables/useLayerExport'
import PanelWindow from '@/components/UI/PanelWindow.vue'
import LayerItem from '@/components/UI/LayerItem.vue'
import ConfirmDialog from '@/components/UI/ConfirmDialog.vue'

interface MaplayerItem {
  key: string;
  name: string;
  displayName: string;
  desc: string;
  visible: boolean;
  source: string;
}

const mapStore = useMapStore()
const analysisStore = useAnalysisStore()
const { togglelayerVisibility, removeLayer } = uselayermanager()
const { exportLayersAsGeoJSON } = useLayerExport()

// 选中图层状态
const selectedlayerKey = ref<string>('')

// 删除确认对话框
const deleteDialog = ref({
  visible: false,
  title: '',
  message: '',
  layerId: ''
})

// 选择图层
const selectlayer = (layerKey: string) => {
  selectedlayerKey.value = layerKey
}

// 折叠状态管理
const collapsedGroups = ref<Record<string, boolean>>({
  supermap: true,
  draw: true,
  query: true,
  external: true,
  upload: true
})

// 切换分组折叠状态
const toggleGroupCollapse = (source: string) => {
  collapsedGroups.value[source] = !collapsedGroups.value[source]
}


// 获取指定来源的图层列表
const getLayersBySource = (source: string): MaplayerItem[] => {
  return alllayers.value
    .filter(item => item.source === source)
}


// 所有图层的扁平化列表
const alllayers = computed(() => {
  const layers: MaplayerItem[] = []
  
  mapStore.vectorlayers.forEach(vl => {
    const source = vl.source || 'external'
    const item: MaplayerItem = {
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



const handleToggleVisibility = (item: MaplayerItem) => {
  togglelayerVisibility(item.key)
}

// 处理图层删除
const handleRemove = (item: MaplayerItem) => {
  deleteDialog.value = {
    visible: true,
    title: '删除图层',
    message: `确定要删除图层"${item.displayName}"吗？此操作不可撤销。`,
    layerId: item.key
  }
}

// 处理删除确认
const handleConfirmRemove = () => {
  removeLayer(deleteDialog.value.layerId)
  deleteDialog.value.visible = false
}

// 处理删除取消
const handleCancelRemove = () => {
  deleteDialog.value.visible = false
}

// 处理图层组导出
const handleExportGroup = async (source: string) => {
  const layers = getLayersBySource(source)
  if (layers.length === 0) {
    return
  }
  
  const groupNames: Record<string, string> = {
    supermap: 'SuperMap服务图层',
    draw: '分析及绘制图层', 
    query: '查询图层',
    upload: '上传图层'
  }
  
  await exportLayersAsGeoJSON(layers, groupNames[source] || source)
}
</script>

<style scoped>
.layer-manager-panel {
  height: 100%;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  /* 使用全局滚动条样式 */
}

.analysis-section {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
  /* 禁用动画，防止主题切换闪烁 */
  animation: none !important;
  margin-bottom: 16px;
  /* 确保内容可以滚动 */
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.layer-list-container {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* 保留fadeIn动画定义但不使用 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.section-title {
  font-size: 13px;
  color: var(--text);
  margin-bottom: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.layer-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 4px;
}

/* LayerItem 组件样式已移至组件内部，选中状态使用默认颜色 */

/* 图层容器样式 */
.layer-containers {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.layer-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.group-header {
  padding: 8px 12px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 40px;
  margin-bottom: 4px;
  box-shadow: var(--glow);
}

.group-header:hover {
  background: var(--accent);
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.group-header:active {
  transform: translateY(0);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
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
  transition: all 0.2s ease;
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
  gap: 6px;
  flex: 1;
  text-align: left;
}

.group-count {
  font-size: 10px;
  font-weight: 500;
  color: var(--accent);
  background: var(--accent-bg, rgba(var(--accent-rgb), 0.1));
  padding: 2px 6px;
  border-radius: 10px;
  margin-left: 6px;
  min-width: 16px;
  text-align: center;
  line-height: 1;
  transition: none !important;
  animation: none !important;
}

.group-header:hover .group-count {
  color: white;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.export-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--accent);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
  flex-shrink: 0;
  margin-left: 8px;
}

.export-btn:hover {
  background: var(--accent);
  color: white;
  transform: scale(1.1);
}

.export-btn:disabled {
  color: var(--sub);
  cursor: not-allowed;
  transform: none;
}

.export-btn:disabled:hover {
  background: transparent;
  color: var(--sub);
}



.group-content {
  background: var(--panel);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  box-shadow: var(--glow);
}

.group-scroll-container {
  max-height: 360px;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
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
/* 滚动条样式 */
.layer-list::-webkit-scrollbar,
.layer-groups::-webkit-scrollbar,
.group-scroll-container::-webkit-scrollbar {
  width: 3px;
}

.layer-list::-webkit-scrollbar-track,
.layer-groups::-webkit-scrollbar-track,
.group-scroll-container::-webkit-scrollbar-track {
  background: var(--scrollbar-track, rgba(200, 200, 200, 0.1));
  border-radius: 1.5px;
}

.layer-list::-webkit-scrollbar-thumb,
.layer-groups::-webkit-scrollbar-thumb,
.group-scroll-container::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb, rgba(150, 150, 150, 0.3));
  border-radius: 1.5px;
}

.layer-list::-webkit-scrollbar-thumb:hover,
.layer-groups::-webkit-scrollbar-thumb:hover,
.group-scroll-container::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover, rgba(150, 150, 150, 0.5));
}

.layer-list.empty {
  align-items: center;
  justify-content: center;
  min-height: 200px;
  overflow: hidden;
}

.empty-state {
  text-align: center;
  color: var(--sub);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-text {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
}

.empty-desc {
  font-size: 12px;
  opacity: 0.8;
}

/* 保留空状态样式 */
</style>


