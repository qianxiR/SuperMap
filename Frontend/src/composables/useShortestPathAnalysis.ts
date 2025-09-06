import { ref, computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import { useAnalysisStore } from '@/stores/analysisStore'
import { useLayerManager } from '@/composables/useLayerManager'
import { getAnalysisServiceConfig } from '@/api/config'
import shortestPath from '@turf/shortest-path'
import { feature, point, lineString, polygon, featureCollection } from '@turf/turf'
import { convertFeatureToTurfGeometry, convertFeaturesToTurfGeometries } from '@/utils/geometryConverter'

declare global {
  interface Window {
    ol: any
    turf: any
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

interface ShortestPathOptions {
  obstacles?: any
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
  
  // 分析配置选项
  const analysisOptions = ref<ShortestPathOptions>({
    obstacles: null,
    units: 'kilometers',
    resolution: 1000  // 设置网格分辨率为1000米
  })
  
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
      zIndex: 999
    })
    
    // 设置图层标识属性
    analysisLayer.set('isAnalysisLayer', true)
    analysisLayer.set('id', `path-layer-${Date.now()}`)
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
  
  // ===== 保存为图层方法 =====
  
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
      removeAnalysisLayers()
      startPoint.value = null
      endPoint.value = null
      analysisResults.value = []
      isSelectingStartPoint.value = false
      isSelectingEndPoint.value = false
      layerName.value = name
    }
    
    return success
  }
  
  // 生成图层名称
  const generateLayerNameFromAnalysis = (): string => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    return `分析图层_${timestamp}`
  }
  
  // ===== 清空图层方法 =====
  
  const clearResults = () => {
    removeAnalysisLayers()
    analysisResults.value = []
    layerName.value = ''
    startPoint.value = null
    endPoint.value = null
    isSelectingStartPoint.value = false
    isSelectingEndPoint.value = false
    analysisOptions.value = {
      obstacles: null,
      units: 'kilometers',
      resolution: 100
    }
  }
  
  const removePathLayersOnly = (): void => {
    if (!mapStore.map) return
    
    const layers = mapStore.map.getLayers().getArray()
    layers.forEach((layer: any) => {
      if (layer.get && layer.get('analysisType') === 'path') {
        mapStore.map.removeLayer(layer)
      }
    })
    
    analysisLayers.value.pathLayer = null
  }
  
  const removeAnalysisLayers = (): void => {
    if (!mapStore.map) return
    
    const layers = mapStore.map.getLayers().getArray()
    layers.forEach((layer: any) => {
      if (layer.get && (layer.get('isAnalysisLayer') || layer.get('isStartPointLayer') || layer.get('isEndPointLayer'))) {
        mapStore.map.removeLayer(layer)
      }
    })
    
    analysisLayers.value.startPointLayer = null
    analysisLayers.value.endPointLayer = null
    analysisLayers.value.pathLayer = null
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
  
  const executePathAnalysis = async (): Promise<void> => {
    if (!canAnalyze.value) {
      analysisStore.setAnalysisStatus('请先绘制两个分析点')
      return
    }
    
    analysisStore.setAnalysisStatus('正在计算最短路径...')
    
    try {
      removePathLayersOnly()
      
      // 提取起点和终点坐标
      const startGeometry = startPoint.value.getGeometry()
      const endGeometry = endPoint.value.getGeometry()
      const startCoords = startGeometry.getCoordinates()
      const endCoords = endGeometry.getCoordinates()
      
      // 构建API请求数据
      const requestData: any = {
        startPoint: {
          type: 'Point',
          coordinates: [startCoords[0], startCoords[1]]
        },
        endPoint: {
          type: 'Point',
          coordinates: [endCoords[0], endCoords[1]]
        },
        analysisOptions: {
          units: analysisOptions.value.units || 'kilometers',
          resolution: analysisOptions.value.resolution || 1000
        },
        options: {
          returnGeometry: true,
          calculateDistance: true,
          calculateDuration: true,
          averageSpeed: 50
        }
      }
      
      // 如果有障碍物数据，添加到请求中（使用现有的obstacles数据）
      if (analysisOptions.value.obstacles) {
        requestData.obstacleData = analysisOptions.value.obstacles
        console.log('[ShortestPath] 发送障碍物数据:', {
          obstacleCount: analysisOptions.value.obstacles.features?.length || 0
        })
      }
      
      console.log('[ShortestPath] 发送API请求:', requestData)
      
      // 调用后端API
      const API_BASE_URL = getAnalysisServiceConfig().baseUrl
      const response = await fetch(`${API_BASE_URL}/spatial-analysis/shortest-path`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })
      
      const apiResponse = await response.json()
      
      if (!apiResponse.success) {
        throw new Error(`API请求失败: ${apiResponse.error?.message || '未知错误'}`)
      }
      
      const pathData = apiResponse.data
      const stats = pathData.statistics
      
      const result: ShortestPathResult = {
        id: pathData.resultId,
        name: pathData.resultName,
        geometry: pathData.pathGeometry,
        distance: stats.distance,
        duration: stats.duration,
        pathType: '最短路径',
        sourceLayerName: '分析图层',
        createdAt: new Date().toISOString()
      }
      
      analysisResults.value = [result]
      displayAnalysisResults([result])
      
      const statusMessage = `最短路径分析完成，距离: ${stats.distance} ${stats.distanceUnit}，预计时间: ${stats.duration} ${stats.durationUnit}`
      analysisStore.setAnalysisStatus(statusMessage)
      
    } catch (error) {
      analysisStore.setAnalysisStatus(`路径分析失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }
  
  // 计算路径距离 - 优化版本，减少计算复杂度
  const calculatePathDistance = (pathFeature: any): number => {
    const coordinates = pathFeature.geometry.coordinates
    if (!coordinates || coordinates.length < 2) return 0
    
    let totalDistance = 0
    const R = 6371 // 地球半径（千米）
    
    // 对于长路径，使用采样计算以提高性能
    const step = coordinates.length > 1000 ? Math.ceil(coordinates.length / 1000) : 1
    
    for (let i = step; i < coordinates.length; i += step) {
      const [lon1, lat1] = coordinates[i - step]
      const [lon2, lat2] = coordinates[i]
      
      // 使用简化的距离计算
      const dLat = (lat2 - lat1) * Math.PI / 180
      const dLon = (lon2 - lon1) * Math.PI / 180
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      const distance = R * c
      
      totalDistance += distance * step // 乘以步长来补偿采样
    }
    
    return totalDistance * 1000 // 转换为米
  }
  
  // ===== 地图显示功能 =====
  
  const displayStartPoint = (pointFeature: any): void => {
    if (!mapStore.map) return
    
    if (analysisLayers.value.startPointLayer) {
      mapStore.map.removeLayer(analysisLayers.value.startPointLayer)
    }
    
    const source = new window.ol.source.Vector({
      features: [pointFeature]
    })
    
    const layer = new window.ol.layer.Vector({
      source: source,
      zIndex: 1000
    })
    
    layer.set('isStartPointLayer', true)
    layer.set('id', 'start-point-layer')
    
    analysisLayers.value.startPointLayer = layer
    mapStore.map.addLayer(layer)
  }
  
  const displayEndPoint = (pointFeature: any): void => {
    if (!mapStore.map) return
    
    if (analysisLayers.value.endPointLayer) {
      mapStore.map.removeLayer(analysisLayers.value.endPointLayer)
    }
    
    const source = new window.ol.source.Vector({
      features: [pointFeature]
    })
    
    const layer = new window.ol.layer.Vector({
      source: source,
      zIndex: 1001
    })
    
    layer.set('isEndPointLayer', true)
    layer.set('id', 'end-point-layer')
    
    analysisLayers.value.endPointLayer = layer
    mapStore.map.addLayer(layer)
  }
  
  // ===== 工具方法 =====
  
  const convertLayerToObstacles = (layerId: string): any => {
    try {
      const layerInfo = mapStore.vectorLayers.find(l => l.id === layerId)
      if (!layerInfo || !layerInfo.layer) {
        return null
      }
      
      const source = layerInfo.layer.getSource()
      if (!source) {
        return null
      }
      
      const features = source.getFeatures()
      if (features.length === 0) {
        return null
      }
      
      const turf = window.turf
      if (!turf) {
        return null
      }
      
      // 使用geometryConverter统一转换要素为turf几何对象
      const turfFeatures = convertFeaturesToTurfGeometries(features)
      
      if (turfFeatures.length === 0) {
        return null
      }
      
      // 将非多边形要素转换为多边形（作为障碍物）
      const polygonFeatures = turfFeatures.map((turfFeature: any) => {
        try {
          if (!turfFeature || !turfFeature.geometry) return null
          
          const geometryType = turfFeature.geometry.type
          
          // 多边形类型直接使用
          if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
            return turfFeature
          }
          // 点要素转换为小缓冲区
          else if (geometryType === 'Point') {
            return turf.buffer(turfFeature, 0.0001, { units: 'kilometers' })
          }
          // 线要素转换为小缓冲区
          else if (geometryType === 'LineString' || geometryType === 'MultiLineString') {
            return turf.buffer(turfFeature, 0.0001, { units: 'kilometers' })
          }
          else {
            return null
          }
        } catch (error) {
          console.warn('[ShortestPath] 障碍物要素转换失败:', error)
          return null
        }
      }).filter(Boolean)
      
      if (polygonFeatures.length === 0) {
        return null
      }
      
      console.log(`[ShortestPath] 转换了 ${polygonFeatures.length} 个障碍物要素`)
      return turf.featureCollection(polygonFeatures)
    } catch (error) {
      console.error('[ShortestPath] 障碍物转换失败:', error)
      return null
    }
  }
  
  const setObstacleLayer = (layerId: string | null): void => {
    if (layerId) {
      const obstacles = convertLayerToObstacles(layerId)
      analysisOptions.value.obstacles = obstacles
    } else {
      analysisOptions.value.obstacles = null
    }
  }
  
  // 更新分析选项
  const updateAnalysisOptions = (options: Partial<ShortestPathOptions>): void => {
    analysisOptions.value = { ...analysisOptions.value, ...options }
  }
  
  // 清除地图交互
  const clearMapInteractions = (): void => {
    isSelectingStartPoint.value = false
    isSelectingEndPoint.value = false
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
    analysisOptions,
    
    // 方法
    selectStartPoint,
    selectEndPoint,
    executePathAnalysis,
    clearResults,
    saveAnalysisLayer,
    exportGeoJSON,
    setObstacleLayer,
    updateAnalysisOptions
  }
}