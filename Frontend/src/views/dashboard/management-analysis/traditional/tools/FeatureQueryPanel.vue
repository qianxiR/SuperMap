<template>
  <PanelWindow 
    :visible="analysisStore.toolPanel.visible && analysisStore.toolPanel.activeTool === 'attribute-selection'"
    :embed="true"
    :width="'100%'"
    :height="'100%'"
    class="feature-query-panel"
    component-id="traditional-query-panel"
  >
    <!-- 图层选择 -->
    <div class="analysis-section">
      <div class="section-title">选择查询数据源</div>
      <DropdownSelect 
        v-model="selectedlayerId"
        :options="layerOptions"
        placeholder="无"
      />
    </div>
    
    <!-- 数据字段结构 -->
    <div class="analysis-section no-theme-flicker" v-if="layerFields.length > 0">
      <div class="section-title">
        数据字段结构 ({{ layerFields.length }}个字段)
      </div>
      <div class="fields-info">
        <div class="fields-header">
          <span class="field-name">字段名称</span>
          <span class="field-type">类型</span>
          <span class="field-sample">示例值</span>
          <span class="field-desc">描述</span>
        </div>
        <div class="fields-list">
          <div 
            v-for="field in layerFields" 
            :key="field.name"
            class="field-item"
            :class="{ active: selectedFieldName === field.name }"
            @click="selectFieldName(field.name)"
          >
            <span class="field-name">{{ field.name }}</span>
            <span class="field-type" :class="getFieldTypeClass(field.type)">{{ field.type }}</span>
            <span class="field-sample" :title="field.sampleValue">{{ field.sampleValue }}</span>
            <span class="field-desc">{{ field.description }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 查询条件设置 -->
    <div class="analysis-section">
      <div class="section-title">
        查询条件设置
        <span class="condition-hint"> 字段选择 | 比较操作符 | 值输入</span>
      </div>
      
      <!-- 查询条件 -->
      <div class="query-conditions">
        <QueryConditionRow
          :condition="queryConfig.condition || createDefaultCondition()"
          :fields="layerFields"
          :disabled="false"
          @update="updateCondition"
        />
      </div>
      

    </div>

    <!-- 查询结果 -->
    <div class="analysis-section no-theme-flicker" v-if="queryResults.length > 0">
      <div class="section-title">
        查询结果 ({{ queryResults.length }}个要素)
      </div>
      
      <div class="layer-list">
        <div 
          v-for="(feature, index) in queryResults" 
          :key="feature.getId?.() || index"
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
    </div>

    <!-- 要素信息 -->
    <div class="analysis-section" v-if="selectedFeatureIndex !== -1 && queryResults[selectedFeatureIndex]">
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

    <!-- 查询操作 -->
    <div class="analysis-section">
      <div class="section-title">查询操作</div>
      <div class="button-column">
        <SecondaryButton 
          text="执行查询"
          variant="secondary"
          @click="executeQuery"
          :loading="isQuerying"
        />
        
        <SecondaryButton 
          v-if="queryResults.length > 0"
          text="另存为图层"
          @click="showLayerNameModal"
        />
        <SecondaryButton 
          v-if="queryResults.length > 0"
          text="导出为GeoJSON"
          @click="exportQueryResultsAsGeoJSON"
        />
        <SecondaryButton 
          v-if="queryResults.length > 0"
          text="反选当前要素"
          @click="invertSelectedlayer"
        />
        <SecondaryButton 
          v-if="queryResults.length > 0"
          text="清空查询结果"
          variant="danger"
          @click="clearQueryResults"
        />
      </div>
    </div>
    
    <TipWindow v-if="selectedlayerId" :text="getTipText()" />
  </PanelWindow>
  
  <!-- 图层名称输入弹窗 -->
  <LayerNameModal
    :visible="showLayerNameModalRef"
    title="保存属性查询结果"
    placeholder="请输入图层名称"
    hint="图层名称将用于在图层管理器中识别此属性查询结果"
    :default-name="defaultlayerName"
    @confirm="handlelayerNameConfirm"
    @close="handlelayerNameClose"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch, ref } from 'vue'
