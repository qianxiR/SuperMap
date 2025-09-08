import { useMapStore } from '@/stores/mapStore'
import { useLoadingStore } from '@/stores/loadingStore'
import { useThemeStore } from '@/stores/themeStore'
import { useAnalysisStore } from '@/stores/analysisStore'
import { useSelectionStore } from '@/stores/selectionStore'
import { useShortestPathAnalysisStore } from '@/stores/shortestPathAnalysisStore'
import { superMapClient } from '@/api/supermap'
import { handleError, notificationManager } from '@/utils/notification'
import { getCurrentBaseMapUrl } from '@/utils/config'

// 导入拆分后的模块
import { useMapStyles } from './useMapStyles'
import { useMapData } from './useMapData'
import { useMapInteraction } from './useMapInteraction'
import { useMapLifecycle } from './useMapLifecycle'

const ol = window.ol;

/**
 * 地图管理主 Composable
 * 
 * 功能：整合各个子模块，提供统一的地图管理接口
 * 架构：采用模块化设计，将原有的大文件拆分为多个专门的模块
 * 
 * 模块说明：
 * - useMapStyles: 样式管理（主题切换、图层样式等）
 * - useMapData: 数据加载（SuperMap服务连接、懒加载等）
 * - useMapInteraction: 用户交互（点击、悬停、要素选择等）
 * - useMapLifecycle: 生命周期管理（事件监听、资源清理等）
 * 
 * @returns {Object} 地图管理相关的方法和状态
 */
