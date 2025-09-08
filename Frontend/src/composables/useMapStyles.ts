import { useMapStore } from '@/stores/mapStore'
import { useThemeStore } from '@/stores/themeStore'
import { createAPIConfig, getCurrentBaseMapUrl } from '@/utils/config'
import { 
  createLayerStyle, 
  createHoverStyle, 
  createSelectStyle
} from '@/utils/styleUtils'
import { getCurrentTheme, dispatchThemeChangeEvent } from '@/utils/themeUtils'

const ol = window.ol;

// 样式配置常量
const STYLE_CONFIG = {
  DEFAULT_STROKE_WIDTH: 2,
  DEFAULT_FILL_OPACITY: 0.3,
  DEFAULT_POINT_RADIUS: 6,
  DEFAULT_POINT_STROKE_WIDTH: 2,
  HOVER_TIMEOUT: 120,
  IMPORTANT_LAYERS: ['武汉_县级', '公路', '铁路'],
  IMPORTANT_STYLE: {
    POINT_RADIUS: 8,
    STROKE_WIDTH: 2.5,
    FILL_OPACITY: 0.8,
    LINE_WIDTH: 3,
    POLYGON_WIDTH: 2
  },
  NORMAL_STYLE: {
    POINT_RADIUS: 6,
    STROKE_WIDTH: 2,
    FILL_OPACITY: 0.6,
    LINE_WIDTH: 2,
    POLYGON_WIDTH: 1.5
  }
} as const;

/**
 * 地图样式管理 Composable
 * 
 * 功能：管理地图中所有图层的样式，包括本地图层和SuperMap服务图层
 * 职责：样式创建、主题切换、底图更新等样式相关操作
 * 
 * @returns {Object} 样式管理相关的方法
 */