import { useAnalysisStore } from '@/stores/analysisStore'
import { useFeatureQueryStore } from '@/stores/featureQueryStore'
import { useMapStore } from '@/stores/mapStore'
import { useModeStateStore } from '@/stores/modeStateStore'
import { uselayermanager } from '@/composables/useLayerManager'
import { useLayerExport } from '@/composables/useLayerExport'
import { getFeatureCompleteInfo, getFeatureGeometryDescription } from '@/utils/featureUtils'
import DropdownSelect from '@/components/UI/DropdownSelect.vue'
import SecondaryButton from '@/components/UI/SecondaryButton.vue'
import PanelWindow from '@/components/UI/PanelWindow.vue'
import TipWindow from '@/components/UI/TipWindow.vue'
import QueryConditionRow from '@/components/UI/QueryConditionRow.vue'
import LayerNameModal from '@/components/UI/LayerNameModal.vue'
import type { QueryCondition } from '@/types/query'
 

const analysisStore = useAnalysisStore()
const mapStore = useMapStore()
const featureQuery = useFeatureQueryStore()
const modeStateStore = useModeStateStore()

// 使用图层管理 hook
const { saveFeaturesAslayer } = uselayermanager()

// 使用图层导出 hook
const { exportFeaturesAsGeoJSON } = useLayerExport()

// 生成基于SQL语句的图层名称
const generatelayerNameFromQuery = () => {
  const condition = queryConfig.value.condition
  if (!condition || !condition.fieldName || !condition.value) {
    return `属性查询`
  }

  // 获取图层名称
  const layerName = getSelectedlayerName()
  
  // 获取操作符标签
  const operatorLabel = getOperatorLabel(condition.operator)
  
  // 拼接图层名称：图层名称 字段 条件 值
  const sqllayerName = `${layerName} ${condition.fieldName} ${operatorLabel} ${condition.value}`
  
  return sqllayerName
}

// 图层名称弹窗状态
const showLayerNameModalRef = ref<boolean>(false)
const defaultlayerName = ref<string>('')

// 显示图层名称输入弹窗
const showLayerNameModal = () => {
  if (queryResults.value.length === 0) {
    return
  }
  
  defaultlayerName.value = generatelayerNameFromQuery()
  showLayerNameModalRef.value = true
}

// 处理图层名称确认
const handlelayerNameConfirm = async (layerName: string) => {
  showLayerNameModalRef.value = false
  await saveQueryResultsAslayer(layerName)
}

// 处理图层名称弹窗关闭
const handlelayerNameClose = () => {
  showLayerNameModalRef.value = false
}

// 保存查询结果为图层
const saveQueryResultsAslayer = async (customlayerName: string) => {
  if (queryResults.value.length === 0) {
    return
  }

  await saveFeaturesAslayer(queryResults.value, customlayerName, 'query')
}
 
// 导出查询结果为 GeoJSON 文件
const exportQueryResultsAsGeoJSON = async () => {
  if (!queryResults.value.length) {
    return
  }
  
  const ol = (window as any).ol
  const format = new ol.format.GeoJSON()
  const features = format.writeFeaturesObject(queryResults.value, {
    featureProjection: mapStore.map?.getView()?.getProjection?.(),
    dataProjection: 'EPSG:4326'
  })

  await exportFeaturesAsGeoJSON(features.features, '属性查询结果', {
    analysisType: 'attribute_query',
    sourceLayer: selectedlayerId.value,
    description: '按属性查询的要素结果',
    parameters: queryConfig.value.condition
  })
}
 

// 状态管理
const selectedlayerId = computed({
  get: () => featureQuery.selectedlayerId,
  set: (value) => featureQuery.selectedlayerId = value
})

const queryResults = computed(() => featureQuery.queryResults)
const layerFields = computed(() => featureQuery.layerFields)
const selectedFieldName = ref<string>('')
const queryConfig = computed(() => featureQuery.queryConfig)
const isQuerying = computed(() => featureQuery.isQuerying)
const selectedFeatureIndex = computed(() => featureQuery.selectedFeatureIndex)

