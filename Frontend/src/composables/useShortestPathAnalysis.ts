import { ref, computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import { useAnalysisStore } from '@/stores/analysisStore'
import { useLayerManager } from '@/composables/useLayerManager'
import shortestPath from '@turf/shortest-path'
import { feature, point, lineString, polygon, featureCollection } from '@turf/turf'

declare global {
  interface Window {
    ol: any
  }
}

interface PointInfo {
  name: string
  coordinates: string
  geometry: any
}

interface ShortestPathResult {
  id: string
  name: string
  geometry: any
  distance: number
  duration: number
  pathType: string
  sourceLayerName: string
  createdAt: string
}

interface ShortestPathAnalysisParams {
  startPoint: any
  endPoint: any
  obstacles?: any
  minDistance?: number
  units?: 'degrees' | 'radians' | 'miles' | 'kilometers'
  resolution?: number
}

export function useShortestPathAnalysis() {
  const mapStore = useMapStore()
  const analysisStore = useAnalysisStore()
  const { saveFeaturesAsLayer } = useLayerManager()
  
  // ===== 核心状态 =====
  const analysisResults = ref<ShortestPathResult[]>([])
  const layerName = ref<string>('')
  
  // 地图交互状态
  const isSelectingStartPoint = ref<boolean>(false)
  const isSelectingEndPoint = ref<boolean>(false)
  const startPoint = ref<any>(null)
  const endPoint = ref<any>(null)
  
  // 分析图层引用
  const analysisLayers = ref({
    startPointLayer: null as any,
    endPointLayer: null as any,
    pathLayer: null as any,
    obstaclesLayer: null as any
  })
  
  // ===== 计算属性 =====
  const startPointInfo = computed<PointInfo | null>(() => {
    if (!startPoint.value) return null
    
    const geometry = startPoint.value.getGeometry()
    const coords = geometry?.getCoordinates()
    
    return {
      name: '起始点',
      coordinates: coords ? `${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}` : '未知坐标',
      geometry: geometry
    }
  })
  
  const endPointInfo = computed<PointInfo | null>(() => {
    if (!endPoint.value) return null
    
    const geometry = endPoint.value.getGeometry()
    const coords = geometry?.getCoordinates()
    
    return {
      name: '目标点',
      coordinates: coords ? `${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}` : '未知坐标',
      geometry: geometry
    }
  })
  
  const canAnalyze = computed<boolean>(() => {
    return !!(startPoint.value && endPoint.value)
  })
  
  // ===== 图层显示方法 =====
  
  const displayAnalysisResults = (results: ShortestPathResult[]): void => {
    // 只移除之前的路径图层，保留起始点和目标点
    removePathLayersOnly()
    
    if (results.length === 0) return
    
    // 创建新的分析图层
    const analysisFeatures = results.map(result => {
      const geometry = new window.ol.format.GeoJSON().readGeometry(result.geometry)
      const feature = new window.ol.Feature({
        geometry: geometry,
        properties: {
          id: result.id,
          name: result.name,
          distance: result.distance,
          duration: result.duration,
          pathType: result.pathType,
          sourceLayer: result.sourceLayerName,
          createdAt: result.createdAt
        }
      })
      return feature
    })
    
    // 设置分析图层样式
    const analysisLayer = new window.ol.layer.Vector({
      source: new window.ol.source.Vector({ features: analysisFeatures }),
      style: getAnalysisLayerStyle(),
      zIndex: 999,
      properties: {
        isAnalysisLayer: true,
        id: `path-layer-${Date.now()}`
      }
    })
    
    // 设置额外的图层标识
    analysisLayer.set('analysisType', 'path')
    analysisLayer.set('analysisResults', results)
    
    analysisLayers.value.pathLayer = analysisLayer
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
  
  // 获取CSS变量值的工具函数
  const getCSSVariable = (variableName: string, fallback: string = '#000000'): string => {
    try {
      const value = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim()
      return value || fallback
    } catch (error) {
      return fallback
    }
  }

  // 获取分析图层样式 - 使用主题色
  const getAnalysisLayerStyle = () => {
    return new window.ol.style.Style({
      stroke: new window.ol.style.Stroke({
        color: '#ff0000', // 红色
        width: 4
      }),
      fill: new window.ol.style.Fill({
        color: 'rgba(255, 0, 0, 0.1)' // 红色半透明
      })
    })
  }
  
  // ===== 保存图层方法 =====
  
  const saveAnalysisLayer = async (customLayerName?: string) => {
    const name = customLayerName || generateLayerNameFromAnalysis()
    
    // 创建Feature对象数组，包含路径和起始点、目标点
    const allFeatures: any[] = []
    
    // 添加路径要素
    analysisResults.value.forEach(result => {
      const geometry = new window.ol.format.GeoJSON().readGeometry(result.geometry)
      const feature = new window.ol.Feature({
        geometry: geometry,
        properties: {
          id: result.id,
          name: result.name,
          distance: result.distance,
          duration: result.duration,
          pathType: result.pathType,
          sourceLayer: result.sourceLayerName,
          createdAt: result.createdAt,
          featureType: 'path' // 标识为路径要素
        }
      })
      allFeatures.push(feature)
    })
    
    // 添加起始点要素
    if (startPoint.value) {
      const startGeometry = startPoint.value.getGeometry()
      if (startGeometry) {
        const startFeature = new window.ol.Feature({
          geometry: startGeometry,
          properties: {
            id: `start_point_${Date.now()}`,
            name: '起始点',
            featureType: 'start_point',
            createdAt: new Date().toISOString()
          }
        })
        allFeatures.push(startFeature)
      }
    }
    
    // 添加目标点要素
    if (endPoint.value) {
      const endGeometry = endPoint.value.getGeometry()
      if (endGeometry) {
        const endFeature = new window.ol.Feature({
          geometry: endGeometry,
          properties: {
            id: `end_point_${Date.now()}`,
            name: '目标点',
            featureType: 'end_point',
            createdAt: new Date().toISOString()
          }
        })
        allFeatures.push(endFeature)
      }
    }
    
    // 调用通用保存函数
    const success = await saveFeaturesAsLayer(
      allFeatures,
      name,
      'path'
    )
    
    if (success) {
      console.log('=== 保存图层成功，开始清除分析状态 ===')
      
      // 移除地图上的所有分析图层
      removeAnalysisLayers()
      
      // 清空内存中的状态
      startPoint.value = null
      endPoint.value = null
      analysisResults.value = []
      isSelectingStartPoint.value = false
      isSelectingEndPoint.value = false
      
      // 保存图层名称
      layerName.value = name
      
      console.log('=== 分析状态清除完成 ===')
    }
    
    return success
  }
  
  // 生成图层名称
  const generateLayerNameFromAnalysis = (): string => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    return `最短路径分析_${timestamp}`
  }
  
  // ===== 清空图层方法 =====
  
  const clearResults = () => {
    console.log('=== 开始清除分析结果 ===')
    console.log('清除前的状态:')
    console.log('- 起始点:', startPoint.value)
    console.log('- 目标点:', endPoint.value)
    console.log('- 分析结果数量:', analysisResults.value.length)
    
    // 先移除地图上的所有分析图层（包括起始点、目标点和路径）
    removeAnalysisLayers()
    
    // 清空结果数组
    analysisResults.value = []
    
    // 清空图层名称
    layerName.value = ''
    
    // 清空分析点
    startPoint.value = null
    endPoint.value = null
    isSelectingStartPoint.value = false
    isSelectingEndPoint.value = false
    
    console.log('清除后的状态:')
    console.log('- 起始点:', startPoint.value)
    console.log('- 目标点:', endPoint.value)
    console.log('- 分析结果数量:', analysisResults.value.length)
    console.log('=== 分析结果清除完成 ===')
  }
  
  // 只移除路径图层，保留起始点和目标点
  const removePathLayersOnly = (): void => {
    if (!mapStore.map) return
    
    const layers = mapStore.map.getLayers().getArray()
    let removedCount = 0
    
    // 调试信息
    console.log('=== 开始移除路径图层（保留起始点和目标点）===')
    console.log('当前地图图层数量:', layers.length)
    
    // 收集需要移除的路径图层，避免在遍历过程中修改集合
    const layersToRemove: any[] = []
    
    layers.forEach((layer: any, index: number) => {
      const layerId = layer.get('id')
      const isAnalysis = layer.get('isAnalysisLayer')
      
      console.log(`检查图层[${index}]:`, {
        layerId,
        isAnalysis,
        isPathRef: layer === analysisLayers.value.pathLayer
      })
      
      // 收集需要移除的分析图层（路径图层）
      if (isAnalysis) {
        layersToRemove.push(layer)
      }
    })
    
    // 批量移除收集到的路径图层
    layersToRemove.forEach((layer: any) => {
      const layerId = layer.get('id')
      console.log(`移除路径图层 (ID: ${layerId}):`, layer)
      mapStore.map.removeLayer(layer)
      removedCount++
    })
    
    console.log(`总共移除了 ${removedCount} 个路径图层`)
    console.log('=== 路径图层移除完成 ===')
    
    // 只清空路径图层引用，保留起始点和目标点引用
    analysisLayers.value.pathLayer = null
  }
  
  const removeAnalysisLayers = (): void => {
    if (!mapStore.map) return
    
    const layers = mapStore.map.getLayers().getArray()
    let removedCount = 0
    
    // 调试信息
    console.log('=== 开始移除所有分析图层 ===')
    console.log('当前地图图层数量:', layers.length)
    console.log('起始点图层引用:', analysisLayers.value.startPointLayer)
    console.log('目标点图层引用:', analysisLayers.value.endPointLayer)
    console.log('路径图层引用:', analysisLayers.value.pathLayer)
    
    // 收集需要移除的图层，避免在遍历过程中修改集合
    const layersToRemove: any[] = []
    
    layers.forEach((layer: any, index: number) => {
      const layerId = layer.get('id')
      const isAnalysis = layer.get('isAnalysisLayer')
      const isStartPoint = layer.get('isStartPointLayer')
      const isEndPoint = layer.get('isEndPointLayer')
      
      console.log(`检查图层 [${index}]:`, {
        layerId,
        isAnalysis,
        isStartPoint,
        isEndPoint,
        isStartPointRef: layer === analysisLayers.value.startPointLayer,
        isEndPointRef: layer === analysisLayers.value.endPointLayer,
        isPathRef: layer === analysisLayers.value.pathLayer
      })
      
      // 收集需要移除的图层
      if (isAnalysis || isStartPoint || isEndPoint) {
        layersToRemove.push(layer)
      }
    })
    
    // 批量移除收集到的图层
    layersToRemove.forEach((layer: any) => {
      const layerId = layer.get('id')
      const layerType = layer.get('isAnalysisLayer') ? '分析图层' : 
                       layer.get('isStartPointLayer') ? '起始点图层' : '目标点图层'
      
      console.log(`移除${layerType} (ID: ${layerId}):`, layer)
      mapStore.map.removeLayer(layer)
      removedCount++
    })
    
    console.log(`总共移除了 ${removedCount} 个图层`)
    console.log('=== 所有分析图层移除完成 ===')
    
    // 清空所有图层引用
    analysisLayers.value = {
      startPointLayer: null,
      endPointLayer: null,
      pathLayer: null,
      obstaclesLayer: null
    }
  }
  
  // ===== 导出为JSON方法 =====
  
  const exportGeoJSON = () => {
    const allFeatures: any[] = []
    
    // 添加路径要素
    analysisResults.value.forEach(result => {
      allFeatures.push({
        type: 'Feature',
        geometry: result.geometry,
        properties: {
          id: result.id,
          name: result.name,
          distance: result.distance,
          duration: result.duration,
          pathType: result.pathType,
          sourceLayer: result.sourceLayerName,
          createdAt: result.createdAt,
          featureType: 'path' // 标识为路径要素
        }
      })
    })
    
    // 添加起始点要素
    if (startPoint.value) {
      const startGeometry = startPoint.value.getGeometry()
      if (startGeometry) {
        allFeatures.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: startGeometry.getCoordinates()
          },
          properties: {
            id: `start_point_${Date.now()}`,
            name: '起始点',
            featureType: 'start_point',
            createdAt: new Date().toISOString()
          }
        })
      }
    }
    
    // 添加目标点要素
    if (endPoint.value) {
      const endGeometry = endPoint.value.getGeometry()
      if (endGeometry) {
        allFeatures.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: endGeometry.getCoordinates()
          },
          properties: {
            id: `end_point_${Date.now()}`,
            name: '目标点',
            featureType: 'end_point',
            createdAt: new Date().toISOString()
          }
        })
      }
    }
    
    const geoJSON = {
      type: 'FeatureCollection',
      features: allFeatures
    }
    
    const blob = new Blob([JSON.stringify(geoJSON, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shortest_path_analysis_${new Date().toISOString().slice(0, 10)}.geojson`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  
  // ===== 地图交互功能 =====
  
  // 通用的点要素创建和显示函数
  const createAndDisplayPoint = (coordinate: number[], pointType: 'start' | 'end'): void => {
    // 创建分析点要素
    const pointFeature = new window.ol.Feature({
      geometry: new window.ol.geom.Point(coordinate)
    })
    
    // 设置分析点样式 - 使用主题色
    const accentColor = getCSSVariable('--accent', '#000000')
    const pointStyle = new window.ol.style.Style({
      image: new window.ol.style.Circle({
        radius: 8,
        fill: new window.ol.style.Fill({ color: accentColor }),
        stroke: new window.ol.style.Stroke({ color: '#fff', width: 2 })
      }),
      text: new window.ol.style.Text({
        text: pointType === 'start' ? '起始点' : '目标点',
        font: '12px sans-serif',
        fill: new window.ol.style.Fill({ color: '#fff' }),
        offsetY: -20,
        backgroundFill: new window.ol.style.Fill({ color: accentColor }),
        padding: [2, 4, 2, 4]
      })
    })
    
    pointFeature.setStyle(pointStyle)
    
    // 根据类型设置相应的状态和显示
    if (pointType === 'start') {
      startPoint.value = pointFeature
      displayStartPoint(pointFeature)
    } else {
      endPoint.value = pointFeature
      displayEndPoint(pointFeature)
    }
  }
  
  // 绘制起始点
  const selectStartPoint = (): void => {
    if (!mapStore.map) {
      analysisStore.setAnalysisStatus('地图未初始化')
      return
    }
    
    clearMapInteractions()
    isSelectingStartPoint.value = true
    isSelectingEndPoint.value = false
    
    const clickListener = (event: any) => {
      const coordinate = event.coordinate
      
      // 使用通用函数创建和显示起始点
      createAndDisplayPoint(coordinate, 'start')
      
      mapStore.map.un('singleclick', clickListener)
      isSelectingStartPoint.value = false
      
      analysisStore.setAnalysisStatus('起始点已绘制，请绘制目标点')
    }
    
    mapStore.map.on('singleclick', clickListener)
    analysisStore.setAnalysisStatus('请在地图上点击绘制分析点1')
  }
  
  // 绘制目标点
  const selectEndPoint = (): void => {
    if (!mapStore.map) {
      analysisStore.setAnalysisStatus('地图未初始化')
      return
    }
    
    clearMapInteractions()
    isSelectingEndPoint.value = true
    isSelectingStartPoint.value = false
    
    const clickListener = (event: any) => {
      const coordinate = event.coordinate
      
      // 使用通用函数创建和显示目标点
      createAndDisplayPoint(coordinate, 'end')
      
      mapStore.map.un('singleclick', clickListener)
      isSelectingEndPoint.value = false
      
      analysisStore.setAnalysisStatus('目标点已绘制，可以开始最短路径分析')
    }
    
    mapStore.map.on('singleclick', clickListener)
    analysisStore.setAnalysisStatus('请在地图上点击绘制分析点2')
  }
  
  // ===== 分析执行功能 =====
  
  // 执行路径分析
  const executePathAnalysis = async (): Promise<void> => {
    // 调试：检查起始点和终点状态
    debugPoints()
    
    if (!canAnalyze.value) {
      analysisStore.setAnalysisStatus('请先绘制两个分析点')
      return
    }
    
    // 额外检查分析点是否存在
    if (!startPoint.value || !endPoint.value) {
      analysisStore.setAnalysisStatus('分析点未设置')
      return
    }
    
    analysisStore.setAnalysisStatus('正在计算最短路径...')
    
    try {
      // 只移除之前的路径图层，保留起始点和目标点
      removePathLayersOnly()
      
      // 获取分析点坐标
      const startGeometry = startPoint.value.getGeometry()
      const endGeometry = endPoint.value.getGeometry()
      
      if (!startGeometry || !endGeometry) {
        throw new Error('分析点的几何信息无效')
      }
      
      const startCoords = startGeometry.getCoordinates()
      const endCoords = endGeometry.getCoordinates()
      
      console.log('起始点坐标:', startCoords)
      console.log('终点坐标:', endCoords)
      console.log('起始点要素:', startPoint.value)
      console.log('终点要素:', endPoint.value)
      
      // 检查坐标格式
      if (!startCoords || !endCoords || startCoords.length < 2 || endCoords.length < 2) {
        throw new Error('起始点或终点的坐标格式无效')
      }
      
      // 按照turf.js的格式创建点要素
      const start = point(startCoords)
      const end = point(endCoords)
      
      // 构建turf.js选项 - 使用默认设置
      const options: any = {}
      
      console.log('调用turf.shortestPath:', { start, end, options })
      console.log('start类型:', typeof start, start)
      console.log('end类型:', typeof end, end)
      
      // 直接调用turf.js计算最短路径
      const pathResult = shortestPath(start, end, options)
      
      if (!pathResult) {
        throw new Error('无法找到有效路径')
      }
      
      console.log('turf.js返回的路径结果:', pathResult)
      
      // 计算路径距离
      const distance = calculatePathDistance(pathResult)
      
      // 创建分析结果
      const result: ShortestPathResult = {
        id: `path_${Date.now()}`,
        name: '最短路径分析',
        geometry: pathResult.geometry,
        distance: distance,
        duration: Math.round(distance / 1000 * 20), // 假设20分钟/公里
        pathType: '最短路径',
        sourceLayerName: '用户绘制',
        createdAt: new Date().toISOString()
      }
      
      // 保存分析结果
      analysisResults.value = [result]
      
      // 在地图上显示路径结果
      displayAnalysisResults([result])
      
      analysisStore.setAnalysisStatus(`路径分析完成: 距离 ${distance.toFixed(2)}米`)
      
    } catch (error) {
      console.error('路径分析失败:', error)
      analysisStore.setAnalysisStatus(`路径分析失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }
  
  // 计算路径距离
  const calculatePathDistance = (pathFeature: any): number => {
    const coordinates = pathFeature.geometry.coordinates
    let totalDistance = 0
    
    for (let i = 1; i < coordinates.length; i++) {
      const [lon1, lat1] = coordinates[i - 1]
      const [lon2, lat2] = coordinates[i]
      
      // 使用哈弗辛公式计算距离（千米）
      const R = 6371 // 地球半径（千米）
      const dLat = (lat2 - lat1) * Math.PI / 180
      const dLon = (lon2 - lon1) * Math.PI / 180
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      const distance = R * c
      
      totalDistance += distance
    }
    
    return totalDistance * 1000 // 转换为米
  }
  
  // ===== 地图显示功能 =====
  
  // 显示起始点
  const displayStartPoint = (pointFeature: any): void => {
    if (!mapStore.map) return
    
    console.log('=== 显示起始点 ===')
    
    // 清除之前的起始点图层
    if (analysisLayers.value.startPointLayer) {
      console.log('移除之前的起始点图层:', analysisLayers.value.startPointLayer)
      mapStore.map.removeLayer(analysisLayers.value.startPointLayer)
    }
    
    // 创建起始点图层
    const source = new window.ol.source.Vector({
      features: [pointFeature]
    })
    
    const layer = new window.ol.layer.Vector({
      source: source,
      zIndex: 1000,
      properties: {
        isStartPointLayer: true,
        id: 'start-point-layer'
      }
    })
    
    analysisLayers.value.startPointLayer = layer
    mapStore.map.addLayer(layer)
    
    console.log('起始点图层已创建并添加到地图:', layer)
    console.log('起始点图层引用已设置:', analysisLayers.value.startPointLayer)
  }
  
  // 显示目标点
  const displayEndPoint = (pointFeature: any): void => {
    if (!mapStore.map) return
    
    console.log('=== 显示目标点 ===')
    
    if (analysisLayers.value.endPointLayer) {
      console.log('移除之前的目标点图层:', analysisLayers.value.endPointLayer)
      mapStore.map.removeLayer(analysisLayers.value.endPointLayer)
    }
    
    const source = new window.ol.source.Vector({
      features: [pointFeature]
    })
    
    const layer = new window.ol.layer.Vector({
      source: source,
      zIndex: 1001,
      properties: {
        isEndPointLayer: true,
        id: 'end-point-layer'
      }
    })
    
    analysisLayers.value.endPointLayer = layer
    mapStore.map.addLayer(layer)
    
    console.log('目标点图层已创建并添加到地图:', layer)
    console.log('目标点图层引用已设置:', analysisLayers.value.endPointLayer)
  }
  
  // ===== 工具方法 =====
  
  // 清除地图交互
  const clearMapInteractions = (): void => {
    isSelectingStartPoint.value = false
    isSelectingEndPoint.value = false
  }
  
  // 调试函数：检查起始点和终点的状态
  const debugPoints = (): void => {
    console.log('=== 调试起始点和终点状态 ===')
    console.log('startPoint.value:', startPoint.value)
    console.log('endPoint.value:', endPoint.value)
    
    if (startPoint.value) {
      const startGeom = startPoint.value.getGeometry()
      console.log('起始点几何:', startGeom)
      if (startGeom) {
        console.log('起始点坐标:', startGeom.getCoordinates())
      }
    }
    
    if (endPoint.value) {
      const endGeom = endPoint.value.getGeometry()
      console.log('终点几何:', endGeom)
      if (endGeom) {
        console.log('终点坐标:', endGeom.getCoordinates())
      }
    }
    
    console.log('canAnalyze.value:', canAnalyze.value)
    console.log('================================')
  }
  
  return {
    // 状态
    analysisResults,
    layerName,
    startPointInfo,
    endPointInfo,
    canAnalyze,
    isSelectingStartPoint,
    isSelectingEndPoint,
    
    // 方法
    selectStartPoint,
    selectEndPoint,
    executePathAnalysis,
    clearResults,
    saveAnalysisLayer,
    exportGeoJSON
  }
}