export function useMapStyles() {
  const mapStore = useMapStore()
  const themeStore = useThemeStore()

  /**
   * 创建本地图层样式
   * 用于绘制、分析、上传等本地生成的图层
   * 
   * @param {string} sourceType - 图层来源类型
   * @returns {ol.style.Style} OpenLayers 样式对象
   */
  const createLocalLayerStyle = (sourceType: string): any => {
    return createLayerStyle(sourceType)
  }

  /**
   * 创建SuperMap服务图层样式
   * 用于从SuperMap服务器加载的矢量图层
   * 
   * @param {any} layerConfig - 图层配置对象
   * @param {string} layerName - 图层名称
   * @returns {ol.style.Style} OpenLayers 样式对象
   */
  const createSuperMapLayerStyle = (layerConfig: any, layerName: string): any => {
    // 获取当前主题的CSS变量值
    const css = getComputedStyle(document.documentElement);
    const currentTheme = getCurrentTheme();
    
    // 获取图层特定的样式变量
    const strokeVar = css.getPropertyValue(`--layer-stroke-${layerName}`).trim();
    const fillVar = css.getPropertyValue(`--layer-fill-${layerName}`).trim();
    const accentFallback = css.getPropertyValue('--accent').trim() || (currentTheme === 'dark' ? '#666666' : '#212529');

    // 解析样式颜色，优先使用图层特定变量，回退到主题色
    const resolvedStroke = strokeVar || accentFallback;
    const resolvedFill = fillVar || (currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(33,37,41,0.1)');
    
    /**
     * 根据图层类型和重要性获取样式参数
     * 重要图层（如县级边界、主要交通线）使用更粗的线条和更大的点
     */
    const getStyleParams = (type: string, layerName: string) => {
      const isImportant = STYLE_CONFIG.IMPORTANT_LAYERS.includes(layerName as any);
      const style = isImportant ? STYLE_CONFIG.IMPORTANT_STYLE : STYLE_CONFIG.NORMAL_STYLE;
      
      switch (type) {
        case 'point':
          return {
            radius: style.POINT_RADIUS,
            strokeWidth: style.STROKE_WIDTH,
            fillOpacity: style.FILL_OPACITY
          };
        case 'line':
          return {
            width: style.LINE_WIDTH,
            lineCap: 'round',
            lineJoin: 'round'
          };
        case 'polygon':
          return {
            width: style.POLYGON_WIDTH,
            fillOpacity: style.FILL_OPACITY
          };
        default:
          return {
            width: style.POLYGON_WIDTH,
            fillOpacity: style.FILL_OPACITY
          };
      }
    };
    
    const params = getStyleParams(layerConfig.type, layerName);
    
    // 根据几何类型创建对应的OpenLayers样式
    switch (layerConfig.type) {
      case 'point':
        return new ol.style.Style({
          image: new ol.style.Circle({
            radius: params.radius,
            stroke: new ol.style.Stroke({ 
              color: resolvedStroke, 
              width: params.strokeWidth 
            }),
            fill: new ol.style.Fill({ 
              color: resolvedFill 
            })
          })
        });
      case 'line':
        return new ol.style.Style({
          stroke: new ol.style.Stroke({ 
            color: resolvedStroke, 
            width: params.width,
            lineCap: params.lineCap,
            lineJoin: params.lineJoin
          }),
          fill: new ol.style.Fill({ color: 'rgba(0, 0, 0, 0)' })
        });
      case 'polygon':
        return new ol.style.Style({
          stroke: new ol.style.Stroke({ 
            color: resolvedStroke, 
            width: params.width 
          }),
          fill: new ol.style.Fill({ 
            color: resolvedFill 
          })
        });
      default:
        return new ol.style.Style({
          stroke: new ol.style.Stroke({ 
            color: resolvedStroke, 
            width: params.width 
          }),
          fill: new ol.style.Fill({ 
            color: resolvedFill 
          })
        });
    }
  }

  /**
   * 批量更新图层样式
   * 在主题切换时调用，更新所有图层的样式以适配新主题
   */
  const updateLayerStyles = async () => {
    
    // 批量更新矢量图层样式，避免频繁重绘
    const updatePromises: Promise<void>[] = []
    
    // 获取当前主题的CSS变量，避免重复获取
    const css = getComputedStyle(document.documentElement)
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light'
    
    mapStore.vectorlayers.forEach(layerInfo => {
      if (layerInfo.layer) {
        // 更新所有类型的图层，不仅仅是supermap图层
        const updatePromise = new Promise<void>(resolve => {
          // 使用单次requestAnimationFrame，避免多次调用
          requestAnimationFrame(() => {
            try {
              if (layerInfo.source === 'supermap') {
                // SuperMap服务图层
                const layerConfig = createAPIConfig().wuhanlayers.find(config => config.name === layerInfo.id);
                if (layerConfig) {
                  const newStyle = createSuperMapLayerStyle(layerConfig, layerInfo.name);
                  layerInfo.layer.setStyle(newStyle);
                }
              } else if (layerInfo.source === 'local') {
                // 本地图层（绘制、分析、上传等）
                const sourceType = layerInfo.layer.get('sourceType') || 'draw'
                const newStyle = createLocalLayerStyle(sourceType)
                layerInfo.layer.setStyle(newStyle)
              }
              resolve()
            } catch (error) {
              console.error('更新图层样式失败:', error)
              resolve()
            }
          })
        })
        updatePromises.push(updatePromise)
      }
    });
    
    // 更新选择图层样式
    if (mapStore.selectlayer) {
      const updateSelectPromise = new Promise<void>(resolve => {
        requestAnimationFrame(() => {
          const newSelectStyle = createSelectStyle();
          mapStore.selectlayer.setStyle(newSelectStyle);
          resolve()
        })
      })
      updatePromises.push(updateSelectPromise)
    }
    
    // 更新悬停图层样式
    if (mapStore.hintersecter) {
      const updateHoverPromise = new Promise<void>(resolve => {
        requestAnimationFrame(() => {
          const newHoverStyle = createHoverStyle();
          mapStore.hintersecter.setStyle(newHoverStyle);
          resolve()
        })
      })
      updatePromises.push(updateHoverPromise)
    }
    
    // 等待所有样式更新完成
    await Promise.all(updatePromises)
  }

  /**
   * 更新底图主题
   * 在主题切换时调用，切换浅色/深色底图
   * 
   * @param {string} theme - 主题名称 ('light' | 'dark')
   */
  const updateBaseMap = async (theme: 'light' | 'dark') => {
    if (mapStore.map && mapStore.baselayer) {
      
      // 优先使用预加载的底图源
      const preloadedSources = mapStore.getPreloadedBaseMapSources()
      let newBaseMapSource: any
      
      if (preloadedSources && preloadedSources[theme]) {
        // 使用预加载的源，避免重新加载
        newBaseMapSource = preloadedSources[theme]
      } else {
        // 回退到动态创建
        const currentBaseMapUrl = getCurrentBaseMapUrl(theme)
        const sourceConfig: any = {
          url: currentBaseMapUrl,
          serverType: 'iserver'
        }
        
        if (theme === 'light') {
          sourceConfig.crossOrigin = 'anonymous'
          sourceConfig.tileLoadFunction = undefined
        }
        
        newBaseMapSource = new ol.source.TileSuperMapRest(sourceConfig)
      }
      
      // 直接切换底图源，不使用隐藏/显示机制
      const oldSource = mapStore.baselayer.getSource()
      if (oldSource) {
        oldSource.clear?.()
      }
      
      // 设置新源
      mapStore.baselayer.setSource(newBaseMapSource)
      mapStore.baselayer.changed()
      
      // 强制重绘地图
      if (mapStore.map) {
        mapStore.map.updateSize()
        mapStore.map.render()
      }
      
    }
  }

  /**
   * 监听主题变化
   * 设置主题变化的事件监听器，自动更新地图样式
   * 
   * @returns {Function} 清理函数
   */
  const observeThemeChanges = () => {
    // 使用事件驱动的方式监听主题变化，确保与主题切换同步
    const handleThemeChange = async (event: Event) => {
      const customEvent = event as CustomEvent
      const newTheme = customEvent.detail.theme
      
      try {
        // 立即更新底图和矢量图层样式，无需防抖
        await updateBaseMap(newTheme)
        await updateLayerStyles()
      } catch (error) {
        console.error('地图主题更新失败:', error)
      }
    }
    
    // 监听自定义主题变化事件
    window.addEventListener('themeChanged', handleThemeChange)
    
    return () => {
      window.removeEventListener('themeChanged', handleThemeChange)
    }
  }

  /**
   * 预加载底图数据
   * 预先加载浅色和深色主题的底图，提升主题切换体验
   */
  const preloadBaseMapData = async (): Promise<void> => {
    try {
      const lightBaseMapUrl = getCurrentBaseMapUrl('light')
      const darkBaseMapUrl = getCurrentBaseMapUrl('dark')
      
      // 预加载浅色主题底图
      const lightSource = new ol.source.TileSuperMapRest({
        url: lightBaseMapUrl,
        serverType: 'iserver',
        crossOrigin: 'anonymous'
      })
      
      // 预加载深色主题底图
      const darkSource = new ol.source.TileSuperMapRest({
        url: darkBaseMapUrl,
        serverType: 'iserver'
      })
      
      // 将预加载的源存储到mapStore中，供主题切换时使用
      mapStore.setPreloadedBaseMapSources({
        light: lightSource,
        dark: darkSource
      })
      
    } catch (error) {
      console.warn('底图数据预加载失败:', error)
    }
  }

  return {
    createLocalLayerStyle,
    createLayerStyle: createSuperMapLayerStyle,
    updateLayerStyles,
    updateBaseMap,
    observeThemeChanges,
    preloadBaseMapData
  }
}
