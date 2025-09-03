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
          text="清除显示"
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
        <div class="form-item">
          <label class="form-label">图层名称</label>
          <TraditionalInputGroup
            v-model="layerName"
            placeholder="输入图层名称"
          />
        </div>
        <div class="button-group">
          <PrimaryButton 
            text="保存为图层"
            @click="saveBufferLayer(layerName)"
          />
          <SecondaryButton 
            text="导出 GeoJSON"
            @click="exportGeoJSON"
          />
        </div>
      </div>
    </div>
  </PanelWindow>
</template>

<script setup lang="ts">
import { watch, computed, ref, onMounted, onUnmounted } from 'vue'
import { useAnalysisStore } from '@/stores/analysisStore'
import { useMapStore } from '@/stores/mapStore'
import { useBufferAnalysis } from '@/composables/useBufferAnalysis'
import { useLayerManager } from '@/composables/useLayerManager'
import PrimaryButton from '@/components/UI/PrimaryButton.vue'
import SecondaryButton from '@/components/UI/SecondaryButton.vue'
import TraditionalInputGroup from '@/components/UI/TraditionalInputGroup.vue'
import DropdownSelect from '@/components/UI/DropdownSelect.vue'
import PanelWindow from '@/components/UI/PanelWindow.vue'
import TipWindow from '@/components/UI/TipWindow.vue'

const analysisStore = useAnalysisStore()
const mapStore = useMapStore()

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
  saveState,
  restoreState,
  clearState
} = useBufferAnalysis()

// 使用图层管理 hook
const { saveFeaturesAsLayer } = useLayerManager()

// 图层名称
const layerName = ref<string>('')

// 包含"无"选项的图层选项
const layerOptionsWithNone = computed(() => {
  return [
    { value: '', label: '无', disabled: false },
    ...layerOptions.value
  ]
})

