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
            :disabled="isAnalyzing"
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
            :disabled="isAnalyzing"
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

    <!-- 分析配置选项 -->
    <div class="analysis-section">
      <div class="section-title">分析配置</div>
      
      <!-- 障碍物选择 -->
      <div class="form-item">
        <label class="form-label">障碍物图层（可选）</label>
        <DropdownSelect
          :options="obstaclelayerOptions"
          v-model="selectedObstaclelayer"
          placeholder="选择障碍物图层"
          :disabled="isAnalyzing"
        />
        <div v-if="selectedObstaclelayer" class="obstacle-info">
          <span class="info-text">已选择障碍物图层: {{ getObstaclelayerName() }}</span>
        </div>
      </div>
      
      <!-- 分析参数配置 -->
      <div class="analysis-params">
        <div class="param-row">
          <div class="form-item">
            <label class="form-label">距离单位</label>
            <DropdownSelect
              :options="unitOptions"
              v-model="analysisOptions.units"
              :disabled="isAnalyzing"
            />
          </div>
          
        </div>
      </div>
    </div>

    <!-- 分析操作 -->
    <div class="analysis-section">
      <div class="analysis-actions" :class="{ analyzing: isAnalyzing }">
        <SecondaryButton 
          :text="isAnalyzing ? '计算中...' : '计算最短路径'"
          @click="handleExecuteAnalysis"
          :disabled="!canAnalyze || isAnalyzing"
        />
        
        <SecondaryButton 
          v-if="currentResult"
          text="导出为json"
          @click="exportGeoJSON"
          style="margin-top: 8px;"
        />

        <SecondaryButton 
          v-if="currentResult"
          text="保存为图层"
          @click="showlayerNameModal"
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
  
  <!-- 图层名称输入弹窗 -->
  <layerNameModal
    :visible="showlayerNameModalRef"
    title="保存最短路径分析结果"
    placeholder="请输入图层名称"
    hint="图层名称将用于在图层管理器中识别此最短路径分析结果"
    :default-name="defaultlayerName"
    @confirm="handlelayerNameConfirm"
    @close="handlelayerNameClose"
  />
</template>

<script setup lang="ts">
import { watch, computed, onMounted, onUnmounted, ref } from 'vue'
import { useAnalysisStore } from '@/stores/analysisStore'
import { useMapStore } from '@/stores/mapStore'
import { useShortestPathAnalysis } from '@/composables/useShortestPathAnalysis'
import SecondaryButton from '@/components/UI/SecondaryButton.vue'
import DropdownSelect from '@/components/UI/DropdownSelect.vue'
import layerNameModal from '@/components/UI/layerNameModal.vue'
import PanelWindow from '@/components/UI/PanelWindow.vue'

const analysisStore = useAnalysisStore()
const mapStore = useMapStore()

const {
  startPointInfo,
  endPointInfo,
  analysisResults,
  canAnalyze,
  isSelectingStartPoint,
  isSelectingEndPoint,
  analysisOptions,
  selectStartPoint,
  selectEndPoint,
  clearResults,
  executePathAnalysis,
  saveAnalysislayer,
  exportGeoJSON,
  setObstaclelayer,
  updateAnalysisOptions
} = useShortestPathAnalysis()

// 图层名称弹窗状态
const showlayerNameModalRef = ref<boolean>(false)
const defaultlayerName = ref<string>('')

// 计算属性
const hasResults = computed(() => analysisResults.value.length > 0)
const currentResult = computed(() => analysisResults.value[0] || null)

// 分析状态
const isAnalyzing = ref(false)

// 障碍物图层选项（参考缓冲区分析的方法）
const obstaclelayerOptions = computed(() => {
  const options = [{ value: '', label: '无障碍物' }]
  
  // 获取可见的矢量图层
  const vectorlayers = mapStore.vectorlayers.filter(layer => 
    layer.layer && 
    layer.layer.getVisible() && 
    layer.type === 'vector'
  )
  
  vectorlayers.forEach(layer => {
    const features = layer.layer.getSource()?.getFeatures() || []
    const featureCount = features.length
    
    // 分析及绘制图层中要素的几何类型
    const geometryTypes = new Set<string>()
    features.forEach((feature: any) => {
      const geometry = feature.getGeometry()
      if (geometry) {
        geometryTypes.add(geometry.getType())
      }
    })
    
    const geometryTypeStr = Array.from(geometryTypes).join(', ') || '未知'
    
    options.push({
      value: layer.id,
      label: `${layer.name} (${featureCount}个要素, ${geometryTypeStr})`
    })
  })
  
  return options
})

