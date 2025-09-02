<template>
  <PanelWindow 
    :visible="analysisStore.toolPanel.visible && analysisStore.toolPanel.activeTool === 'thiessen'"
    :embed="true"
    :width="'100%'"
    :height="'100%'"
    class="thiessen-analysis-panel"
  >
    <!--  点集选择（泰森） -->
    <div class="analysis-section">
      <div class="section-title"> 点集（生成泰森多边形）</div>
      <SecondaryButton 
        text="选择图层"
        @click="selectPoints"
        :active="isSelectingPoints"
      />
      <div v-if="pointsInfo.length" class="feature-info">
        <div class="info-item">
          <span class="info-label">点数量:</span>
          <span class="info-value">{{ pointsInfo.length }}</span>
        </div>
      </div>
    </div>

    <!-- 泰森参数 -->
    <div class="analysis-section">
      <div class="section-title">泰森参数</div>
      <div class="form-item">
        <label class="form-label">裁剪范围（minX,minY,maxX,maxY，可选）</label>
        <TraditionalInputGroup v-model="extentText" placeholder="如: 0,0,100,100" />
      </div>
    </div>

    <!-- 分析操作 -->
    <div class="analysis-section">
      <SecondaryButton 
        text="生成泰森多边形"
        @click="executeThiessen"
      />
      
      <!-- 显示分析结果 -->
      <div v-if="thiessenResult" class="result-section">
        <div class="result-title">泰森多边形结果</div>
        <div class="result-item">
          <span class="result-label">多边形数量:</span>
          <span class="result-value">{{ thiessenResult.features?.length || 0 }}</span>
        </div>
      </div>
    </div>
  </PanelWindow>
</template>

<script setup lang="ts">
import { watch, computed, ref } from 'vue'
import { useAnalysisStore } from '@/stores/analysisStore'
import { useThiessenAnalysis } from '@/composables/useThiessenAnalysis'
import SecondaryButton from '@/components/UI/SecondaryButton.vue'
import TraditionalInputGroup from '@/components/UI/TraditionalInputGroup.vue'
import PanelWindow from '@/components/UI/PanelWindow.vue'

const analysisStore = useAnalysisStore()

const extentText = ref('')

const {
  pointsInfo,
  thiessenResult,
  selectPoints,
  clearSelection,
  executeThiessen,
  setExtentFromText
} = useThiessenAnalysis()

// 是否正在选择点
const isSelectingPoints = computed(() => analysisStore.toolPanel.activeTool === 'thiessen')

watch(extentText, (text) => setExtentFromText(text))

// 监听工具面板变化
watch(() => analysisStore.toolPanel.activeTool, (tool) => {
  if (tool === 'thiessen') {
    selectPoints()
  } else {
    clearSelection()
  }
})
</script>

<style scoped>
.thiessen-analysis-panel {
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
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
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
  color: var(--accent);
  font-weight: 600;
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

