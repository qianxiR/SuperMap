<template>
  <PanelWindow 
    :visible="analysisStore.toolPanel.visible && analysisStore.toolPanel.activeTool === 'area-selection'"
    :embed="true"
    :width="'100%'"
    :height="'100%'"
    class="area-selection-tools-panel"
  >
    <!-- 已选中要素列表 -->
    <div class="analysis-section">
      <div class="section-title">已选中要素列表 ({{ selectedFeatures.length }})</div>
      <div class="layer-list" v-if="selectedFeatures.length > 0">
        <div 
          v-for="(feature, index) in selectedFeatures" 
          :key="feature.id || index"
          class="layer-item"
          :class="{ 'active': selectedFeatureIndex === index }"
          @click="handleSelectFeature(index)"
        >
          <div class="layer-info">
            <div class="layer-name">要素 {{ index + 1 }} - {{ getFeatureType(feature) }}</div>
            <div class="layer-desc">{{ getFeatureGeometryInfo(feature) }}</div>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        <div class="empty-text">未选中要素</div>
        <div class="empty-desc">请在地图上框选要素</div>
      </div>
    </div>

    <!-- 要素信息 -->
    <div class="analysis-section" v-if="selectedFeatureIndex !== -1 && selectedFeatures[selectedFeatureIndex]">
      <div class="section-title">要素信息</div>
      <div class="feature-details">
        <div 
          v-for="(item, index) in selectedFeatureInfo" 
          :key="index"
          class="info-item"
        >
          <span class="info-label">{{ item.label }}</span>
          <span class="info-value">{{ item.value }}</span>
        </div>
      </div>
    </div>

    <!-- 选择操作 -->
    <div class="analysis-section">
      <div class="section-title">选择操作</div>
      <div class="button-column">
        <SecondaryButton 
          text="反选当前要素"
          @click="invertSelectedLayer"
        />
        <SecondaryButton 
          text="另存为图层"
          @click="showLayerNameModal"
          :disabled="selectedFeatures.length === 0"
        />
        <SecondaryButton 
          text="导出 GeoJSON"
          @click="exportSelectedAsGeoJSON"
          :disabled="selectedFeatures.length === 0"
        />
        <SecondaryButton 
          text="清除选择"
          variant="danger"
          @click="clearSelection"
        />
      </div>
    </div>

    <!-- 提示信息 -->
    <div class="analysis-section">
      <TipWindow text="在地图上按住左键拖拽鼠标进行框选要素，框选完成后松开左键" />
    </div>
    
  </PanelWindow>
  
  <!-- 图层名称输入弹窗 -->
  <LayerNameModal
    :visible="showLayerNameModalRef"
    title="保存区域选择结果"
    placeholder="请输入图层名称"
    hint="图层名称将用于在图层管理器中识别此区域选择结果"
    :default-name="defaultLayerName"
    @confirm="handleLayerNameConfirm"
    @close="handleLayerNameClose"
  />
</template>

<script setup lang="ts">
import { watch, computed, onMounted, onUnmounted, ref } from 'vue'
import { useAnalysisStore } from '@/stores/analysisStore'
import { useMapStore } from '@/stores/mapStore'
import { useFeatureSelection } from '@/composables/useFeatureSelection'
import { useLayerManager } from '@/composables/useLayerManager'
import { getFeatureCompleteInfo } from '@/utils/featureUtils'
import SecondaryButton from '@/components/UI/SecondaryButton.vue'
import PanelWindow from '@/components/UI/PanelWindow.vue'
import TipWindow from '@/components/UI/TipWindow.vue'
import LayerNameModal from '@/components/UI/LayerNameModal.vue'

const analysisStore = useAnalysisStore()
const mapStore = useMapStore()

// 使用要素选择 hook
const {
  selectedFeatures,
  selectedFeatureIndex,
  clearSelection,
  invertSelectedLayer,
  handleSelectFeature,
  setupSelectionInteractions,
  clearSelectionInteractions,
  getFeatureType,
  getFeatureCoords,
  getFeatureGeometryInfo
} = useFeatureSelection()

