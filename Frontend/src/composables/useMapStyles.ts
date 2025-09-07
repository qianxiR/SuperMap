import { useMapStore } from '@/stores/mapStore'
import { useThemeStore } from '@/stores/themeStore'
import { createAPIConfig, getCurrentBaseMapUrl } from '@/utils/config'

const ol = window.ol;

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
    const css = getComputedStyle(document.documentElement)
    
    /**
     * 创建统一的红色主题样式
     * 支持主题切换，自动适配浅色/深色模式
     */
    const createRedStyle = (colorVar: string, strokeWidth: number) => {
      const color = css.getPropertyValue(`--${colorVar}-color`).trim() || 
                   css.getPropertyValue('--accent').trim() || 
                   (document.documentElement.getAttribute('data-theme') === 'dark' ? '#ffffff' : '#000000')
      const rgb = css.getPropertyValue(`--${colorVar}-rgb`).trim() || '0, 0, 0'
      
      return new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: color,
          width: strokeWidth
        }),
        fill: new ol.style.Fill({
          color: `rgba(${rgb}, 0.3)`
        }),
        image: new ol.style.Circle({
          radius: 6,
          fill: new ol.style.Fill({
            color: color
          }),
          stroke: new ol.style.Stroke({
            color: css.getPropertyValue('--panel').trim() || '#ffffff',
            width: 2
          })
        })
      })
    }
    
    // 根据图层来源类型返回对应样式
    switch (sourceType) {
      case 'draw':      // 绘制图层
        return createRedStyle('draw', 2)
      case 'area':      // 区域选择图层
        return createRedStyle('analysis', 2)
      case 'query':     // 查询结果图层
        return createRedStyle('analysis', 2)
      case 'buffer':    // 缓冲区分析图层
        return createRedStyle('analysis', 3)
      case 'upload':    // 上传图层
        return createRedStyle('upload', 3)
      case 'path':      // 路径分析图层（使用蓝色主题）
        return new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: '#0078D4',
            width: 4
          }),
          fill: new ol.style.Fill({
            color: '#0078D44D' // 蓝色，70%透明度
          }),
          image: new ol.style.Circle({
            radius: 8,
            fill: new ol.style.Fill({
              color: '#0078D4'
            }),
            stroke: new ol.style.Stroke({
              color: css.getPropertyValue('--panel').trim() || '#ffffff',
              width: 2
            })
          })
        })
      case 'intersect': // 相交分析图层
        return createRedStyle('analysis', 3)
      case 'erase':     // 擦除分析图层
        return createRedStyle('analysis', 3)
      default:          // 默认分析图层
        return createRedStyle('analysis', 2)
    }
  }

  /**
   * 创建SuperMap服务图层样式
   * 用于从SuperMap服务器加载的矢量图层
   * 
   * @param {any} layerConfig - 图层配置对象
   * @param {string} layerName - 图层名称
   * @returns {ol.style.Style} OpenLayers 样式对象
   */
  const createLayerStyle = (layerConfig: any, layerName: string): any => {
    // 获取当前主题的CSS变量值
    const css = getComputedStyle(document.documentElement);
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    
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
      const isImportant = ['武汉_县级', '公路', '铁路'].includes(layerName);
      
      switch (type) {
        case 'point':
          return {
            radius: isImportant ? 8 : 6,
            strokeWidth: isImportant ? 2.5 : 2,
            fillOpacity: 0.8
          };
        case 'line':
          return {
            width: isImportant ? 3 : 2,
            lineCap: 'round',
            lineJoin: 'round'
          };
        case 'polygon':
          return {
            width: isImportant ? 2 : 1.5,
            fillOpacity: 0.6
          };
        default:
          return {
            width: 1.5,
            fillOpacity: 0.6
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
    console.log('开始批量更新图层样式')
    
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
                  const newStyle = createLayerStyle(layerConfig, layerInfo.name);
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
          const grayFillColor = css.getPropertyValue('--map-select-fill').trim() || (currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(33, 37, 41, 0.15)');
          const highlightColor = css.getPropertyValue('--map-highlight-color').trim() || (currentTheme === 'dark' ? '#ffffff' : '#000000');
          
          console.log(`更新选择图层样式, 主题: ${currentTheme}, 高亮色: ${highlightColor}, 填充色: ${grayFillColor}`);
          
          const newSelectStyle = (feature: any) => {
            const geometry = feature.getGeometry();
            if (!geometry) {
              return new ol.style.Style({
                image: new ol.style.Circle({ 
                  radius: 8, 
                  stroke: new ol.style.Stroke({color: highlightColor, width: 3}), 
                  fill: new ol.style.Fill({color: grayFillColor})
                }),
                stroke: new ol.style.Stroke({color: highlightColor, width: 3}),
                fill: new ol.style.Fill({color: grayFillColor})
              });
            }
            
            const geometryType = geometry.getType();
            
            switch (geometryType) {
              case 'Point':
              case 'MultiPoint':
                return new ol.style.Style({
                  image: new ol.style.Circle({ 
                    radius: 8, 
                    stroke: new ol.style.Stroke({color: highlightColor, width: 3}), 
                    fill: new ol.style.Fill({color: grayFillColor})
                  })
                });
                
              case 'LineString':
              case 'MultiLineString':
                return new ol.style.Style({
                  stroke: new ol.style.Stroke({
                    color: highlightColor, 
                    width: 5,
                    lineCap: 'round',
                    lineJoin: 'round'
                  })
                });
                
              case 'Polygon':
              case 'MultiPolygon':
                return new ol.style.Style({
                  stroke: new ol.style.Stroke({color: highlightColor, width: 3}),
                  fill: new ol.style.Fill({color: grayFillColor})
                });
                
              default:
                return new ol.style.Style({
                  image: new ol.style.Circle({ 
                    radius: 8, 
                    stroke: new ol.style.Stroke({color: highlightColor, width: 3}), 
                    fill: new ol.style.Fill({color: grayFillColor})
                  }),
                  stroke: new ol.style.Stroke({color: highlightColor, width: 3}),
                  fill: new ol.style.Fill({color: grayFillColor})
                });
            }
          };
          
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
          const highlightColor = css.getPropertyValue('--map-highlight-color').trim() || (currentTheme === 'dark' ? '#ffffff' : '#000000');
          const hoverFillColor = css.getPropertyValue('--map-hover-fill').trim() || 'rgba(0, 123, 255, 0.3)';
          
          console.log(`更新悬停图层样式, 主题: ${currentTheme}, 高亮色: ${highlightColor}, 悬停填充色: ${hoverFillColor}`);
          
          const newHoverStyle = new ol.style.Style({
            image: new ol.style.Circle({ 
              radius: 6, 
              stroke: new ol.style.Stroke({color: highlightColor, width: 2}), 
              fill: new ol.style.Fill({color: hoverFillColor}) 
            }),
            stroke: new ol.style.Stroke({color: highlightColor, width: 2}),
            fill: new ol.style.Fill({color: hoverFillColor})
          });
          
          mapStore.hintersecter.setStyle(newHoverStyle);
          resolve()
        })
      })
      updatePromises.push(updateHoverPromise)
    }
    
    // 等待所有样式更新完成
    await Promise.all(updatePromises)
    console.log('图层样式更新完成')
  }

  /**
   * 更新底图主题
   * 在主题切换时调用，切换浅色/深色底图
   * 
   * @param {string} theme - 主题名称 ('light' | 'dark')
   */
  const updateBaseMap = async (theme: 'light' | 'dark') => {
    if (mapStore.map && mapStore.baselayer) {
      console.log(`开始更新底图到${theme}主题`)
      
      // 优先使用预加载的底图源
      const preloadedSources = mapStore.getPreloadedBaseMapSources()
      let newBaseMapSource: any
      
      if (preloadedSources && preloadedSources[theme]) {
        // 使用预加载的源，避免重新加载
        newBaseMapSource = preloadedSources[theme]
        console.log(`使用预加载的${theme}主题底图`)
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
        console.log(`动态创建${theme}主题底图`)
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
      
      console.log(`${theme}主题底图更新完成`)
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
      console.log(`收到主题变化事件: ${newTheme}`)
      
      try {
        // 立即更新底图和矢量图层样式，无需防抖
        await updateBaseMap(newTheme)
        await updateLayerStyles()
        console.log(`地图主题更新完成: ${newTheme}`)
      } catch (error) {
        console.error('地图主题更新失败:', error)
      }
    }
    
    // 监听自定义主题变化事件
    window.addEventListener('themeChanged', handleThemeChange)
    
    // 保留原有的MutationObserver作为备用监听
    const observer = new MutationObserver(async () => {
      // 只在没有收到themeChanged事件时才执行
      console.log('MutationObserver检测到主题变化（备用机制）')
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
      subtree: false
    });
    
    return () => {
      window.removeEventListener('themeChanged', handleThemeChange)
      try { observer.disconnect(); } catch (_) {}
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
      
      console.log('底图数据预加载完成')
    } catch (error) {
      console.warn('底图数据预加载失败:', error)
    }
  }

  return {
    createLocalLayerStyle,
    createLayerStyle,
    updateLayerStyles,
    updateBaseMap,
    observeThemeChanges,
    preloadBaseMapData
  }
}
