import { ref, computed } from 'vue'
import { useAnalysisStore } from '@/stores/analysisStore'
import { useMapStore } from '@/stores/mapStore'

export function useBufferAnalysis() {
  const analysisStore = useAnalysisStore()
  const mapStore = useMapStore()
  
  const bufferDistance = ref<number>(100)
  const selectedAnalysisLayerId = ref<string>('')
  
  // 选中图层信息
  const selectedAnalysisLayerInfo = computed(() => {
    if (!selectedAnalysisLayerId.value) return null
    
    const layer = mapStore.vectorLayers.find(l => l.id === selectedAnalysisLayerId.value)
    if (!layer) return null
    
    return {
      id: layer.id,
      name: layer.name,
      type: layer.type,
      layer: layer.layer
    }
  })
  
  // 图层选项
  const layerOptions = computed(() => {
    const visibleLayers = mapStore.vectorLayers.filter(layer => layer.layer && layer.layer.getVisible())
    return visibleLayers.map(layer => ({ 
      value: layer.id, 
      label: layer.name, 
      disabled: false 
    }))
  })
  
  // 设置选中的分析图层
  const setSelectedAnalysisLayer = (layerId: string): void => {
    selectedAnalysisLayerId.value = layerId
    if (layerId) {
      const layer = mapStore.vectorLayers.find(l => l.id === layerId)
      if (layer) {
        analysisStore.setAnalysisStatus(`已选择分析图层: ${layer.name}`)
      }
    } else {
      analysisStore.setAnalysisStatus('未选择分析图层')
    }
  }
  
  const executeBufferAnalysis = async (): Promise<void> => {
    if (!selectedAnalysisLayerId.value) {
      analysisStore.setAnalysisStatus('请先选择分析图层')
      return
    }
    
    if (bufferDistance.value <= 0) {
      analysisStore.setAnalysisStatus('缓冲距离必须大于0')
      return
    }
    
    const layer = mapStore.vectorLayers.find(l => l.id === selectedAnalysisLayerId.value)
    if (!layer) {
      analysisStore.setAnalysisStatus('选中的图层不存在')
      return
    }
    
    analysisStore.setAnalysisStatus(`正在对图层 "${layer.name}" 执行缓冲区分析，距离: ${bufferDistance.value}米`)
  }
  
  // 清除所有选择状态
  const clearAllSelections = (): void => {
    selectedAnalysisLayerId.value = ''
    analysisStore.setAnalysisStatus('已清除所有选择')
  }
  
  return {
    bufferDistance,
    selectedAnalysisLayerId,
    selectedAnalysisLayerInfo,
    layerOptions,
    setSelectedAnalysisLayer,
    clearAllSelections,
    executeBufferAnalysis
  }
}