// 使用图层管理 hook
const { saveFeaturesAsLayer } = useLayerManager()

// 图层名称弹窗状态
const showLayerNameModalRef = ref<boolean>(false)
const defaultLayerName = ref<string>('')

// 显示图层名称输入弹窗
const showLayerNameModal = () => {
  if (selectedFeatures.value.length === 0) {
    return
  }
  
  defaultLayerName.value = `区域选择`
  showLayerNameModalRef.value = true
}

// 处理图层名称确认
const handleLayerNameConfirm = async (layerName: string) => {
  showLayerNameModalRef.value = false
  await saveSelectedAsLayer(layerName)
}

// 处理图层名称弹窗关闭
const handleLayerNameClose = () => {
  showLayerNameModalRef.value = false
}

// 保存选中要素为图层
const saveSelectedAsLayer = async (customLayerName: string) => {
  if (selectedFeatures.value.length === 0) {
    return
  }

  await saveFeaturesAsLayer(selectedFeatures.value, customLayerName, 'area')
}

// 导出区域选择结果为 GeoJSON 文件
const exportSelectedAsGeoJSON = () => {
  if (!selectedFeatures.value.length) {
    return
  }
  const ol = (window as any).ol
  const format = new ol.format.GeoJSON()
  const featureCollection = format.writeFeaturesObject(selectedFeatures.value, {
    featureProjection: mapStore.map?.getView()?.getProjection?.(),
    dataProjection: 'EPSG:4326'
  })

  const now = new Date()
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  const blob = new Blob([JSON.stringify(featureCollection, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `area_selection_结果_${hh}${mm}${ss}.geojson`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// 选中要素的详细信息
const selectedFeatureInfo = computed(() => {
  if (selectedFeatureIndex.value === -1 || !selectedFeatures.value[selectedFeatureIndex.value]) {
    return []
  }
  
  const feature = selectedFeatures.value[selectedFeatureIndex.value]
  
  // 使用增强的要素信息获取函数
  return getFeatureCompleteInfo(feature)
})

// 监听区域选择工具关闭 - 不清除已选择的要素，只清除交互
watch(() => analysisStore.toolPanel?.activeTool, (tool) => {
  if (tool !== 'area-selection') {
    // 只清除交互，不清除已选择的要素
    clearSelectionInteractions()
  }
})

// 组件挂载时设置交互
onMounted(() => {
  setupSelectionInteractions()
  
  // 延迟初始化自动滚动，确保DOM已渲染
  setTimeout(() => {
    // initAutoScroll() // Removed as per edit hint
  }, 100)
})

// 组件卸载时清理 - 只清除交互，保持要素选择
onUnmounted(() => {
  clearSelectionInteractions()
})

defineExpose({
  selectedFeatures,
  selectedFeatureIndex,
  clearSelection
})
</script>

<style scoped>
.area-selection-tools-panel {
  height: 100%;
  overflow-y: auto;
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

.selection-info {
  margin-bottom: 12px;
  padding: 12px;
  background: var(--btn-secondary-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  animation: fadeIn 0.3s ease-out;
}

.info-text {
  font-size: 12px;
  color: var(--text);
  margin-bottom: 4px;
}

.info-text:last-child {
  margin-bottom: 0;
}

.button-column {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 使用图层管理的列表样式 */
.layer-list { 
  display: flex; 
  flex-direction: column; 
  gap: 8px;
  max-height: 180px; /* 约3个项目的高度 */
  overflow-y: auto;
  padding-right: 4px; /* 为滚动条预留空间 */
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

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  color: var(--sub);
  /* 禁用动画，防止主题切换闪烁 */
  animation: none !important;
}

.empty-text {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text);
}

.empty-desc {
  font-size: 14px;
  opacity: 0.8;
}

.feature-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 4px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  padding: 6px 0;
  border-bottom: 1px solid var(--border);
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  color: var(--sub);
  min-width: 80px;
  font-weight: 500;
}

.info-value {
  color: var(--text);
  text-align: right;
  word-break: break-word;
  max-width: 200px;
  font-size: 11px;
}
</style>
