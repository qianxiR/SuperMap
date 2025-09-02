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
              <span class="layer-count">({{ getLayerCount('supermap') }})</span>
            </div>
          </div>
          
          <!-- 可折叠的图层列表 -->
          <div class="group-content" v-show="!collapsedGroups.supermap">
            <div class="group-scroll-container">
              <div 
                v-for="item in getLayersBySource('supermap')" 
                :key="item.key"
                class="layer-item"
                :class="{ 'active': selectedLayerKey === item.key }"
                @click="selectLayer(item.key)"
              >
                <div class="layer-info">
                  <div class="layer-name">{{ item.displayName }}</div>
                  <div class="layer-desc">{{ item.desc }}</div>
                </div>
                <div class="layer-operations">
                  <SecondaryButton
                    :text="item.visible ? '隐藏' : '显示'"
                    @click.stop="handleToggleVisibility(item)"
                  />
                  <SecondaryButton
                    text="移除"
                    :variant="selectedLayerKey === item.key ? 'secondary' : 'danger'"
                    @click.stop="handleRemove(item)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 绘制图层容器 -->
        <div class="layer-container">
          <div class="group-header" @click="toggleGroupCollapse('draw')">
            <div class="group-title">
              绘制图层
              <span class="layer-count">({{ getLayerCount('draw') }})</span>
            </div>
          </div>
          
          <!-- 可折叠的图层列表 -->
          <div class="group-content" v-show="!collapsedGroups.draw">
            <div class="group-scroll-container">
              <div 
                v-for="item in getLayersBySource('draw')" 
                :key="item.key"
                class="layer-item"
                :class="{ 'active': selectedLayerKey === item.key }"
                @click="selectLayer(item.key)"
              >
                <div class="layer-info">
                  <div class="layer-name">{{ item.displayName }}</div>
                  <div class="layer-desc">{{ item.desc }}</div>
                </div>
                <div class="layer-operations">
                  <SecondaryButton
                    :text="item.visible ? '隐藏' : '显示'"
                    @click.stop="handleToggleVisibility(item)"
                  />
                  <SecondaryButton
                    text="移除"
                    :variant="selectedLayerKey === item.key ? 'secondary' : 'danger'"
                    @click.stop="handleRemove(item)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 查询图层容器 -->
        <div class="layer-container">
          <div class="group-header" @click="toggleGroupCollapse('query')">
            <div class="group-title">
              查询图层
              <span class="layer-count">({{ getLayerCount('query') }})</span>
            </div>
          </div>
          
          <!-- 可折叠的图层列表 -->
          <div class="group-content" v-show="!collapsedGroups.query">
            <div class="group-scroll-container">
              <div 
                v-for="item in getLayersBySource('query')" 
                :key="item.key"
                class="layer-item"
                :class="{ 'active': selectedLayerKey === item.key }"
                @click="selectLayer(item.key)"
              >
                <div class="layer-info">
                  <div class="layer-name">{{ item.displayName }}</div>
                  <div class="layer-desc">{{ item.desc }}</div>
                </div>
                <div class="layer-operations">
                  <SecondaryButton
                    :text="item.visible ? '隐藏' : '显示'"
                    @click.stop="handleToggleVisibility(item)"
                  />
                  <SecondaryButton
                    text="移除"
                    :variant="selectedLayerKey === item.key ? 'secondary' : 'danger'"
                    @click.stop="handleRemove(item)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </PanelWindow>
  
  <!-- 确认对话框 -->
  <ConfirmDialog
    :visible="confirmDialogVisible"
    :title="confirmDialogConfig.title"
    :message="confirmDialogConfig.message"
    confirm-text="确定移除"
    cancel-text="取消"
    @confirm="handleConfirmRemove"
    @cancel="handleCancelRemove"
    @close="handleCancelRemove"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import { useAnalysisStore } from '@/stores/analysisStore'
import SecondaryButton from '@/components/UI/SecondaryButton.vue'
import { useLayerManager } from '@/composables/useLayerManager'
import PanelWindow from '@/components/UI/PanelWindow.vue'
import ConfirmDialog from '@/components/UI/ConfirmDialog.vue'

interface MapLayerItem {
  key: string;
  name: string;
  displayName: string;
  desc: string;
  visible: boolean;
  source: string;
}

const mapStore = useMapStore()
const analysisStore = useAnalysisStore()
const { toggleLayerVisibility, removeLayer } = useLayerManager()

// 确认对话框状态
const confirmDialogVisible = ref(false)
const confirmDialogConfig = ref({
  title: '',
  message: '',
  layerId: ''
})

