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
          v-model="selectedAnalysisLayerId"
          :options="layerOptionsWithNone"
          placeholder="请选择分析图层"
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
      </div>
    </div>
    
    <!-- 缓冲区参数 -->
    <div class="analysis-section">
      <div class="section-title">缓冲距离参数</div>
      <div class="form-item">
        <label class="form-label">距离 (米)</label>
        <TraditionalInputGroup
          v-model.number="bufferDistance" 
          type="number" 
          :min="1" 
          :step="10"
          placeholder="请输入缓冲距离"
          @input="onDistanceChange"
        />
      </div>
    </div>

    <!-- 分析操作 -->
    <div class="analysis-section">
      <SecondaryButton 
        text="执行缓冲区分析"
        @click="executeBufferAnalysis"
      />
    </div>
  </PanelWindow>
</template>

<script setup lang="ts">
import { watch, computed, ref } from 'vue'
import { useAnalysisStore } from '@/stores/analysisStore'
import { useMapStore } from '@/stores/mapStore'
import { useBufferAnalysis } from '@/composables/useBufferAnalysis'
import SecondaryButton from '@/components/UI/SecondaryButton.vue'
import TraditionalInputGroup from '@/components/UI/TraditionalInputGroup.vue'
import DropdownSelect from '@/components/UI/DropdownSelect.vue'
import PanelWindow from '@/components/UI/PanelWindow.vue'

const analysisStore = useAnalysisStore()

const {
  bufferDistance,
  selectedAnalysisLayerId,
  selectedAnalysisLayerInfo,
  layerOptions,
  setSelectedAnalysisLayer,
  clearAllSelections,
  executeBufferAnalysis
} = useBufferAnalysis()

// 包含"无"选项的图层选项
const layerOptionsWithNone = computed(() => {
  return [
    { value: '', label: '无', disabled: false },
    ...layerOptions.value
  ]
})

// 距离变化时的处理
const onDistanceChange = () => {
  if (bufferDistance.value <= 0) {
    analysisStore.setAnalysisStatus('缓冲距离必须大于0')
  } else {
    analysisStore.setAnalysisStatus(`缓冲距离: ${bufferDistance.value}米`)
  }
}

// 监听工具面板变化
watch(() => analysisStore.toolPanel.activeTool, (tool) => {
  if (tool === 'buffer') {
    // 当进入缓冲区分析时，初始化状态
    analysisStore.setAnalysisStatus('请选择分析图层')
  } else {
    // 当离开缓冲区分析时，清除选中状态
    clearAllSelections()
  }
}, { immediate: true })

// 监听图层选择变化
watch(selectedAnalysisLayerId, (newLayerId) => {
  if (newLayerId) {
    setSelectedAnalysisLayer(newLayerId)
  }
})
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
</style>