// 选中要素的详细信息
const selectedFeatureInfo = computed(() => {
  if (selectedFeatureIndex.value === -1 || !queryResults.value[selectedFeatureIndex.value]) {
    return []
  }
  
  const feature = queryResults.value[selectedFeatureIndex.value]
  return getFeatureCompleteInfo(feature)
})

// 工具状态管理
const toolId = 'query'

// 保存工具状态
const saveToolState = () => {
  const stateToSave = {
    selectedlayerId: selectedlayerId.value,
    queryConfig: queryConfig.value,
    queryResults: queryResults.value
  }
  console.log('保存查询工具状态:', stateToSave)
  modeStateStore.saveToolState(toolId, stateToSave)
}

// 保存状态（防抖）
let saveTimer: any = null
const saveToolStateDebounced = () => {
  if (saveTimer) {
    clearTimeout(saveTimer)
  }
  saveTimer = setTimeout(() => {
    saveToolState()
  }, 300)
}

// 恢复工具状态
const restoreToolState = () => {
  const state = modeStateStore.getToolState(toolId)
  console.log('恢复查询工具状态:', state)
  
  if (state.selectedlayerId) {
    selectedlayerId.value = state.selectedlayerId
  }
  if (state.queryConfig) {
    // 恢复查询配置
    Object.assign(featureQuery.queryConfig, state.queryConfig)
  }
  if (state.queryResults && state.queryResults.length > 0) {
    featureQuery.queryResults = state.queryResults
    // 恢复查询结果的高亮显示
    setTimeout(() => {
      featureQuery.highlightQueryResults()
    }, 100)
  }
  
  // 如果有选中的图层，确保字段结构也被恢复
  if (state.selectedlayerId) {
    setTimeout(async () => {
      await featureQuery.getlayerFields(state.selectedlayerId)
    }, 50)
  }
}

// 组件生命周期管理
onMounted(() => {
  // 恢复状态（仅一次）
  restoreToolState()
})

onUnmounted(() => {
  console.log('查询工具组件卸载，保存状态')
  saveToolState()
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
})

// 监听状态变化，自动保存（防抖，并缩小监听范围）
watch([
  selectedlayerId,
  () => queryConfig.value.condition,
  () => queryResults.value.length
], () => {
  saveToolStateDebounced()
})

// 监听工具面板状态变化，在面板关闭时保存状态
watch(() => analysisStore.toolPanel.visible, (newVisible, oldVisible) => {
  if (oldVisible && !newVisible && analysisStore.toolPanel.activeTool === 'attribute-selection') {
    // 工具面板关闭时保存状态
    saveToolState()
  }
})

// 监听activeTool变化，在工具切换时保存状态
watch(() => analysisStore.toolPanel.activeTool, (newTool, oldTool) => {
  if (oldTool === 'attribute-selection' && newTool !== 'area-selection') {
    // 从查询工具切换到其他工具时，立即保存状态
    console.log('从查询工具切换到其他工具，保存状态')
    saveToolState()
  }
})

// 监听图层选择变化，自动获取字段结构
watch(selectedlayerId, async (newlayerId, oldlayerId) => {
  console.log('图层选择变化:', newlayerId, '从:', oldlayerId)
  
  // 只有在真正切换图层时才清空查询结果
  if (newlayerId && newlayerId !== oldlayerId) {
    // 清空查询结果
    featureQuery.queryResults = []
    
    // 重置查询条件
    Object.assign(featureQuery.queryConfig.condition, createDefaultCondition())
    
    // 获取新图层的字段结构
    await featureQuery.getlayerFields(newlayerId)
    analysisStore.setAnalysisStatus(`已选择图层: ${getSelectedlayerName()}`)
  } else if (newlayerId && newlayerId === oldlayerId) {
    // 如果是恢复状态时的相同图层，只获取字段结构
    await featureQuery.getlayerFields(newlayerId)
  } else if (!newlayerId) {
    // 选择“无”时清空字段与结果
    featureQuery.queryResults = []
    featureQuery.layerFields = []
    Object.assign(featureQuery.queryConfig.condition, createDefaultCondition())
    analysisStore.setAnalysisStatus('未选择查询图层')
  }
})

