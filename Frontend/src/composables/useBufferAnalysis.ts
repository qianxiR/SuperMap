import { ref, computed } from 'vue'
import { useAnalysisStore } from '@/stores/analysisStore'
import { useMapStore } from '@/stores/mapStore'
import * as ol from 'ol'
import { Feature } from 'ol'
import { Vector as VectorSource } from 'ol/source'
import { Vector as VectorLayer } from 'ol/layer'
import { Style, Stroke, Fill } from 'ol/style'
import GeoJSON from 'ol/format/GeoJSON'

// 声明全局类型
declare global {
  interface Window {
    ol: any
  }
}

// 缓冲区分析结果类型
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
  endType: 'ROUND' | 'FLAT'
  leftDistance: number
  rightDistance: number
  semicircleLineSegment: number
}

export function useBufferAnalysis() {
  const analysisStore = useAnalysisStore()
  const mapStore = useMapStore()
  
  // 分析参数
  const selectedAnalysisLayerId = ref<string>('')
  
  // 高级参数
  const bufferSettings = ref<BufferSettings>({
    endType: 'ROUND',
    leftDistance: 100,
    rightDistance: 100,
    semicircleLineSegment: 10
  })
  
  // 分析结果
  const bufferResults = ref<BufferResult[]>([])
  const currentResult = ref<BufferResult | null>(null)
  const isAnalyzing = ref<boolean>(false)
  
  // 保存状态
  const saveState = (layerName?: string) => {
    import('@/stores/modeStateStore').then(({ useModeStateStore }) => {
      const modeStateStore = useModeStateStore()
      const stateToSave = {
        selectedAnalysisLayerId: selectedAnalysisLayerId.value,
        bufferSettings: { ...bufferSettings.value },
        // 只在有实际结果时才保存结果数据
        ...(bufferResults.value && bufferResults.value.length > 0 && {
          bufferResults: bufferResults.value
        }),
        ...(layerName && { layerName })
      }
      modeStateStore.saveToolState('buffer', stateToSave)
    })
  }
  
  // 恢复状态
  const restoreState = () => {
    return import('@/stores/modeStateStore').then(({ useModeStateStore }) => {
      const modeStateStore = useModeStateStore()
      const state = modeStateStore.getToolState('buffer')
      if (state.selectedAnalysisLayerId) {
        selectedAnalysisLayerId.value = state.selectedAnalysisLayerId
      }
      if (state.bufferSettings) {
        Object.assign(bufferSettings.value, state.bufferSettings)
      }
      // 只在有保存的结果时才恢复
      if (state.bufferResults && state.bufferResults.length > 0) {
        bufferResults.value = state.bufferResults
      }
      return state.layerName || ''
    })
  }

  // 清理状态（工具切换时调用）
  const clearState = () => {
    // 清理分析结果
    bufferResults.value = []
    currentResult.value = null
    
    // 移除地图上的缓冲区图层
    removeBufferLayers()
    
    // 清理状态存储中的临时数据，只保留配置
    import('@/stores/modeStateStore').then(({ useModeStateStore }) => {
      const modeStateStore = useModeStateStore()
      modeStateStore.clearToolTemporaryData('buffer', [
        'selectedAnalysisLayerId',
        'bufferSettings'
      ])
    })
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
    return vectorLayers.map(layer => ({ 
      value: layer.id, 
      label: `${layer.name} (${layer.layer.getSource()?.getFeatures().length || 0}个要素)`, 
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
  
  // 执行缓冲区分析（使用SuperMap SpatialAnalystService）
  const executeBufferAnalysis = async (): Promise<void> => {
    if (!selectedAnalysisLayerId.value) {
      analysisStore.setAnalysisStatus('请先选择分析图层')
      return
    }
    
    if (bufferSettings.value.leftDistance <= 0 || bufferSettings.value.rightDistance <= 0) {
      analysisStore.setAnalysisStatus('缓冲距离必须大于0')
      return
    }
    
    const layer = mapStore.vectorLayers.find(l => l.id === selectedAnalysisLayerId.value)
    if (!layer) {
      analysisStore.setAnalysisStatus('选中的图层不存在')
      return
    }
    
    try {
      isAnalyzing.value = true
      analysisStore.setAnalysisStatus(`正在对图层 "${layer.name}" 执行缓冲区分析...`)
      
      // 获取图层中的所有要素
      const source = layer.layer.getSource()
      const features = source.getFeatures()
      
      if (features.length === 0) {
        analysisStore.setAnalysisStatus('选中图层没有要素数据')
        return
      }
      
      // 检查SuperMap iClient是否可用
      if (typeof (window as any).ol?.supermap === 'undefined') {
        analysisStore.setAnalysisStatus('SuperMap iClient 未加载，无法执行缓冲区分析')
        return
      }
      
      // 使用SuperMap SpatialAnalystService进行缓冲区分析
      const results: BufferResult[] = []
      
      for (let i = 0; i < features.length; i++) {
        const feature = features[i]
        const geometry = feature.getGeometry()
        
        if (!geometry) continue
        
        // 更新进度提示
        const progress = Math.round(((i + 1) / features.length) * 100)
        analysisStore.setAnalysisStatus(`正在分析要素 ${i + 1}/${features.length} (${progress}%)...`)
        
        try {
          // 获取当前地图的投影信息
          const mapView = mapStore.map?.getView()
          const currentProjection = mapView?.getProjection()?.getCode() || 'EPSG:4326'
          console.log('当前地图投影:', currentProjection)
          
          // 如果当前是地理坐标系，需要转换到投影坐标系
          let projectedGeometry = geometry
          if (currentProjection === 'EPSG:4326') {
            // 转换到Web Mercator投影 (EPSG:3857)
            const targetProjection = 'EPSG:3857'
            projectedGeometry = geometry.clone().transform(currentProjection, targetProjection)
            console.log('几何体已转换到投影坐标系:', targetProjection)
          }
          
          // 创建缓冲区分析参数
          const geoBufferAnalystParams = new (window as any).ol.supermap.GeometryBufferAnalystParameters({
            sourceGeometry: projectedGeometry,
            bufferSetting: new (window as any).ol.supermap.BufferSetting({
              endType: bufferSettings.value.endType === 'ROUND' 
                ? (window as any).ol.supermap.BufferEndType.ROUND 
                : (window as any).ol.supermap.BufferEndType.FLAT,
              leftDistance: new (window as any).ol.supermap.BufferDistance({value: bufferSettings.value.leftDistance}),
              rightDistance: new (window as any).ol.supermap.BufferDistance({value: bufferSettings.value.rightDistance}),
              semicircleLineSegment: bufferSettings.value.semicircleLineSegment
            })
          })
          
          // 调用SuperMap SpatialAnalystService
          const serviceUrl = 'https://iserver.supermap.io/iserver/services/spatialanalyst-changchun/restjsr/spatialanalyst'
          const serviceResult = await new (window as any).ol.supermap.SpatialAnalystService(serviceUrl).bufferAnalysis(geoBufferAnalystParams)
          
          if (serviceResult && serviceResult.result && serviceResult.result.resultGeometry) {
            console.log('SuperMap服务返回的缓冲区结果:', serviceResult.result.resultGeometry)
            
            // 如果输入时进行了坐标系转换，返回结果也需要转换回地理坐标系
            let resultGeometry = serviceResult.result.resultGeometry
            if (currentProjection === 'EPSG:4326') {
              // 将返回的投影坐标系结果转换回地理坐标系
              try {
                const resultFeature = new (window as any).ol.format.GeoJSON().readFeature(resultGeometry)
                const resultGeom = resultFeature.getGeometry()
                if (resultGeom) {
                  resultGeom.transform('EPSG:3857', 'EPSG:4326')
                  resultGeometry = new (window as any).ol.format.GeoJSON().writeFeatureObject(resultFeature)
                  console.log('缓冲区结果已转换回地理坐标系')
                }
              } catch (transformError) {
                console.warn('坐标系转换失败，使用原始结果:', transformError)
              }
            }
            
            const result: BufferResult = {
              id: `buffer_${Date.now()}_${i}`,
              name: `缓冲区_${layer.name}_${i + 1}`,
              geometry: resultGeometry,
              distance: bufferSettings.value.leftDistance === bufferSettings.value.rightDistance ? bufferSettings.value.leftDistance : Math.max(bufferSettings.value.leftDistance, bufferSettings.value.rightDistance),
              unit: '米',
              sourceLayerName: layer.name,
              createdAt: new Date().toISOString()
            }
            results.push(result)
          }
        } catch (error) {
          console.warn(`要素 ${i} 缓冲区分析失败:`, error)
          continue
        }
      }
      
      if (results.length > 0) {
        bufferResults.value = results
        currentResult.value = results[0]
        
        // 在地图上显示结果
        displayBufferResults(results)
        
        const distanceText = bufferSettings.value.leftDistance === bufferSettings.value.rightDistance 
          ? `${bufferSettings.value.leftDistance}米` 
          : `左${bufferSettings.value.leftDistance}米/右${bufferSettings.value.rightDistance}米`
        
        analysisStore.setAnalysisStatus(`✅ 缓冲区分析完成！生成了 ${results.length} 个缓冲区，距离: ${distanceText}`)
      } else {
        analysisStore.setAnalysisStatus('❌ 缓冲区分析失败，未生成有效结果')
      }
      
    } catch (error) {
      console.error('缓冲区分析错误:', error)
      analysisStore.setAnalysisStatus(`❌ 缓冲区分析失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      isAnalyzing.value = false
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
      
      // 处理不同的GeoJSON格式
      if (result.geometry.type === 'Feature') {
        // 如果是Feature类型，提取geometry部分
        geometry = new GeoJSON().readGeometry(result.geometry.geometry)
      } else if (result.geometry.type === 'FeatureCollection') {
        // 如果是FeatureCollection类型，提取第一个feature的geometry
        const features = new GeoJSON().readFeatures(result.geometry)
        geometry = features[0]?.getGeometry()
      } else {
        // 直接是Geometry类型
        geometry = new GeoJSON().readGeometry(result.geometry)
      }
      
      if (!geometry) {
        console.warn(`无法解析几何体: ${result.id}`)
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
  
  // 清除所有选择状态（仅清除显示，不清除保存的状态）
  const clearAllSelections = (): void => {
    // 只清除图层显示，保留状态数据
    removeBufferLayers()
    analysisStore.setAnalysisStatus('已清除缓冲区图层显示')
  }
  
  // 更新缓冲区设置
  const updateBufferSettings = (settings: Partial<BufferSettings>): void => {
    bufferSettings.value = { ...bufferSettings.value, ...settings }
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
    
    // 方法
    setSelectedAnalysisLayer,
    executeBufferAnalysis,
    clearAllSelections,
    updateBufferSettings,
    removeBufferLayers,
    displayBufferResults,
    
    // 状态管理
    saveState,
    restoreState,
    clearState
  }
}
