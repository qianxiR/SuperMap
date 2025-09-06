import { ref, computed } from 'vue'
import { useAnalysisStore } from '@/stores/analysisStore'
import { useMapStore } from '@/stores/mapStore'
import { useBufferAnalysisStore } from '@/stores/bufferAnalysisStore'
import { extractGeoJSONFromLayer } from '@/utils/featureUtils'
import { getAnalysisServiceConfig } from '@/api/config'
import * as ol from 'ol'
import { Feature } from 'ol'
import { Vector as VectorSource } from 'ol/source'
import { Vector as VectorLayer } from 'ol/layer'
import { Style, Stroke, Fill } from 'ol/style'
import GeoJSON from 'ol/format/GeoJSON'
import type OlFeature from 'ol/Feature'

// API配置
const API_BASE_URL = getAnalysisServiceConfig().baseUrl

// 后端API接口类型定义
interface FeatureGeometry {
  type: string
  coordinates: any
}

interface FeatureItem {
  type: string
  geometry: FeatureGeometry
  properties?: Record<string, any>
}

// 缓冲区分析结果类型（兼容现有代码）
interface BufferResult {
  id: string
  name: string
  geometry: any
  distance: number
  unit: string
  sourceLayerName: string
  createdAt: string
}

// 缓冲区参数类型
interface BufferSettings {
  radius: number
  semicircleLineSegment: number
}