export function useMap() {
  // ===== 模块实例化 =====
  const mapStore = useMapStore()
  const loadingStore = useLoadingStore()
  const themeStore = useThemeStore()
  const analysisStore = useAnalysisStore()
  const selectionStore = useSelectionStore()
  const shortestPathStore = useShortestPathAnalysisStore()
  
  // 实例化各个功能模块
  const mapStyles = useMapStyles()
  const mapData = useMapData()
  const mapInteraction = useMapInteraction()
  const mapLifecycle = useMapLifecycle()

  /**
   * 全局状态清理函数
   * 在地图初始化前调用，清理所有相关状态和图层
   */
  const clearAllStatesAndLayers = (): void => {
    
    // 1. 清理图层数据（SuperMap服务图层 + 本地图层）
    mapData.clearAllLayersBeforeInit()
    
    // 2. 清理选择状态
    selectionStore.clearSelection()
    
    // 3. 清理分析状态
    analysisStore.closeTool()
    analysisStore.setDrawMode('')
    
    // 4. 清理最短路径分析状态
    shortestPathStore.clearAll()
    
    // 5. 清理地图量测状态
    if (mapStore.distanceMeasureMode) {
      mapStore.clearDistanceMeasure()
    }
    
    if (mapStore.areaMeasureMode) {
      mapStore.clearAreaMeasure()
    }
    
  }

  /**
   * 地图初始化主函数
   * 整合各模块功能，完成地图的完整初始化流程
   */
  const initMap = async (): Promise<void> => {
    let currentMapStore = useMapStore()
    
    try {
      if (!window.ol || !mapLifecycle.mapContainer.value) {
        throw new Error('地图容器或SuperMap SDK未准备就绪')
      }
      
      loadingStore.startLoading('map-init', '正在初始化地图...')
      
      // ===== 0. 全局状态和图层清理 =====
      loadingStore.updateLoading('map-init', '正在清理旧数据...')
      clearAllStatesAndLayers()
      
      // ===== 1. 服务健康检查 =====
      const healthCheck = await superMapClient.checkServiceHealth()
      if (!healthCheck.success) {
        throw new Error(`SuperMap服务不可用: ${healthCheck.error}`)
      }
      
      // ===== 2. 预加载底图数据 =====
      loadingStore.updateLoading('map-init', '正在预加载底图数据...')
      await mapStyles.preloadBaseMapData()
      
      // ===== 3. 创建地图实例 =====
      const resolutions: number[] = [];
      for (let i = 0; i < 19; i++) {
          resolutions[i] = 180 / 256 / Math.pow(2, i);
      }

      const map = new ol.Map({
        target: mapLifecycle.mapContainer.value,
        controls: new ol.Collection([
          new ol.control.Zoom({
            className: 'custom-zoom-control',
            target: undefined
          })
        ]),
        view: new ol.View({
          projection: currentMapStore.mapConfig.projection,
          resolutions: resolutions,
          center: currentMapStore.mapConfig.center,
          zoom: currentMapStore.mapConfig.zoom
        })
      })
      
      // 禁用双击缩放
      const doubleClickInteraction = map.getInteractions().getArray().find(
        (interaction: any) => interaction instanceof ol.interaction.DoubleClickZoom
      )
      if (doubleClickInteraction) {
        map.removeInteraction(doubleClickInteraction)
      }
      
      // ===== 4. 创建底图图层 =====
      const currentBaseMapUrl = getCurrentBaseMapUrl(themeStore.theme)
      
      const sourceConfig: any = {
        url: currentBaseMapUrl,
        serverType: 'iserver'
      }
      
      if (themeStore.theme === 'light') {
        sourceConfig.crossOrigin = 'anonymous'
        sourceConfig.tileLoadFunction = undefined
      }
      
      const baseMapLayer = new ol.layer.Tile({
        source: new ol.source.TileSuperMapRest(sourceConfig),
        visible: true,
        zIndex: -1000
      })
      
      map.addLayer(baseMapLayer)
      
      // 强制更新地图尺寸
      setTimeout(() => {
        map.updateSize()
        baseMapLayer.changed()
      }, 100)
      
      // ===== 5. 加载矢量图层 =====
      loadingStore.updateLoading('map-init', '正在加载图层...')
      await mapData.loadVectorLayers(map)
      
      // ===== 6. 创建交互图层 =====
      // 悬停图层
      const hoverSource = new ol.source.Vector()
      const hoverLayer = new ol.layer.Vector({
        source: hoverSource,
        style: mapInteraction.createHoverStyle(),
        zIndex: 999
      })
      map.addLayer(hoverLayer)
        
      // 选择图层
      const selectSource = new ol.source.Vector()
      const selectLayer = new ol.layer.Vector({
        source: selectSource,
        style: mapInteraction.createSelectStyle(),
        zIndex: 1000
      })
      map.addLayer(selectLayer)
        
      // ===== 7. 存储地图实例和图层引用 =====
      currentMapStore.setMap(map)
      currentMapStore.setlayers({
        base: baseMapLayer,
        hover: hoverLayer,
        select: selectLayer
      })
        
      // ===== 8. 设置事件监听 =====
      const disposeMapEvents = mapInteraction.setupMapEvents(map, hoverSource, selectSource)
      const disposeThemeObserver = mapStyles.observeThemeChanges()
      
      // ===== 9. 最终初始化步骤 =====
      setTimeout(() => {
        map.updateSize()
      }, 100)

      // 初始化生命周期管理
      mapLifecycle.initializeLifecycle()
      
      loadingStore.stopLoading('map-init')
      notificationManager.success('地图初始化成功', '地图已准备就绪')
      
    } catch (error) {
      loadingStore.stopLoading('map-init')
      handleError(error, '地图初始化')
    }
  }

  // ===== 导出统一接口 =====
  return {
    // 容器引用
    mapContainer: mapLifecycle.mapContainer,
    
    // 核心功能
    initMap,
    cleanup: mapLifecycle.cleanup,
    
    // 样式管理
    updateLayerStyles: mapStyles.updateLayerStyles,
    createLayerStyle: mapStyles.createLayerStyle,
    
    // 数据加载
    loadLazyLayer: mapData.loadLazyLayer,
    unloadLazyLayer: mapData.unloadLazyLayer,
    
    // 交互功能
    queryFeaturesAtPoint: mapInteraction.queryFeaturesAtPoint,
    
    // 向后兼容的别名
    updatelayerStyles: mapStyles.updateLayerStyles,
    createlayerStyle: mapStyles.createLayerStyle
  }
}
