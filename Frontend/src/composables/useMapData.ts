import { useMapStore } from '@/stores/mapStore'
import { useLoadingStore } from '@/stores/loadingStore'
import { useLayerDataStore } from '@/stores/layerDataStore'
import { createAPIConfig } from '@/utils/config'
import { notificationManager } from '@/utils/notification'
import { useMapStyles } from './useMapStyles'

const ol = window.ol;

// 数据加载配置常量
const DATA_CONFIG = {
  PAGE_SIZE: 10000,
  PAGINATION_DELAY: 100,
  HIT_TOLERANCE: 5,
  DEFAULT_FEATURE_COUNT: 20,
  DEFAULT_START_INDEX: 0,
  Z_INDEX: {
    COUNTY_BOUNDARY: -500,
    CITY_BOUNDARY: -1000, // 武汉_市级图层使用更低的Z-index
    DEFAULT_OFFSET: 10
  }
} as const;

/**
 * 地图数据加载 Composable
 * 
 * 功能：管理SuperMap服务数据的加载，包括矢量图层和懒加载机制
 * 职责：连接SuperMap iServer、要素数据获取、分页加载、重复检查等
 * 
 * @returns {Object} 数据加载相关的方法
 */
export function useMapData() {
  const mapStore = useMapStore()
  const loadingStore = useLoadingStore()
  const layerDataStore = useLayerDataStore()
  const { createLayerStyle } = useMapStyles()

  /**
   * 加载矢量图层 - 连接SuperMap iServer数据服务获取地理要素数据
   * 调用者: useMapData() -> loadVectorLayers() -> loadVectorLayer()
   * 作用: 从SuperMap服务器加载指定图层的矢量要素数据并渲染到地图上
   */
  const loadVectorLayer = async (map: any, layerConfig: any, visibleOverride?: boolean): Promise<void> => {
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
    } else {
      // 创建新的图层容器
      const style = createLayerStyle(layerConfig, layerName);
      
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
    // 调用者: loadVectorLayer()
    // 服务器地址: mapStore.mapConfig.dataUrl (来自 src/utils/config.ts 配置)
    // 作用: 创建SuperMap要素服务客户端，用于获取矢量数据
    const featureService = new ol.supermap.FeatureService(mapStore.mapConfig.dataUrl);
    
    // 解析图层名称获取数据集和数据源信息
    const parts = layerConfig.name.split('@');
    const dataset = parts[0];    // 数据集名称，如: '武汉_县级'
    const datasource = parts[1]; // 数据源名称，如: 'wuhan'
    const datasetNames = [`${datasource}:${dataset}`];

    // ===== 第一次服务器调用：获取图层元数据信息 =====
    // 调用者: loadVectorLayer()
    // 服务器地址: ${mapStore.mapConfig.dataUrl}/datasources/${datasource}/datasets/${dataset}/features.json
    // 作用: 获取图层的要素总数、起始索引等元数据信息，用于分页加载
    const metaUrlBounds = `${mapStore.mapConfig.dataUrl}/datasources/${datasource}/datasets/${dataset}/features.json`;
    const metaJsonBounds = await (await fetch(metaUrlBounds)).json();
    const startIndexDefaultBounds: number = (metaJsonBounds && typeof metaJsonBounds.startIndex === 'number') ? metaJsonBounds.startIndex : 0;
    const featureCountBounds: number = (metaJsonBounds && typeof metaJsonBounds.featureCount === 'number') ? metaJsonBounds.featureCount : 20;
    const computedFromIndexBounds: number = startIndexDefaultBounds;
    const computedToIndexBounds: number = startIndexDefaultBounds + featureCountBounds - 1;

    // ===== 从配置中获取地图边界范围 =====
    // 调用者: loadVectorLayer()
    // 配置来源: createAPIConfig().mapBounds.extent
    const apiConfig = createAPIConfig()
    const mapExtent = apiConfig.mapBounds.extent
    const mapBounds = new ol.geom.Polygon([[
      [mapExtent[0], mapExtent[1]], // 左下角 [minLon, minLat]
      [mapExtent[2], mapExtent[1]], // 右下角 [maxLon, minLat]
      [mapExtent[2], mapExtent[3]], // 右上角 [maxLon, maxLat]
      [mapExtent[0], mapExtent[3]], // 左上角 [minLon, maxLat]
      [mapExtent[0], mapExtent[1]]  // 闭合 [minLon, minLat]
    ]]);

    const pageSize = DATA_CONFIG.PAGE_SIZE;
    const initialToIndex = Math.min(computedFromIndexBounds + pageSize - 1, computedToIndexBounds);

    // 移除对 count.json 和 info.json 接口的调用，避免 400/404 错误
    let totalFeatureCount = 0;

    // ===== 第四次服务器调用：获取第一页要素数据（优化后的参数） =====
    // 调用者: loadVectorLayer() -> featureService.getFeaturesByBounds()
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
    // 调用者: loadVectorLayer() -> featureService.getFeaturesByBounds()
    // 服务器地址: mapStore.mapConfig.dataUrl (通过SuperMap FeatureService)
    // 作用: 实际执行第一页要素数据的获取，并将GeoJSON格式的要素数据转换为Openlayers要素对象
    featureService.getFeaturesByBounds(getFeaturesByBoundsParams, (serviceResult: any) => {
      if (serviceResult.result && serviceResult.result.features) {
        const features = (new ol.format.GeoJSON()).readFeatures(serviceResult.result.features);
        vectorlayer.getSource().addFeatures(features);
        //serviceResult.result.features就是目前从服务器中获取到的要素数据，features是GeoJSON格式的要素数据，features是Openlayers要素对象

        // ===== 第六次及后续服务器调用：分页加载剩余要素数据（优化后的参数） =====
        // 调用者: loadVectorLayer() -> addPage() -> featureService.getFeaturesByBounds()
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
        // 调用者: loadVectorLayer() -> setTimeout() -> addPage()
        // 作用: 延迟后开始分页加载剩余要素，避免阻塞主线程
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
        }, DATA_CONFIG.PAGINATION_DELAY);
        
        // ===== 保存图层数据到全局状态管理 =====
        // 调用者: loadVectorLayer()
        // 作用: 将加载的要素数据保存到layerDataStore中，供文本注记等功能使用
        layerDataStore.setLayerAttributes(layerName, features)
        
        // ===== 加载完成通知（使用自定义API获取的统计信息） =====
        // 调用者: loadVectorLayer()
        // 作用: 显示图层加载完成的统计信息，包括要素数量、数据来源和服务器地址
        notificationManager.info(
          `图层 ${layerName} 加载完成`,
          `共 ${features.length} 个要素\n总要素数: ${totalFeatureCount || serviceResult.result.totalCount || '未知'}\n当前返回: ${serviceResult.result.currentCount || features.length}\n最大要素数: ${serviceResult.result.maxFeatures || '无限制'}\nfeatureCount: ${(serviceResult.result.featureCount ?? serviceResult.result.totalCount ?? serviceResult.result.currentCount ?? features.length) || 0}\n数据来源: SuperMap iServer\n服务器地址: ${mapStore.mapConfig.dataUrl}\n✅ 使用自定义API优化性能`
        );
      }
    });
    
    const resolvedVisible = typeof visibleOverride === 'boolean' ? visibleOverride : !!layerConfig.visible
    vectorlayer.setVisible(resolvedVisible);
    let zIndex;
    if (layerName === '武汉_市级') {
      zIndex = DATA_CONFIG.Z_INDEX.CITY_BOUNDARY; // 武汉_市级图层使用最低Z-index
    } else if (layerName === '武汉_县级') {
      zIndex = DATA_CONFIG.Z_INDEX.COUNTY_BOUNDARY; // 武汉_县级图层使用中等Z-index
    } else {
      zIndex = DATA_CONFIG.Z_INDEX.DEFAULT_OFFSET + mapStore.vectorlayers.length; // 其他图层使用默认Z-index
    }
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

  /**
   * 创建懒加载图层容器 - 创建空的图层容器，等待用户点击显示时再加载数据
   * 调用者: loadVectorLayers() -> createLazyLayerContainer()
   * 作用: 为懒加载图层创建空的OpenLayers图层容器，设置初始样式但不加载数据
   */
  const createLazyLayerContainer = (map: any, layerConfig: any): void => {
    const layerName = layerConfig.name.split('@')[0] || layerConfig.name
    const style = createLayerStyle(layerConfig, layerName)
    
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
    
  }

  /**
   * 加载懒加载图层数据 - 当用户点击显示懒加载图层时调用
   * 调用者: useLayerManager.ts -> toggleLayerVisibility() -> loadLazyLayer()
   * 作用: 为已创建的懒加载图层容器加载实际的矢量数据
   */
  const loadLazyLayer = async (layerName: string): Promise<boolean> => {
    const layerInfo = mapStore.vectorlayers.find(l => l.name === layerName && l.isLazyLoaded)
    
    if (!layerInfo || !layerInfo.layer) {
      console.warn(`懒加载图层不存在: ${layerName}`)
      return false
    }
    
    if (layerInfo.isLoaded) {
      return true
    }
    
    try {
      const layerConfig = layerInfo.layer.get('layerConfig')
      if (!layerConfig) {
        console.error(`图层配置不存在: ${layerName}`)
        return false
      }
      
      
      // 调用原有的loadVectorLayer函数加载数据
      await loadVectorLayer(mapStore.map, layerConfig, true)
      
      // 更新图层状态
      layerInfo.isLoaded = true
      layerInfo.layer.set('isLoaded', true)
      
      return true
      
    } catch (error) {
      console.error(`加载懒加载图层失败: ${layerName}`, error)
      return false
    }
  }

  /**
   * 卸载懒加载图层数据 - 当用户点击隐藏懒加载图层时调用
   * 调用者: useLayerManager.ts -> toggleLayerVisibility() -> unloadLazyLayer()
   * 作用: 完全移除懒加载图层的数据，释放内存，但保留图层容器
   */
  const unloadLazyLayer = async (layerName: string): Promise<boolean> => {
    const layerInfo = mapStore.vectorlayers.find(l => l.name === layerName && l.isLazyLoaded)
    
    if (!layerInfo || !layerInfo.layer) {
      console.warn(`懒加载图层不存在: ${layerName}`)
      return false
    }
    
    if (!layerInfo.isLoaded) {
      return true
    }
    
    try {
      
      // 清除图层源中的所有要素数据
      const source = layerInfo.layer.getSource()
      if (source) {
        source.clear()
      }
      
      // 设置图层不可见
      layerInfo.layer.setVisible(false)
      
      // 更新图层状态
      layerInfo.isLoaded = false
      layerInfo.layer.set('isLoaded', false)
      
      // 强制触发图层重绘
      layerInfo.layer.changed()
      
      return true
      
    } catch (error) {
      console.error(`卸载懒加载图层失败: ${layerName}`, error)
      return false
    }
  }

  /**
   * 清空所有图层数据
   * 在页面刷新或重新初始化时调用，彻底清理所有图层避免重复
   */
  const clearAllLayersBeforeInit = (): void => {
    
    // 1. 清空SuperMap服务图层
    const supermapLayersCount = mapStore.vectorlayers.filter(l => l.source === 'supermap').length
    
    // 2. 清空本地图层（分析、绘制、查询、上传等）
    const localLayersCount = mapStore.vectorlayers.filter(l => l.source === 'local').length
    
    // 3. 清空自定义图层
    const customLayersCount = mapStore.customlayers.length
    
    // 4. 从地图中移除所有图层
    if (mapStore.map) {
      // 移除矢量图层
      mapStore.vectorlayers.forEach(item => {
        try { 
          mapStore.map.removeLayer(item.layer)
        } catch (_) { /* 静默处理 */ }
      })
      
      // 移除自定义图层
      mapStore.customlayers.forEach(item => {
        try { 
          mapStore.map.removeLayer(item.layer)
        } catch (_) { /* 静默处理 */ }
      })
    }
    
    // 5. 清空数组
    const totalBefore = mapStore.vectorlayers.length + mapStore.customlayers.length
    mapStore.vectorlayers.length = 0  // 清空矢量图层数组
    mapStore.customlayers.length = 0  // 清空自定义图层数组
    
    // 6. 清空选择图层的数据源
    if (mapStore.selectlayer?.getSource) {
      try {
        mapStore.selectlayer.getSource().clear()
      } catch (_) { /* 静默处理 */ }
    }
    
  }

  /**
   * 加载所有矢量图层
   * 在加载前彻底清空所有图层，避免重复添加
   * @param map 地图实例
   * @param visibleLayers 指定要显示的图层名称数组，如果不提供则使用默认配置
   */
  const loadVectorLayers = async (map: any, visibleLayers?: string[]): Promise<void> => {
    // ===== 首先清空所有现有图层 =====
    clearAllLayersBeforeInit()
    
    const apiConfig = createAPIConfig()
    
    
    const loadTasks: Promise<void>[] = []
    
    for (const layerConfig of apiConfig.wuhanlayers) {
      const layerName = layerConfig.name.split('@')[0] || layerConfig.name
      
      if (layerConfig.type === 'raster') {
        continue;
      }
      
      // 如果指定了可见图层列表，则只加载指定的图层
      let shouldLoad = false
      if (visibleLayers && visibleLayers.length > 0) {
        shouldLoad = visibleLayers.includes(layerName)
      } else {
        // 懒加载逻辑：只有非懒加载且可见的图层才立即加载
        shouldLoad = !layerConfig.lazyLoad && layerConfig.visible
      }
      
      if (shouldLoad) {
        loadingStore.updateLoading('map-init', `正在加载图层: ${layerName}`)
        loadTasks.push(loadVectorLayer(map, layerConfig, true))
      } else {
        // 懒加载图层：创建空的图层容器，等待用户点击显示时再加载数据
        createLazyLayerContainer(map, layerConfig)
      }
    }
    
    await Promise.allSettled(loadTasks)
  }

  return {
    loadVectorLayer,
    loadVectorLayers,
    createLazyLayerContainer,
    loadLazyLayer,
    unloadLazyLayer,
    clearAllLayersBeforeInit
  }
}
