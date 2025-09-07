import type { APIConfig, Wuhanlayer } from '@/types/map'

/**
 * 创建SuperMap API配置 - 定义所有服务器连接地址和图层配置
 * 调用者: mapStore.ts -> createMapConfig() -> createAPIConfig()
 * 作用: 集中管理SuperMap iServer的服务器地址、服务路径和图层定义
 */
export const createAPIConfig = (): APIConfig => {
  // ===== 服务器连接配置 =====
  // 调用者: createAPIConfig()
  // 服务器地址: 从环境变量获取，默认localhost:8090
  // 作用: 定义SuperMap iServer的基础服务器地址
  const baseUrl = import.meta.env.VITE_SUPERMAP_BASE_URL 
  
  // ===== 地图服务路径配置 =====
  // 调用者: createAPIConfig()
  // 服务路径: 从环境变量获取，默认iserver/services/map-guanlifenxipingtai/rest
  // 作用: 定义地图服务的REST API路径，用于底图和地图服务
  const mapService = import.meta.env.VITE_SUPERMAP_MAP_SERVICE 
  
  // ===== 数据服务路径配置 =====
  // 调用者: createAPIConfig()
  // 服务路径: 从环境变量获取，默认iserver/services/data-guanlifenxipingtai/rest/data
  // 作用: 定义数据服务的REST API路径，用于矢量要素数据获取
  const dataService = import.meta.env.VITE_SUPERMAP_DATA_SERVICE
  
  // ===== 工作空间配置 =====
  // 调用者: createAPIConfig()
  // 工作空间: 从环境变量获取，默认wuhan
  // 作用: 定义数据源工作空间名称
  const workspace = import.meta.env.VITE_SUPERMAP_WORKSPACE 
  
  // ===== 地图名称配置 =====
  // 调用者: createAPIConfig()
  // 地图名称: 从环境变量获取，默认wuhan_map
  // 作用: 定义地图服务中的地图名称
  const mapName = import.meta.env.VITE_SUPERMAP_MAP_NAME
  
  // ===== 地图边界范围配置 =====
  // 调用者: useMap.ts -> loadVectorlayer() -> 空间过滤
  // 边界范围: 从环境变量获取
  // 作用: 定义地图的空间过滤边界，用于限制要素加载范围
  const mapBounds = {
    // 武汉地区边界范围 [minLon, minLat, maxLon, maxLat]
    extent: import.meta.env.VITE_SUPERMAP_MAP_EXTENT.split(',').map(Number),
    // 地图中心点 [lon, lat]
    center: import.meta.env.VITE_SUPERMAP_MAP_CENTER.split(',').map(Number),
    // 初始缩放级别
    zoom: Number(import.meta.env.VITE_SUPERMAP_MAP_ZOOM)
  }
  
  return {
    baseUrl: baseUrl.replace(/\/$/, ''), // 移除末尾斜杠
    mapService,
    dataService,
    datasetName: import.meta.env.VITE_SUPERMAP_DATASET_NAME,
    
    // ===== 底图服务配置 =====
    // 调用者: useMap.ts -> updateBaseMap() -> getCurrentBaseMapUrl()
    // 服务器地址: 从环境变量获取
    // 作用: 提供浅色和深色主题的底图瓦片服务，根据主题自动切换
    baseMaps: {
      light: import.meta.env.VITE_SUPERMAP_BASEMAP_LIGHT,
      dark: import.meta.env.VITE_SUPERMAP_BASEMAP_DARK
    },
    
    // ===== 备用底图服务配置 =====
    // 调用者: useMap.ts -> updateBaseMap() -> getCurrentBaseMapUrl()
    // 服务器地址: 从环境变量获取
    // 作用: 当主底图服务不可用时，提供备用的底图瓦片服务
    fallbackBaseMaps: {
      light: import.meta.env.VITE_SUPERMAP_FALLBACK_BASEMAP_LIGHT,
      dark: import.meta.env.VITE_SUPERMAP_FALLBACK_BASEMAP_DARK
    },
    
    // ===== 矢量图层配置 =====
    // 调用者: useMap.ts -> loadVectorlayers() -> loadVectorlayer()
    // 服务器地址: ${baseUrl}/${dataService}/datasources/${workspace}/datasets/{数据集名}
    // 作用: 定义所有矢量图层，包括县级边界、交通、水系、建筑物、基础设施等
    wuhanlayers: [
      // ===== 市县级行政区图层 =====
      // 调用者: useMap.ts -> loadVectorlayer()
      // 服务器地址: ${baseUrl}/${dataService}/datasources/${workspace}/datasets/wuhan_map_县级
      // 作用: 提供县级行政区边界数据，用于区域划分和空间分析
      { 
        name: `武汉_县级@${workspace}@@武汉`, 
        type: 'polygon', 
        visible: true, 
        group: '县级行政区',
        datasetName: 'wuhan_map_县级',
        dataService: `${mapService}/maps/${mapName}`
      },
    
      // ===== 交通设施图层组 =====
      // 调用者: useMap.ts -> loadVectorlayer()
      // 服务器地址: ${baseUrl}/${dataService}/datasources/${workspace}/datasets/公路
      // 作用: 提供公路网络数据，用于交通分析和路径规划
      { 
        name: `公路@${workspace}@@武汉`, 
        type: 'line', 
        visible: true, 
        group: '城市基本信息',
        datasetName: '公路',
        dataService: `${mapService}/maps/${mapName}`
      },
      // 调用者: useMap.ts -> loadVectorlayer()
      // 服务器地址: ${baseUrl}/${dataService}/datasources/${workspace}/datasets/铁路
      // 作用: 提供铁路网络数据，用于交通分析和运输规划
      { 
        name: `铁路@${workspace}@@武汉`, 
        type: 'line', 
        visible: true, 
        group: '城市基本信息',
        datasetName: '铁路',
        dataService: `${mapService}/maps/${mapName}`
      },
    
      // 城市基本信息图层组 - 水系信息
      { 
        name: `水系线@${workspace}@@武汉`, 
        type: 'line', 
        visible: true, 
        group: '城市基本信息',
        datasetName: '水系线',
        dataService: `${mapService}/maps/${mapName}`
      },
      { 
        name: `水系面@${workspace}@@${mapName}`, 
        type: 'polygon', 
        visible: true, 
        group: '城市基本信息',
        datasetName: '水系面',
        dataService: `${mapService}/maps/${mapName}`
      },
      
      // 城市基本信息图层组 - 建筑信息
      { 
        name: `建筑物面@${workspace}@@${mapName}`, 
        type: 'polygon', 
        visible: true, 
        group: '城市基本信息',
        datasetName: '建筑物面',
        dataService: `${mapService}/maps/${mapName}`
      },
      
      // 基础设施图层组 - 居民地信息
      { 
        name: `居民地地名点@${workspace}@@${mapName}`, 
        type: 'point', 
        visible: true, 
        group: '基础设施',
        datasetName: '居民地地名点',
        dataService: `${mapService}/maps/${mapName}`
      },
      
      // 基础设施图层组 - 公共服务设施
      { 
        name: `学校@${workspace}@@${mapName}`, 
        type: 'point', 
        visible: true, 
        group: '基础设施',
        datasetName: '学校',
        dataService: `${mapService}/maps/${mapName}`
      },
      { 
        name: `医院@${workspace}@@${mapName}`, 
        type: 'point', 
        visible: true, 
        group: '基础设施',
        datasetName: '医院',
        dataService: `${mapService}/maps/${mapName}`
      },
      
      // DEM图层 - 已禁用加载，避免使用瓦片服务
      // { 
      //   name: `DEM_${workspace}@${workspace}@@${mapName}`, 
      //   type: 'raster', 
      //   visible: true, 
      //   group: '地形数据',
      //   datasetName: `DEM_${workspace}`,
      //   dataService: `${mapService}/maps/${mapName}`
      // }
    ],
    timeout: Number(import.meta.env.VITE_API_TIMEOUT),
    retryCount: Number(import.meta.env.VITE_API_RETRY_COUNT),
    devMode: import.meta.env.VITE_DEV_MODE === 'true' || import.meta.env.DEV,
    mapBounds: mapBounds
  }
}

