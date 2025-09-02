<template>
  <PanelWindow 
    :visible="analysisStore.toolPanel.visible && analysisStore.toolPanel.activeTool === 'distance'"
    :embed="true"
    :width="'100%'"
    :height="'100%'"
    class="distance-analysis-panel"
  >
    <!-- 选择起点和终点 -->
    <div class="analysis-section">
      <div class="section-title">选择起点和终点</div>
      <div class="point-selection-container">
        <div class="point-selection-item">
          <SecondaryButton 
            text="选择起始点"
            @click="selectStartPoint"
            :active="isSelectingStartPoint"
          />
          
          <!-- 显示起始点信息 -->
          <div v-if="startPointInfo" class="feature-info">
            <div class="info-item">
              <span class="info-label">起始点:</span>
              <span class="info-value">{{ startPointInfo.name }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">坐标:</span>
              <span class="info-value">{{ startPointInfo.coordinates }}</span>
            </div>
          </div>
        </div>
        
        <div class="point-selection-item">
          <SecondaryButton 
            text="选择目标点"
            @click="selectEndPoint"
            :active="isSelectingEndPoint ?? undefined"
          />
          
          <!-- 显示目标点信息 -->
          <div v-if="endPointInfo" class="feature-info">
            <div class="info-item">
              <span class="info-label">目标点:</span>
              <span class="info-value">{{ endPointInfo.name }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">坐标:</span>
              <span class="info-value">{{ endPointInfo.coordinates }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>



    <!-- 分析操作 -->
    <div class="analysis-section">
      <div class="analysis-actions">
        <SecondaryButton 
          text="计算最短路径"
          @click="executePathAnalysis"
          :disabled="!canAnalyze"
        />
        
        <SecondaryButton 
          v-if="currentResult"
          text="导出路径"
          @click="exportGeoJSON"
          style="margin-top: 8px;"
        />

        <SecondaryButton 
          v-if="currentResult"
          text="保存图层"
          @click="handleSaveLayer"
          style="margin-top: 8px;"
        />

        <SecondaryButton 
          v-if="hasResults || startPointInfo || endPointInfo"
          text="清除状态"
          @click="handleClearState"
          style="margin-top: 8px;"
        />
      </div>
      
      <!-- 显示分析结果 -->
      <div v-if="currentResult" class="result-section">
        <div class="result-title">路径分析结果</div>
        <div class="result-item">
          <span class="result-label">路径长度:</span>
          <span class="result-value">{{ currentResult.distance }} 米</span>
        </div>
        <div class="result-item">
          <span class="result-label">预计时间:</span>
          <span class="result-value">{{ currentResult.duration }} 分钟</span>
        </div>
        <div class="result-item">
          <span class="result-label">路径类型:</span>
          <span class="result-value">{{ currentResult.pathType }}</span>
        </div>
      </div>
    </div>
  </PanelWindow>
</template>

<script setup lang="ts">
import { watch, computed, onMounted } from 'vue'
import { useAnalysisStore } from '@/stores/analysisStore'
import { usePathAnalysis } from '@/composables/usePathAnalysis'
import SecondaryButton from '@/components/UI/SecondaryButton.vue'
import DropdownSelect from '@/components/UI/DropdownSelect.vue'
import PanelWindow from '@/components/UI/PanelWindow.vue'

const analysisStore = useAnalysisStore()

const {
  startPointInfo,
  endPointInfo,
  analysisResults,
  layerName,
  canAnalyze,
  isSelectingStartPoint,
  isSelectingEndPoint,
  selectStartPoint,
  selectEndPoint,
  clearResults,
  executePathAnalysis,
  saveAnalysisLayer,
  exportGeoJSON
} = usePathAnalysis()

// 计算属性
const hasResults = computed(() => analysisResults.value.length > 0)
const currentResult = computed(() => analysisResults.value[0] || null)

// 组件挂载时初始化
onMounted(async () => {
  // 状态管理已移除，无需初始化
})

// 监听工具面板变化
watch(() => analysisStore.toolPanel.activeTool, async (tool) => {
  if (tool === 'distance') {
    // 进入最短路径分析模式
    // 状态管理已移除，直接显示提示信息
    analysisStore.setAnalysisStatus('请点击选择起始点和目标点进行最短路径分析')
  } else {
    // 离开最短路径分析模式
    // 状态管理已移除，无需特殊处理
  }
})

// 保存图层
const handleSaveLayer = async () => {
  const success = await saveAnalysisLayer()
  if (success) {
    analysisStore.setAnalysisStatus('图层保存成功')
  } else {
    analysisStore.setAnalysisStatus('图层保存失败')
  }
}

// 清除状态
const handleClearState = () => {
  clearResults()
  analysisStore.setAnalysisStatus('状态已清除，可以重新开始分析')
}
</script>

<style scoped>
.distance-analysis-panel {
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

.point-selection-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.point-selection-item {
  display: flex;
  flex-direction: column;
  gap: 12px;
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
  animation: fadeIn 0.3s ease-out;
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

.analysis-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.obstacle-controls {
  display: flex;
  gap: 8px;
}

.form-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  font-size: 13px;
  font-weight: 500;
}

.form-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-light);
}

.form-input::-webkit-inner-spin-button,
.form-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.form-input[type="number"] {
  -moz-appearance: textfield; /* Firefox */
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
