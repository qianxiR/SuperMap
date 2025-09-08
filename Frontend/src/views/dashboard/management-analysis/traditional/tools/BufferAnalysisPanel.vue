<template>
  <PanelWindow 
    :visible="analysisStore.toolPanel.visible && analysisStore.toolPanel.activeTool === 'buffer'"
    :embed="true"
    :width="'100%'"
    :height="'100%'"
    class="buffer-analysis-panel"
  >
    <!-- 选择分析及绘制图层 -->
    <div class="analysis-section">
      <div class="section-title">选择分析及绘制图层</div>
      <div class="layer-selector">
        <DropdownSelect 
          :model-value="selectedAnalysislayerId"
          :options="layerOptionsWithNone"
          placeholder="请选择分析及绘制图层"
          @update:model-value="onlayerSelectionChange"
        />
      </div>
      
      <!-- 显示选中图层信息 -->
      <div v-if="selectedAnalysislayerInfo" class="layer-info">
        <div class="info-item">
          <span class="info-label">图层名称:</span>
          <span class="info-value">{{ selectedAnalysislayerInfo?.name }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">图层类型:</span>
          <span class="info-value">{{ selectedAnalysislayerInfo?.type }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">要素数量:</span>
          <span class="info-value">{{ selectedAnalysislayerInfo?.featureCount }} 个</span>
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
          :disabled="!selectedAnalysislayerId"
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
            正在对图层 "{{ selectedAnalysislayerInfo?.name }}" 进行缓冲区分析，请稍候
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
            @click="showlayerNameModal"
          />
          <SecondaryButton 
            text="导出为GeoJSON"
            @click="exportGeoJSON"
          />
        </div>
      </div>
    </div>
  </PanelWindow>
  
  <!-- 图层名称输入弹窗 -->
  <layerNameModal
    :visible="showlayerNameModalRef"
    title="保存缓冲区分析结果"
    placeholder="请输入图层名称"
    hint="图层名称将用于在图层管理器中识别此缓冲区分析结果"
    :default-name="defaultlayerName"
    @confirm="handlelayerNameConfirm"
    @close="handlelayerNameClose"
  />
</template>

<script setup lang="ts">
import { watch, computed, ref, onMounted, onUnmounted } from 'vue'
import { useAnalysisStore } from '@/stores/analysisStore'
import { useMapStore } from '@/stores/mapStore'
import { useBufferAnalysis } from '@/composables/useBufferAnalysis'
import { uselayermanager } from '@/composables/uselayermanager'
import { useLayerExport } from '@/composables/useLayerExport'
import { useAreaSelectionStore } from '@/stores/areaSelectionStore'
import PrimaryButton from '@/components/UI/PrimaryButton.vue'
import SecondaryButton from '@/components/UI/SecondaryButton.vue'
import TraditionalInputGroup from '@/components/UI/TraditionalInputGroup.vue'
import DropdownSelect from '@/components/UI/DropdownSelect.vue'
import PanelWindow from '@/components/UI/PanelWindow.vue'
import TipWindow from '@/components/UI/TipWindow.vue'
import layerNameModal from '@/components/UI/LayerNameModal.vue'

const analysisStore = useAnalysisStore()
const mapStore = useMapStore()
const areaSelectionStore = useAreaSelectionStore()

const {
  selectedAnalysislayerId,
  selectedAnalysislayerInfo,
  layerOptions,
  bufferSettings,
  bufferResults,
  currentResult,
  isAnalyzing,
  setSelectedAnalysislayer,
  updateBufferSettings,
  clearAllSelections,
  executeBufferAnalysis,
  removeBufferlayers,
  displayBufferResults,
  clearState,
  
} = useBufferAnalysis()

// 使用图层管理 hook
const { saveFeaturesAslayer } = uselayermanager()

// 使用图层导出 hook
const { exportFeaturesAsGeoJSON } = useLayerExport()

// 图层名称弹窗状态
const showlayerNameModalRef = ref<boolean>(false)
const defaultlayerName = ref<string>('')

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
const onlayerSelectionChange = (layerId: string) => {
  if (layerId) {
    setSelectedAnalysislayer(layerId)
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

// 导出为GeoJSON
const exportGeoJSON = async () => {
  if (!bufferResults.value || bufferResults.value.length === 0) {
    analysisStore.setAnalysisStatus('没有可导出的结果')
    return
  }
  
  try {
    const allFeatures: any[] = []
    
    bufferResults.value.forEach(result => {
      if (result.geometry.type === 'FeatureCollection') {
        // 如果是FeatureCollection类型，处理所有features
        const features = result.geometry.features || []
        console.log(`[Export] FeatureCollection包含 ${features.length} 个要素`)
        
        features.forEach((feature: any, index: number) => {
          allFeatures.push({
            type: 'Feature',
            geometry: feature.geometry,
            properties: {
              id: `${result.id}_${index}`,
              name: `${result.name}_${index + 1}`,
              distance: result.distance,
              unit: result.unit,
              sourcelayer: result.sourcelayerName,
              createdAt: result.createdAt,
              featureIndex: index
            }
          })
        })
      } else if (result.geometry.type === 'Feature') {
        // 如果是Feature类型，直接添加
        allFeatures.push({
          type: 'Feature',
          geometry: result.geometry.geometry,
          properties: {
            id: result.id,
            name: result.name,
            distance: result.distance,
            unit: result.unit,
            sourcelayer: result.sourcelayerName,
            createdAt: result.createdAt
          }
        })
      } else {
        // 直接是Geometry类型
        allFeatures.push({
          type: 'Feature',
          geometry: result.geometry,
          properties: {
            id: result.id,
            name: result.name,
            distance: result.distance,
            unit: result.unit,
            sourcelayer: result.sourcelayerName,
            createdAt: result.createdAt
          }
        })
      }
    })
    
    console.log(`[Export] 总共导出 ${allFeatures.length} 个要素`)
    
    await exportFeaturesAsGeoJSON(allFeatures, '缓冲区分析结果', {
      analysisType: 'buffer_analysis',
      sourceLayer: selectedAnalysislayerInfo.value?.name,
      description: '缓冲区分析生成的要素结果',
      parameters: {
        radius: bufferSettings.value.radius,
        semicircleLineSegment: bufferSettings.value.semicircleLineSegment,
        resultCount: bufferResults.value.length
      }
    })
    
    analysisStore.setAnalysisStatus('GeoJSON 文件已导出')
    
  } catch (error) {
    analysisStore.setAnalysisStatus(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

// 生成基于分析参数的图层名称
const generatelayerNameFromBuffer = () => {
  if (!selectedAnalysislayerInfo.value) {
    return `缓冲区分析`
  }

  const sourcelayerName = selectedAnalysislayerInfo.value.name
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
      return `缓冲区_${sourcelayerName}_${featureNamesStr}_${distanceText}`
    } else {
      // 如果要素数量较多，只显示数量和主要信息
      return `缓冲区_${sourcelayerName}_${selectedFeatures.value.length}个要素_${distanceText}`
    }
  }
  
  return `缓冲区_${sourcelayerName}_${distanceText}`
}

// 显示图层名称输入弹窗
const showlayerNameModal = () => {
  if (!bufferResults.value || bufferResults.value.length === 0) {
    analysisStore.setAnalysisStatus('没有可保存的缓冲区结果')
    return
  }
  
  defaultlayerName.value = generatelayerNameFromBuffer()
  showlayerNameModalRef.value = true
}

// 处理图层名称确认
const handlelayerNameConfirm = async (layerName: string) => {
  showlayerNameModalRef.value = false
  await saveBufferlayer(layerName)
}

// 处理图层名称弹窗关闭
const handlelayerNameClose = () => {
  showlayerNameModalRef.value = false
}

// 保存缓冲区结果为图层
const saveBufferlayer = async (customlayerName: string) => {
  if (!bufferResults.value || bufferResults.value.length === 0) {
    analysisStore.setAnalysisStatus('没有可保存的缓冲区结果')
    return
  }

  try {
    const name = customlayerName
    const bufferFeatures: any[] = []
    
    bufferResults.value.forEach(result => {
      // 处理不同的GeoJSON格式
      if (result.geometry.type === 'Feature') {
        // 如果是Feature类型，提取geometry部分
        const geometry = new window.ol.format.GeoJSON().readGeometry(result.geometry.geometry)
        if (geometry) {
          const feature = new window.ol.Feature({
            geometry: geometry,
            properties: {
              id: result.id,
              name: result.name,
              distance: result.distance,
              unit: result.unit,
              sourcelayer: result.sourcelayerName,
              createdAt: result.createdAt
            }
          })
          bufferFeatures.push(feature)
        }
      } else if (result.geometry.type === 'FeatureCollection') {
        // 如果是FeatureCollection类型，处理所有features
        const features = new window.ol.format.GeoJSON().readFeatures(result.geometry)
        console.log(`[Save] FeatureCollection包含 ${features.length} 个要素`)
        
        features.forEach((olFeature: any, index: number) => {
          const geometry = olFeature.getGeometry()
          if (geometry) {
            const feature = new window.ol.Feature({
              geometry: geometry,
              properties: {
                id: `${result.id}_${index}`,
                name: `${result.name}_${index + 1}`,
                distance: result.distance,
                unit: result.unit,
                sourcelayer: result.sourcelayerName,
                createdAt: result.createdAt,
                featureIndex: index
              }
            })
            bufferFeatures.push(feature)
          }
        })
      } else {
        // 直接是Geometry类型
        const geometry = new window.ol.format.GeoJSON().readGeometry(result.geometry)
        if (geometry) {
          const feature = new window.ol.Feature({
            geometry: geometry,
            properties: {
              id: result.id,
              name: result.name,
              distance: result.distance,
              unit: result.unit,
              sourcelayer: result.sourcelayerName,
              createdAt: result.createdAt
            }
          })
          bufferFeatures.push(feature)
        }
      }
    })
    
    console.log(`[Save] 总共保存 ${bufferFeatures.length} 个要素`)
    
    // 调用图层管理中的通用保存函数
    const success = await saveFeaturesAslayer(
      bufferFeatures,
      name,
      'buffer' // 作为缓冲区图层保存，使用红色样式
    )
    
    // 保存成功后自动清空所有缓冲区分析结果
    if (success) {
      // 移除地图上的临时缓冲区图层
      removeBufferlayers()
      
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
  analysisStore.setAnalysisStatus('请选择分析及绘制图层')
})

onUnmounted(() => {})

// 监听状态变化，自动保存（防抖）
watch([
  selectedAnalysislayerId,
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
      analysisStore.setAnalysisStatus('请选择分析及绘制图层')
    }
  } else if (prevTool === 'buffer' && tool !== 'buffer') {
    // 当从缓冲区分析切换到其他工具时，清理分析结果和地图显示
    clearBufferAnalysisState()
  }
}, { immediate: true })

// 监听图层选择变化
watch(selectedAnalysislayerId, (newlayerId) => {
  if (newlayerId) {
    setSelectedAnalysislayer(newlayerId)
  }
})



// 监听分析结果变化
watch(bufferResults, (results) => {
  // 结果变化时更新默认图层名称
  if (results && results.length > 0) {
    defaultlayerName.value = generatelayerNameFromBuffer()
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