/**
 * 获取完整的SuperMap服务URL
 * 调用者: mapStore.ts -> createMapConfig() -> getFullUrl()
 * 作用: 根据服务类型构建完整的SuperMap iServer服务访问地址
 */
export const getFullUrl = (endpoint: 'map' | 'data'): string => {
  // ===== 获取API配置 =====
  // 调用者: getFullUrl() -> createAPIConfig()
  // 作用: 获取SuperMap服务器的基础配置信息
  const config = createAPIConfig()
  
  // ===== 选择服务类型 =====
  // 调用者: getFullUrl()
  // 作用: 根据endpoint参数选择对应的服务路径
  const service = endpoint === 'map' ? config.mapService : config.dataService
  
  // ===== 构建完整URL =====
  // 调用者: mapStore.ts -> createMapConfig()
  // 服务器地址: ${baseUrl}/${service}
  // 作用: 返回完整的SuperMap服务访问地址
  return `${config.baseUrl}/${service}`
}

export const isDevelopment = (): boolean => {
  return createAPIConfig().devMode
}

// 获取按组分类的图层
export const getLayersByGroup = () => {
  const config = createAPIConfig()
  const groupedlayers: Record<string, Wuhanlayer[]> = {}
  
  config.wuhanlayers.forEach(layer => {
    const group = layer.group || '其他'
    if (!groupedlayers[group]) {
      groupedlayers[group] = []
    }
    groupedlayers[group].push(layer)
  })
  
  return groupedlayers
}