// 选中的障碍物图层
const selectedObstaclelayer = ref<string>('')

// 距离单位选项
const unitOptions = [
  { value: 'kilometers', label: '千米' },
  { value: 'miles', label: '英里' },
  { value: 'degrees', label: '度' },
  { value: 'radians', label: '弧度' }
]

// 监听障碍物图层选择变化
watch(selectedObstaclelayer, (newlayerId) => {
  console.log('=== 障碍物图层选择变化 ===')
  console.log('新的layerId:', newlayerId)
  console.log('当前可用图层数量:', mapStore.vectorlayers.length)
  console.log('可用图层列表:', mapStore.vectorlayers.map(l => ({ id: l.id, name: l.name, type: l.type })))
  
  if (newlayerId === '') {
    console.log('清除障碍物图层')
    setObstaclelayer(null)
  } else {
    console.log('设置障碍物图层:', newlayerId)
    setObstaclelayer(newlayerId)
  }
})

const getObstaclelayerName = () => {
  if (!selectedObstaclelayer.value) return ''
  const layer = mapStore.vectorlayers.find(l => l.id === selectedObstaclelayer.value)
  return layer ? layer.name : '未知图层'
}

// 直接执行分析函数
const handleExecuteAnalysis = async () => {
  if (isAnalyzing.value) return
  
  isAnalyzing.value = true
  try {
    await executePathAnalysis()
  } finally {
    isAnalyzing.value = false
  }
}

// 组件挂载时初始化
onMounted(async () => {
  analysisStore.setAnalysisStatus('请点击选择起始点和目标点进行最短路径分析')
})

// 切换离开最短路径工具时，清除地图图层与状态
watch(() => analysisStore.toolPanel.activeTool, async (tool) => {
  if (tool !== 'distance') {
    clearResults()
    analysisStore.setAnalysisStatus('已退出最短路径分析，已清除图层与状态')
  }
})

// 面板关闭时，清除地图图层与状态
watch(() => analysisStore.toolPanel.visible.valueOf?.() ?? analysisStore.toolPanel.visible, (newVisible: any, oldVisible: any) => {
  try {
    const wasVisible = Boolean(oldVisible)
    const nowVisible = Boolean(newVisible)
    if (wasVisible && !nowVisible && (analysisStore.toolPanel.activeTool.valueOf?.() === 'distance' || analysisStore.toolPanel.activeTool === 'distance')) {
      clearResults()
      analysisStore.setAnalysisStatus('最短路径面板已关闭，已清除图层与状态')
    }
  } catch (_) {
    clearResults()
  }
})

// 显示图层名称输入弹窗
const showlayerNameModal = () => {
  if (!currentResult.value) {
    analysisStore.setAnalysisStatus('没有可保存的路径分析结果')
    return
  }
  
  defaultlayerName.value = `最短路径分析`
  showlayerNameModalRef.value = true
}

// 处理图层名称确认
const handlelayerNameConfirm = async (layerName: string) => {
  showlayerNameModalRef.value = false
  await handleSavelayer(layerName)
}

// 处理图层名称弹窗关闭
const handlelayerNameClose = () => {
  showlayerNameModalRef.value = false
}

// 保存为图层
const handleSavelayer = async (customlayerName?: string) => {
  const success = await saveAnalysislayer(customlayerName)
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

onUnmounted(() => {
  clearResults()
})
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

/* 加载状态样式 */
.analyzing {
  opacity: 0.7;
  pointer-events: none;
}

.analyzing .secondary-button {
  background: var(--accent-light);
  color: var(--accent);
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
  appearance: none;
  margin: 0;
}

.analysis-params {
  margin-top: 16px;
}

.param-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.obstacle-info {
  margin-top: 8px;
  padding: 8px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.info-text {
  font-size: 11px;
  color: var(--text);
  font-weight: 500;
}

.form-input[type="number"] {
  -moz-appearance: textfield; /* Firefox */
  appearance: textfield;
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
