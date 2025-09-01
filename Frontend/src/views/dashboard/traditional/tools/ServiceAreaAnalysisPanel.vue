<template>
  <PanelWindow 
    :visible="analysisStore.toolPanel.visible && analysisStore.toolPanel.activeTool === 'servicearea'"
    :embed="true"
    :width="'100%'"
    :height="'100%'"
    class="service-area-analysis-panel"
  >
    <!-- 服务中心点选择 -->
    <div class="analysis-section">
      <div class="section-title">服务中心点选择</div>
      <SecondaryButton 
        text="选择中心点"
        @click="selectCenters"
        :active="isSelectingCenters"
      />
      <div v-if="centersInfo.length" class="feature-info">
        <div class="info-item" v-for="c in centersInfo" :key="c.id">
          <span class="info-label">{{ c.id }} 坐标/半径:</span>
          <span class="info-value">{{ c.coordinates }} / {{ c.radius }} 米</span>
        </div>
      </div>
    </div>

    <!-- 参数设置 -->
    <div class="analysis-section">
      <div class="section-title">服务半径参数</div>
      <div class="form-item">
        <label class="form-label">基础半径 (米，首个中心)</label>
        <TraditionalInputGroup v-model.number="baseRadius" type="number" :min="1" :step="50" placeholder="如: 400" />
      </div>
      <div class="form-item">
        <label class="form-label">递增步长 (米)</label>
        <TraditionalInputGroup v-model.number="radiusStep" type="number" :min="1" :step="50" placeholder="如: 100" />
      </div>
    </div>

    <!-- 分析操作 -->
    <div class="analysis-section">
      <SecondaryButton 
        text="执行服务区分析"
        @click="executeServiceArea"
      />

      <div v-if="serviceAreaResult" class="result-section">
        <div class="result-title">服务区分析结果</div>
        <div class="result-item">
          <span class="result-label">结果要素数:</span>
          <span class="result-value">{{ serviceAreaResult.features?.length || 0 }}</span>
        </div>
      </div>
    </div>
  </PanelWindow>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useAnalysisStore } from '@/stores/analysisStore'
import { useServiceAreaAnalysis } from '@/composables/useServiceAreaAnalysis'
import SecondaryButton from '@/components/UI/SecondaryButton.vue'
import TraditionalInputGroup from '@/components/UI/TraditionalInputGroup.vue'
import PanelWindow from '@/components/UI/PanelWindow.vue'

const analysisStore = useAnalysisStore()

const {
  centersInfo,
  serviceAreaResult,
  baseRadius,
  radiusStep,
  selectCenters,
  clearSelection,
  executeServiceArea
} = useServiceAreaAnalysis()

// 是否正在选择中心点
const isSelectingCenters = computed(() => analysisStore.toolPanel.activeTool === 'servicearea')

// 监听工具面板变化
// 进入服务区分析时提示选择，离开时清空
watch(() => analysisStore.toolPanel.activeTool, (tool) => {
  if (tool === 'servicearea') {
    selectCenters()
  } else {
    clearSelection()
  }
})
</script>

<style scoped>
.service-area-analysis-panel {
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

.feature-info {
  margin-top: 12px;
  padding: 16px;
  background: rgba(66, 165, 245, 0.08);
  border: 1px solid rgba(66, 165, 245, 0.2);
  border-radius: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.info-item:last-child { margin-bottom: 0; }
.info-label { font-size: 11px; color: var(--sub); font-weight: 500; }
.info-value { font-size: 11px; color: var(--accent); font-weight: 600; }

.form-item { display: flex; flex-direction: column; gap: 8px; }
.form-label { font-size: 12px; color: var(--sub); font-weight: 500; }

.result-section { margin-top: 16px; padding: 16px; background: rgba(40, 167, 69, 0.05); border: 1px solid rgba(40, 167, 69, 0.2); border-radius: 8px; }
.result-title { font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 12px; }
.result-item { display: flex; justify-content: space-between; margin-bottom: 8px; }
.result-item:last-child { margin-bottom: 0; }
.result-label { font-size: 13px; color: var(--sub); font-weight: 500; }
.result-value { font-size: 13px; color: var(--text); font-weight: 600; }
</style>


