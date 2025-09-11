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
import { ref as vueRef } from 'vue'
import { uselayermanager } from '@/composables/useLayerManager'
import { useLayerExport } from '@/composables/useLayerExport'

// API配置 - 动态获取以避免缓存问题

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
  const lastFeatureCollection = vueRef<any | null>(null)
  const { saveFeaturesAslayer } = uselayermanager()
  const { exportFeaturesAsGeoJSON } = useLayerExport()
  
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



    const API_BASE_URL = getAnalysisServiceConfig().baseUrl
    console.log('[BufferAnalysis] 当前API地址:', API_BASE_URL)
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

    
    // 保存结果到store（用于导出JSON功能）- 直接保存API返回的完整FeatureCollection
    bufferAnalysisStore.setBufferResults(apiResponse)
    
    // 直接显示API返回的FeatureCollection
    lastFeatureCollection.value = apiResponse
    displayBufferResults(apiResponse)
    bufferAnalysisStore.setIsAnalyzing(false)
    
    } catch (error) {
      console.error('缓冲区分析执行失败:', error)
      analysisStore.setAnalysisStatus(`缓冲区分析失败: ${error instanceof Error ? error.message : '未知错误'}`)
      bufferAnalysisStore.setIsAnalyzing(false)
    }
  }
  
  // 在地图上显示缓冲区结果
  const displayBufferResults = (featureCollection: any): void => {
    removeBufferlayers()
    

    const bufferFeatures: any[] = []
    
    featureCollection.features.forEach((feature: any, index: number) => {

      
      // 处理后端返回的Feature数据
      try {
        let geometry;
        
        // 检查geometry类型并相应处理
        if (feature.geometry.type === 'FeatureCollection') {
          // 如果geometry本身是FeatureCollection，处理其中的features
          const geoJSONFormat = new GeoJSON()
          const features = geoJSONFormat.readFeatures(feature.geometry)
          features.forEach((olFeature: any) => {
            const featureGeometry = olFeature.getGeometry()
            if (featureGeometry) {
              const newFeature = new Feature({
                geometry: featureGeometry,
                ...feature.properties // 直接展开属性到Feature根级别
              })
              bufferFeatures.push(newFeature)
            }
          })
        } else {
          // 正常的Geometry类型
          geometry = new GeoJSON().readGeometry(feature.geometry)
          const olFeature = new Feature({
            geometry: geometry,
            ...feature.properties // 直接展开属性到Feature根级别
          })
          bufferFeatures.push(olFeature)
        }
      } catch (error) {
        console.error(`处理第${index + 1}个要素时出错:`, error, feature)
      }
    })
    

    bufferFeatures.forEach((feature, index) => {
      console.log(`要素${index + 1}:`, feature.getProperties?.())
    })
    
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
    bufferlayer.set('bufferResults', featureCollection.features)
    
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

  // ===== 保存为图层 / 导出为JSON =====
  const saveBufferResultsAsLayer = async (layerName?: string): Promise<boolean> => {
    const fc = lastFeatureCollection.value
    if (!fc || !fc.features || fc.features.length === 0) return false
    // 将FeatureCollection.features展开并转换为OL Feature后再保存
    const format = new GeoJSON()
    const olFeatures: any[] = []
    fc.features.forEach((feature: any) => {
      if (feature?.geometry?.type === 'FeatureCollection') {
        const subOlFeatures = format.readFeatures(feature.geometry)
        subOlFeatures.forEach((subF: any) => {
          const props = feature.properties || {}
          subF.setProperties({ ...subF.getProperties?.(), ...props })
          olFeatures.push(subF)
        })
      } else {
        const geometry = format.readGeometry(feature.geometry)
        const olFeature = new Feature({ geometry })
        if (feature.properties) {
          olFeature.setProperties(feature.properties)
        }
        olFeatures.push(olFeature)
      }
    })
    return saveFeaturesAslayer(olFeatures as any[], layerName || (bufferAnalysisStore.state.layerName || '缓冲区分析结果'), 'buffer')
  }
  
  const exportBufferResultsAsJSON = async (fileName?: string): Promise<any> => {
    const fc = lastFeatureCollection.value
    if (!fc || !fc.features || fc.features.length === 0) return false
    return exportFeaturesAsGeoJSON(fc.features, fileName || '缓冲区分析结果')
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
    lastFeatureCollection,
    
    // 方法
    setSelectedAnalysislayer,
    executeBufferAnalysis,
    executeBufferAnalysisAndSave,
    saveBufferAnalysisToDatabase,
    clearAllSelections,
    updateBufferSettings,
    removeBufferlayers,
    displayBufferResults,
    saveBufferResultsAsLayer,
    exportBufferResultsAsJSON,
    
    // 状态管理
    clearState
  }
}
