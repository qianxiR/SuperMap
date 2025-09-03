<template>
  <PanelWindow 
    :visible="analysisStore.toolPanel.visible && analysisStore.toolPanel.activeTool === 'overlay'"
    :embed="true"
    :width="'100%'"
    :height="'100%'"
    class="overlay-analysis-panel"
  >
    <!-- 叠加操作设置 -->
    <div class="analysis-section">
      <div class="section-title">叠加操作设置</div>
      
      <!-- 第一个图层选择 -->
      <div class="form-item">
        <label class="form-label">第一个图层</label>
        <DropdownSelect 
          v-model="selectedLayer1" 
          placeholder="请选择第一个图层"
          :options="availableLayerOptions"
        />
      </div>
      
      <!-- 第二个图层选择 -->
      <div class="form-item">
        <label class="form-label">第二个图层</label>
        <DropdownSelect 
          v-model="selectedLayer2" 
          placeholder="请选择第二个图层"
          :options="availableLayerOptions"
        />
      </div>
      
      <!-- 操作类型选择 -->
      <div class="form-item">
        <label class="form-label">叠加操作类型</label>
        <DropdownSelect 
          v-model="selectedOperation"
          :options="operationOptions"
          placeholder="请选择叠加操作类型"
        />
      </div>
    </div>

    <!-- 分析操作 -->
    <div class="analysis-section">
      <div class="analysis-actions">
        <SecondaryButton 
          text="执行叠置分析"
          @click="executeOverlayAnalysis"
          :disabled="!canAnalyze || isAnalyzing"
          :loading="isAnalyzing"
        />
        
        <SecondaryButton 
          v-if="overlayResult"
          text="导出结果"
          @click="exportResult"
          style="margin-top: 8px;"
        />

        <SecondaryButton 
          v-if="overlayResult"
          text="保存为图层"
          @click="handleSaveLayer"
          style="margin-top: 8px;"
        />

        <SecondaryButton 
          v-if="overlayResult"
          text="清除结果"
          @click="clearResult"
          variant="outline"
          style="margin-top: 8px;"
        />

        <SecondaryButton 
          text="清除所有选择"
          @click="clearAll"
          variant="outline"
          style="margin-top: 8px;"
        />
      </div>
      
      <!-- 显示分析结果 -->
      <div v-if="overlayResult" class="result-section">
        <div class="result-title">叠置分析结果</div>
        <div class="result-item">
          <span class="result-label">操作类型:</span>
          <span class="result-value">{{ getOperationLabel(overlayResult.operation) }}</span>
        </div>
        <div class="result-item">
          <span class="result-label">图层1:</span>
          <span class="result-value">{{ overlayResult.layer1 }}</span>
        </div>
        <div class="result-item">
          <span class="result-label">图层2:</span>
          <span class="result-value">{{ overlayResult.layer2 }}</span>
        </div>
        <div class="result-item">
          <span class="result-label">结果要素数:</span>
          <span class="result-value">{{ overlayResult.result.features?.length || 0 }}</span>
        </div>
        <div class="result-item">
          <span class="result-label">分析时间:</span>
          <span class="result-value">{{ formatTimestamp(overlayResult.timestamp) }}</span>
        </div>
      </div>
    </div>
  </PanelWindow>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useAnalysisStore } from '@/stores/analysisStore'
import { useOverlayAnalysis } from '@/composables/useOverlayAnalysis'
import SecondaryButton from '@/components/UI/SecondaryButton.vue'
import DropdownSelect from '@/components/UI/DropdownSelect.vue'
import PanelWindow from '@/components/UI/PanelWindow.vue'

const analysisStore = useAnalysisStore()

const {
  overlayOperations,
  selectedLayer1,
  selectedLayer2,
  selectedOperation,
  overlayResult,
  isAnalyzing,
  availableLayers,
  canAnalyze,
  executeOverlayAnalysis,
  clearResult,
  exportResult,
  saveAnalysisLayer,
  clearAll
} = useOverlayAnalysis()

// 可用图层选项 - 直接从地图图层中选择
const availableLayerOptions = computed(() => {
  return availableLayers.value.map(layer => ({
    value: layer.id,
    label: layer.name
  }))
})

// 操作类型选项
const operationOptions = computed(() => {
  return overlayOperations.map(operation => ({
    value: operation.type,
    label: operation.label
  }))
})

// 获取操作标签
function getOperationLabel(operationType: string): string {
  const operation = overlayOperations.find(op => op.type === operationType)
  return operation ? operation.label : operationType
}

// 格式化时间戳
function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString('zh-CN')
}

// 监听工具面板变化
watch(() => analysisStore.toolPanel.activeTool, (tool) => {
  if (tool === 'overlay') {
    analysisStore.setAnalysisStatus('请选择要分析的图层和操作类型')
  } else {
    clearResult()
  }
})

// 保存为图层
const handleSaveLayer = async () => {
  const success = await saveAnalysisLayer()
  if (success) {
    analysisStore.setAnalysisStatus('图层保存成功')
  } else {
    analysisStore.setAnalysisStatus('图层保存失败')
  }
}
</script>

<style scoped>
.overlay-analysis-panel {
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

.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.form-item:last-child {
  margin-bottom: 0;
}

.form-label {
  font-size: 12px;
  color: var(--sub);
  font-weight: 500;
}

.layer-info {
  margin-top: 4px;
  padding: 8px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
}

.info-text {
  font-size: 11px;
  color: var(--accent);
  font-weight: 500;
}

.analysis-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.result-section {
  margin-top: 16px;
  padding: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.result-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 12px;
}

.result-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.result-item:last-child {
  margin-bottom: 0;
}

.result-label {
  font-size: 13px;
  color: var(--sub);
  font-weight: 500;
}

.result-value {
  font-size: 13px;
  color: var(--text);
  font-weight: 600;
}
</style>


