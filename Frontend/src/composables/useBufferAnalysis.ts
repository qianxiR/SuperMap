import { ref, computed } from 'vue'
import { useAnalysisStore } from '@/stores/analysisStore'
import { useMapStore } from '@/stores/mapStore'
import { useBufferAnalysisStore } from '@/stores/bufferAnalysisStore'
import { extractGeoJSONFromlayer } from '@/utils/featureUtils'
import { getAnalysisServiceConfig } from '@/api/config'
import { Feature } from 'ol'
import { Vector as VectorSource } from 'ol/source'
import { Vector as Vectorlayer } from 'ol/layer'
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
  properties: Record<string, any> // 保留完整属性数据
  distance: number
  unit: string
  sourcelayerName: string
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
  const selectedAnalysislayerId = computed(() => bufferAnalysisStore.state.selectedAnalysislayerId)
  const bufferSettings = computed(() => bufferAnalysisStore.state.bufferSettings)
  const bufferResults = computed(() => bufferAnalysisStore.state.bufferResults)
  const currentResult = computed(() => bufferAnalysisStore.state.currentResult)
  const isAnalyzing = computed(() => bufferAnalysisStore.state.isAnalyzing)
  const taskId = computed(() => bufferAnalysisStore.state.taskId)
  
  // 清理状态（工具切换时调用）
  const clearState = () => {
    bufferAnalysisStore.clearResults()
    removeBufferlayers()
  }
  
  // 选中图层信息
  const selectedAnalysislayerInfo = computed(() => {
    if (!selectedAnalysislayerId.value) return null
    
    const layer = mapStore.vectorlayers.find(l => l.id === selectedAnalysislayerId.value)
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
    const vectorlayers = mapStore.vectorlayers.filter(layer => 
      layer.layer && 
      layer.layer.getVisible() && 
      layer.type === 'vector'
    )
    return vectorlayers.map(layer => {
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
      
      return { 
        value: layer.id, 
        label: `${layer.name} (${featureCount}个要素, 类型: ${geometryTypeStr})`, 
        disabled: false 
      }
    })
  })
  
  // 设置选中的分析及绘制图层
  const setSelectedAnalysislayer = (layerId: string): void => {
    bufferAnalysisStore.setSelectedAnalysislayer(layerId)
    if (layerId) {
      const layer = mapStore.vectorlayers.find(l => l.id === layerId)
      if (layer) {
              analysisStore.setAnalysisStatus(`已选择分析及绘制图层: ${layer.name}`)
      }
    } else {
      analysisStore.setAnalysisStatus('未选择分析及绘制图层')
    }
  }

  // 从Openlayers图层中提取GeoJSON数据
  
  // 等待图层分页加载完成
  const waitForLayerPaginationComplete = async (layer: any, layerName: string): Promise<void> => {
    return new Promise((resolve) => {
      const source = layer.getSource()
      if (!source) {
        resolve()
        return
      }

      let lastFeatureCount = 0
      let stableCount = 0
      const maxStableChecks = 3 // 连续3次检查要素数量不变则认为加载完成
      const checkInterval = 500 // 每500ms检查一次

      const checkPagination = () => {
        const currentFeatureCount = source.getFeatures().length
        
        if (currentFeatureCount === lastFeatureCount) {
          stableCount++
          if (stableCount >= maxStableChecks) {
            console.log(`[Buffer] 图层 ${layerName} 分页加载完成，共 ${currentFeatureCount} 个要素`)
            resolve()
            return
          }
        } else {
          stableCount = 0
          lastFeatureCount = currentFeatureCount
          console.log(`[Buffer] 图层 ${layerName} 正在分页加载，当前 ${currentFeatureCount} 个要素`)
        }
        
        setTimeout(checkPagination, checkInterval)
      }

      // 开始检查
      checkPagination()
    })
  }

  const executeBufferAnalysis = async (): Promise<void> => {
    const layerId = selectedAnalysislayerId.value
    const target = mapStore.vectorlayers.find(l => l.id === layerId)!
    const radiusMeters = Number(bufferSettings.value.radius)
    const steps = Number(bufferSettings.value.semicircleLineSegment)

    bufferAnalysisStore.setIsAnalyzing(true)

    try {
      // 等待图层分页加载完成
      await waitForLayerPaginationComplete(target.layer, target.name)

      const sourceData = extractGeoJSONFromlayer(target.layer, mapStore.map, {
        enableLogging: false
      })

    const requestData = {
      sourceData: sourceData,
      bufferSettings: {
        radius: radiusMeters,
        semicircleLineSegment: steps
      },
      options: {
        resultlayerName: `缓冲区分析结果_${target.name}`
      }
    }

    const response = await fetch(`${API_BASE_URL}/buffer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error?.message || `API请求失败: ${response.status} ${response.statusText}`)
    }

    const apiResponse = await response.json()

    // 打印完整的API响应数据
    console.log('=== 缓冲区分析 - 后端API完整响应数据 ===')
    console.log('响应类型:', typeof apiResponse)
    console.log('响应结构:', JSON.stringify(apiResponse, null, 2))
    console.log('是否为FeatureCollection:', apiResponse.type === 'FeatureCollection')
    console.log('features数量:', apiResponse.features?.length || 0)
    
    if (apiResponse.features && apiResponse.features.length > 0) {
      console.log('第一个feature详细结构:')
      console.log(JSON.stringify(apiResponse.features[0], null, 2))
      
      if (apiResponse.features.length > 1) {
        console.log(`还有其他 ${apiResponse.features.length - 1} 个features...`)
      }
    }
    console.log('=== API响应数据打印完毕 ===')

    // 后端现在直接返回 FeatureCollection 格式
    if (!apiResponse.features) {
      throw new Error('API响应格式错误：缺少features数据')
    }

    // 将后端返回的features转换为BufferResult格式，保留完整属性
    const bufferResults = apiResponse.features.map((feature: any, index: number) => ({
      id: feature.properties?.id || `buffer_${Date.now()}_${index}`,
      name: feature.properties?.name || `缓冲区_${index + 1}`,
      geometry: feature.geometry,
      properties: feature.properties || {}, // 保留完整属性数据
      distance: radiusMeters,
      unit: 'meters',
      sourcelayerName: target.name,
      createdAt: new Date().toISOString()
    }))

    console.log('[Buffer] 处理分析结果:', {
      inputFeatures: sourceData.features.length,
      outputResults: bufferResults.length,
      firstResult: bufferResults[0]
    })

    const statusMessage = `缓冲区分析完成，成功处理 ${sourceData.features.length} 个要素，生成 ${bufferResults.length} 个缓冲区`
    analysisStore.setAnalysisStatus(statusMessage)
    
    // 更新状态和显示结果
    bufferAnalysisStore.setBufferResults(bufferResults as any)
    displayBufferResults(bufferResults)
    bufferAnalysisStore.setIsAnalyzing(false)
    
    } catch (error) {
      console.error('缓冲区分析执行失败:', error)
      analysisStore.setAnalysisStatus(`缓冲区分析失败: ${error instanceof Error ? error.message : '未知错误'}`)
      bufferAnalysisStore.setIsAnalyzing(false)
    }
  }
  
  // 在地图上显示缓冲区结果
  const displayBufferResults = (results: BufferResult[]): void => {
    removeBufferlayers()
    
    console.log('=== displayBufferResults - 开始处理缓冲区结果 ===')
    console.log('结果数量:', results.length)
    console.log('完整结果数据:', JSON.stringify(results, null, 2))
    
    const bufferFeatures: any[] = []
    
    results.forEach((result, resultIndex) => {
      console.log(`=== 处理第 ${resultIndex + 1} 个结果 ===`)
      console.log('result.geometry.type:', result.geometry.type)
      console.log('result完整结构:', JSON.stringify(result, null, 2))
      // 处理不同的GeoJSON格式
      if (result.geometry.type === 'FeatureCollection') {
        // 如果是FeatureCollection类型，处理所有features
        const features = new GeoJSON().readFeatures(result.geometry)
        console.log(`[Display] FeatureCollection包含 ${features.length} 个要素`)
        
        features.forEach((olFeature: any, index: number) => {
          const geometry = olFeature.getGeometry()
          if (geometry) {
            const feature = new Feature({
              geometry: geometry,
              properties: {
                // 保留后端传来的完整属性数据
                ...result.properties,
                // 添加前端显示需要的元数据
                id: `${result.id}_${index}`,
                name: `${result.name}_${index + 1}`,
                distance: result.distance,
                unit: result.unit,
                sourcelayer: result.sourcelayerName,
                createdAt: result.createdAt,
                featureIndex: index
              }
            })
            bufferFeatures.push(feature)
          }
        })
      } else if (result.geometry.type === 'Feature') {
        // 如果是Feature类型，提取geometry部分
        const geometry = new GeoJSON().readGeometry(result.geometry.geometry)
        const feature = new Feature({
          geometry: geometry,
          properties: {
            // 保留后端传来的完整属性数据
            ...result.properties,
            // 添加前端显示需要的元数据
            id: result.properties?.id || result.id,
            name: result.properties?.name || result.name,
            distance: result.distance,
            unit: result.unit,
            sourcelayer: result.sourcelayerName,
            createdAt: result.createdAt
          }
        })
        bufferFeatures.push(feature)
      } else {
        // 直接是Geometry类型
        const geometry = new GeoJSON().readGeometry(result.geometry)
        const feature = new Feature({
          geometry: geometry,
          properties: {
            // 保留后端传来的完整属性数据
            ...result.properties,
            // 添加前端显示需要的元数据
            id: result.properties?.id || result.id,
            name: result.properties?.name || result.name,
            distance: result.distance,
            unit: result.unit,
            sourcelayer: result.sourcelayerName,
            createdAt: result.createdAt
          }
        })
        bufferFeatures.push(feature)
      }
    })
    
    console.log('=== displayBufferResults - 处理完成 ===')
    console.log('最终生成的要素数量:', bufferFeatures.length)
    console.log('所有生成要素的属性信息:')
    bufferFeatures.forEach((feature, index) => {
      console.log(`要素${index + 1}:`, feature.getProperties?.())
    })
    console.log('=== 开始添加到地图 ===')
    
    const bufferSource = new VectorSource({
      features: bufferFeatures
    })
    
    // 获取分析专用颜色
    const rootStyle = getComputedStyle(document.documentElement)
    const analysisColor = rootStyle.getPropertyValue('--analysis-color')?.trim() || '#0078D4'
    
    const bufferlayer = new Vectorlayer({
      source: bufferSource,
      style: new Style({
        stroke: new Stroke({
          color: analysisColor,
          width: 3
        }),
        fill: new Fill({
          color: analysisColor + '4D' // 蓝色，70%透明度
        })
      })
    })
    
    bufferlayer.set('isBufferlayer', true)
    bufferlayer.set('bufferResults', results)
    
    mapStore.map.addLayer(bufferlayer)
    
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
  const removeBufferlayers = (): void => {
    if (!mapStore.map) return
    
    const layers = mapStore.map.getLayers().getArray()
    layers.forEach((layer: any) => {
      if (layer.get('isBufferlayer')) {
        mapStore.map.removeLayer(layer)
      }
    })
  }
  
  // 清除所有选择状态（仅清除结果，不清除保存的状态）
  const clearAllSelections = (): void => {
    // 只清除图层显示，保留状态数据
    removeBufferlayers()
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
    selectedAnalysislayerId,
    selectedAnalysislayerInfo,
    layerOptions,
    
    // 参数设置
    bufferSettings,
    
    // 分析结果
    bufferResults,
    currentResult,
    isAnalyzing,
    taskId,
    
    // 方法
    setSelectedAnalysislayer,
    executeBufferAnalysis,
    executeBufferAnalysisAndSave,
    saveBufferAnalysisToDatabase,
    clearAllSelections,
    updateBufferSettings,
    removeBufferlayers,
    displayBufferResults,
    
    // 状态管理
    clearState
  }
}
