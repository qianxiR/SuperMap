import { ref, computed, ref as vueRef } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import { useAnalysisStore } from '@/stores/analysisStore'
import { useLayerExport } from '@/composables/useLayerExport'
import { useShortestPathAnalysisStore } from '@/stores/shortestPathAnalysisStore'
import { getAnalysisServiceConfig } from '@/api/config'
import { convertFeatureToTurfGeometry, convertFeaturesToTurfGeometries } from '@/utils/geometryConverter'
import { uselayermanager } from '@/composables/useLayerManager'

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
  properties: Record<string, any> // 保留完整属性数据
  distance: number
  duration: number
  pathType: string
  sourcelayerName: string
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
  const shortestPathStore = useShortestPathAnalysisStore()
  const { exportFeaturesAsGeoJSON } = useLayerExport()
  const { saveFeaturesAslayer } = uselayermanager()
  const lastFeatureCollection = vueRef<any | null>(null)
  
  // 从 store 获取状态
  const {
    state,
    hasResults,
    canAnalyze,
    hasStartPoint,
    hasEndPoint,
    currentResult,
    startPointInfo,
    endPointInfo,
    setStartPoint,
    setEndPoint,
    updateAnalysisOptions,
    setAnalysisResults,
    setIsAnalyzing,
    setIsSelectingStartPoint,
    setIsSelectingEndPoint,
    setLayerName,
    setAnalysisLayers,
    clearResults: clearResultsStore,
    clearPoints,
    clearAll
  } = shortestPathStore
  
  // 直接使用 store 的状态，不解构
  
  // 重新定义计算属性，确保响应式更新
  const canAnalyzeLocal = computed(() => !!(state.startPoint && state.endPoint))
  
  const startPointInfoLocal = computed<PointInfo | null>(() => {
    if (!state.startPoint) return null
    
    const geometry = state.startPoint.getGeometry()
    const coords = geometry?.getCoordinates()
    
    return {
      name: '起始点',
      coordinates: coords ? `${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}` : '未知坐标',
      geometry: geometry
    }
  })
  
  const endPointInfoLocal = computed<PointInfo | null>(() => {
    if (!state.endPoint) return null
    
    const geometry = state.endPoint.getGeometry()
    const coords = geometry?.getCoordinates()
    
    return {
      name: '目标点',
      coordinates: coords ? `${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}` : '未知坐标',
      geometry: geometry
    }
  })
  
  // ===== 图层显示方法 =====
  
  const displayAnalysisResults = (featureCollection: any): void => {
    // 只移除之前的路径图层，保留起始点和目标点
    removePathlayersOnly()
    
    if (!featureCollection.features || featureCollection.features.length === 0) return
    
    console.log('=== displayAnalysisResults - 开始处理最短路径分析结果 ===')
    console.log('结果数量:', featureCollection.features.length)
    console.log('完整结果数据:', JSON.stringify(featureCollection, null, 2))

    const pathFeatures: any[] = []
    
    featureCollection.features.forEach((feature: any, index: number) => {
      console.log(`=== 处理第 ${index + 1} 个要素 ===`)
      console.log('feature.geometry.type:', feature.geometry.type)
      console.log('feature完整结构:', JSON.stringify(feature, null, 2))
      
      // 处理后端返回的Feature数据
      try {
        let geometry;
        
        // 检查geometry类型并相应处理
        if (feature.geometry.type === 'FeatureCollection') {
          // 如果geometry本身是FeatureCollection，处理其中的features
          const geoJSONFormat = new window.ol.format.GeoJSON()
          const features = geoJSONFormat.readFeatures(feature.geometry)
          features.forEach((olFeature: any) => {
            const featureGeometry = olFeature.getGeometry()
            if (featureGeometry) {
              const newFeature = new window.ol.Feature({
                geometry: featureGeometry,
                ...feature.properties // 直接展开属性到Feature根级别
              })
              pathFeatures.push(newFeature)
            }
          })
        } else {
          // 正常的Geometry类型
          geometry = new window.ol.format.GeoJSON().readGeometry(feature.geometry)
          const olFeature = new window.ol.Feature({
            geometry: geometry,
            ...feature.properties // 直接展开属性到Feature根级别
          })
          pathFeatures.push(olFeature)
        }
      } catch (error) {
        console.error(`处理第${index + 1}个要素时出错:`, error, feature)
      }
    })
    
    console.log('=== displayAnalysisResults - 处理完成 ===')
    console.log('最终生成的要素数量:', pathFeatures.length)
    console.log('所有生成要素的属性信息:')
    pathFeatures.forEach((feature, index) => {
      console.log(`要素${index + 1}:`, feature.getProperties?.())
    })
    console.log('=== 开始添加到地图 ===')
    
    // 设置分析及绘制图层样式
    const analysislayer = new window.ol.layer.Vector({
      source: new window.ol.source.Vector({ features: pathFeatures }),
      style: getAnalysislayerStyle(),
      zIndex: 999
    })
    
    // 设置图层标识属性
    analysislayer.set('isAnalysislayer', true)
    analysislayer.set('id', `path-layer-${Date.now()}`)
    analysislayer.set('analysisType', 'path')
    analysislayer.set('analysisResults', featureCollection.features)
    
    setAnalysisLayers({ pathlayer: analysislayer })
    mapStore.map.addLayer(analysislayer)
    
    // 自动缩放到分析结果范围
    const extent = analysislayer.getSource().getExtent()
    if (extent && extent.every((coord: number) => isFinite(coord))) {
      mapStore.map.getView().fit(extent, {
        padding: [50, 50, 50, 50],
        maxZoom: 16
      })
    }
  }

  // ===== 保存为图层 / 导出为JSON =====
  const savePathResultsAsLayer = async (layerName?: string): Promise<boolean> => {
    const fc = lastFeatureCollection.value
    if (!fc || !fc.features || fc.features.length === 0) return false
    
    // 将FeatureCollection.features展开并转换为OL Feature后再保存
    const format = new window.ol.format.GeoJSON()
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
        const olFeature = new window.ol.Feature({ geometry })
        if (feature.properties) {
          olFeature.setProperties(feature.properties)
        }
        olFeatures.push(olFeature)
      }
    })
    
    return saveFeaturesAslayer(olFeatures as any[], layerName || '最短路径分析结果', 'path')
  }

  const exportPathResultsAsJSON = async (fileName?: string): Promise<any> => {
    const fc = lastFeatureCollection.value
    if (!fc || !fc.features || fc.features.length === 0) return false
    return exportFeaturesAsGeoJSON(fc.features, fileName || '最短路径分析结果')
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

  // 获取分析及绘制图层样式 - 使用主题色
  const getAnalysislayerStyle = () => {
    return new window.ol.style.Style({
      stroke: new window.ol.style.Stroke({
        color: '#0078D4', // 蓝色
        width: 4
      }),
      fill: new window.ol.style.Fill({
        color: '#0078D44D' // 蓝色，70%透明度
      })
    })
  }
  
  
  // 生成图层名称
  const generatelayerNameFromAnalysis = (): string => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    return `分析及绘制图层_${timestamp}`
  }
  
  // ===== 清空图层方法 =====
  
  const clearResults = () => {
    removeAnalysislayers()
    clearAll()
  }
  
  const removePathlayersOnly = (): void => {
    if (!mapStore.map) return
    
    const layers = mapStore.map.getLayers().getArray()
    layers.forEach((layer: any) => {
      if (layer.get && layer.get('analysisType') === 'path') {
        mapStore.map.removeLayer(layer)
      }
    })
    
    setAnalysisLayers({ pathlayer: null })
  }
  
  const removeAnalysislayers = (): void => {
    if (!mapStore.map) return
    
    // 直接通过图层引用移除图层
    if (state.analysislayers.startPointlayer) {
      mapStore.map.removeLayer(state.analysislayers.startPointlayer)
      setAnalysisLayers({ startPointlayer: null })
    }
    
    if (state.analysislayers.endPointlayer) {
      mapStore.map.removeLayer(state.analysislayers.endPointlayer)
      setAnalysisLayers({ endPointlayer: null })
    }
    
    if (state.analysislayers.pathlayer) {
      mapStore.map.removeLayer(state.analysislayers.pathlayer)
      setAnalysisLayers({ pathlayer: null })
    }
    
    // 额外检查：通过图层属性移除可能遗漏的图层
    const layers = mapStore.map.getLayers().getArray()
    layers.forEach((layer: any) => {
      if (layer.get && (layer.get('isAnalysislayer') || layer.get('isStartPointlayer') || layer.get('isEndPointlayer') || layer.get('analysisType') === 'path')) {
        mapStore.map.removeLayer(layer)
      }
    })
  }
  
  // ===== 导出为GeoJSON方法 =====
  
  const exportGeoJSON = async () => {
    const allFeatures: any[] = []
    
    // 添加路径要素
    state.analysisResults.forEach(result => {
      allFeatures.push({
        type: 'Feature',
        geometry: result.geometry,
        properties: {
          id: result.id,
          name: result.name,
          distance: result.distance,
          duration: result.duration,
          pathType: result.pathType,
          sourcelayer: result.sourcelayerName,
          createdAt: result.createdAt,
          featureType: 'path' // 标识为路径要素
        }
      })
    })
    
    // 添加起始点要素
    if (state.startPoint) {
      const startGeometry = state.startPoint.getGeometry()
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
    if (state.endPoint) {
      const endGeometry = state.endPoint.getGeometry()
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
    
    await exportFeaturesAsGeoJSON(allFeatures, '最短路径分析结果', {
      analysisType: 'shortest_path_analysis',
      description: '最短路径分析生成的路径和起终点要素',
      parameters: {
        pathCount: state.analysisResults.length,
        hasStartPoint: !!state.startPoint,
        hasEndPoint: !!state.endPoint,
        units: state.analysisOptions.units
      }
    })
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
    
    // 保存到store
    if (pointType === 'start') {
      setStartPoint(pointFeature)
      displayStartPoint(pointFeature)
    } else {
      setEndPoint(pointFeature)
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
    setIsSelectingStartPoint(true)
    setIsSelectingEndPoint(false)
    
    const clickListener = (event: any) => {
      const coordinate = event.coordinate
      
      // 使用通用函数创建和显示起始点
      createAndDisplayPoint(coordinate, 'start')
      
      mapStore.map.un('singleclick', clickListener)
      setIsSelectingStartPoint(false)
      
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
    setIsSelectingEndPoint(true)
    setIsSelectingStartPoint(false)
    
    const clickListener = (event: any) => {
      const coordinate = event.coordinate
      
      // 使用通用函数创建和显示目标点
      createAndDisplayPoint(coordinate, 'end')
      
      mapStore.map.un('singleclick', clickListener)
      setIsSelectingEndPoint(false)
      
      analysisStore.setAnalysisStatus('目标点已绘制，可以开始最短路径分析')
    }
    
    mapStore.map.on('singleclick', clickListener)
    analysisStore.setAnalysisStatus('请在地图上点击绘制分析点2')
  }
  
  // ===== 分析执行功能 =====
  
  const executePathAnalysis = async (): Promise<void> => {
    if (!canAnalyzeLocal.value) {
      analysisStore.setAnalysisStatus('请先绘制两个分析点')
      return
    }
    
    analysisStore.setAnalysisStatus('正在计算最短路径...')
    
    try {
      removePathlayersOnly()
      
      // 提取起点和终点坐标
      const startGeometry = state.startPoint.getGeometry()
      const endGeometry = state.endPoint.getGeometry()
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
          units: state.analysisOptions.units || 'kilometers',
          resolution: state.analysisOptions.resolution || 1000
        },
        options: {
          returnGeometry: true,
          calculateDistance: true,
          calculateDuration: true,
          averageSpeed: 50
        }
      }
      
      // 如果有障碍物数据，添加到请求中（使用现有的obstacles数据）
      if (state.analysisOptions.obstacles) {
        requestData.obstacleData = state.analysisOptions.obstacles
        console.log('[ShortestPath] 发送障碍物数据:', {
          obstacleCount: state.analysisOptions.obstacles.features?.length || 0
        })
      }
      
      console.log('[ShortestPath] 发送API请求:', requestData)
      
      // 调用后端API
      const API_BASE_URL = getAnalysisServiceConfig().baseUrl
      const response = await fetch(`${API_BASE_URL}/shortest-path`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`API请求失败: ${errorData.error?.message || '未知错误'}`)
      }
      
      const apiResponse = await response.json()
      
      
      // 后端现在直接返回 FeatureCollection 格式
      if (!apiResponse.features) {
        throw new Error('API响应格式错误：缺少features数据')
      }
      
      const features = apiResponse.features
      
      // 从features数组中提取路径数据 - 查找LineString类型的路径线
      const pathFeature = features.find((feature: any) => 
        feature.geometry?.type === 'LineString' && 
        feature.properties?.analysisType === 'shortest-path'
      )
      
      if (!pathFeature) {
        throw new Error('未获取到路径数据')
      }
      
      
      // 保存结果到store（用于面板状态判断）- 直接保存API返回的完整FeatureCollection
      setAnalysisResults(apiResponse)
      
      // 保存结果到lastFeatureCollection（用于导出和保存图层功能）
      lastFeatureCollection.value = apiResponse
      
      // 直接显示API返回的FeatureCollection
      displayAnalysisResults(apiResponse)
      
      const distance = apiResponse.statistics?.distance || 0
      const duration = apiResponse.statistics?.duration || 0
      const statusMessage = `最短路径分析完成，距离: ${distance} 米，预计时间: ${duration} 分钟`
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
    
    if (state.analysislayers.startPointlayer) {
      mapStore.map.removeLayer(state.analysislayers.startPointlayer)
    }
    
    const source = new window.ol.source.Vector({
      features: [pointFeature]
    })
    
    const layer = new window.ol.layer.Vector({
      source: source,
      zIndex: 1000
    })
    
    layer.set('isStartPointlayer', true)
    layer.set('id', 'start-point-layer')
    
    setAnalysisLayers({ startPointlayer: layer })
    mapStore.map.addLayer(layer)
  }
  
  const displayEndPoint = (pointFeature: any): void => {
    if (!mapStore.map) return
    
    if (state.analysislayers.endPointlayer) {
      mapStore.map.removeLayer(state.analysislayers.endPointlayer)
    }
    
    const source = new window.ol.source.Vector({
      features: [pointFeature]
    })
    
    const layer = new window.ol.layer.Vector({
      source: source,
      zIndex: 1001
    })
    
    layer.set('isEndPointlayer', true)
    layer.set('id', 'end-point-layer')
    
    setAnalysisLayers({ endPointlayer: layer })
    mapStore.map.addLayer(layer)
  }
  
  // ===== 工具方法 =====
  
  const convertlayerToObstacles = (layerName: string): any => {
    try {
      // 仅通过图层名称查找图层
      const layerInfo = mapStore.vectorlayers.find(l => l.name === layerName)
      if (!layerInfo || !layerInfo.layer) {
        console.warn(`[ShortestPath] 未找到图层: ${layerName}`)
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
  
  const setObstaclelayer = (layerName: string | null): void => {
    if (layerName) {
      const obstacles = convertlayerToObstacles(layerName)
      updateAnalysisOptions({ obstacles })
      console.log(`[ShortestPath] 设置障碍物图层: ${layerName}`)
    } else {
      updateAnalysisOptions({ obstacles: null })
      console.log('[ShortestPath] 清除障碍物图层')
    }
  }
  
  // 更新分析选项
  const updateAnalysisOptionsLocal = (options: Partial<ShortestPathOptions>): void => {
    updateAnalysisOptions(options)
  }
  
  // 清除地图交互
  const clearMapInteractions = (): void => {
    setIsSelectingStartPoint(false)
    setIsSelectingEndPoint(false)
  }
  
 
  
  // Agent事件驱动的最短路径分析执行方法
  const executeShortestPathAnalysisByAgent = async (startLayerName: string, endLayerName: string, obstacleLayerName?: string): Promise<void> => {
    // 根据图层名称查找图层
    const startLayer = mapStore.vectorlayers.find(l => l.name === startLayerName)
    const endLayer = mapStore.vectorlayers.find(l => l.name === endLayerName)
    
    if (!startLayer) {
      throw new Error(`未找到起点图层: ${startLayerName}`)
    }
    
    if (!endLayer) {
      throw new Error(`未找到终点图层: ${endLayerName}`)
    }
    
    // 获取起点和终点的第一个要素作为分析点
    const startFeatures = startLayer.layer?.getSource()?.getFeatures() || []
    const endFeatures = endLayer.layer?.getSource()?.getFeatures() || []
    
    if (startFeatures.length === 0) {
      throw new Error(`起点图层 ${startLayerName} 没有要素`)
    }
    
    if (endFeatures.length === 0) {
      throw new Error(`终点图层 ${endLayerName} 没有要素`)
    }
    
    // 使用第一个要素的几何中心作为起点和终点
    const startFeature = startFeatures[0]
    const endFeature = endFeatures[0]
    
    const startGeometry = startFeature.getGeometry()
    const endGeometry = endFeature.getGeometry()
    
    if (!startGeometry || !endGeometry) {
      throw new Error('无法获取起点或终点的几何信息')
    }
    
    // 获取几何中心点坐标
    const startCoords = startGeometry.getType() === 'Point' 
      ? startGeometry.getCoordinates()
      : startGeometry.getExtent()
    
    const endCoords = endGeometry.getType() === 'Point'
      ? endGeometry.getCoordinates()
      : endGeometry.getExtent()
    
    // 对于非点要素，使用几何中心
    const startPoint = startGeometry.getType() === 'Point' 
      ? startCoords
      : [(startCoords[0] + startCoords[2]) / 2, (startCoords[1] + startCoords[3]) / 2]
    
    const endPoint = endGeometry.getType() === 'Point'
      ? endCoords
      : [(endCoords[0] + endCoords[2]) / 2, (endCoords[1] + endCoords[3]) / 2]
    
    // 创建起点和终点要素
    const startPointFeature = new window.ol.Feature({
      geometry: new window.ol.geom.Point(startPoint)
    })
    
    const endPointFeature = new window.ol.Feature({
      geometry: new window.ol.geom.Point(endPoint)
    })
    
    // 设置起点和终点
    setStartPoint(startPointFeature)
    setEndPoint(endPointFeature)
    
    // 如果有障碍物图层，设置障碍物
    if (obstacleLayerName) {
      console.log(`[Agent] 设置障碍物图层: ${obstacleLayerName}`)
      setObstaclelayer(obstacleLayerName)
    }
    
    // 执行最短路径分析
    await executePathAnalysis()
  }

  return {
    // 状态 (从 store 获取)
    analysisResults: computed(() => state.analysisResults),
    layerName: computed(() => state.layerName),
    startPointInfo: startPointInfoLocal,
    endPointInfo: endPointInfoLocal,
    canAnalyze: canAnalyzeLocal,
    isSelectingStartPoint: computed(() => state.isSelectingStartPoint),
    isSelectingEndPoint: computed(() => state.isSelectingEndPoint),
    analysisOptions: computed(() => state.analysisOptions),
    lastFeatureCollection,
    
    // 方法
    selectStartPoint,
    selectEndPoint,
    executePathAnalysis,
    executeShortestPathAnalysisByAgent,
    clearResults,
    exportGeoJSON,
    setObstaclelayer,
    updateAnalysisOptions: updateAnalysisOptionsLocal,
    displayAnalysisResults,
    savePathResultsAsLayer,
    exportPathResultsAsJSON
  }
}