// 图层选择变化处理
const onLayerSelectionChange = (layerId: string) => {
  console.log('图层选择变化:', layerId)
  if (layerId) {
    setSelectedAnalysisLayer(layerId)
    // 自动保存状态
    saveToolState()
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

// 清除显示
const clearResults = () => {
  // 使用composable中的清理方法
  clearState()
  layerName.value = ''
  analysisStore.setAnalysisStatus('已清除缓冲区分析结果')
}

// 导出 GeoJSON
const exportGeoJSON = () => {
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
    a.download = `buffer_analysis_${new Date().toISOString().slice(0, 10)}.geojson`
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
  
  return `缓冲区_${sourceLayerName}_${distanceText}`
}

// 保存缓冲区结果为图层
const saveBufferLayer = async (customLayerName?: string) => {
  if (!bufferResults.value || bufferResults.value.length === 0) {
    analysisStore.setAnalysisStatus('没有可保存的缓冲区结果')
    return
  }

  try {
    const name = customLayerName || generateLayerNameFromBuffer()
    
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
        console.warn(`无法解析几何体: ${result.id}`)
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
    
    if (success) {
      // 保存成功后，移除原来的临时缓冲区图层
      removeBufferLayers()
      analysisStore.setAnalysisStatus(`缓冲区图层 "${name}" 已保存成功，临时图层已移除`)
    } else {
      analysisStore.setAnalysisStatus('保存缓冲区图层失败')
    }
    
  } catch (error) {
    console.error('保存缓冲区图层错误:', error)
    analysisStore.setAnalysisStatus(`保存失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

// 工具状态管理
const toolId = 'buffer'
let isRestoring = false // 防止在恢复状态时触发保存

// 清理缓冲区分析状态（工具切换时调用）
const clearBufferAnalysisState = () => {
  console.log('清理缓冲区分析状态')
  
  // 使用 useBufferAnalysis 中的清理方法
  clearState()
  
  // 清理本地状态
  layerName.value = ''
  
  analysisStore.setAnalysisStatus('缓冲区分析状态已清理')
}

// 保存工具状态（防抖）
let saveTimer: any = null
const saveToolStateDebounced = () => {
  if (saveTimer) {
    clearTimeout(saveTimer)
  }
  saveTimer = setTimeout(() => {
    saveToolState()
  }, 300)
}

// 保存工具状态
const saveToolState = () => {
  if (isRestoring) {
    console.log('正在恢复状态，跳过保存')
    return
  }
  
  console.log('保存缓冲区分析工具状态')
  // 直接调用composable中的保存方法
  saveState(layerName.value)
}

// 恢复工具状态
const restoreToolState = async () => {
  try {
    isRestoring = true // 设置恢复标志
    console.log('开始恢复缓冲区分析工具状态...')
    const savedLayerName = await restoreState()
    console.log('恢复缓冲区分析工具状态完成:', {
      selectedAnalysisLayerId: selectedAnalysisLayerId.value,
      bufferSettings: bufferSettings.value,
      bufferResults: bufferResults.value,
      layerName: savedLayerName
    })
    
    // 恢复图层名称
    if (savedLayerName) {
      layerName.value = savedLayerName
    }
    
    // 如果有分析结果，不自动显示在地图上，只提示用户
    if (bufferResults.value && bufferResults.value.length > 0) {
      analysisStore.setAnalysisStatus(`缓冲区分析结果已恢复（${bufferResults.value.length}个结果），点击"执行分析"重新显示`)
    } else {
      analysisStore.setAnalysisStatus('请选择分析图层')
    }
  } catch (error) {
    console.error('恢复缓冲区分析工具状态失败:', error)
    analysisStore.setAnalysisStatus('请选择分析图层')
  } finally {
    // 延迟重置恢复标志，确保状态恢复完成后再允许保存
    setTimeout(() => {
      isRestoring = false
      console.log('状态恢复完成，允许保存')
    }, 100)
  }
}

// 组件生命周期管理
onMounted(() => {
  console.log('缓冲区分析工具组件挂载，恢复状态')
  // 恢复状态（仅一次）
  restoreToolState()
})

onUnmounted(() => {
  console.log('缓冲区分析工具组件卸载，清理定时器')
  // 清理定时器，状态已经在变化时实时保存了
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
})

// 监听状态变化，自动保存（防抖）
watch([
  selectedAnalysisLayerId,
  () => bufferSettings.value.radius,
  () => bufferSettings.value.semicircleLineSegment,
  // 移除对 bufferResults 的监听，避免结果变化时自动保存
  layerName
], () => {
  console.log('缓冲区分析配置变化，自动保存')
  saveToolStateDebounced()
})

// 监听工具面板变化
watch(() => analysisStore.toolPanel?.activeTool, (tool, prevTool) => {
  if (tool === 'buffer' && prevTool !== 'buffer') {
    // 当进入缓冲区分析时，只更新状态提示，不重复恢复状态
    console.log('切换到缓冲区分析工具')
    if (bufferResults.value && bufferResults.value.length > 0) {
      analysisStore.setAnalysisStatus(`缓冲区分析结果已加载（${bufferResults.value.length}个结果），点击"执行分析"重新显示`)
    } else {
      analysisStore.setAnalysisStatus('请选择分析图层')
    }
  } else if (prevTool === 'buffer' && tool !== 'buffer') {
    // 当从缓冲区分析切换到其他工具时，清理分析结果和地图显示
    console.log('从缓冲区分析切换到其他工具，清理状态')
    clearBufferAnalysisState()
  }
}, { immediate: true })

// 监听图层选择变化
watch(selectedAnalysisLayerId, (newLayerId) => {
  if (newLayerId) {
    setSelectedAnalysisLayer(newLayerId)
  }
})



// 监听分析结果变化，只在有结果时保存
watch(bufferResults, (results) => {
  if (results && results.length > 0 && !layerName.value) {
    layerName.value = generateLayerNameFromBuffer()
  }
  
  // 结果变化时手动保存状态（避免频繁保存）
  if (results && results.length > 0) {
    console.log('分析结果变化，保存状态')
    saveToolState()
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