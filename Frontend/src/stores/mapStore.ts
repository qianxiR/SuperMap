import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { MapConfig, Coordinate, Maplayer, VectorlayerConfig } from '@/types/map'
import { createAPIConfig, getFullUrl } from '@/utils/config'
import { useAnalysisStore } from '@/stores/analysisStore'

const useMapStore = defineStore('map', () => {
  // 地图实例
  const map = ref<any>(null) // ol.Map
  const isMapReady = ref<boolean>(false)
  
  // 图层管理
  const baselayer = ref<any>(null) // ol.layer.Tile
  const hintersecter = ref<any>(null) // ol.layer.Vector
  const selectlayer = ref<any>(null) // ol.layer.Vector
  const vectorlayers = ref<Maplayer[]>([])

  const customlayers = ref<Maplayer[]>([])
  
  // 鼠标坐标
  const currentCoordinate = ref<Coordinate>({ lon: null, lat: null })
  
  // 距离量算相关状态
  const distanceMeasureMode = ref<boolean>(false)
  const distanceMeasureResult = ref<{ distance: number; unit: string } | null>(null)
  const measurelayer = ref<any>(null) // 量算图层
  const measureInteraction = ref<any>(null) // 量算交互
  
  // 面积量算相关状态
  const areaMeasureMode = ref<boolean>(false)
  const areaMeasureResult = ref<{ area: number; unit: string } | null>(null)
  const areaMeasurelayer = ref<any>(null) // 面积量算图层
  const areaMeasureInteraction = ref<any>(null) // 面积量算交互
  
  // 鹰眼相关状态
  const overviewMapVisible = ref<boolean>(true)
  
  // 预加载的底图源
  const preloadedBaseMapSources = ref<{ light?: any; dark?: any } | null>(null)
  
  // 主题变化监听
  let themeObserver: MutationObserver | null = null // 主题变化观察器

  // 更新测量图层样式的函数
  const updateMeasurelayerStyle = () => {
    if (!measurelayer.value && !areaMeasurelayer.value) return
    
    try {
      const ol = window.ol
      
      // 强制重新获取最新的CSS变量值
      const css = getComputedStyle(document.documentElement)
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light'
      
      const measureColor = css.getPropertyValue('--measure-line-color').trim() || (currentTheme === 'dark' ? '#ffffff' : '#4a5568')
      const measureRgb = css.getPropertyValue('--measure-line-rgb').trim() || (currentTheme === 'dark' ? '255, 255, 255' : '74, 85, 104')
      
      console.log(`更新测量图层样式，主题: ${currentTheme}, 颜色: ${measureColor}, RGB: ${measureRgb}`)
      
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
      if (measurelayer.value) {
        measurelayer.value.setStyle(newStyle)
        measurelayer.value.changed()
      }
      
      // 更新面积测量图层样式
      if (areaMeasurelayer.value) {
        areaMeasurelayer.value.setStyle(newStyle)
        areaMeasurelayer.value.changed()
      }
      
      console.log('测量图层样式更新完成')
    } catch (error) {
      console.error('更新测量图层样式失败:', error)
    }
  }

  // 监听主题变化的函数
  const handleThemeChange = () => {
    console.log('检测到主题变化，更新测量图层样式')
    updateMeasurelayerStyle()
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
    const hasCustomlayers = customlayers.value.length > 0
    const hasSelections = selectlayer.value && selectlayer.value.getSource() && selectlayer.value.getSource().getFeatures().length > 0
    return hasCustomlayers || !!hasSelections
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
    const vectorlayerConfigs: VectorlayerConfig[] = apiConfig.wuhanlayers
      .filter(layer => layer.type !== 'raster') // 过滤掉栅格图层
      .map(layer => {
        const baseStyle = {
          stroke: { width: 1.5, color: 'var(--accent)' },
          fill: { color: 'var(--selection-bg)' }
        }
        
        // 特殊处理县级图层，使用主题色并添加文本注记
        const layerName = layer.name.split('@')[0] || layer.name
        if (layerName === '武汉_县级') {
          return {
            name: layer.name,
            style: {
              stroke: { width: 2, color: 'var(--layer-stroke-武汉_县级)' }, // 加粗到2
              fill: { color: 'var(--layer-fill-武汉_县级)' },
              text: {
                text: '{NAME_1}', // 显示NAME_1字段
                font: '14px sans-serif',
                fill: { color: 'var(--accent)' }, // 使用主题颜色
                stroke: { color: '#ffffff', width: 2 }, // 白色描边
                offsetY: 0,
                textAlign: 'center',
                textBaseline: 'middle'
              }
            }
          }
        }
        
        // 特殊处理市级图层，使用主题配色变量
        if (layerName === '武汉_市级') {
          return {
            name: layer.name,
            style: {
              stroke: { width: 10, color: 'var(--layer-stroke-武汉_市级)' }, // 使用主题配色变量
              fill: { color: 'var(--layer-fill-武汉_市级)' } // 使用主题配色变量
            }
          }
        }
        
        // 根据图层类型调整样式 - 使用CSS变量
        const strokeVar = `var(--layer-stroke-${layerName})`
        const fillVar = `var(--layer-fill-${layerName})`
        
        switch (layer.type) {
          case 'point':
            // 根据图层名称设置不同的点要素样式
            let pointRadius = 6
            let pointStrokeWidth = 2
            
            // 民生设施使用更大的点，便于识别
            if (['学校', '医院', '居民地地名点'].includes(layerName)) {
              pointRadius = 8
              pointStrokeWidth = 2.5
            }
            
            // 为民生设施点要素添加特殊样式配置
            if (['学校', '医院', '居民地地名点'].includes(layerName)) {
              let imageType = 'circle'
              
              // 为不同民生设施设置不同的点样式
              if (layerName === '学校') {
                imageType = 'square' // 学校使用方形
              } else if (layerName === '医院') {
                imageType = 'triangle' // 医院使用三角形
              } else if (layerName === '居民地地名点') {
                imageType = 'diamond' // 居民地使用菱形
              }
              
              // 为不同民生设施设置特定颜色
              let fillColor = fillVar
              let strokeColor = strokeVar
              
              if (layerName === '医院') {
                fillColor = '#ffb3b3' // 浅红色
                strokeColor = '#ff6666' // 红色描边
              } else if (layerName === '学校') {
                fillColor = '#b3ffb3' // 浅绿色
                strokeColor = '#66cc66' // 绿色描边
              } else if (layerName === '居民地地名点') {
                fillColor = '#ffb3e6' // 浅粉色
                strokeColor = '#ff66cc' // 粉色描边
              }
              
              return {
                name: layer.name,
                style: {
                  image: {
                    type: imageType,
                    radius: pointRadius,
                    stroke: {
                      color: strokeColor,
                      width: pointStrokeWidth
                    },
                    fill: {
                      color: fillColor
                    }
                  },
                }
              }
            }
            
            return {
              name: layer.name,
              style: {
                ...baseStyle,
                stroke: { width: pointStrokeWidth, color: strokeVar },
                fill: { color: fillVar },
                image: {
                  type: 'circle',
                  radius: pointRadius
                },
              }
            }
          case 'line':
            // 根据图层名称设置不同的线要素样式
            let lineWidth = 2
            
            // 交通资源使用更粗的线条
            if (['公路', '铁路'].includes(layerName)) {
              lineWidth = 3
            }
            // 水系线使用中等粗细
            else if (['水系线'].includes(layerName)) {
              lineWidth = 2.5
            }
            
            return {
              name: layer.name,
              style: {
                ...baseStyle,
                stroke: { width: lineWidth, color: strokeVar },
                fill: { color: 'rgba(0, 0, 0, 0)' },
              }
            }
          case 'polygon':
            // 根据图层名称设置不同的面要素样式
            let polygonStrokeWidth = 1.5
            
            // 行政区划使用更粗的边界
            if (['武汉_市级', '武汉_县级'].includes(layerName)) {
              polygonStrokeWidth = 2
            }
            // 水系面使用中等粗细
            else if (['水系面'].includes(layerName)) {
              polygonStrokeWidth = 2
            }
            
            return {
              name: layer.name,
              style: {
                ...baseStyle,
                stroke: { width: polygonStrokeWidth, color: strokeVar },
                fill: { color: fillVar },
              }
            }
          default:
            return {
              name: layer.name,
              style: {
                stroke: { width: 1.5, color: strokeVar },
                fill: { color: fillVar },
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
      // 调用者: useMap.ts -> loadVectorlayer() -> featureService
      // 服务器地址: ${baseUrl}/${dataService} (数据服务)
      // 作用: 提供矢量要素数据的访问地址
      dataUrl: getFullUrl('data'),
      
      datasetName: apiConfig.datasetName,
      vectorlayers: vectorlayerConfigs,
      
      // ===== 地图显示配置 =====
      // 作用: 定义地图的初始显示参数，从配置中读取避免硬编码
      center: apiConfig.mapBounds.center, // 地图中心点坐标
      zoom: apiConfig.mapBounds.zoom,     // 初始缩放级别
      projection: 'EPSG:4326',           // 坐标系
      extent: apiConfig.mapBounds.extent  // 地图边界范围
    }
  }
  
  const mapConfig = ref<MapConfig>(createMapConfig())
  
  // Actions
  function setMap(mapInstance: any) { // ol.Map
    map.value = mapInstance
    isMapReady.value = true
  }
  
  function setlayers(layers: { base: any, hover: any, select: any }) {
    baselayer.value = layers.base
    hintersecter.value = layers.hover
    selectlayer.value = layers.select
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
    if (selectlayer.value && selectlayer.value.getSource) {
      const source = selectlayer.value.getSource()
      return source ? source.getFeatures() : []
    }
    return []
  }

  function clearAlllayers() {
    if (map.value) {
      customlayers.value.forEach(item => {
        try { map.value.removeLayer(item.layer) } catch (_) { /* noop */ }
      })
      vectorlayers.value.forEach(item => {
        try { map.value.removeLayer(item.layer) } catch (_) { /* noop */ }
      })
    }
    customlayers.value = []
    vectorlayers.value = []
    if (selectlayer.value && selectlayer.value.getSource()) {
      selectlayer.value.getSource().clear()
    }
  }

  /**
   * 清理SuperMap服务图层
   * 在路由切换或页面刷新时调用，避免重复加载
   */
  function clearSuperMapLayers() {
    if (map.value) {
      // 只清理SuperMap服务图层，保留本地图层和水文图层
      vectorlayers.value
        .filter(item => item.source === 'supermap')
        .forEach(item => {
          try { 
            map.value.removeLayer(item.layer) 
            console.log(`已从地图中移除SuperMap图层: ${item.name}`)
          } catch (_) { /* noop */ }
        })
    }
    
    // 从数组中移除SuperMap图层
    const beforeCount = vectorlayers.value.length
    vectorlayers.value = vectorlayers.value.filter(item => item.source !== 'supermap')
    const afterCount = vectorlayers.value.length
    
    console.log(`清理SuperMap图层完成，移除 ${beforeCount - afterCount} 个图层`)
  }

  function clearHydrologyLayers() {
    if (map.value) {
      // 清理水文监测点图层
      vectorlayers.value
        .filter(item => item.source === 'hydrology')
        .forEach(item => {
          try { 
            map.value.removeLayer(item.layer) 
            console.log(`已从地图中移除水文图层: ${item.name}`)
          } catch (_) { /* noop */ }
        })
    }
    
    // 从数组中移除水文图层
    const beforeCount = vectorlayers.value.length
    vectorlayers.value = vectorlayers.value.filter(item => item.source !== 'hydrology')
    const afterCount = vectorlayers.value.length
    
    console.log(`清理水文图层完成，移除 ${beforeCount - afterCount} 个图层`)
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
    const measureColor = getComputedStyle(document.documentElement).getPropertyValue('--measure-line-color').trim() || '#4a5568'
    const measureRgb = getComputedStyle(document.documentElement).getPropertyValue('--measure-line-rgb').trim() || '33, 37, 41'
    
    console.log('初始化距离测量，颜色:', measureColor, 'RGB:', measureRgb)
    
    // 创建量算图层
    const measureSource = new ol.source.Vector({ wrapX: false })
    measurelayer.value = new ol.layer.Vector({
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
    measurelayer.value.set('isMeasurelayer', true)
    measurelayer.value.set('measureType', 'distance')
    
    map.value.addLayer(measurelayer.value)
    
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
    
      
      // 尝试使用SuperMap MeasureService进行距离量算
      try {
        const distanceMeasureParam = new ol.supermap.MeasureParameters(geometry)
        console.log('MeasureParameters对象:', distanceMeasureParam)
        
        // 获取地图服务URL - 使用配置中的正确URL
        const url = `${createAPIConfig().baseUrl}/iserver/services/map-guanlifenxipingtai/rest/maps/wuhan_map`
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
    
    if (measurelayer.value && map.value) {
      map.value.removeLayer(measurelayer.value)
      measurelayer.value = null
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
    if (measurelayer.value && measurelayer.value.getSource()) {
      measurelayer.value.getSource().clear()
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
     const measureColor = getComputedStyle(document.documentElement).getPropertyValue('--measure-line-color').trim() || '#4a5568'
     const measureRgb = getComputedStyle(document.documentElement).getPropertyValue('--measure-line-rgb').trim() || '33, 37, 41'
     
     console.log('初始化面积测量，颜色:', measureColor, 'RGB:', measureRgb)
     
     // 创建量算图层
     const measureSource = new ol.source.Vector({ wrapX: false })
     areaMeasurelayer.value = new ol.layer.Vector({
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
     areaMeasurelayer.value.set('isMeasurelayer', true)
     areaMeasurelayer.value.set('measureType', 'area')
     
    map.value.addLayer(areaMeasurelayer.value)
    
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
      
             // 获取地图服务URL - 使用配置中的正确URL
       const url = `${createAPIConfig().baseUrl}/iserver/services/map-guanlifenxipingtai/rest/maps/wuhan_map`
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
    
    if (areaMeasurelayer.value && map.value) {
      map.value.removeLayer(areaMeasurelayer.value)
      areaMeasurelayer.value = null
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
     if (areaMeasurelayer.value && areaMeasurelayer.value.getSource()) {
       areaMeasurelayer.value.getSource().clear()
     }
     areaMeasureResult.value = null
   }
   
   // 更新面积量测图层样式（用于主题切换）
   function updateAreaMeasureStyle() {
     if (areaMeasurelayer.value) {
       const ol = window.ol
       const highlightColor = getComputedStyle(document.documentElement).getPropertyValue('--measure-line-color').trim() || (document.documentElement.getAttribute('data-theme') === 'dark' ? '#ffffff' : '#4a5568')
       const measureRgb = getComputedStyle(document.documentElement).getPropertyValue('--measure-line-rgb').trim() || (document.documentElement.getAttribute('data-theme') === 'dark' ? '255, 255, 255' : '74, 85, 104')
       
       const newStyle = new ol.style.Style({
         stroke: new ol.style.Stroke({
           color: highlightColor,
           width: 2
         }),
         fill: new ol.style.Fill({
           color: `rgba(${measureRgb}, 0.1)`
         })
       })
       
       areaMeasurelayer.value.setStyle(newStyle)
     }
   }
  
  // 鹰眼控制方法
  function toggleOverviewMap() {
    overviewMapVisible.value = !overviewMapVisible.value
  }
  
  function setOverviewMapVisible(visible: boolean) {
    overviewMapVisible.value = visible
  }
  
  // 预加载底图源管理方法
  function setPreloadedBaseMapSources(sources: { light?: any; dark?: any }) {
    preloadedBaseMapSources.value = sources
  }
  
  function getPreloadedBaseMapSources() {
    return preloadedBaseMapSources.value
  }
  

  return {
    map,
    isMapReady,
    baselayer,
    hintersecter,
    selectlayer,
    vectorlayers,
    currentCoordinate,
    customlayers,
    mapConfig,
    formattedCoordinate,
    hasMapDiff,
    // 距离量算相关
    distanceMeasureMode,
    distanceMeasureResult,
    measurelayer,
    measureInteraction,
    // 面积量算相关
    areaMeasureMode,
    areaMeasureResult,
    areaMeasurelayer,
    areaMeasureInteraction,
    // 鹰眼相关
    overviewMapVisible,
    setMap,
    setlayers,
    updateCoordinate,
    getSelectedFeatures,
    clearAlllayers,
    clearSuperMapLayers,
    clearHydrologyLayers,
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
    setOverviewMapVisible,
    // 预加载底图源管理方法
    setPreloadedBaseMapSources,
    getPreloadedBaseMapSources
  }
})

export { useMapStore }
export default useMapStore