// 图层选项（首项为“无”）
const layerOptions = computed(() => [{ value: '', label: '无', disabled: false }, ...featureQuery.getlayerOptions()])

// 获取选中图层名称
const getSelectedlayerName = () => {
  return featureQuery.getSelectedlayerName(selectedlayerId.value)
}

// 获取TipWindow显示文本
const getTipText = () => {
  const layerName = getSelectedlayerName()
  const condition = queryConfig.value.condition
  
  // 获取图层要素数量
  const featureCount = featureQuery.getlayerFeatureCount(selectedlayerId.value)
  
  let tipText = `已选择图层: ${layerName}`
  
  if (featureCount > 0) {
    tipText += `，共${featureCount}个要素`
  }
  
  if (condition && condition.fieldName) {
    const operatorText = condition.operator ? ` (${getOperatorLabel(condition.operator)})` : ''
    tipText += `，查询字段: ${condition.fieldName}${operatorText}`
    
    if (condition.value) {
      tipText += `，查询值: ${condition.value}`
    }
  } else {
    tipText += `，请选择查询字段`
  }
  
  // 添加查询结果信息
  if (queryResults.value.length > 0) {
    tipText += `，找到${queryResults.value.length}个匹配要素`
  }
  
  return tipText
}

// 获取操作符标签
const getOperatorLabel = (operator: string) => {
  const operatorMap: { [key: string]: string } = {
    'eq': '=',
    'gt': '>',
    'lt': '<',
    'gte': '>=',
    'lte': '<=',
    'like': 'LIKE'
  }
  return operatorMap[operator] || operator
}

// 获取字段类型样式类
const getFieldTypeClass = (type: string): string => {
  const typeClasses: { [key: string]: string } = {
    '文本': 'type-text',
    '整数': 'type-number',
    '小数': 'type-number',
    '布尔值': 'type-boolean',
    '日期': 'type-date',
    '数组': 'type-array',
    '对象': 'type-object',
    '空值': 'type-null',
    '未知': 'type-unknown',
    '几何': 'type-geometry' // 几何类型使用专用样式
  }
  return typeClasses[type] || 'type-unknown'
}

// 复制字段名到剪贴板
const selectFieldName = (fieldName: string) => {
  selectedFieldName.value = fieldName
}

// 查询条件管理
const createDefaultCondition = (): QueryCondition => ({
  fieldName: '',
  operator: 'eq',
  value: ''
})

const updateCondition = (condition: QueryCondition) => {
  console.log('更新条件:', condition)
  // 直接更新查询条件
  Object.assign(featureQuery.queryConfig.condition, condition)
}



// 执行查询
const executeQuery = async () => {
  if (!selectedlayerId.value) {
    analysisStore.setAnalysisStatus('请选择查询图层')
    return
  }
  
  const condition = queryConfig.value.condition
  if (!condition || !condition.fieldName || !condition.value) {
    analysisStore.setAnalysisStatus('请填写完整的查询条件')
    return
  }
  
  try {
    const result = await featureQuery.executeQuery()
    
    if (result.success) {
      console.log('查询成功:', result)
      
      // 自动高亮显示查询结果
      if (result.data.length > 0) {
        featureQuery.highlightQueryResults()
      }
    } else {
      console.error('查询失败:', result.error)
    }
  } catch (error) {
    console.error('执行查询时出错:', error)
    analysisStore.setAnalysisStatus('查询执行失败，请重试')
  }
}

// 选择要素（在列表中点击）
const handleSelectFeature = (index: number) => {
  featureQuery.handleSelectFeature(index)
}



// 获取要素类型
const getFeatureType = (feature: any): string => {
  const geometry = feature.geometry || feature.getGeometry?.()
  if (!geometry) return '未知'
  
  // 直接返回几何类型，不进行映射
  const geometryType = geometry.getType?.() || geometry.type
  return geometryType || '未知'
}

