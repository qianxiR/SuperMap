<template>
  <PanelWindow 
    :visible="analysisStore.toolPanel.visible && analysisStore.toolPanel.activeTool === 'buffer'"
    :embed="true"
    :width="'100%'"
    :height="'100%'"
    class="buffer-analysis-panel"
  >
    <!-- 选择分析图层 -->
    <div class="analysis-section">
      <div class="section-title">选择分析图层</div>
      <div class="layer-selector">
        <DropdownSelect 
          :model-value="selectedAnalysisLayerId"
          :options="layerOptionsWithNone"
          placeholder="请选择分析图层"
          @update:model-value="onLayerSelectionChange"
        />
      </div>
      
      <!-- 显示选中图层信息 -->
      <div v-if="selectedAnalysisLayerInfo" class="layer-info">
        <div class="info-item">
          <span class="info-label">图层名称:</span>
          <span class="info-value">{{ selectedAnalysisLayerInfo?.name }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">图层类型:</span>
          <span class="info-value">{{ selectedAnalysisLayerInfo?.type }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">要素数量:</span>
          <span class="info-value">{{ selectedAnalysisLayerInfo?.featureCount }} 个</span>
        </div>
      </div>
      
      <!-- 显示已选择要素信息 -->
      <div v-if="hasSelectedFeatures" class="selected-features-info">
        <div class="info-item">
          <span class="info-label">已选择要素:</span>
          <span class="info-value">{{ selectedFeatures.length }} 个</span>
        </div>
        <div v-if="selectedFeatures.length <= 10" class="feature-names">
          <div class="info-label">要素名称:</div>
          <div class="feature-name-list">
            <span 
              v-for="(feature, index) in selectedFeatures.slice(0, 10)" 
              :key="index"
              class="feature-name-tag"
            >
              {{ getFeatureDisplayName(feature, index) }}
            </span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 参数设置 -->
    <div class="analysis-section">
      <div class="section-title">参数设置</div>
      <div class="form-row">
        <div class="form-item">
          <label class="form-label">圆弧精度</label>
          <TraditionalInputGroup
            :model-value="bufferSettings.semicircleLineSegment"
            type="number"
            :min="4"
            :max="50"
            :step="2"
            placeholder="圆弧精度 (步数)"
            @update:model-value="(value) => updateBufferSettings({ semicircleLineSegment: value })"
          />
        </div>

      </div>
      <div class="form-row">
        <div class="form-item">
          <label class="form-label">缓冲距离 (米)</label>
          <TraditionalInputGroup
            :model-value="bufferSettings.radius"
            type="number"
            :min="0"
            :step="10"
            placeholder="缓冲距离"
            @update:model-value="(value) => updateBufferSettings({ radius: value })"
          />
        </div>
      </div>
    </div>

    <!-- 分析操作 -->
    <div class="analysis-section">
      <div class="button-group">
        <PrimaryButton 
          text="执行缓冲区分析"
          :loading="isAnalyzing"
          :disabled="!selectedAnalysisLayerId"
          @click="executeBufferAnalysis"
        />
        <SecondaryButton 
          text="清除结果"
          :disabled="!bufferResults || bufferResults.length === 0"
          @click="clearResults"
        />
      </div>
      
      <!-- 运行时提示 -->
      <TipWindow 
        v-if="isAnalyzing"
        :visible="isAnalyzing"
        variant="info"
        :show-icon="true"
      >
        <template #icon>🔄</template>
        <div>
          <div style="font-weight: 600; margin-bottom: 4px;">正在执行缓冲区分析...</div>
          <div style="font-size: 11px; opacity: 0.8;">
            正在对图层 "{{ selectedAnalysisLayerInfo?.name }}" 进行缓冲区分析，请稍候
          </div>
        </div>
      </TipWindow>
    </div>

    <!-- 分析结果 -->
    <div v-if="bufferResults && bufferResults.length > 0" class="analysis-section">
      <div class="section-title">分析结果</div>
      <div class="result-info">
        <div class="info-item">
          <span class="info-label">生成缓冲区:</span>
          <span class="info-value">{{ bufferResults.length }} 个</span>
        </div>
        <div class="info-item">
          <span class="info-label">缓冲距离:</span>
          <span class="info-value">{{ bufferSettings.radius }} 米</span>
        </div>
        <div class="info-item">
          <span class="info-label">圆弧精度:</span>
          <span class="info-value">{{ bufferSettings.semicircleLineSegment }} 步</span>
        </div>
      </div>
      
      <!-- 结果操作 -->
      <div class="result-actions">
        <div class="button-group">
          <PrimaryButton 
            text="保存为图层"
            @click="showLayerNameModal"
          />
          <SecondaryButton 
            text="导出 GeoJSON"
            @click="exportGeoJSON"
          />
        </div>
      </div>
    </div>
  </PanelWindow>
  
  <!-- 图层名称输入弹窗 -->
  <LayerNameModal
    :visible="showLayerNameModalRef"
    title="保存缓冲区分析结果"
    placeholder="请输入图层名称"
    hint="图层名称将用于在图层管理器中识别此缓冲区分析结果"
    :default-name="defaultLayerName"
    @confirm="handleLayerNameConfirm"
    @close="handleLayerNameClose"
  />
</template>

<script setup lang="ts">
import { watch, computed, ref, onMounted, onUnmounted } from 'vue'
import { useAnalysisStore } from '@/stores/analysisStore'
import { useMapStore } from '@/stores/mapStore'
import { useBufferAnalysis } from '@/composables/useBufferAnalysis'
import { useLayerManager } from '@/composables/useLayerManager'
import { useAreaSelectionStore } from '@/stores/areaSelectionStore'
import PrimaryButton from '@/components/UI/PrimaryButton.vue'
import SecondaryButton from '@/components/UI/SecondaryButton.vue'
import TraditionalInputGroup from '@/components/UI/TraditionalInputGroup.vue'
import DropdownSelect from '@/components/UI/DropdownSelect.vue'
import PanelWindow from '@/components/UI/PanelWindow.vue'
import TipWindow from '@/components/UI/TipWindow.vue'
import LayerNameModal from '@/components/UI/LayerNameModal.vue'

const analysisStore = useAnalysisStore()
const mapStore = useMapStore()
const areaSelectionStore = useAreaSelectionStore()

const {
  selectedAnalysisLayerId,
  selectedAnalysisLayerInfo,
  layerOptions,
  bufferSettings,
  bufferResults,
  currentResult,
  isAnalyzing,
  setSelectedAnalysisLayer,
  updateBufferSettings,
  clearAllSelections,
  executeBufferAnalysis,
  removeBufferLayers,
  displayBufferResults,
  clearState,
  
} = useBufferAnalysis()

// 使用图层管理 hook
const { saveFeaturesAsLayer } = useLayerManager()

// 图层名称弹窗状态
const showLayerNameModalRef = ref<boolean>(false)
const defaultLayerName = ref<string>('')

// 获取已选择要素信息
const selectedFeatures = computed(() => areaSelectionStore.selectedFeatures)
const hasSelectedFeatures = computed(() => selectedFeatures.value.length > 0)

// 获取要素显示名称
const getFeatureDisplayName = (feature: any, index: number): string => {
  const properties = feature.getProperties?.() || {}
  const featureName = properties.name || properties.NAME || properties.Name || 
                     properties.title || properties.TITLE || properties.Title ||
                     properties.label || properties.LABEL || properties.Label
  
  if (featureName) {
    return featureName
  }
  
  // 如果没有名称属性，使用几何类型和索引
  const geometry = feature.getGeometry?.()
  const geometryType = geometry?.getType?.() || '未知'
  return `${geometryType}_${index + 1}`
}

// 包含"无"选项的图层选项
const layerOptionsWithNone = computed(() => {
  return [
    { value: '', label: '无', disabled: false },
    ...layerOptions.value
  ]
})

// 图层选择变化处理
const onLayerSelectionChange = (layerId: string) => {
  if (layerId) {
    setSelectedAnalysisLayer(layerId)
  }
}

// 距离变化时的处理
const onDistanceChange = () => {
  const radius = bufferSettings.value.radius
  
  if (radius <= 0) {
    analysisStore.setAnalysisStatus('缓冲距离必须大于0')
  } else {
    analysisStore.setAnalysisStatus(`缓冲距离: ${radius}米`)
  }
}

// 清除结果
const clearResults = () => {
  clearState()
  analysisStore.setAnalysisStatus('已清除缓冲区分析结果')
}

// 导出 GeoJSON
const exportGeoJSON = async () => {
  if (!bufferResults.value || bufferResults.value.length === 0) {
    analysisStore.setAnalysisStatus('没有可导出的结果')
    return
  }
  
  try {
    const geoJSON = {
      type: 'FeatureCollection',
      features: bufferResults.value.map(result => ({
        type: 'Feature',
        geometry: result.geometry,
        properties: {
          id: result.id,
          name: result.name,
          distance: result.distance,
          unit: result.unit,
          sourceLayer: result.sourceLayerName,
          createdAt: result.createdAt
        }
      }))
    }
    
    const blob = new Blob([JSON.stringify(geoJSON, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    // 文件名：buffer_analysis_结果_执行时间（时分秒）
    const now = new Date()
    const hh = String(now.getHours()).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')
    const ss = String(now.getSeconds()).padStart(2, '0')
    a.download = `buffer_analysis_结果_${hh}${mm}${ss}.geojson`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    analysisStore.setAnalysisStatus('GeoJSON 文件已导出')

    
  } catch (error) {
    analysisStore.setAnalysisStatus(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

// 生成基于分析参数的图层名称
const generateLayerNameFromBuffer = () => {
  if (!selectedAnalysisLayerInfo.value) {
    return `缓冲区分析_${new Date().toLocaleString()}`
  }

  const sourceLayerName = selectedAnalysisLayerInfo.value.name
  const distanceText = `${bufferSettings.value.radius}米`
  
  // 如果有已选择的要素，尝试从要素中获取更详细的名称信息
  if (hasSelectedFeatures.value && selectedFeatures.value.length > 0) {
    const featureNames = selectedFeatures.value.map((feature, index) => {
      // 尝试从要素属性中获取名称
      const properties = feature.getProperties?.() || {}
      const featureName = properties.name || properties.NAME || properties.Name || 
                         properties.title || properties.TITLE || properties.Title ||
                         properties.label || properties.LABEL || properties.Label
      
      if (featureName) {
        return featureName
      }
      
      // 如果没有名称属性，使用几何类型和索引
      const geometry = feature.getGeometry?.()
      const geometryType = geometry?.getType?.() || '未知'
      return `${geometryType}_${index + 1}`
    })
    
    // 如果要素数量较少，在名称中包含具体要素信息
    if (selectedFeatures.value.length <= 5) {
      const featureNamesStr = featureNames.join('_')
      return `缓冲区_${sourceLayerName}_${featureNamesStr}_${distanceText}`
    } else {
      // 如果要素数量较多，只显示数量和主要信息
      return `缓冲区_${sourceLayerName}_${selectedFeatures.value.length}个要素_${distanceText}`
    }
  }
  
  return `缓冲区_${sourceLayerName}_${distanceText}`
}

// 显示图层名称输入弹窗
const showLayerNameModal = () => {
  if (!bufferResults.value || bufferResults.value.length === 0) {
    analysisStore.setAnalysisStatus('没有可保存的缓冲区结果')
    return
  }
  
  defaultLayerName.value = generateLayerNameFromBuffer()
  showLayerNameModalRef.value = true
}

// 处理图层名称确认
const handleLayerNameConfirm = async (layerName: string) => {
  showLayerNameModalRef.value = false
  await saveBufferLayer(layerName)
}

// 处理图层名称弹窗关闭
const handleLayerNameClose = () => {
  showLayerNameModalRef.value = false
}

// 保存缓冲区结果为图层
const saveBufferLayer = async (customLayerName: string) => {
  if (!bufferResults.value || bufferResults.value.length === 0) {
    analysisStore.setAnalysisStatus('没有可保存的缓冲区结果')
    return
  }

  try {
    const name = customLayerName
    
    // 创建Feature对象数组
    const bufferFeatures = bufferResults.value.map(result => {
      let geometry
      
      // 处理不同的GeoJSON格式
      if (result.geometry.type === 'Feature') {
        // 如果是Feature类型，提取geometry部分
        geometry = new window.ol.format.GeoJSON().readGeometry(result.geometry.geometry)
      } else if (result.geometry.type === 'FeatureCollection') {
        // 如果是FeatureCollection类型，提取第一个feature的geometry
        const features = new window.ol.format.GeoJSON().readFeatures(result.geometry)
        geometry = features[0]?.getGeometry()
      } else {
        // 直接是Geometry类型
        geometry = new window.ol.format.GeoJSON().readGeometry(result.geometry)
      }
      
      if (!geometry) {
        return null
      }
      
      const feature = new window.ol.Feature({
        geometry: geometry,
        properties: {
          id: result.id,
          name: result.name,
          distance: result.distance,
          unit: result.unit,
          sourceLayer: result.sourceLayerName,
          createdAt: result.createdAt
        }
      })
      return feature
    }).filter(Boolean) // 过滤掉null值
    
    // 调用图层管理中的通用保存函数
    const success = await saveFeaturesAsLayer(
      bufferFeatures,
      name,
      'buffer' // 作为缓冲区图层保存，使用红色样式
    )
    
    // 保存成功后自动清空所有缓冲区分析结果
    if (success) {
      // 移除地图上的临时缓冲区图层
      removeBufferLayers()
      
      // 清空缓冲区分析状态（包括结果、当前结果等）
      clearState()
      
      // 重置分析状态
      analysisStore.setAnalysisStatus(`缓冲区图层 "${name}" 已保存并已提交入库流程，结果已清空`)
    } else {
      analysisStore.setAnalysisStatus('保存失败，请重试')
    }
    
  } catch (error) {
    analysisStore.setAnalysisStatus(`保存失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

// 工具状态管理（已移除持久化）

// 清理缓冲区分析状态（工具切换时调用）
const clearBufferAnalysisState = () => {
  clearState()
  
  analysisStore.setAnalysisStatus('缓冲区分析状态已清理')
}

// 已移除持久化保存/恢复逻辑

// 组件生命周期管理
onMounted(() => {
  analysisStore.setAnalysisStatus('请选择分析图层')
})

onUnmounted(() => {})

// 监听状态变化，自动保存（防抖）
watch([
  selectedAnalysisLayerId,
  () => bufferSettings.value.radius,
  () => bufferSettings.value.semicircleLineSegment
], () => {
  // 持久化已移除：此处仅更新状态提示
})

// 监听工具面板变化
watch(() => analysisStore.toolPanel?.activeTool, (tool, prevTool) => {
  if (tool === 'buffer' && prevTool !== 'buffer') {
    // 当进入缓冲区分析时，只更新状态提示，不重复恢复状态
    if (bufferResults.value && bufferResults.value.length > 0) {
      analysisStore.setAnalysisStatus(`缓冲区分析结果已加载（${bufferResults.value.length}个结果），点击"执行分析"重新显示`)
    } else {
      analysisStore.setAnalysisStatus('请选择分析图层')
    }
  } else if (prevTool === 'buffer' && tool !== 'buffer') {
    // 当从缓冲区分析切换到其他工具时，清理分析结果和地图显示
    clearBufferAnalysisState()
  }
}, { immediate: true })

// 监听图层选择变化
watch(selectedAnalysisLayerId, (newLayerId) => {
  if (newLayerId) {
    setSelectedAnalysisLayer(newLayerId)
  }
})



// 监听分析结果变化
watch(bufferResults, (results) => {
  // 结果变化时更新默认图层名称
  if (results && results.length > 0) {
    defaultLayerName.value = generateLayerNameFromBuffer()
  }
}, { deep: true })
</script>

<style scoped>
.buffer-analysis-panel {
  height: 100%;
  overflow-y: auto;
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
  animation: none !important;
  margin-bottom: 16px;
}

.section-title {
  font-size: 13px;
  color: var(--text);
  margin-bottom: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.layer-selector {
  margin-bottom: 12px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.form-row {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.form-row:last-child {
  margin-bottom: 0;
}

.form-label {
  font-size: 12px;
  color: var(--sub);
  font-weight: 500;
}

.layer-info {
  margin-top: 12px;
  padding: 16px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  transition: all 0.2s ease;
  box-shadow: var(--glow);
}

.layer-info:hover {
  background: var(--surface-hover);
  border-color: var(--accent);
  box-shadow: 0 2px 6px rgba(var(--accent-rgb), 0.15);
}

.selected-features-info {
  margin-top: 12px;
  padding: 16px;
  background: rgba(var(--accent-rgb), 0.05);
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  border-radius: 12px;
  transition: all 0.2s ease;
}

.selected-features-info:hover {
  background: rgba(var(--accent-rgb), 0.08);
  border-color: rgba(var(--accent-rgb), 0.3);
}

.feature-names {
  margin-top: 8px;
}

.feature-name-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

.feature-name-tag {
  display: inline-block;
  padding: 2px 8px;
  background: rgba(var(--accent-rgb), 0.1);
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  border-radius: 6px;
  font-size: 10px;
  color: var(--text);
  font-weight: 500;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.info-item:last-child {
  margin-bottom: 0;
}

.info-label {
  font-size: 11px;
  color: var(--sub);
  font-weight: 500;
}

.info-value {
  font-size: 11px;
  color: var(--text);
  font-weight: 600;
}

.button-group {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.button-group .primary-button,
.button-group .secondary-button {
  flex: 1;
  min-width: 120px;
}

.result-info {
  margin-bottom: 16px;
  padding: 12px;
  background: rgba(var(--accent-rgb), 0.1);
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  border-radius: 8px;
}

.result-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-actions .button-group {
  justify-content: stretch;
}

.result-actions .button-group .primary-button,
.result-actions .button-group .secondary-button {
  flex: 1;
}
</style>