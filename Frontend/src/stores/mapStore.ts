import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { MapConfig, Coordinate, MapLayer, VectorLayerConfig } from '@/types/map'
import { createAPIConfig, getFullUrl } from '@/utils/config'
import { useAnalysisStore } from '@/stores/analysisStore'

const useMapStore = defineStore('map', () => {
  // 地图实例
  const map = ref<any>(null) // ol.Map
  const isMapReady = ref<boolean>(false)
  
  // 图层管理
  const baseLayer = ref<any>(null) // ol.layer.Tile
  const hoverLayer = ref<any>(null) // ol.layer.Vector
  const selectLayer = ref<any>(null) // ol.layer.Vector
  const vectorLayers = ref<MapLayer[]>([])

  const customLayers = ref<MapLayer[]>([])
  
  // 鼠标坐标
  const currentCoordinate = ref<Coordinate>({ lon: null, lat: null })
  
  // 距离量算相关状态
  const distanceMeasureMode = ref<boolean>(false)
  const distanceMeasureResult = ref<{ distance: number; unit: string } | null>(null)
  const measureLayer = ref<any>(null) // 量算图层
  const measureInteraction = ref<any>(null) // 量算交互
  
  // 面积量算相关状态
  const areaMeasureMode = ref<boolean>(false)
  const areaMeasureResult = ref<{ area: number; unit: string } | null>(null)
  const areaMeasureLayer = ref<any>(null) // 面积量算图层
  const areaMeasureInteraction = ref<any>(null) // 面积量算交互
  
  // 鹰眼相关状态
  const overviewMapVisible = ref<boolean>(false)
  
  // 主题变化监听
  let themeObserver: MutationObserver | null = null // 主题变化观察器

  // 更新测量图层样式的函数
  const updateMeasureLayerStyle = () => {
    if (!measureLayer.value && !areaMeasureLayer.value) return
    
    try {
      const ol = window.ol
      
      // 重新获取测量线条颜色
      const measureColor = getComputedStyle(document.documentElement).getPropertyValue('--measure-line-color').trim() || '#212529'
      const measureRgb = getComputedStyle(document.documentElement).getPropertyValue('--measure-line-rgb').trim() || '33, 37, 41'
      
      console.log('更新测量图层样式，颜色:', measureColor, 'RGB:', measureRgb)
      
      // 创建新样式
      const newStyle = new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: measureColor,
          width: 3,
          lineCap: 'round',
          lineJoin: 'round'
        }),
        fill: new ol.style.Fill({
          color: `rgba(${measureRgb}, 0.1)`
        })
      })
      
      // 更新距离测量图层样式
      if (measureLayer.value) {
        measureLayer.value.setStyle(newStyle)
        measureLayer.value.changed()
      }
      
      // 更新面积测量图层样式
      if (areaMeasureLayer.value) {
        areaMeasureLayer.value.setStyle(newStyle)
        areaMeasureLayer.value.changed()
      }
      
      console.log('测量图层样式更新完成')
    } catch (error) {
      console.error('更新测量图层样式失败:', error)
    }
  }

  // 监听主题变化的函数
  const handleThemeChange = () => {
    console.log('检测到主题变化，更新测量图层样式')
    updateMeasureLayerStyle()
  }

  // 初始化主题变化监听
  const initThemeObserver = () => {
    if (themeObserver) {
      themeObserver.disconnect()
    }
    
    themeObserver = new MutationObserver(handleThemeChange)
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    })
    
    console.log('测量主题变化监听器已初始化')
  }

  // 清理主题变化监听
  const cleanupThemeObserver = () => {
    if (themeObserver) {
      themeObserver.disconnect()
      themeObserver = null
      console.log('测量主题变化监听器已清理')
    }
  }
  
  // 计算属性
  const formattedCoordinate = computed(() => {
    if (currentCoordinate.value.lon === null || currentCoordinate.value.lat === null) {
      return '经度: -, 纬度: -'
    }
    return `经度: ${currentCoordinate.value.lon.toFixed(6)}, 纬度: ${currentCoordinate.value.lat.toFixed(6)}`
  })

  const hasMapDiff = computed(() => {
    const hasCustomLayers = customLayers.value.length > 0
    const hasSelections = selectLayer.value && selectLayer.value.getSource() && selectLayer.value.getSource().getFeatures().length > 0
    return hasCustomLayers || !!hasSelections
  })
  



  /**
   * 创建地图配置 - 整合SuperMap服务配置和图层样式配置
   * 调用者: mapStore.ts -> mapConfig
   * 作用: 将API配置转换为地图可用的配置，包括服务URL和图层样式
   */
  const createMapConfig = (): MapConfig => {
    // ===== 获取SuperMap API配置 =====
    // 调用者: createMapConfig() -> createAPIConfig()
    // 作用: 获取所有SuperMap服务器连接配置和图层定义
    const apiConfig = createAPIConfig()
    
    // ===== 创建矢量图层样式配置 =====
    // 调用者: createMapConfig()
    // 作用: 为每个矢量图层创建对应的样式配置，支持主题切换
    const vectorLayerConfigs: VectorLayerConfig[] = apiConfig.wuhanLayers
      .filter(layer => layer.type !== 'raster') // 过滤掉栅格图层
      .map(layer => {
        const baseStyle = {
          stroke: { width: 1.5, color: 'var(--accent)' },
          fill: { color: 'var(--selection-bg)' }
        }
        
        // 特殊处理县级图层，使用主题色
        const layerName = layer.name.split('@')[0] || layer.name
        if (layerName === '武汉_县级') {
          return {
            name: layer.name,
            style: {
              stroke: { width: 1.5, color: 'var(--layer-stroke-武汉_县级)' },
              fill: { color: 'var(--layer-fill-武汉_县级)' }
            }
          }
        }
        
        // 根据图层类型调整样式 - 使用CSS变量
        const strokeVar = `var(--layer-stroke-${layerName})`
        const fillVar = `var(--layer-fill-${layerName})`
        
        switch (layer.type) {
          case 'point':
            return {
              name: layer.name,
              style: {
                ...baseStyle,
                stroke: { width: 2, color: strokeVar },
                fill: { color: fillVar }
              }
            }
          case 'line':
            return {
              name: layer.name,
              style: {
                ...baseStyle,
                stroke: { width: 2, color: strokeVar },
                fill: { color: 'rgba(0, 0, 0, 0)' }
              }
            }
          case 'polygon':
            return {
              name: layer.name,
              style: {
                ...baseStyle,
                stroke: { width: 1.5, color: strokeVar },
                fill: { color: fillVar }
              }
            }
          default:
            return {
              name: layer.name,
              style: {
                stroke: { width: 1.5, color: strokeVar },
                fill: { color: fillVar }
              }
            }
        }
      })
    
    // ===== 返回完整地图配置 =====
    // 调用者: mapStore.ts -> mapConfig
    // 作用: 整合所有配置信息，包括服务URL、图层样式、地图中心点等
    return {
      // ===== 地图服务URL配置 =====
      // 调用者: useMap.ts -> updateBaseMap() -> getFullUrl('map')
      // 服务器地址: ${baseUrl}/${mapService} (地图服务)
      // 作用: 提供地图瓦片服务的访问地址
      baseUrl: getFullUrl('map'),
      
      // ===== 数据服务URL配置 =====
      // 调用者: useMap.ts -> loadVectorLayer() -> featureService
      // 服务器地址: ${baseUrl}/${dataService} (数据服务)
      // 作用: 提供矢量要素数据的访问地址
      dataUrl: getFullUrl('data'),
      
      datasetName: apiConfig.datasetName,
      vectorLayers: vectorLayerConfigs,
      
      // ===== 地图显示配置 =====
      // 作用: 定义地图的初始显示参数
      center: [114.37, 30.69], // 武汉市中心坐标
      zoom: 8,                 // 初始缩放级别
      projection: 'EPSG:4326', // 坐标系
      extent: [113.7, 29.97, 115.08, 31.36] // 武汉地区边界范围
    }
  }
  
  const mapConfig = ref<MapConfig>(createMapConfig())
  
  // Actions
  function setMap(mapInstance: any) { // ol.Map
    map.value = mapInstance
    isMapReady.value = true
  }
  
  function setLayers(layers: { base: any, hover: any, select: any }) {
    baseLayer.value = layers.base
    hoverLayer.value = layers.hover
    selectLayer.value = layers.select
  }
  
  function updateCoordinate(coordinate: number[]) {
    currentCoordinate.value = {
      lon: coordinate[0],
      lat: coordinate[1]
    }
  }

  function clearCoordinate() {
    currentCoordinate.value = { lon: null, lat: null }
  }
  
  function getSelectedFeatures(): any[] { // ol.Feature[]
    if (selectLayer.value && selectLayer.value.getSource) {
      const source = selectLayer.value.getSource()
      return source ? source.getFeatures() : []
    }
    return []
  }

  function clearAllLayers() {
    if (map.value) {
      customLayers.value.forEach(item => {
        try { map.value.removeLayer(item.layer) } catch (_) { /* noop */ }
      })
      vectorLayers.value.forEach(item => {
        try { map.value.removeLayer(item.layer) } catch (_) { /* noop */ }
      })
    }
    customLayers.value = []
    vectorLayers.value = []
    if (selectLayer.value && selectLayer.value.getSource()) {
      selectLayer.value.getSource().clear()
    }
  }

  function reloadConfig() {
    mapConfig.value = createMapConfig()
  }

  // 距离量算功能 - 直接使用SuperMap iClient API
  function startDistanceMeasure() {
    if (!map.value) return
    
    // 确保停止绘制工具
    const analysisStore = useAnalysisStore()
    if (analysisStore.drawMode !== '') {
      console.log('停止绘制工具，启动距离测量')
      analysisStore.setDrawMode('')
    }
    
    // 确保停止面积测量
    if (areaMeasureMode.value) {
      console.log('停止面积测量，启动距离测量')
      stopAreaMeasure()
    }
    
    const ol = window.ol
    
    // 获取测量线条颜色
    const measureColor = getComputedStyle(document.documentElement).getPropertyValue('--measure-line-color').trim() || '#212529'
    const measureRgb = getComputedStyle(document.documentElement).getPropertyValue('--measure-line-rgb').trim() || '33, 37, 41'
    
    console.log('初始化距离测量，颜色:', measureColor, 'RGB:', measureRgb)
    
    // 创建量算图层
    const measureSource = new ol.source.Vector({ wrapX: false })
    measureLayer.value = new ol.layer.Vector({
      source: measureSource,
      style: new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: measureColor,
          width: 3,
          lineCap: 'round',
          lineJoin: 'round'
        }),
        fill: new ol.style.Fill({
          color: `rgba(${measureRgb}, 0.1)`
        })
      })
    })
    
    // 设置测量图层标识，防止被保存为要素
    measureLayer.value.set('isMeasureLayer', true)
    measureLayer.value.set('measureType', 'distance')
    
    map.value.addLayer(measureLayer.value)
    
    // 创建独立的量算交互 - 不依赖绘制工具
    measureInteraction.value = new ol.interaction.Draw({
      source: measureSource,
      type: 'LineString',
      snapTolerance: 20
    })
    
    // 设置测量交互标识
    measureInteraction.value.set('isMeasureInteraction', true)
    measureInteraction.value.set('measureType', 'distance')
    
    // 监听绘制完成事件
    measureInteraction.value.on('drawend', (event: any) => {
      const feature = event.feature
      const geometry = feature.getGeometry()
      
      // 设置测量要素标识，防止被保存为永久要素
      feature.set('isMeasureFeature', true)
      feature.set('measureType', 'distance')
      
      // 打印几何信息
      console.log('=== 距离量测API调用信息 ===')
      console.log('绘制要素:', feature)
      console.log('几何对象:', geometry)
      console.log('几何类型:', geometry.getType())
      console.log('几何坐标:', geometry.getCoordinates())
      
      // 尝试使用SuperMap MeasureService进行距离量算
      try {
        const distanceMeasureParam = new ol.supermap.MeasureParameters(geometry)
        console.log('MeasureParameters对象:', distanceMeasureParam)
        
        // 获取地图服务URL - 直接使用正确的URL
        const url = 'http://localhost:8090/iserver/services/map-WuHan/rest/maps/武汉'
        console.log('SuperMap服务URL:', url)
        
        // 直接调用SuperMap MeasureService API
        const measureService = new ol.supermap.MeasureService(url, { measureMode: 'distance' })
        console.log('MeasureService对象:', measureService)
        
        console.log('开始调用measureDistance API...')
        measureService.measureDistance(distanceMeasureParam)
          .then((serviceResult: any) => {
            console.log('SuperMap MeasureService返回结果:', serviceResult)
            if (serviceResult && serviceResult.result) {
              const result = serviceResult.result
              distanceMeasureResult.value = {
                distance: result.distance,
                unit: result.unit || '米'
              }
            }
          })
          .catch((error: any) => {
            console.error('SuperMap服务距离量算失败:', error)
            console.error('错误详情:', error?.message)
            console.error('错误堆栈:', error?.stack)
          })
      } catch (error: any) {
        console.error('SuperMap MeasureService初始化失败:', error)
        console.error('错误详情:', error?.message)
        console.error('错误堆栈:', error?.stack)
      }
    })
    
    map.value.addInteraction(measureInteraction.value)
    distanceMeasureMode.value = true
    
    // 同步分析状态
    analysisStore.setDistanceMeasureMode(true)
  }
  
  function stopDistanceMeasure() {
    if (measureInteraction.value && map.value) {
      map.value.removeInteraction(measureInteraction.value)
      measureInteraction.value = null
    }
    
    if (measureLayer.value && map.value) {
      map.value.removeLayer(measureLayer.value)
      measureLayer.value = null
    }
    
    // 清理主题变化监听
    cleanupThemeObserver()
    
    distanceMeasureMode.value = false
    distanceMeasureResult.value = null
    
    // 同步分析状态
    const analysisStore = useAnalysisStore()
    analysisStore.setDistanceMeasureMode(false)
  }
  
  function clearDistanceMeasure() {
    if (measureLayer.value && measureLayer.value.getSource()) {
      measureLayer.value.getSource().clear()
    }
    distanceMeasureResult.value = null
  }
  
     // 面积量算功能 - 使用SuperMap iClient API
   function startAreaMeasure() {
     if (!map.value) return
     
     // 确保停止绘制工具
     const analysisStore = useAnalysisStore()
     if (analysisStore.drawMode !== '') {
       console.log('停止绘制工具，启动面积测量')
       analysisStore.setDrawMode('')
     }
     
     // 确保停止距离测量
     if (distanceMeasureMode.value) {
       console.log('停止距离测量，启动面积测量')
       stopDistanceMeasure()
     }
     
     const ol = window.ol
     
     // 获取测量线条颜色
     const measureColor = getComputedStyle(document.documentElement).getPropertyValue('--measure-line-color').trim() || '#212529'
     const measureRgb = getComputedStyle(document.documentElement).getPropertyValue('--measure-line-rgb').trim() || '33, 37, 41'
     
     console.log('初始化面积测量，颜色:', measureColor, 'RGB:', measureRgb)
     
     // 创建量算图层
     const measureSource = new ol.source.Vector({ wrapX: false })
     areaMeasureLayer.value = new ol.layer.Vector({
       source: measureSource,
       style: new ol.style.Style({
         stroke: new ol.style.Stroke({
           color: measureColor,
           width: 3,
           lineCap: 'round',
           lineJoin: 'round'
         }),
         fill: new ol.style.Fill({
           color: `rgba(${measureRgb}, 0.1)`
         })
       })
     })
     
     // 设置面积测量图层标识，防止被保存为要素
     areaMeasureLayer.value.set('isMeasureLayer', true)
     areaMeasureLayer.value.set('measureType', 'area')
     
    map.value.addLayer(areaMeasureLayer.value)
    
    // 创建独立的面积量算交互 - 不依赖绘制工具
    areaMeasureInteraction.value = new ol.interaction.Draw({
      source: measureSource,
      type: 'Polygon',
      snapTolerance: 20
    })
    
    // 设置测量交互标识
    areaMeasureInteraction.value.set('isMeasureInteraction', true)
    areaMeasureInteraction.value.set('measureType', 'area')
    
    // 监听绘制完成事件
    areaMeasureInteraction.value.on('drawend', (event: any) => {
      const feature = event.feature
      const geometry = feature.getGeometry()
      
      // 设置测量要素标识，防止被保存为永久要素
      feature.set('isMeasureFeature', true)
      feature.set('measureType', 'area')
      
      // 打印几何信息
      console.log('=== 面积量测API调用信息 ===')
      console.log('绘制要素:', feature)
      console.log('几何对象:', geometry)
      console.log('几何类型:', geometry.getType())
      console.log('几何坐标:', geometry.getCoordinates())
      
      // 使用SuperMap MeasureService进行面积量算
      const areaMeasureParam = new ol.supermap.MeasureParameters(geometry)
      console.log('MeasureParameters对象:', areaMeasureParam)
      
      // 获取地图服务URL - 直接使用正确的URL
      const url = 'http://localhost:8090/iserver/services/map-WuHan/rest/maps/武汉'
      console.log('SuperMap服务URL:', url)
      
      // 直接调用SuperMap MeasureService API
      const measureService = new ol.supermap.MeasureService(url)
      console.log('MeasureService对象:', measureService)
      
      console.log('开始调用measureArea API...')
      measureService.measureArea(areaMeasureParam)
        .then((serviceResult: any) => {
          console.log('SuperMap MeasureService返回结果:', serviceResult)
          const result = serviceResult.result
          const areaInKm2 = result.area / 1000000
          areaMeasureResult.value = {
            area: areaInKm2,
            unit: '平方千米'
          }
        })
    })
    
    map.value.addInteraction(areaMeasureInteraction.value)
    areaMeasureMode.value = true
    
    // 同步分析状态
    analysisStore.setAreaMeasureMode(true)
  }
  
  function stopAreaMeasure() {
    if (areaMeasureInteraction.value && map.value) {
      map.value.removeInteraction(areaMeasureInteraction.value)
      areaMeasureInteraction.value = null
    }
    
    if (areaMeasureLayer.value && map.value) {
      map.value.removeLayer(areaMeasureLayer.value)
      areaMeasureLayer.value = null
    }
    
    // 清理主题变化监听
    cleanupThemeObserver()
    
    areaMeasureMode.value = false
    areaMeasureResult.value = null
    
    // 同步分析状态
    const analysisStore = useAnalysisStore()
    analysisStore.setAreaMeasureMode(false)
  }
  
     function clearAreaMeasure() {
     if (areaMeasureLayer.value && areaMeasureLayer.value.getSource()) {
       areaMeasureLayer.value.getSource().clear()
     }
     areaMeasureResult.value = null
   }
   
   // 更新面积量测图层样式（用于主题切换）
   function updateAreaMeasureStyle() {
     if (areaMeasureLayer.value) {
       const ol = window.ol
       const highlightColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || (document.documentElement.getAttribute('data-theme') === 'dark' ? '#000000' : '#212529')
       const hex = highlightColor.replace('#', '')
       const r = parseInt(hex.substr(0, 2), 16)
       const g = parseInt(hex.substr(2, 2), 16)
       const b = parseInt(hex.substr(4, 2), 16)
       const fillColor = `rgba(${r}, ${g}, ${b}, 0.1)`
       
       const newStyle = new ol.style.Style({
         stroke: new ol.style.Stroke({
           color: highlightColor,
           width: 2
         }),
         fill: new ol.style.Fill({
           color: fillColor
         })
       })
       
       areaMeasureLayer.value.setStyle(newStyle)
     }
   }
  
  // 鹰眼控制方法
  function toggleOverviewMap() {
    overviewMapVisible.value = !overviewMapVisible.value
  }
  
  function setOverviewMapVisible(visible: boolean) {
    overviewMapVisible.value = visible
  }
  

  return {
    map,
    isMapReady,
    baseLayer,
    hoverLayer,
    selectLayer,
    vectorLayers,
    currentCoordinate,
    customLayers,
    mapConfig,
    formattedCoordinate,
    hasMapDiff,
    // 距离量算相关
    distanceMeasureMode,
    distanceMeasureResult,
    measureLayer,
    measureInteraction,
    // 面积量算相关
    areaMeasureMode,
    areaMeasureResult,
    areaMeasureLayer,
    areaMeasureInteraction,
    // 鹰眼相关
    overviewMapVisible,
    setMap,
    setLayers,
    updateCoordinate,
    getSelectedFeatures,
    clearAllLayers,
    reloadConfig,
    clearCoordinate,
    // 距离量算方法
    startDistanceMeasure,
    stopDistanceMeasure,
    clearDistanceMeasure,
         // 面积量算方法
     startAreaMeasure,
     stopAreaMeasure,
     clearAreaMeasure,
     updateAreaMeasureStyle,
    // 鹰眼控制方法
    toggleOverviewMap,
    setOverviewMapVisible
  }
})

export { useMapStore }
export default useMapStore
