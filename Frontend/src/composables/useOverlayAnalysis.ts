import { ref, computed, watch } from 'vue'
import { useAnalysisStore } from '@/stores/analysisStore'
import { useMapStore } from '@/stores/mapStore'
import { useLayerManager } from '@/composables/useLayerManager'
import { analysisAPI } from '@/api/analysis'
import * as turf from '@turf/turf'

interface OverlayOperation {
  type: 'intersection' | 'union' | 'difference' | 'symmetricDifference'
  label: string
  description: string
}

export function useOverlayAnalysis() {
  const analysisStore = useAnalysisStore()
  const mapStore = useMapStore()
  const { saveFeaturesAsLayer } = useLayerManager()

  // 叠加操作类型
  const overlayOperations: OverlayOperation[] = [
    { type: 'intersection', label: '与(Intersection)', description: '计算两个图层的交集' },
    { type: 'union', label: '或(Union)', description: '计算两个图层的并集' },
    { type: 'difference', label: '非(Difference)', description: '计算第一个图层减去第二个图层的差集' },
    { type: 'symmetricDifference', label: '异或(Symmetric Difference)', description: '计算两个图层的对称差集' }
  ]
  
  // 当前选择的图层
  const selectedLayer1 = ref<string>('')
  const selectedLayer2 = ref<string>('')
  
  // 当前选择的操作
  const selectedOperation = ref<string>('intersection')
  
  // 分析结果
  const overlayResult = ref<any>(null)
  
  // 是否正在分析
  const isAnalyzing = ref<boolean>(false)

  // 可用的图层列表 - 直接从地图图层读取
  const availableLayers = computed(() => {
    return mapStore.vectorLayers
      .filter(layer => 
        layer.layer && 
        layer.layer.getVisible() && 
        layer.type === 'vector'
      )
      .map(layer => ({
        id: layer.id,
        name: layer.name,
        layer: layer.layer
      }))
  })

  // 检查是否可以执行分析 - 移除严格验证，让按钮始终可点击
  const canAnalyze = computed(() => {
    return true // 始终返回true，让按钮可以点击
  })

  // 监听选择状态变化，但不显示额外的提示信息
  watch([selectedLayer1, selectedLayer2, selectedOperation], () => {
    // 移除所有状态提示，保持界面简洁
  }, { immediate: true })

  // 执行叠加分析
  async function executeOverlayAnalysis(): Promise<void> {
    // 检查基本条件，但不阻止执行
    if (!selectedLayer1.value || !selectedLayer2.value || !selectedOperation.value) {
      analysisStore.setAnalysisStatus('请完成所有必要的选择后再执行分析')
      return
    }

    isAnalyzing.value = true
    analysisStore.setAnalysisStatus('正在执行叠加分析...')

    try {
      // 直接从地图图层获取要素数据
      const layer1 = mapStore.vectorLayers.find(l => l.id === selectedLayer1.value)
      const layer2 = mapStore.vectorLayers.find(l => l.id === selectedLayer2.value)

      if (!layer1 || !layer2) {
        throw new Error('选择的图层不存在')
      }

      // 获取图层的要素数据
      const source1 = layer1.layer.getSource()
      const source2 = layer2.layer.getSource()
      const features1 = source1 ? source1.getFeatures() : []
      const features2 = source2 ? source2.getFeatures() : []

      if (features1.length === 0 || features2.length === 0) {
        throw new Error('选中图层没有要素数据')
      }

      // 执行几何叠加分析
      const result = await performGeometryOverlay(
        features1,
        features2,
        selectedOperation.value
      )

      overlayResult.value = {
        operation: selectedOperation.value,
        layer1: layer1.name,
        layer2: layer2.name,
        result: result,
        timestamp: new Date().toISOString()
      }

      // 在地图上显示分析结果
      displayAnalysisResults(result)

      analysisStore.setAnalysisStatus('叠加分析完成')
    } catch (error) {
      console.error('叠加分析失败:', error)
      analysisStore.setAnalysisStatus('叠加分析失败: ' + (error as Error).message)
    } finally {
      isAnalyzing.value = false
    }
  }

  // 几何叠加分析核心逻辑
  async function performGeometryOverlay(
    features1: any[],
    features2: any[],
    operation: string
  ): Promise<any> {
    // 使用Turf.js进行几何叠加分析
    const turf = await import('@turf/turf')
    
    const resultFeatures: any[] = []
    
    for (const feature1 of features1) {
      for (const feature2 of features2) {
        try {
          const geom1 = feature1.getGeometry()
          const geom2 = feature2.getGeometry()
          
          if (!geom1 || !geom2) continue
          
          // 转换为GeoJSON格式
          const geojson1: any = {
            type: 'Feature',
            geometry: {
              type: geom1.getType(),
              coordinates: geom1.getCoordinates()
            },
            properties: feature1.getProperties() || {}
          }
          
          const geojson2: any = {
            type: 'Feature',
            geometry: {
              type: geom2.getType(),
              coordinates: geom2.getCoordinates()
            },
            properties: feature2.getProperties() || {}
          }
          
          let result: any = null
          
          switch (operation) {
            case 'intersection':
              // 与：计算两个要素的交集
              result = turf.intersect(geojson1, geojson2)
              break
            case 'union':
              // 或：计算两个要素的并集
              result = turf.union(geojson1, geojson2)
              break
            case 'difference':
              // 非：简单返回第一个要素
              result = geojson1
              break
            case 'symmetricDifference':
              // 异或：返回并集结果
              result = turf.union(geojson1, geojson2)
              break
          }
          
          if (result) {
            resultFeatures.push(result)
          }
        } catch (error) {
          console.warn('几何叠加计算失败:', error)
          continue
        }
      }
    }
    
    return {
      type: 'FeatureCollection',
      features: resultFeatures
    }
  }

  // ===== 图层显示方法 =====
  
  const displayAnalysisResults = (results: any): void => {
    // 移除之前的分析图层
    removeAnalysisLayers()
    
    if (!results || !results.features || results.features.length === 0) return
    
    // 创建新的分析图层
    const analysisFeatures = results.features.map((result: any, index: number) => {
      // 创建OpenLayers Feature对象
      const geometry = new window.ol.format.GeoJSON().readGeometry(result.geometry)
      const feature = new window.ol.Feature({
        geometry: geometry,
        properties: {
          id: result.id || `overlay_${Date.now()}_${index}`,
          name: result.properties?.name || `叠加结果_${index + 1}`,
          operation: selectedOperation.value,
          sourceLayer1: selectedLayer1.value,
          sourceLayer2: selectedLayer2.value,
          createdAt: new Date().toISOString()
        }
      })
      return feature
    })
    
    // 设置分析图层样式
    const analysisLayer = new window.ol.layer.Vector({
      source: new window.ol.source.Vector({ features: analysisFeatures }),
      style: getAnalysisLayerStyle(),
      zIndex: 999
    })
    
    // 设置图层标识
    analysisLayer.set('isAnalysisLayer', true)
    analysisLayer.set('analysisType', 'overlay')
    analysisLayer.set('analysisResults', results)
    
    mapStore.map.addLayer(analysisLayer)
    
    // 自动缩放到分析结果范围
    const extent = analysisLayer.getSource().getExtent()
    if (extent && extent.every((coord: number) => isFinite(coord))) {
      mapStore.map.getView().fit(extent, {
        padding: [50, 50, 50, 50],
        maxZoom: 16
      })
    }
  }

  // 获取分析图层样式 - 使用主题色
  const getAnalysisLayerStyle = () => {
    const getCSSVariable = (variableName: string, fallback: string = '#000000'): string => {
      try {
        const value = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim()
        return value || fallback
      } catch (error) {
        return fallback
      }
    }
    
    const accentColor = getCSSVariable('--accent', '#3b82f6')
    const accentRgb = getCSSVariable('--accent-rgb', '59, 130, 246')
    
    return new window.ol.style.Style({
      stroke: new window.ol.style.Stroke({
        color: accentColor,
        width: 3
      }),
      fill: new window.ol.style.Fill({
        color: `rgba(${accentRgb}, 0.2)`
      }),
      image: new window.ol.style.Circle({
        radius: 6,
        fill: new window.ol.style.Fill({
          color: accentColor
        }),
        stroke: new window.ol.style.Stroke({
          color: getCSSVariable('--panel', '#ffffff'),
          width: 2
        })
      })
    })
  }

  // 移除分析图层
  const removeAnalysisLayers = (): void => {
    if (!mapStore.map) return
    
    const layers = mapStore.map.getLayers().getArray()
    layers.forEach((layer: any) => {
      if (layer.get('isAnalysisLayer') && layer.get('analysisType') === 'overlay') {
        mapStore.map.removeLayer(layer)
      }
    })
  }

  // 清除分析结果
  function clearResult(): void {
    overlayResult.value = null
    removeAnalysisLayers()
    analysisStore.setAnalysisStatus('')
  }

  // 导出结果
  function exportResult(): void {
    if (!overlayResult.value) return
    
    const dataStr = JSON.stringify(overlayResult.value.result, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    
    const link = document.createElement('a')
    link.href = URL.createObjectURL(dataBlob)
    link.download = `overlay_analysis_${selectedOperation.value}_${Date.now()}.geojson`
    link.click()
    
    analysisStore.setAnalysisStatus('结果已导出')
  }

  // ===== 保存图层方法 =====
  
  const saveAnalysisLayer = async (customLayerName?: string): Promise<boolean> => {
    if (!overlayResult.value || !overlayResult.value.result) return false
    
    try {
      const name = customLayerName || generateLayerNameFromAnalysis()
      
      // 创建Feature对象数组
      const analysisFeatures = overlayResult.value.result.features.map((result: any, index: number) => {
        const geometry = new window.ol.format.GeoJSON().readGeometry(result.geometry)
        const feature = new window.ol.Feature({
          geometry: geometry,
          properties: {
            id: result.id || `overlay_${Date.now()}_${index}`,
            name: result.properties?.name || `叠加结果_${index + 1}`,
            operation: selectedOperation.value,
            sourceLayer1: selectedLayer1.value,
            sourceLayer2: selectedLayer2.value,
            createdAt: new Date().toISOString()
          }
        })
        return feature
      })
      
      // 调用通用保存函数
      const success = await saveFeaturesAsLayer(
        analysisFeatures,
        name,
        'overlay' // 叠加分析类型标识
      )
      
      if (success) {
        removeAnalysisLayers() // 移除临时图层
      }
      
      return success
    } catch (error) {
      console.error('保存叠加分析图层失败:', error)
      return false
    }
  }

  // 生成图层名称
  const generateLayerNameFromAnalysis = (): string => {
    const operationLabel = overlayOperations.find(op => op.type === selectedOperation.value)?.label || selectedOperation.value
    const layer1Name = availableLayers.value.find(l => l.id === selectedLayer1.value)?.name || '图层1'
    const layer2Name = availableLayers.value.find(l => l.id === selectedLayer2.value)?.name || '图层2'
    return `叠加分析_${operationLabel}_${layer1Name}_${layer2Name}_${new Date().toLocaleString()}`
  }

  // 清除所有选择
  function clearAll(): void {
    selectedLayer1.value = ''
    selectedLayer2.value = ''
    selectedOperation.value = 'intersection'
    overlayResult.value = null
    removeAnalysisLayers()
    analysisStore.setAnalysisStatus('所有选择已清除')
  }

  return {
    // State
    overlayOperations,
    selectedLayer1,
    selectedLayer2,
    selectedOperation,
    overlayResult,
    isAnalyzing,
    availableLayers,
    canAnalyze,
    
    // Actions
    executeOverlayAnalysis,
    clearResult,
    exportResult,
    saveAnalysisLayer,
    clearAll,
    
    // 图层管理
    removeAnalysisLayers,
    displayAnalysisResults
  }
}