// 选中图层状态
const selectedLayerKey = ref<string>('')

// 选择图层
const selectLayer = (layerKey: string) => {
  selectedLayerKey.value = layerKey
}

// 折叠状态管理
const collapsedGroups = ref<Record<string, boolean>>({
  supermap: true,
  draw: true,
  query: true,
  external: true
})

// 切换分组折叠状态
const toggleGroupCollapse = (source: string) => {
  collapsedGroups.value[source] = !collapsedGroups.value[source]
}

// 获取指定来源的图层数量
const getLayerCount = (source: string): number => {
  return allLayers.value.filter(item => item.source === source).length
}

// 获取指定来源的图层列表（将已打开/可见图层置顶）
const getLayersBySource = (source: string): MapLayerItem[] => {
  return allLayers.value
    .filter(item => item.source === source)
    .sort((a, b) => Number(b.visible) - Number(a.visible))
}





// 所有图层的扁平化列表
const allLayers = computed(() => {
  const layers: MapLayerItem[] = []
  
  mapStore.vectorLayers.forEach(vl => {
    const source = vl.source || 'external'
    const item: MapLayerItem = {
      key: vl.id,
      name: vl.name,
      displayName: vl.name,
      desc: inferDesc(vl.name, vl.type),
      visible: vl.layer.getVisible(),
      source: source
    }
    
    // 特殊处理本地图层的显示名称和分组
    if (source === 'local') {
      const layerName = vl.layer.get('layerName') || vl.name
      const sourceType = vl.layer.get('sourceType') || 'draw'
      const sourceTypeNames: Record<string, string> = {
        draw: '绘制',
        area: '区域选择',
        query: '属性查询',
        buffer: '缓冲区分析'
      }
      item.displayName = `${sourceTypeNames[sourceType] || '本地'}: ${layerName}`
      item.desc = sourceType === 'buffer' ? '缓冲区分析结果图层' : '用户创建的图层'
      
      // 根据sourceType确定分组
      if (sourceType === 'draw' || sourceType === 'buffer') {
        item.source = 'draw' // 绘制图层和缓冲区分析图层都归类到绘制图层组
      } else if (sourceType === 'area' || sourceType === 'query') {
        item.source = 'query' // 查询图层（区域选择 + 属性查询）
      }
    }
    
    layers.push(item)
  })
  
  return layers
})





function inferDesc(name: string, type: string): string {
  if (type === 'raster') return '栅格数据 (DEM)'
  if (name.includes('点')) return '点要素'
  if (name.includes('线')) return '线要素'
  if (name.includes('面')) return '面要素'
  return '矢量数据'
}

const handleToggleVisibility = (item: MapLayerItem) => {
  toggleLayerVisibility(item.key)
}

const handleRemove = (item: MapLayerItem) => {
  confirmDialogConfig.value = {
    title: '移除图层',
    message: `确定要移除图层"${item.name}"吗？此操作不可撤销。`,
    layerId: item.key
  }
  confirmDialogVisible.value = true
}

const handleConfirmRemove = () => {
  removeLayer(confirmDialogConfig.value.layerId)
  confirmDialogVisible.value = false
}

const handleCancelRemove = () => {
  confirmDialogVisible.value = false
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

.layer-item {
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

.layer-item:hover {
  background: var(--surface-hover);
  /* 移除黑色边框效果 */
}

.layer-item.active {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
}

.layer-info {
  display: flex;
  flex-direction: column;
}

.layer-name {
  font-size: 13px;
  color: var(--text);
  font-weight: 500;
}

.layer-item.active .layer-name {
  color: white;
}

.layer-desc {
  font-size: 11px;
  color: var(--sub);
  margin-top: 2px;
}

.layer-item.active .layer-desc {
  color: rgba(255, 255, 255, 0.9);
}

.layer-operations {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.layer-operations :deep(.secondary-button) {
  font-size: 10px;
  padding: 4px 8px;
  min-width: auto;
}

/* 图层容器样式 */
.layer-containers {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.layer-container {
  background: var(--btn-secondary-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}

.group-header {
  padding: 6px 10px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s ease;
  display: flex;
  align-items: center;
  min-height: 36px;
}

.group-header:hover {
  background: var(--surface-hover);
}

.group-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 6px;
}



.layer-count {
  font-size: 11px;
  color: var(--sub);
  font-weight: normal;
}

.group-content {
  border-top: 1px solid var(--border);
  background: var(--panel);
}

.group-scroll-container {
  max-height: 360px;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
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