export function useBufferAnalysis() {
  const analysisStore = useAnalysisStore()
  const mapStore = useMapStore()
  const bufferAnalysisStore = useBufferAnalysisStore()
  
  // 从store获取状态
  const selectedAnalysisLayerId = computed(() => bufferAnalysisStore.state.selectedAnalysisLayerId)
  const bufferSettings = computed(() => bufferAnalysisStore.state.bufferSettings)
  const bufferResults = computed(() => bufferAnalysisStore.state.bufferResults)
  const currentResult = computed(() => bufferAnalysisStore.state.currentResult)
  const isAnalyzing = computed(() => bufferAnalysisStore.state.isAnalyzing)
  const taskId = computed(() => bufferAnalysisStore.state.taskId)
  
  // 清理状态（工具切换时调用）
  const clearState = () => {
    bufferAnalysisStore.clearResults()
    removeBufferLayers()
  }
  
  // 选中图层信息
  const selectedAnalysisLayerInfo = computed(() => {
    if (!selectedAnalysisLayerId.value) return null
    
    const layer = mapStore.vectorLayers.find(l => l.id === selectedAnalysisLayerId.value)
    if (!layer) return null
    
    return {
      id: layer.id,
      name: layer.name,
      type: layer.type,
      layer: layer.layer,
      featureCount: layer.layer?.getSource()?.getFeatures().length || 0
    }
  })
  
  // 图层选项（只显示矢量图层）
  const layerOptions = computed(() => {
    const vectorLayers = mapStore.vectorLayers.filter(layer => 
      layer.layer && 
      layer.layer.getVisible() && 
      layer.type === 'vector'
    )
    return vectorLayers.map(layer => {
      const features = layer.layer.getSource()?.getFeatures() || []
      const featureCount = features.length
      
      // 分析图层中要素的几何类型
      const geometryTypes = new Set<string>()
      features.forEach((feature: any) => {
        const geometry = feature.getGeometry()
        if (geometry) {
          geometryTypes.add(geometry.getType())
        }
      })
      
      const geometryTypeStr = Array.from(geometryTypes).join(', ') || '未知'
      
      return { 
        value: layer.id, 
        label: `${layer.name} (${featureCount}个要素, 类型: ${geometryTypeStr})`, 
        disabled: false 
      }
    })
  })
  
  // 设置选中的分析图层
  const setSelectedAnalysisLayer = (layerId: string): void => {
    bufferAnalysisStore.setSelectedAnalysisLayer(layerId)
    if (layerId) {
      const layer = mapStore.vectorLayers.find(l => l.id === layerId)
      if (layer) {
              analysisStore.setAnalysisStatus(`已选择分析图层: ${layer.name}`)
      }
    } else {
      analysisStore.setAnalysisStatus('未选择分析图层')
    }
  }

  // 从OpenLayers图层中提取GeoJSON数据
  
  const executeBufferAnalysis = async (): Promise<void> => {
    const layerId = selectedAnalysisLayerId.value
    const target = mapStore.vectorLayers.find(l => l.id === layerId)!
    const radiusMeters = Number(bufferSettings.value.radius)
    const steps = Number(bufferSettings.value.semicircleLineSegment)

    bufferAnalysisStore.setIsAnalyzing(true)

    try {

    const sourceData = extractGeoJSONFromLayer(target.layer, mapStore.map, {
      enableLogging: false
    })

    const requestData = {
      sourceData: sourceData,
      bufferSettings: {
        radius: radiusMeters,
        semicircleLineSegment: steps
      },
      options: {
        resultLayerName: `缓冲区分析结果_${target.name}`
      }
    }

    const response = await fetch(`${API_BASE_URL}/spatial-analysis/buffer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    })

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`)
    }

    const apiResponse = await response.json()

    if (!apiResponse.success) {
      throw new Error(apiResponse.error?.message || '缓冲区分析失败')
    }

    if (!apiResponse.data || !apiResponse.data.features) {
      throw new Error('API响应格式错误：缺少features数据')
    }

    const results: BufferResult[] = apiResponse.data.features.map((feature: any, index: number) => ({
      id: feature.properties?.id || `buffer_${Date.now()}_${index}`,
      name: feature.properties?.name || `缓冲区_${index + 1}`,
      geometry: feature.geometry,
      distance: radiusMeters,
      unit: 'meters',
      sourceLayerName: target.name,
      createdAt: new Date().toISOString()
    }))

    const stats = apiResponse.data.statistics
    const statusMessage = `缓冲区分析完成，成功处理 ${sourceData.features.length} 个要素，生成 ${stats?.outputFeatureCount || results.length} 个缓冲区，总面积 ${stats?.totalArea?.toFixed(2) || '未知'} 平方米`
    analysisStore.setAnalysisStatus(statusMessage)
    
    bufferAnalysisStore.setBufferResults(results as any)
    displayBufferResults(results as any)
    bufferAnalysisStore.setIsAnalyzing(false)
    
    } catch (error) {
      console.error('缓冲区分析执行失败:', error)
      analysisStore.setAnalysisStatus(`缓冲区分析失败: ${error instanceof Error ? error.message : '未知错误'}`)
      bufferAnalysisStore.setIsAnalyzing(false)
    }
  }
  
  // 在地图上显示缓冲区结果
  const displayBufferResults = (results: BufferResult[]): void => {
    removeBufferLayers()
    
    const bufferFeatures: any[] = []
    
    results.forEach(result => {
      if (result.geometry.type === 'FeatureCollection') {
        const features = new GeoJSON().readFeatures(result.geometry)
        features.forEach((olFeature, index) => {
          const feature = new Feature({
            geometry: olFeature.getGeometry(),
            properties: {
              id: `${result.id}_${index}`,
              name: `${result.name}_${index + 1}`,
              distance: result.distance,
              unit: result.unit,
              sourceLayer: result.sourceLayerName,
              createdAt: result.createdAt
            }
          })
          bufferFeatures.push(feature)
        })
      } else {
        const geometry = new GeoJSON().readGeometry(result.geometry)
        const feature = new Feature({
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
        bufferFeatures.push(feature)
      }
    })
    
    const bufferSource = new VectorSource({
      features: bufferFeatures
    })
    
    // 获取分析专用颜色
    const rootStyle = getComputedStyle(document.documentElement)
    const analysisColor = rootStyle.getPropertyValue('--analysis-color')?.trim() || '#0078D4'
    
    const bufferLayer = new VectorLayer({
      source: bufferSource,
      style: new Style({
        stroke: new Stroke({
          color: analysisColor,
          width: 3
        }),
        fill: new Fill({
          color: analysisColor + '40' // 25% 不透明度
        })
      })
    })
    
    bufferLayer.set('isBufferLayer', true)
    bufferLayer.set('bufferResults', results)
    
    mapStore.map.addLayer(bufferLayer)
    
    // 缩放到缓冲区范围
    const extent = bufferSource.getExtent()
    if (extent && !extent.every((coord: number) => coord === Infinity)) {
      mapStore.map.getView().fit(extent, {
        padding: [50, 50, 50, 50],
        duration: 1000
      })
    }
  }
  
  // 移除缓冲区图层
  const removeBufferLayers = (): void => {
    if (!mapStore.map) return
    
    const layers = mapStore.map.getLayers().getArray()
    layers.forEach((layer: any) => {
      if (layer.get('isBufferLayer')) {
        mapStore.map.removeLayer(layer)
      }
    })
  }
  
  // 清除所有选择状态（仅清除结果，不清除保存的状态）
  const clearAllSelections = (): void => {
    // 只清除图层显示，保留状态数据
    removeBufferLayers()
    analysisStore.setAnalysisStatus('已清除缓冲区图层显示')
  }
  
  // 更新缓冲区设置
  const updateBufferSettings = (settings: Partial<BufferSettings>): void => {
    bufferAnalysisStore.updateBufferSettings(settings)
  }
  
  const saveBufferAnalysisToDatabase = async (_taskId: string, _layerName: string): Promise<boolean> => {
    analysisStore.setAnalysisStatus('缓冲区分析结果入库功能已禁用')
    return false
  }

  const executeBufferAnalysisAndSave = async (): Promise<void> => {
    bufferAnalysisStore.setIsAnalyzing(false)
    analysisStore.setAnalysisStatus('缓冲区分析与入库功能已禁用')
  }

  return {
    // 分析参数
    selectedAnalysisLayerId,
    selectedAnalysisLayerInfo,
    layerOptions,
    
    // 参数设置
    bufferSettings,
    
    // 分析结果
    bufferResults,
    currentResult,
    isAnalyzing,
    taskId,
    
    // 方法
    setSelectedAnalysisLayer,
    executeBufferAnalysis,
    executeBufferAnalysisAndSave,
    saveBufferAnalysisToDatabase,
    clearAllSelections,
    updateBufferSettings,
    removeBufferLayers,
    displayBufferResults,
    
    // 状态管理
    clearState
  }
}
