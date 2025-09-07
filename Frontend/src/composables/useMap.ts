import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import { useSelectionStore } from '@/stores/selectionStore'
import { usePopupStore } from '@/stores/popupStore'
import { useAnalysisStore } from '@/stores/analysisStore'
import { useLoadingStore } from '@/stores/loadingStore'
import { useThemeStore } from '@/stores/themeStore'
import { uselayermanager } from '@/composables/uselayermanager'
import { superMapClient } from '@/api/supermap'
import { handleError, notificationManager } from '@/utils/notification'
import { createAPIConfig, getCurrentBaseMapUrl } from '@/utils/config'

const ol = window.ol;

export function useMap() {
  let mapStore = useMapStore()
  const selectionStore = useSelectionStore()
  const popupStore = usePopupStore()
  const analysisStore = useAnalysisStore()
  const loadingStore = useLoadingStore()
  const themeStore = useThemeStore()
  const layermanager = uselayermanager()
  const mapContainer = ref<HTMLElement | null>(null)
  const hoverTimer = ref<number | null>(null)
  const selectSourceRef = ref<any>(null) // ol.source.Vector
  const disposers: Array<() => void> = []

  // 前置声明所有函数
  const createLocalLayerStyle = (sourceType: string): any => {
    const css = getComputedStyle(document.documentElement)
    
    // 创建红色样式（用于绘制、分析等图层）
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
    
    switch (sourceType) {
      case 'draw':
        return createRedStyle('draw', 2)
      case 'area':
        return createRedStyle('analysis', 2)
      case 'query':
        return createRedStyle('analysis', 2)
      case 'buffer':
        return createRedStyle('analysis', 3)
      case 'upload':
        return createRedStyle('upload', 3)
      case 'path':
        // 路径分析使用蓝色
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
      case 'intersect':
        return createRedStyle('analysis', 3)
      case 'erase':
        return createRedStyle('analysis', 3)
      default:
        return createRedStyle('analysis', 2)
    }
  }

  const createlayerStyle = (layerConfig: any, layerName: string): any => {
    // 强制重新获取最新的CSS变量值
    const css = getComputedStyle(document.documentElement);
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    
    const strokeVar = css.getPropertyValue(`--layer-stroke-${layerName}`).trim();
    const fillVar = css.getPropertyValue(`--layer-fill-${layerName}`).trim();
    const accentFallback = css.getPropertyValue('--accent').trim() || (currentTheme === 'dark' ? '#666666' : '#212529');

    // 统一使用CSS变量，如果CSS变量为空则使用主题色作为fallback
    const resolvedStroke = strokeVar || accentFallback;
    const resolvedFill = fillVar || (currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(33,37,41,0.1)');
    
    
    // 根据图层类型和重要性调整样式参数
    const getStyleParams = (type: string, layerName: string) => {
      // 重要图层使用更粗的线条和更大的点
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

  const updatelayerStyles = async () => {
    // 批量更新矢量图层样式，避免频繁重绘
    const updatePromises: Promise<void>[] = []
    
    mapStore.vectorlayers.forEach(layerInfo => {
      if (layerInfo.layer) {
        // 更新所有类型的图层，不仅仅是supermap图层
        const updatePromise = new Promise<void>(resolve => {
          requestAnimationFrame(() => {
            try {
              if (layerInfo.source === 'supermap') {
                // SuperMap服务图层
                const layerConfig = createAPIConfig().wuhanlayers.find(config => config.name === layerInfo.id);
                if (layerConfig) {
                  const newStyle = createlayerStyle(layerConfig, layerInfo.name);
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
          const css = getComputedStyle(document.documentElement);
          const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
          
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
          const css = getComputedStyle(document.documentElement);
          const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
          
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
  }
  const updateBaseMap = async (theme: 'light' | 'dark') => {
    if (mapStore.map && mapStore.baselayer) {
      // 优先使用预加载的底图源
      const preloadedSources = mapStore.getPreloadedBaseMapSources()
      let newBaseMapSource: any
      
      if (preloadedSources && preloadedSources[theme]) {
        // 使用预加载的源
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
      
      const oldSource = mapStore.baselayer.getSource()
      if (oldSource) {
        oldSource.clear?.()
      }
      
      mapStore.baselayer.setSource(newBaseMapSource)
      mapStore.baselayer.changed()
      
      // 使用异步渲染替代同步渲染
      await new Promise(resolve => {
        requestAnimationFrame(() => {
          if (mapStore.map) {
            mapStore.map.updateSize()
            mapStore.map.render()
            resolve(void 0)
          }
        })
      })
    }
  }
     const observeThemeChanges = () => {
     // 防抖函数，避免频繁更新
     let debounceTimer: number | null = null
     
     const debouncedUpdate = async () => {
       if (debounceTimer) {
         clearTimeout(debounceTimer)
       }
       debounceTimer = window.setTimeout(async () => {
         try {
           // 使用优化的主题切换同步机制
           const { useThemeOptimization } = await import('@/composables/useThemeOptimization')
           const { syncThemeChange } = useThemeOptimization()
           await syncThemeChange(async () => {
             // 更新底图和矢量图层样式
             await updateBaseMap(themeStore.theme)
             await updatelayerStyles() // 等待矢量图层样式更新完成
           })
         } catch (error) {
           console.error('地图主题更新失败:', error)
         }
         debounceTimer = null
       }, 100) // 增加防抖延迟到100ms，确保主题切换完成
     }
     
     const observer = new MutationObserver(debouncedUpdate);
     
     observer.observe(document.documentElement, {
       attributes: true,
       attributeFilter: ['data-theme'],
       subtree: false
     });
     
     const stopThemeWatch = watch(() => themeStore.theme, debouncedUpdate);
     
     return () => {
       if (debounceTimer) {
         clearTimeout(debounceTimer)
       }
       try { observer.disconnect(); } catch (_) {}
       try { stopThemeWatch(); } catch (_) {}
     }
   }

  /**
   * 加载矢量图层 - 连接SuperMap iServer数据服务获取地理要素数据
   * 调用者: useMap() -> loadVectorlayers() -> loadVectorlayer()
   * 作用: 从SuperMap服务器加载指定图层的矢量要素数据并渲染到地图上
   */
  const loadVectorlayer = async (map: any, layerConfig: any, visibleOverride?: boolean): Promise<void> => {
    // 改进图层名称解析逻辑
    let layerName = layerConfig.name
    if (layerConfig.name.includes('@')) {
      // 处理标准化的数据源格式：图层名@数据源@@工作空间
      const parts = layerConfig.name.split('@')
      if (parts.length >= 1) {
        layerName = parts[0] // 取第一部分作为图层名称
      }
    } 
    
    // 检查是否已存在懒加载图层容器
    const existingLayerInfo = mapStore.vectorlayers.find(l => l.name === layerName && l.isLazyLoaded)
    let vectorlayer: any
    
    if (existingLayerInfo && existingLayerInfo.layer) {
      // 使用已存在的懒加载图层容器
      vectorlayer = existingLayerInfo.layer
      console.log(`使用已存在的懒加载图层容器: ${layerName}`)
    } else {
      // 创建新的图层容器
      const style = createlayerStyle(layerConfig, layerName);
      
      // 创建Openlayers矢量图层容器，图层创建和渲染：
      // 1. 创建图层容器
      // 2. 创建图层源
      // 3. 创建图层样式
      // 4. 创建图层
      // 5. 添加图层到地图
      // 6. 渲染图层
      // 7. 更新图层样式
      vectorlayer = new ol.layer.Vector({
        source: new ol.source.Vector({}),
        style: style
      });
    }
    
    // ===== 连接SuperMap iServer数据服务 =====
    // 调用者: loadVectorlayer()
    // 服务器地址: mapStore.mapConfig.dataUrl (来自 src/utils/config.ts 配置)
    // 作用: 创建SuperMap要素服务客户端，用于获取矢量数据
    const featureService = new ol.supermap.FeatureService(mapStore.mapConfig.dataUrl);
    
    // 解析图层名称获取数据集和数据源信息
    const parts = layerConfig.name.split('@');
    const dataset = parts[0];    // 数据集名称，如: '武汉_县级'
    const datasource = parts[1]; // 数据源名称，如: 'wuhan'
    const datasetNames = [`${datasource}:${dataset}`];

    // ===== 第一次服务器调用：获取图层元数据信息 =====
    // 调用者: loadVectorlayer()
    // 服务器地址: ${mapStore.mapConfig.dataUrl}/datasources/${datasource}/datasets/${dataset}/features.json
    // 作用: 获取图层的要素总数、起始索引等元数据信息，用于分页加载
    const metaUrlBounds = `${mapStore.mapConfig.dataUrl}/datasources/${datasource}/datasets/${dataset}/features.json`;
    const metaJsonBounds = await (await fetch(metaUrlBounds)).json();
    const startIndexDefaultBounds: number = (metaJsonBounds && typeof metaJsonBounds.startIndex === 'number') ? metaJsonBounds.startIndex : 0;
    const featureCountBounds: number = (metaJsonBounds && typeof metaJsonBounds.featureCount === 'number') ? metaJsonBounds.featureCount : 20;
    const computedFromIndexBounds: number = startIndexDefaultBounds;
    const computedToIndexBounds: number = startIndexDefaultBounds + featureCountBounds - 1;

    // ===== 从配置中获取地图边界范围 =====
    // 调用者: loadVectorlayer()
    // 配置来源: createAPIConfig().mapBounds.extent
    // 作用: 使用配置的地图边界范围进行空间过滤，避免硬编码
    const apiConfig = createAPIConfig()
    const mapExtent = apiConfig.mapBounds.extent
    const mapBounds = new ol.geom.Polygon([[
      [mapExtent[0], mapExtent[1]], // 左下角 [minLon, minLat]
      [mapExtent[2], mapExtent[1]], // 右下角 [maxLon, minLat]
      [mapExtent[2], mapExtent[3]], // 右上角 [maxLon, maxLat]
      [mapExtent[0], mapExtent[3]], // 左上角 [minLon, maxLat]
      [mapExtent[0], mapExtent[1]]  // 闭合 [minLon, minLat]
    ]]);

    const pageSize = 10000;
    const initialToIndex = Math.min(computedFromIndexBounds + pageSize - 1, computedToIndexBounds);

    // 移除对 count.json 和 info.json 接口的调用，避免 400/404 错误
    let totalFeatureCount = 0;

    // ===== 第四次服务器调用：获取第一页要素数据（优化后的参数） =====
    // 调用者: loadVectorlayer() -> featureService.getFeaturesByBounds()
    // 服务器地址: mapStore.mapConfig.dataUrl (通过SuperMap FeatureService)
    // 作用: 获取指定边界范围内的第一页矢量要素数据，使用优化的参数配置
    const getFeaturesByBoundsParams = new ol.supermap.GetFeaturesByBoundsParameters({
      datasetNames: datasetNames,
      bounds: ol.extent.boundingExtent(mapBounds.getCoordinates()[0]),
      returnContent: true,
      returnFeaturesOnly: true, // ✅ 官方推荐：设置为true提升性能
      maxFeatures: -1,
      fromIndex: computedFromIndexBounds,
      toIndex: initialToIndex
    });

    // ===== 第五次服务器调用：执行第一页要素数据获取 =====
    // 调用者: loadVectorlayer() -> featureService.getFeaturesByBounds()
    // 服务器地址: mapStore.mapConfig.dataUrl (通过SuperMap FeatureService)
    // 作用: 实际执行第一页要素数据的获取，并将GeoJSON格式的要素数据转换为Openlayers要素对象
    featureService.getFeaturesByBounds(getFeaturesByBoundsParams, (serviceResult: any) => {
      if (serviceResult.result && serviceResult.result.features) {
        const features = (new ol.format.GeoJSON()).readFeatures(serviceResult.result.features);
        vectorlayer.getSource().addFeatures(features);
        //serviceResult.result.features就是目前从服务器中获取到的要素数据，features是GeoJSON格式的要素数据，features是Openlayers要素对象

        // ===== 第六次及后续服务器调用：分页加载剩余要素数据（优化后的参数） =====
        // 调用者: loadVectorlayer() -> addPage() -> featureService.getFeaturesByBounds()
        // 服务器地址: mapStore.mapConfig.dataUrl (通过SuperMap FeatureService)
        // 作用: 如果要素总数超过10000个，则分页加载剩余的要素数据，每页最多10000个要素
        const addPage = (from: number, to: number): Promise<void> => new Promise(resolve => {
          const pageParams = new ol.supermap.GetFeaturesByBoundsParameters({
            datasetNames: datasetNames,
            bounds: ol.extent.boundingExtent(mapBounds.getCoordinates()[0]),
            returnContent: true,
            returnFeaturesOnly: true, // ✅ 官方推荐：设置为true提升性能
            maxFeatures: -1,
            fromIndex: from,
            toIndex: to
          });
          featureService.getFeaturesByBounds(pageParams, (res: any) => {
            if (res.result && res.result.features) {
              const feats = (new ol.format.GeoJSON()).readFeatures(res.result.features);
              vectorlayer.getSource().addFeatures(feats);
            }
            resolve();
          });
        });

        // ===== 异步分页加载循环 =====
        // 调用者: loadVectorlayer() -> setTimeout() -> addPage()
        // 作用: 延迟100ms后开始分页加载剩余要素，避免阻塞主线程
        setTimeout(() => {
          (async () => {
            try {
              for (let start = initialToIndex + 1; start <= computedToIndexBounds; start += pageSize) {
                const end = Math.min(start + pageSize - 1, computedToIndexBounds);
                await addPage(start, end); // 每次调用addPage都会发起一次服务器请求
              }
            } catch (error) {
              // 静默处理分页加载错误
            }
          })();
        }, 100);
        
        // ===== 加载完成通知（使用自定义API获取的统计信息） =====
        // 调用者: loadVectorlayer()
        // 作用: 显示图层加载完成的统计信息，包括要素数量、数据来源和服务器地址
        notificationManager.info(
          `图层 ${layerName} 加载完成`,
          `共 ${features.length} 个要素\n总要素数: ${totalFeatureCount || serviceResult.result.totalCount || '未知'}\n当前返回: ${serviceResult.result.currentCount || features.length}\n最大要素数: ${serviceResult.result.maxFeatures || '无限制'}\nfeatureCount: ${(serviceResult.result.featureCount ?? serviceResult.result.totalCount ?? serviceResult.result.currentCount ?? features.length) || 0}\n数据来源: SuperMap iServer\n服务器地址: ${mapStore.mapConfig.dataUrl}\n✅ 使用自定义API优化性能`
        );
      }
    });
    
    const resolvedVisible = typeof visibleOverride === 'boolean' ? visibleOverride : !!layerConfig.visible
    vectorlayer.setVisible(resolvedVisible);
    const zIndex = layerName === '武汉_县级' ? 0 : 10 + mapStore.vectorlayers.length;
    vectorlayer.setZIndex(zIndex);
    
    // 只有非懒加载图层才需要添加到地图和mapStore
    if (!existingLayerInfo) {
      map.addLayer(vectorlayer);
      mapStore.vectorlayers.push({
        id: layerConfig.name,
        name: layerName,
        layer: vectorlayer,
        visible: resolvedVisible,
        type: 'vector',
        source: 'supermap'
      });
    } else {
      // 懒加载图层已存在，只需要设置可见性
      vectorlayer.setVisible(resolvedVisible);
    }
  }

  // 预加载两套主题的底图数据
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

  /**
   * 创建懒加载图层容器 - 创建空的图层容器，等待用户点击显示时再加载数据
   * 调用者: loadVectorlayers() -> createLazyLayerContainer()
   * 作用: 为懒加载图层创建空的OpenLayers图层容器，设置初始样式但不加载数据
   */
  const createLazyLayerContainer = (map: any, layerConfig: any): void => {
    const layerName = layerConfig.name.split('@')[0] || layerConfig.name
    const style = createlayerStyle(layerConfig, layerName)
    
    // 创建空的矢量图层容器
    const vectorlayer = new ol.layer.Vector({
      source: new ol.source.Vector({}),
      style: style,
      visible: layerConfig.visible // 设置初始可见性
    })
    
    // 设置图层标识
    vectorlayer.set('layerName', layerName)
    vectorlayer.set('layerConfig', layerConfig)
    vectorlayer.set('isLazyLoaded', true) // 标记为懒加载图层
    vectorlayer.set('isLoaded', false) // 标记为未加载数据
    
    // 添加到地图
    map.addLayer(vectorlayer)
    
    // 存储到mapStore中
    mapStore.vectorlayers.push({
      id: layerName,
      name: layerName,
      layer: vectorlayer,
      visible: layerConfig.visible,
      type: 'vector',
      source: 'supermap',
      isLazyLoaded: true,
      isLoaded: false
    })
    
    console.log(`懒加载图层容器创建完成: ${layerName}`)
  }

  /**
   * 加载懒加载图层数据 - 当用户点击显示懒加载图层时调用
   * 调用者: useLayerManager.ts -> togglelayerVisibility() -> loadLazyLayer()
   * 作用: 为已创建的懒加载图层容器加载实际的矢量数据
   */
  const loadLazyLayer = async (layerName: string): Promise<boolean> => {
    const layerInfo = mapStore.vectorlayers.find(l => l.name === layerName && l.isLazyLoaded)
    
    if (!layerInfo || !layerInfo.layer) {
      console.warn(`懒加载图层不存在: ${layerName}`)
      return false
    }
    
    if (layerInfo.isLoaded) {
      console.log(`图层 ${layerName} 已经加载过数据`)
      return true
    }
    
    try {
      const layerConfig = layerInfo.layer.get('layerConfig')
      if (!layerConfig) {
        console.error(`图层配置不存在: ${layerName}`)
        return false
      }
      
      console.log(`开始加载懒加载图层数据: ${layerName}`)
      
      // 调用原有的loadVectorlayer函数加载数据
      await loadVectorlayer(mapStore.map, layerConfig, true)
      
      // 更新图层状态
      layerInfo.isLoaded = true
      layerInfo.layer.set('isLoaded', true)
      
      console.log(`懒加载图层数据加载完成: ${layerName}`)
      return true
      
    } catch (error) {
      console.error(`加载懒加载图层失败: ${layerName}`, error)
      return false
    }
  }

  /**
   * 卸载懒加载图层数据 - 当用户点击隐藏懒加载图层时调用
   * 调用者: useLayerManager.ts -> togglelayerVisibility() -> unloadLazyLayer()
   * 作用: 完全移除懒加载图层的数据，释放内存，但保留图层容器
   */
  const unloadLazyLayer = async (layerName: string): Promise<boolean> => {
    const layerInfo = mapStore.vectorlayers.find(l => l.name === layerName && l.isLazyLoaded)
    
    if (!layerInfo || !layerInfo.layer) {
      console.warn(`懒加载图层不存在: ${layerName}`)
      return false
    }
    
    if (!layerInfo.isLoaded) {
      console.log(`图层 ${layerName} 数据未加载，无需卸载`)
      return true
    }
    
    try {
      console.log(`开始卸载懒加载图层数据: ${layerName}`)
      
      // 清除图层源中的所有要素数据
      const source = layerInfo.layer.getSource()
      if (source) {
        source.clear()
        console.log(`图层 ${layerName} 数据源已清空`)
      }
      
      // 设置图层不可见
      layerInfo.layer.setVisible(false)
      
      // 更新图层状态
      layerInfo.isLoaded = false
      layerInfo.layer.set('isLoaded', false)
      
      // 强制触发图层重绘
      layerInfo.layer.changed()
      
      console.log(`懒加载图层数据卸载完成: ${layerName}`)
      return true
      
    } catch (error) {
      console.error(`卸载懒加载图层失败: ${layerName}`, error)
      return false
    }
  }

  const loadVectorlayers = async (map: any): Promise<void> => {
    const apiConfig = createAPIConfig()
    
    const loadTasks: Promise<void>[] = []
    for (const layerConfig of apiConfig.wuhanlayers) {
      const layerName = layerConfig.name.split('@')[0] || layerConfig.name
      
      if (layerConfig.type === 'raster') {
        continue;
      }
      
      // 懒加载逻辑：只有非懒加载且可见的图层才立即加载
      const shouldLoadImmediately = !layerConfig.lazyLoad && layerConfig.visible
      
      if (shouldLoadImmediately) {
        loadingStore.updateLoading('map-init', `正在加载图层: ${layerName}`)
        loadTasks.push(loadVectorlayer(map, layerConfig, true))
      } else {
        // 懒加载图层：创建空的图层容器，等待用户点击显示时再加载数据
        console.log(`图层 ${layerName} 设置为懒加载模式`)
        createLazyLayerContainer(map, layerConfig)
      }
    }
    await Promise.allSettled(loadTasks)
  }

  const handleFeatureHover = async (hoverSource: any): Promise<void> => {
    hoverSource.clear()
    if (mapStore.map) {
      mapStore.map.getTargetElement().style.cursor = 'default'
    }
  }
  
  const handleMapClick = async (evt: any, selectSource: any): Promise<void> => {
    if (analysisStore.toolPanel?.activeTool === 'draw' && analysisStore.drawMode === 'point') {
      const coord = mapStore.map.getCoordinateFromPixel(evt.pixel)
      if (coord) {
        window.dispatchEvent(new CustomEvent('drawPointClick', { 
          detail: { coordinate: coord, pixel: evt.pixel } 
        }))
      }
      return
    }
    
    await handleNormalClick(evt, selectSource)
  }

  const handleNormalClick = async (evt: any, selectSource: any): Promise<void> => {
    const map = evt.map;
    
    const isEditToolActive = analysisStore.toolPanel?.activeTool === 'attribute-selection';
    const isQueryToolActive = analysisStore.toolPanel?.activeTool === 'area-selection';
    const isDistanceMeasureMode = analysisStore.isDistanceMeasureMode;
    const isAreaMeasureMode = analysisStore.isAreaMeasureMode;
    
    // 检查是否处于绘制模式
    const isDrawingMode = analysisStore.drawMode !== '';
    
    // 如果处于距离量测模式、面积量测模式或绘制模式，禁用要素点击选择功能
    if (isDistanceMeasureMode || isAreaMeasureMode || isDrawingMode) {
      return;
    }
    
    const feature = map.forEachFeatureAtPixel(
      evt.pixel,
      (f: any, l: any) => {
        const isInteractivelayer = l && l !== mapStore.baselayer && l !== mapStore.hintersecter && l !== mapStore.selectlayer;
        if (isInteractivelayer && l.getVisible()) {
          return f;
        }
        return undefined;
      },
      {
        hitTolerance: 5
      }
    );

    // 移除点击外部区域清除选中状态高亮的功能
    // 保持选中状态，不再自动清除

    if (feature) {
      if (isEditToolActive || isQueryToolActive) {
        const isInSelectedFeatures = selectionStore.selectedFeatures.some((selectedFeature: any) => {
          const originalSelectedFeature = selectedFeature._originalFeature || selectedFeature;
          
          if (originalSelectedFeature === feature) {
            return true;
          }
          
          const selectedGeometry = originalSelectedFeature.getGeometry?.() || selectedFeature.geometry;
          const clickedGeometry = feature.getGeometry();
          
          if (selectedGeometry && clickedGeometry) {
            const selectedCoords = selectedGeometry.getCoordinates?.() || selectedGeometry.coordinates;
            const clickedCoords = clickedGeometry.getCoordinates();
            
            if (selectedCoords && clickedCoords) {
              return JSON.stringify(selectedCoords) === JSON.stringify(clickedCoords);
            }
          }
          return false;
        });
        
        if (isInSelectedFeatures) {
          if (isEditToolActive) {
            const selectedIndex = selectionStore.selectedFeatures.findIndex((selectedFeature: any) => {
              const originalSelectedFeature = selectedFeature._originalFeature || selectedFeature;
              return originalSelectedFeature === feature;
            });
            if (selectedIndex !== -1) {
              selectionStore.setSelectedFeatureIndex(selectedIndex);
            }
          } else if (isQueryToolActive) {
            await triggerQueryFeatureSelection(feature);
          }
        } else {
          return;
        }
      } else {

        
        // 清除之前的点击选择
        const source = mapStore.selectlayer?.getSource()
        if (source) {
          const features = source.getFeatures()
          features.forEach((f: any) => {
            if (f?.get && f.get('sourceTag') === 'click') {
              source.removeFeature(f)
            }
          })
        }
        // 只清除点击选择的状态，不影响其他选择
        selectionStore.clearSelection()
        
        // 标记来源为点击选择
        try { feature.set('sourceTag', 'click') } catch (_) {}
        
        // 添加到选择图层
        selectSource.addFeature(feature);
        
        // 添加到选择状态（直接使用原始要素）
        selectionStore.addSelectedFeature(feature);
        
        if (mapStore.selectlayer) {
          mapStore.selectlayer.changed();
        }

        // 直接从GeoJSON properties中获取数据
        const properties = feature.getProperties ? feature.getProperties() : {}
        
        let content = '<div class="feature-info">';
        
        // 显示所有GeoJSON属性字段
        Object.keys(properties).forEach(key => {
          if (key !== 'geometry') {
            const value = properties[key];
            const displayValue = value !== undefined && value !== null ? value : '(空值)';
            content += `<div class="field-row"><span class="field-label">${key}:</span><span class="field-value">${displayValue}</span></div>`;
          }
        });
        
        content += '</div>';

        popupStore.showPopup(
          { x: evt.pixel[0], y: evt.pixel[1] },
          content,
          feature,
          evt.coordinate
        );
      }
    } else {
      // 移除点击非要素区域清除弹窗和选中区域高亮的功能
      // 仅在编辑工具激活时隐藏弹窗
      if (isEditToolActive) {
        popupStore.hidePopup();
      }
    }
  }

  const triggerQueryFeatureSelection = async (clickedFeature: any) => {
    try {
      const { useFeatureQuery } = await import('@/composables/useFeatureQuery')
      const featureQuery = useFeatureQuery()
      
      const queryResults = featureQuery.queryResults.value
      const selectedIndex = queryResults.findIndex((result: any) => {
        const resultGeometry = result.getGeometry?.() || result.geometry
        const clickedGeometry = clickedFeature.getGeometry()
        
        if (resultGeometry && clickedGeometry) {
          const resultCoords = resultGeometry.getCoordinates?.() || resultGeometry.coordinates
          const clickedCoords = clickedGeometry.getCoordinates()
          
          if (resultCoords && clickedCoords) {
            return JSON.stringify(resultCoords) === JSON.stringify(clickedCoords)
          }
        }
        return false
      })
      
      if (selectedIndex !== -1) {
        featureQuery.handleSelectFeature(selectedIndex)
        analysisStore.setAnalysisStatus(`已选择查询结果中的要素 ${selectedIndex + 1}`)
      }
    } catch (error) {
      // 静默处理错误
    }
  }

  const queryFeaturesAtPoint = async (coordinate: number[], pixel: number[]): Promise<void> => {
    try {
      const allFeatures: any[] = [];
      
      for (const layerInfo of mapStore.vectorlayers) {
        if (layerInfo.layer && layerInfo.layer.getVisible()) {
          const source = layerInfo.layer.getSource();
          if (source) {
            const features = source.getFeatures();
            
            features.forEach((feature: any) => {
              const geometry = feature.getGeometry();
              if (geometry) {
                if (geometry.intersectsCoordinate(coordinate)) {
                  allFeatures.push({
                    id: feature.getId(),
                    geometry: {
                      type: geometry.getType()
                    },
                    properties: feature.getProperties(),
                    layerName: layerInfo.name || layerInfo.id || '未知图层'
                  });
                }
              }
            });
          }
        }
      }
      
      if (allFeatures.length > 0) {
        const layerNameToZ: Record<string, number> = {};
        mapStore.vectorlayers.forEach(vl => {
          if (vl.layer && typeof vl.layer.getZIndex === 'function') {
            layerNameToZ[vl.name] = vl.layer.getZIndex() ?? 0;
          }
        });
        allFeatures.sort((a, b) => {
          const za = layerNameToZ[a.layerName] ?? 0;
          const zb = layerNameToZ[b.layerName] ?? 0;
          return zb - za;
        });
        
        let content = '<div class="multi-feature-info">';
        content += `<div class="feature-count">找到 ${allFeatures.length} 个要素</div>`;
        
        allFeatures.forEach((feature, index) => {
          content += `<div class="feature-item">`;
          // 改进图层名称显示逻辑
          const displaylayerName = feature.layerName || '未知图层'
          
          // 添加调试信息
          
          content += `<div class="feature-header">要素 ${index + 1} (${displaylayerName})</div>`;
          
          content += `<div class="field-row"><span class="field-label">要素ID:</span><span class="field-value">${feature.id || '无'}</span></div>`;
          content += `<div class="field-row"><span class="field-label">几何类型:</span><span class="field-value">${feature.geometry?.type || '未知'}</span></div>`;
          
          const properties = feature.properties || {};
          content += `<div class="field-row"><span class="field-label">属性字段数:</span><span class="field-value">${Object.keys(properties).length}个</span></div>`;
          Object.keys(properties).forEach(key => {
            if (key !== 'geometry') {
              const value = properties[key];
              const displayValue = value !== undefined && value !== null ? value : '(空值)';
              content += `<div class="field-row"><span class="field-label">${key}:</span><span class="field-value">${displayValue}</span></div>`;
            }
          });
          
          content += '</div>';
        });
        
        content += '</div>';
        
        popupStore.showPopup(
          { x: pixel[0], y: pixel[1] },
          content,
          null,
          coordinate
        );
      } else {
        popupStore.hidePopup();
      }
    } catch (error) {
      popupStore.hidePopup();
    }
  }

  const setupMapEvents = (map: any, hoverSource: any, selectSource: any): (() => void) => {
    const view = map.getView()
    view.on('change:center', () => {
      popupStore.updatePosition(popupStore.position)
    })
    view.on('change:resolution', () => {
      popupStore.updatePosition(popupStore.position)
    })
    
    map.on('pointermove', (evt: any) => {
      mapStore.updateCoordinate(evt.coordinate)
      if (hoverTimer.value) clearTimeout(hoverTimer.value)
      hoverTimer.value = window.setTimeout(() => {
        handleFeatureHover(hoverSource)
      }, 120)
    })
    
    map.on('click', (evt: any) => {
      handleMapClick(evt, selectSource)
    })
    
    const resizeHandler = () => map.updateSize()
    window.addEventListener('resize', resizeHandler)

    // 鼠标离开地图容器时清空经纬度显示
    const containerEl = mapContainer.value
    const handleMouseLeave = () => {
      try { mapStore.clearCoordinate() } catch (_) {}
    }
    if (containerEl) {
      containerEl.addEventListener('mouseleave', handleMouseLeave)
      containerEl.addEventListener('mouseout', (e) => {
        const related = (e as MouseEvent).relatedTarget as Node | null
        if (!related || (containerEl && !containerEl.contains(related))) {
          handleMouseLeave()
        }
      })
    }
    
    return () => {
      try { window.removeEventListener('resize', resizeHandler) } catch (_) {}
      if (containerEl) {
        try { containerEl.removeEventListener('mouseleave', handleMouseLeave) } catch (_) {}
      }
    }
  }

  const initMap = async (): Promise<void> => {
    mapStore = useMapStore()
    
    
    try {
      if (!window.ol || !mapContainer.value) {
        throw new Error('地图容器或SuperMap SDK未准备就绪')
      }
      
      loadingStore.startLoading('map-init', '正在初始化地图...')
      
      const healthCheck = await superMapClient.checkServiceHealth()
      if (!healthCheck.success) {
        throw new Error(`SuperMap服务不可用: ${healthCheck.error}`)
      }
      
      // 预加载两套主题的底图数据
      loadingStore.updateLoading('map-init', '正在预加载底图数据...')
      await preloadBaseMapData()
      
      const resolutions: number[] = [];
      for (let i = 0; i < 19; i++) {
          resolutions[i] = 180 / 256 / Math.pow(2, i);
      }

      const map = new ol.Map({
        target: mapContainer.value,
        controls: new ol.Collection([
          new ol.control.Zoom({
            className: 'custom-zoom-control',
            target: undefined
          })
        ]),
        view: new ol.View({
          projection: mapStore.mapConfig.projection,
          resolutions: resolutions,
          center: mapStore.mapConfig.center,
          zoom: mapStore.mapConfig.zoom
        })
      })
      
      const doubleClickInteraction = map.getInteractions().getArray().find(
        (interaction: any) => interaction instanceof ol.interaction.DoubleClickZoom
      )
      if (doubleClickInteraction) {
        map.removeInteraction(doubleClickInteraction)
      }
      
      const currentBaseMapUrl = getCurrentBaseMapUrl(themeStore.theme)
      
      const sourceConfig: any = {
        url: currentBaseMapUrl,
        serverType: 'iserver'
      }
      
      if (themeStore.theme === 'light') {
        sourceConfig.crossOrigin = 'anonymous'
        sourceConfig.tileLoadFunction = undefined
      }
      
      const baseMaplayer = new ol.layer.Tile({
        source: new ol.source.TileSuperMapRest(sourceConfig),
        visible: true,
        zIndex: -1000
      })
      
      map.addLayer(baseMaplayer)
      
      setTimeout(() => {
        map.updateSize()
        baseMaplayer.changed()
      }, 100)
      
      loadingStore.updateLoading('map-init', '正在加载图层...')
      
      await loadVectorlayers(map)
      
      const hoverSource = new ol.source.Vector()
      
      const createHoverStyle = () => {
        const highlightColor = getComputedStyle(document.documentElement).getPropertyValue('--map-highlight-color').trim() || (document.documentElement.getAttribute('data-theme') === 'dark' ? '#ffffff' : '#000000');
        const hoverFillColor = getComputedStyle(document.documentElement).getPropertyValue('--map-hover-fill').trim() || 'rgba(0, 123, 255, 0.3)';
        
        return new ol.style.Style({
          image: new ol.style.Circle({ 
            radius: 6, 
            stroke: new ol.style.Stroke({color: highlightColor, width: 2}), 
            fill: new ol.style.Fill({color: hoverFillColor}) 
          }),
          stroke: new ol.style.Stroke({color: highlightColor, width: 2}),
          fill: new ol.style.Fill({color: hoverFillColor})
        });
      };
      
      const hintersecter = new ol.layer.Vector({
        source: hoverSource,
        style: createHoverStyle(),
        zIndex: 999
      })
      map.addLayer(hintersecter)
        
      const selectSource = new ol.source.Vector()
      
      const createSelectStyle = () => {
        const highlightColor = getComputedStyle(document.documentElement).getPropertyValue('--map-highlight-color').trim() || (document.documentElement.getAttribute('data-theme') === 'dark' ? '#ffffff' : '#000000');
        const grayFillColor = getComputedStyle(document.documentElement).getPropertyValue('--map-select-fill').trim() || (document.documentElement.getAttribute('data-theme') === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(33, 37, 41, 0.15)');
        
        return (feature: any) => {
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
      };
      
      const selectlayer = new ol.layer.Vector({
        source: selectSource,
        style: createSelectStyle(),
        zIndex: 1000
      })
      map.addLayer(selectlayer)
      selectSourceRef.value = selectSource
        
      mapStore.setMap(map)
      mapStore.setlayers({
        base: baseMaplayer,
        hover: hintersecter,
        select: selectlayer
      })
        
      const disposeEvents = setupMapEvents(map, hoverSource, selectSource)
      if (disposeEvents) disposers.push(disposeEvents)
      const disposeTheme = observeThemeChanges()
      if (disposeTheme) disposers.push(disposeTheme)
        
      setTimeout(() => {
        map.updateSize()
      }, 100)

      const handleDrawlayerCompleted = (event: Event) => {
        layermanager.acceptDrawlayer((event as CustomEvent).detail)
      }
      window.addEventListener('drawlayerCompleted', handleDrawlayerCompleted)
      
      loadingStore.stopLoading('map-init')
      notificationManager.success('地图初始化成功', '地图已准备就绪')
    } catch (error) {
      loadingStore.stopLoading('map-init')
      handleError(error, '地图初始化')
    }
  }

  const cleanup = (): void => {
    if (hoverTimer.value) {
      clearTimeout(hoverTimer.value)
    }
    while (disposers.length) {
      const dispose = disposers.pop()
      try { dispose && dispose() } catch (_) {}
    }
  }
  
  onUnmounted(cleanup)

  watch(() => analysisStore.drawMode, (newMode) => {
    if (!mapStore.map) return;
    const targetElement = mapStore.map.getTargetElement();
    if (['point', 'line', 'polygon'].includes(newMode)) {
      targetElement.style.cursor = 'crosshair';
    } else {
      targetElement.style.cursor = 'default';
    }
  });

  watch(() => analysisStore.toolPanel?.activeTool, (newTool) => {
    if (newTool === 'area-selection') {
      popupStore.hidePopup();
    }
  });

  let drawCompleteHandler: ((e: Event) => void) | null = null
  let removelayerHandler: ((e: Event) => void) | null = null

  onMounted(() => {
    drawCompleteHandler = (e: Event) => {
      layermanager.acceptDrawlayer((e as CustomEvent).detail)
    }
    
    removelayerHandler = (e: Event) => {
      const { layer } = (e as CustomEvent).detail
      if (layer && mapStore.map) {
        try {
          mapStore.map.removeLayer(layer)
        } catch (error) {
          // 静默处理错误
        }
      }
    }
    
    window.addEventListener('drawlayerCompleted', drawCompleteHandler)
    window.addEventListener('removelayerRequested', removelayerHandler)
  })

  onUnmounted(() => {
    if (drawCompleteHandler) {
      window.removeEventListener('drawlayerCompleted', drawCompleteHandler)
    }
    if (removelayerHandler) {
      window.removeEventListener('removelayerRequested', removelayerHandler)
    }
  })
  
  return {
    mapContainer,
    initMap,
    cleanup,
    updatelayerStyles,
    createlayerStyle,
    queryFeaturesAtPoint,
    loadLazyLayer,
    unloadLazyLayer
  }
}
