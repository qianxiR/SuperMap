import { ref, computed } from 'vue'
import { useAnalysisStore } from '@/stores/analysisStore'
import { useMapStore } from '@/stores/mapStore'
import { useBufferAnalysisStore } from '@/stores/bufferAnalysisStore'
import * as ol from 'ol'
import { Feature } from 'ol'
import { Vector as VectorSource } from 'ol/source'
import { Vector as VectorLayer } from 'ol/layer'
import { Style, Stroke, Fill } from 'ol/style'
import GeoJSON from 'ol/format/GeoJSON'
import type OlFeature from 'ol/Feature'
import { buffer as turfBuffer } from '@turf/turf'

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
  
  const executeBufferAnalysis = async (): Promise<void> => {
    if (!mapStore.map) {
      analysisStore.setAnalysisStatus('地图未初始化')
      return
    }

    const layerId = selectedAnalysisLayerId.value
    if (!layerId) {
      analysisStore.setAnalysisStatus('请先选择分析图层')
      return
    }

    const target = mapStore.vectorLayers.find(l => l.id === layerId)
    const olLayer: any = target?.layer
    if (!olLayer) {
      analysisStore.setAnalysisStatus('未找到所选图层')
      return
    }

    const source = olLayer.getSource?.()
    const features: OlFeature[] = source?.getFeatures?.() || []
    if (!features.length) {
      analysisStore.setAnalysisStatus('所选图层无要素')
      return
    }

    bufferAnalysisStore.setIsAnalyzing(true)
    analysisStore.setAnalysisStatus('正在执行缓冲区分析...')

    try {
      const radiusMeters = Number(bufferSettings.value.radius) || 0
      const steps = Number(bufferSettings.value.semicircleLineSegment) || 8
      if (radiusMeters === 0) {
        analysisStore.setAnalysisStatus('缓冲距离为 0，已取消')
        bufferAnalysisStore.setIsAnalyzing(false)
        return
      }

      const format = new GeoJSON()
      const viewProj = mapStore.map.getView().getProjection().getCode()

      const results: BufferResult[] = []

      for (let i = 0; i < features.length; i++) {
        const f = features[i]
        const geometry = f.getGeometry()
        
        // 检查几何类型是否支持缓冲区分析
        if (!geometry) {
          console.warn(`要素 ${i + 1} 没有几何信息，跳过`)
          continue
        }
        
        const geometryType = geometry.getType()
        console.log(`处理要素 ${i + 1}，几何类型: ${geometryType}`)
        
        // 检查几何类型是否支持缓冲区分析
        const supportedTypes = ['Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon']
        if (!supportedTypes.includes(geometryType)) {
          console.warn(`要素 ${i + 1} 的几何类型 ${geometryType} 不支持缓冲区分析，跳过`)
          continue
        }
        
        try {
          // 转为 GeoJSON（以 WGS84 提供给 Turf）
          const gjFeature: any = format.writeFeatureObject(f, {
            dataProjection: 'EPSG:4326',
            featureProjection: viewProj
          })
          
          console.log(`要素 ${i + 1} 转换为GeoJSON:`, gjFeature)

          // Turf 缓冲（单位米，步数由圆弧精度决定）
          const buffered: any = turfBuffer(gjFeature, radiusMeters, { units: 'meters', steps })
          if (!buffered || !buffered.geometry) {
            console.warn(`要素 ${i + 1} 缓冲区分析失败，跳过`)
            continue
          }
          
          console.log(`要素 ${i + 1} 缓冲区分析成功:`, buffered)

          // 尝试从要素属性中获取名称
          const properties = f.getProperties?.() || {}
          const featureName = properties.name || properties.NAME || properties.Name || 
                             properties.title || properties.TITLE || properties.Title ||
                             properties.label || properties.LABEL || properties.Label
          
          const elementName = featureName || `要素_${i + 1}`
          
          results.push({
            id: `${Date.now()}_${i}`,
            name: `缓冲_${target?.name || '图层'}_${elementName}`,
            geometry: buffered.geometry,
            distance: radiusMeters,
            unit: 'meters',
            sourceLayerName: target?.name || '',
            createdAt: new Date().toISOString()
          })
        } catch (error: any) {
          console.error(`要素 ${i + 1} 缓冲区分析出错:`, error)
          console.error(`错误详情:`, error?.message)
          continue
        }
      }

      if (!results.length) {
        analysisStore.setAnalysisStatus(`未生成任何缓冲结果，共处理 ${features.length} 个要素`)
      } else {
        analysisStore.setAnalysisStatus(`缓冲区分析完成，成功处理 ${results.length}/${features.length} 个要素`)
        bufferAnalysisStore.setBufferResults(results as any)
        displayBufferResults(results as any)
      }
    } catch (e: any) {
      analysisStore.setAnalysisStatus(`缓冲失败: ${e?.message || '未知错误'}`)
    } finally {
      bufferAnalysisStore.setIsAnalyzing(false)
    }
  }
  
  // 在地图上显示缓冲区结果
  const displayBufferResults = (results: BufferResult[]): void => {
    if (!mapStore.map) return
    
    // 移除之前的缓冲区图层
    removeBufferLayers()
    
    // 创建新的缓冲区图层
    const bufferFeatures = results.map(result => {
      let geometry
      
      try {
        // 后端返回的是标准GeoJSON几何体格式
        if (result.geometry && result.geometry.type && result.geometry.coordinates) {
          // 直接是GeoJSON几何体格式
          geometry = new GeoJSON().readGeometry(result.geometry)
        } else if (result.geometry.type === 'Feature') {
          // 如果是Feature类型，提取geometry部分
          geometry = new GeoJSON().readGeometry(result.geometry.geometry)
        } else if (result.geometry.type === 'FeatureCollection') {
          // 如果是FeatureCollection类型，提取第一个feature的geometry
          const features = new GeoJSON().readFeatures(result.geometry)
          geometry = features[0]?.getGeometry()
        } else {
          return null
        }
      } catch (error) {
        return null
      }
      
      if (!geometry) {
        return null
      }
      
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
      return feature
    }).filter(Boolean) // 过滤掉null值
    
    const bufferSource = new VectorSource({
      features: bufferFeatures
    })
    
          // 设置缓冲区图层为红色边界，中间空心
      const bufferLayer = new VectorLayer({
        source: bufferSource,
        style: new Style({
          stroke: new Stroke({
            color: '#ff0000',
            width: 3
          }),
          fill: new Fill({
            color: 'rgba(255, 255, 255, 0.0)' // 完全透明，实现空心效果
          })
        })
      })
    
    // 设置图层标识
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
