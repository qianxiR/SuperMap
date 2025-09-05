import { ref, computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import { useAnalysisStore } from '@/stores/analysisStore'
import { useLayerManager } from '@/composables/useLayerManager'
import shortestPath from '@turf/shortest-path'
import { feature, point, lineString, polygon, featureCollection } from '@turf/turf'

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
      console.log('=== 保存为图层成功，开始清除分析状态 ===')
      
      // 移除地图上的所有分析图层
      removeAnalysisLayers()
      
      // 清空内存中的状态
      startPoint.value = null
      endPoint.value = null
      analysisResults.value = []
      isSelectingStartPoint.value = false
      isSelectingEndPoint.value = false
      
      // 保存为图层名称
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
    
    // 重置分析选项
    analysisOptions.value = {
      obstacles: null,
      units: 'kilometers',
      resolution: 100
    }
    

  }
  
  // 只移除路径图层，保留起始点和目标点
  const removePathLayersOnly = (): void => {
    if (!mapStore.map) return
    
    const layers = mapStore.map.getLayers().getArray()
    let removedCount = 0
  
    
    // 只清空路径图层引用，保留起始点和目标点引用
    analysisLayers.value.pathLayer = null
  }
  
  const removeAnalysisLayers = (): void => {
    if (!mapStore.map) return
    
    const layers = mapStore.map.getLayers().getArray()
    let removedCount = 0
    

    
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
    if (!canAnalyze.value) {
      analysisStore.setAnalysisStatus('请先绘制两个分析点')
      return
    }
    
    // 额外检查分析点是否存在
    if (!startPoint.value || !endPoint.value) {
      analysisStore.setAnalysisStatus('分析点未设置')
      return
    }
    
    // 设置加载状态
    analysisStore.setAnalysisStatus('正在计算最短路径...')
    
    try {
      // 使用setTimeout让出主线程，避免阻塞UI
      await new Promise(resolve => setTimeout(resolve, 0))
      
      // 更新状态显示进度
      analysisStore.setAnalysisStatus('正在处理坐标数据...')
      await new Promise(resolve => setTimeout(resolve, 10))
      
      analysisStore.setAnalysisStatus('正在计算最短路径...')
      await new Promise(resolve => setTimeout(resolve, 10))
      
      // 执行计算密集型任务
      const result = await executePathAnalysisAsync()
      
      if (result) {
        analysisStore.setAnalysisStatus(`路径分析完成: 距离 ${result.distance.toFixed(2)}米`)
      } else {
        analysisStore.setAnalysisStatus('路径分析失败')
      }
      
    } catch (error) {
      console.error('路径分析失败:', error)
      analysisStore.setAnalysisStatus(`路径分析失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }
  
  // 异步执行路径分析的核心逻辑
  const executePathAnalysisAsync = async (): Promise<ShortestPathResult | null> => {
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
      
      // 验证坐标格式 - turf.js期望 [longitude, latitude] 格式
      console.log('原始起始点坐标:', startCoords)
      console.log('原始终点坐标:', endCoords)
      
      // 确保坐标格式正确 [longitude, latitude]
      if (startCoords.length < 2 || endCoords.length < 2) {
        throw new Error('坐标格式无效，需要至少包含经度和纬度')
      }
      
      // 按照test.html验证的格式创建起始点和终点坐标数组
      const start = [startCoords[0], startCoords[1]]
      const end = [endCoords[0], endCoords[1]]

      
      // 构建turf.js选项
      const options: any = {
        units: analysisOptions.value.units,
        resolution: analysisOptions.value.resolution
      }
      
      // 添加障碍物（如果已设置）
      console.log('=== 检查障碍物设置 ===')
      console.log('analysisOptions.value:', analysisOptions.value)
      console.log('analysisOptions.value.obstacles:', analysisOptions.value.obstacles)
      console.log('analysisOptions.value.obstacles 是否为null:', analysisOptions.value.obstacles === null)
      console.log('analysisOptions.value.obstacles 是否为undefined:', analysisOptions.value.obstacles === undefined)
      console.log('analysisOptions.value.obstacles 类型:', typeof analysisOptions.value.obstacles)
      
      if (analysisOptions.value.obstacles) {
        console.log('✅ 检测到障碍物，开始设置到options')
        
        // 直接使用turf.js FeatureCollection格式的障碍物
        options.obstacles = analysisOptions.value.obstacles
        console.log('✅ 障碍物已设置到options (FeatureCollection格式):', options.obstacles)
        
        // 验证障碍物数据格式
        console.log('=== 障碍物数据格式验证 ===')
        console.log('障碍物类型:', options.obstacles.type)
        console.log('是否为FeatureCollection:', options.obstacles.type === 'FeatureCollection')
        console.log('要素数量:', options.obstacles.features ? options.obstacles.features.length : 0)
        
        if (options.obstacles.features && options.obstacles.features.length > 0) {
          options.obstacles.features.forEach((feature: any, index: number) => {
            console.log(`障碍物${index} - 类型:`, feature.type, '几何类型:', feature.geometry.type)
            if (feature.geometry.type === 'Polygon') {
              const coords = feature.geometry.coordinates[0]
              console.log(`障碍物${index} - 坐标数量:`, coords.length)
              console.log(`障碍物${index} - 是否闭合:`, coords[0][0] === coords[coords.length-1][0] && coords[0][1] === coords[coords.length-1][1])
            }
          })
        }
      } else {
        console.log('无障碍物，使用直线路径分析')
        console.log('原因: analysisOptions.value.obstacles 为', analysisOptions.value.obstacles)
      }
      
      console.log('turf.js分析选项:', options)
      
      // 异步执行turf.js计算，避免阻塞UI
      const pathResult = await new Promise<any>((resolve, reject) => {
        // 使用setTimeout让出主线程
        setTimeout(() => {
          try {
            const result = shortestPath(start, end, options)
            resolve(result)
          } catch (error) {
            reject(error)
          }
        }, 0)
      })
      
      // 再次让出主线程
      await new Promise(resolve => setTimeout(resolve, 0))
      
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
      
      // 异步更新结果，避免阻塞UI
      await new Promise(resolve => setTimeout(resolve, 0))
      
      // 保存分析结果
      analysisResults.value = [result]
      
      // 异步显示路径结果
      await new Promise(resolve => setTimeout(resolve, 0))
      displayAnalysisResults([result])
      
      return result
      
    } catch (error) {
      console.error('路径分析失败:', error)
      throw error
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
      zIndex: 1000
    })
    
    // 设置图层标识属性
    layer.set('isStartPointLayer', true)
    layer.set('id', 'start-point-layer')
    
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
      zIndex: 1001
    })
    
    // 设置图层标识属性
    layer.set('isEndPointLayer', true)
    layer.set('id', 'end-point-layer')
    
    analysisLayers.value.endPointLayer = layer
    mapStore.map.addLayer(layer)
    
    console.log('目标点图层已创建并添加到地图:', layer)
    console.log('目标点图层引用已设置:', analysisLayers.value.endPointLayer)
  }
  
  // ===== 工具方法 =====
  
  // 将OpenLayers图层转换为turf.js可用的障碍物格式
  const convertLayerToObstacles = (layerId: string): any => {
    console.log('=== convertLayerToObstacles 开始 ===')
    console.log('传入的layerId:', layerId)
    
    try {
      const layerInfo = mapStore.vectorLayers.find(l => l.id === layerId)
      if (!layerInfo || !layerInfo.layer) {
        console.warn('未找到指定的图层:', layerId)
        return null
      }
      
      const source = layerInfo.layer.getSource()
      if (!source) {
        console.warn('图层没有数据源:', layerId)
        return null
      }
      
      const features = source.getFeatures()
      if (features.length === 0) {
        console.warn('图层没有要素:', layerId)
        return null
      }
      
      console.log(`开始转换图层 ${layerId}，包含 ${features.length} 个要素`)
      
      const turf = window.turf
      if (!turf) {
        console.error('turf.js库未加载')
        return null
      }
      
      // 转换所有要素为turf多边形Feature（按照test.html的格式）
      const polygonFeatures = features.map((feature: any, index: number) => {
        try {
          const geometry = feature.getGeometry()
          if (!geometry) {
            console.warn(`要素 ${index} 没有几何信息`)
            return null
          }
          
          const geometryType = geometry.getType()
          console.log(`要素 ${index} 几何类型:`, geometryType)
          
          // 获取坐标数据
          const coordinates = geometry.getCoordinates()
          if (!coordinates) {
            console.warn(`要素 ${index} 没有坐标数据`)
            return null
          }
          
          let polygonFeature
          
          if (geometryType === 'Polygon') {
            // 多边形：直接使用turf.polygon()创建，与test.html格式一致
            console.log(`要素 ${index} 多边形坐标:`, coordinates)
            polygonFeature = turf.polygon(coordinates)
            console.log(`要素 ${index} 使用turf.polygon创建成功`)
          } else if (geometryType === 'MultiPolygon') {
            // 多多边形
            polygonFeature = turf.multiPolygon(coordinates)
            console.log(`要素 ${index} 使用turf.multiPolygon创建成功`)
          } else if (geometryType === 'Point') {
            // 点：创建缓冲区多边形
            console.log(`要素 ${index} 点坐标:`, coordinates)
            const pointFeature = turf.point(coordinates)
            const buffered = turf.buffer(pointFeature, 0.0001, { units: 'kilometers' })
            polygonFeature = buffered
            console.log(`要素 ${index} 点转换为多边形成功`)
          } else if (geometryType === 'LineString') {
            // 线：创建缓冲区多边形
            console.log(`要素 ${index} 线坐标:`, coordinates)
            const lineFeature = turf.lineString(coordinates)
            const buffered = turf.buffer(lineFeature, 0.0001, { units: 'kilometers' })
            polygonFeature = buffered
            console.log(`要素 ${index} 线转换为多边形成功`)
          } else {
            console.warn(`要素 ${index} 几何类型不支持:`, geometryType)
            return null
          }
          
          // 验证转换后的多边形Feature
          if (!polygonFeature || !polygonFeature.geometry || !polygonFeature.geometry.coordinates) {
            console.warn(`要素 ${index} 最终转换失败`)
            return null
          }
          
          console.log(`要素 ${index} 最终转换成功:`, polygonFeature.geometry.type)
          return polygonFeature
        } catch (error) {
          console.error(`转换要素 ${index} 时出错:`, error)
          return null
        }
      }).filter(Boolean)
      
      if (polygonFeatures.length === 0) {
        console.warn('没有有效的要素可以转换为障碍物')
        return null
      }
      
      console.log(`成功转换 ${polygonFeatures.length} 个要素为多边形障碍物`)
      
      // 使用turf.featureCollection()创建FeatureCollection（与test.html格式一致）
      const obstaclesData = turf.featureCollection(polygonFeatures)
      
      console.log('=== 障碍物数据格式 ===')
      console.log('返回格式: FeatureCollection (使用turf.featureCollection创建)')
      console.log('要素数量:', obstaclesData.features.length)
      console.log('turf.js格式验证:', obstaclesData.type === 'FeatureCollection')
      console.log('障碍物数据:', obstaclesData)
      
      return obstaclesData
    } catch (error) {
      console.error('转换障碍物图层时出错:', error)
      return null
    }
  }
  
  // 设置障碍物图层
  const setObstacleLayer = (layerId: string | null): void => {
    console.log('=== 设置障碍物图层 ===')
    console.log('传入的layerId:', layerId)
    
    if (layerId) {
      // 1. 显示绘制图层的原始JSON格式数据
      const layerInfo = mapStore.vectorLayers.find(l => l.id === layerId)
      if (layerInfo && layerInfo.layer) {
        const source = layerInfo.layer.getSource()
        if (source) {
          const features = source.getFeatures()
          console.log('=== 1. 绘制图层的原始数据 ===')
          console.log('图层名称:', layerInfo.name)
          console.log('要素数量:', features.length)
          
          // 转换为GeoJSON格式显示原始数据
          const geoJsonData = {
            type: 'FeatureCollection',
            features: features.map((feature: any) => {
              const format = new window.ol.format.GeoJSON()
              return format.writeFeatureObject(feature, {
                dataProjection: 'EPSG:4326',
                featureProjection: mapStore.map.getView().getProjection().getCode()
              })
            })
          }
        }
      }
      
      const obstacles = convertLayerToObstacles(layerId)
      
      if (obstacles && obstacles.type) {
        console.log('GeoJSON类型:', obstacles.type)
      }

      
      analysisOptions.value.obstacles = obstacles
      console.log('✅ 障碍物已设置到analysisOptions:', analysisOptions.value.obstacles)
      console.log('✅ 设置后的analysisOptions.value:', analysisOptions.value)
    } else {
      analysisOptions.value.obstacles = null
      console.log('❌ 清除障碍物')
    }
    
    console.log('=== 障碍物设置完成 ===')
    console.log('最终analysisOptions.value:', analysisOptions.value)

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