// 获取指定组的图层
export const getLayersByGroupName = (groupName: string): Wuhanlayer[] => {
  const config = createAPIConfig()
  return config.wuhanlayers.filter(layer => layer.group === groupName)
}

// 获取所有图层组名称
export const getlayerGroupNames = (): string[] => {
  const config = createAPIConfig()
  const groups = new Set(config.wuhanlayers.map(layer => layer.group).filter((group): group is string => Boolean(group)))
  return Array.from(groups)
}

// 获取指定图层的完整地图服务URL
export const getlayerMapServiceUrl = (layerName: string): string | null => {
  const config = createAPIConfig()
  const layer = config.wuhanlayers.find(l => l.name === layerName)
  
  if (layer && layer.dataService) {
    return `${config.baseUrl}/${layer.dataService}/${layer.name}`
  }
  
  return null
}

// 获取指定图层的完整数据服务URL（包含数据集）
export const getlayerDatasetUrl = (layerName: string): string | null => {
  const config = createAPIConfig()
  const layer = config.wuhanlayers.find(l => l.name === layerName)
  
  if (layer && layer.dataService && layer.datasetName) {
    return `${config.baseUrl}/${layer.dataService}/${layer.datasetName}`
  }
  
  return null
}

// 获取所有地图服务URL
export const getAllMapServiceUrls = (): Record<string, string> => {
  const config = createAPIConfig()
  const urls: Record<string, string> = {}
  
  config.wuhanlayers.forEach(layer => {
    if (layer.dataService) {
      urls[layer.name] = `${config.baseUrl}/${layer.dataService}/${layer.name}`
    }
  })
  
  return urls
}

// 测试函数：验证图层配置
export const testlayerConfig = () => {
  const config = createAPIConfig()
  console.log('\n=== 图层列表 ===')
  config.wuhanlayers.forEach((layer, index) => {
    console.log(`${index + 1}. ${layer.name}`)
    console.log(`   类型: ${layer.type}`)
    console.log(`   组: ${layer.group}`)
    console.log(`   服务URL: ${config.baseUrl}/${layer.dataService}`)
    console.log(`   图层名称: ${layer.name}`)
    console.log('')
  })
  
  return config
}

// 获取当前主题对应的底图URL
export const getCurrentBaseMapUrl = (theme: 'light' | 'dark'): string => {
  const config = createAPIConfig()
  return config.baseMaps[theme]
}

// 获取所有底图配置
export const getBaseMapConfig = () => {
  const config = createAPIConfig()
  return config.baseMaps
}

export default createAPIConfig