// 获取要素几何信息
const getFeatureGeometryInfo = (feature: any): string => {
  return getFeatureGeometryDescription(feature)
}

// 几何计算函数已移除

// 反选当前已选中的要素
const invertSelectedlayer = () => {
  if (!selectedlayerId.value) {
    analysisStore.setAnalysisStatus('请先选择要操作的数据')
    return
  }
  
  try {
    featureQuery.invertSelectedlayer(selectedlayerId.value)
    analysisStore.setAnalysisStatus(`已反选图层 "${getSelectedlayerName()}"，更新查询结果列表`)
  } catch (error) {
    console.error('反选要素时出错:', error)
    analysisStore.setAnalysisStatus('反选要素时出错，请重试')
  }
}

// 清空查询结果（统一清除）
const clearQueryResults = () => {
  featureQuery.clearQuerySelection()
}


</script>

<style scoped>
.feature-query-panel {
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

/* 避免主题切换时该区域闪烁：禁用动画与过渡 */
.no-theme-flicker {
  animation: none !important;
}

.no-theme-flicker *,
.no-theme-flicker *::before,
.no-theme-flicker *::after {
  transition: none !important;
  animation: none !important;
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
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.field-hint,
.condition-hint {
  font-size: 11px;
  color: var(--sub);
  font-weight: normal;
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

/* 字段结构样式 */
.fields-info {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--glow);
}

.fields-header {
  display: grid;
  grid-template-columns: 2fr 1fr 2fr 2fr;
  gap: 12px;
  padding: 12px 16px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
}

.fields-list {
  max-height: 300px;
  overflow-y: auto;
}

.field-item {
  display: grid;
  grid-template-columns: 2fr 1fr 2fr 2fr;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--divider);
  cursor: pointer;
  font-size: 12px;
  background: var(--panel);
  /* 禁用过渡动画，防止主题切换闪烁 */
  transition: none !important;
}

.field-item.active {
  background: var(--surface-hover);
  border-left: 2px solid var(--accent);
}

.field-item:hover {
  background: var(--surface-hover);
}

.field-item:last-child {
  border-bottom: none;
}

.field-name {
  font-weight: 500;
  color: var(--text);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.field-type {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  text-align: center;
  min-width: 40px;
}

.type-text {
  background: var(--field-type-text-bg);
  color: var(--field-type-text-color);
}

.type-number {
  background: var(--field-type-number-bg);
  color: var(--field-type-number-color);
}

.type-boolean {
  background: var(--field-type-boolean-bg);
  color: var(--field-type-boolean-color);
}

.type-date {
  background: var(--field-type-date-bg);
  color: var(--field-type-date-color);
}

.type-array {
  background: var(--field-type-array-bg);
  color: var(--field-type-array-color);
}

.type-object {
  background: var(--field-type-object-bg);
  color: var(--field-type-object-color);
}

.type-geometry {
  background: var(--field-type-geometry-bg, var(--field-type-object-bg));
  color: var(--field-type-geometry-color, var(--field-type-object-color));
}

.type-null {
  background: var(--field-type-null-bg);
  color: var(--field-type-null-color);
}

.type-unknown {
  background: var(--field-type-unknown-bg);
  color: var(--field-type-unknown-color);
}

.field-sample {
  color: var(--sub);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.field-desc {
  color: var(--sub);
  font-size: 11px;
}

/* 查询条件样式 */
.query-conditions {
  margin-bottom: 16px;
}

/* 要素详细信息样式 */
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







/* 滚动条样式 */
.fields-list::-webkit-scrollbar,
.layer-list::-webkit-scrollbar {
  width: 3px;
}

.fields-list::-webkit-scrollbar-track,
.layer-list::-webkit-scrollbar-track {
  background: var(--scrollbar-track, rgba(200, 200, 200, 0.1));
  border-radius: 1.5px;
}

.fields-list::-webkit-scrollbar-thumb,
.layer-list::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb, rgba(150, 150, 150, 0.3));
  border-radius: 1.5px;
}

.fields-list::-webkit-scrollbar-thumb:hover,
.layer-list::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover, rgba(150, 150, 150, 0.5));
}
</style>
