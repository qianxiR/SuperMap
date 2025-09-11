import type { APIConfig, Wuhanlayer } from '@/types/map'

/**
 * SuperMap API 配置管理器
 * 
 * 功能：集中管理SuperMap iServer的所有服务配置
 * 包括：服务器地址、服务路径、图层定义、底图配置等
 * 
 * @returns {APIConfig} 完整的API配置对象
 */
export const createAPIConfig = (): APIConfig => {
  // ===== 基础服务配置 =====
  
  /** SuperMap iServer 服务器基础地址 */
  const baseUrl = import.meta.env.VITE_SUPERMAP_BASE_URL 
  
  /** 地图服务REST API路径 - 用于底图和地图服务 */
  const mapService = import.meta.env.VITE_SUPERMAP_MAP_SERVICE 
  
  /** 数据服务REST API路径 - 用于矢量要素数据获取 */
  const dataService = import.meta.env.VITE_SUPERMAP_DATA_SERVICE
  
  /** 数据源工作空间名称 */
  const workspace = import.meta.env.VITE_SUPERMAP_WORKSPACE 
  
  /** 地图服务中的地图名称 */
  const mapName = import.meta.env.VITE_SUPERMAP_MAP_NAME
  
  // ===== 地图显示配置 =====
  
  /** 地图边界和显示参数配置 */
  const mapBounds = {
    /** 武汉地区边界范围 [minLon, minLat, maxLon, maxLat] */
    extent: import.meta.env.VITE_SUPERMAP_MAP_EXTENT.split(',').map(Number),
    /** 地图中心点坐标 [lon, lat] */
    center: import.meta.env.VITE_SUPERMAP_MAP_CENTER.split(',').map(Number),
    /** 初始缩放级别 */
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
        dataService: `${mapService}/maps/${mapName}`,
        lazyLoad: false // 默认显示，不懒加载
      },
    
      // ===== 交通设施图层组 =====
      // 调用者: useMap.ts -> loadVectorlayer()
      // 服务器地址: ${baseUrl}/${dataService}/datasources/${workspace}/datasets/公路
      // 作用: 提供公路网络数据，用于交通分析和路径规划
      { 
        name: `公路@${workspace}@@武汉`, 
        type: 'line', 
        visible: false, 
        group: '城市基本信息',
        datasetName: '公路',
        dataService: `${mapService}/maps/${mapName}`,
        lazyLoad: true // 懒加载，点击显示时才加载
      },
      // 调用者: useMap.ts -> loadVectorlayer()
      // 服务器地址: ${baseUrl}/${dataService}/datasources/${workspace}/datasets/铁路
      // 作用: 提供铁路网络数据，用于交通分析和运输规划
      { 
        name: `铁路@${workspace}@@武汉`, 
        type: 'line', 
        visible: false, 
        group: '城市基本信息',
        datasetName: '铁路',
        dataService: `${mapService}/maps/${mapName}`,
        lazyLoad: true // 懒加载，点击显示时才加载
      },
    
      // 城市基本信息图层组 - 水系信息
      { 
        name: `水系线@${workspace}@@武汉`, 
        type: 'line', 
        visible: false, 
        group: '城市基本信息',
        datasetName: '水系线',
        dataService: `${mapService}/maps/${mapName}`,
        lazyLoad: true // 懒加载，点击显示时才加载
      },
      { 
        name: `水系面@${workspace}@@${mapName}`, 
        type: 'polygon', 
        visible: false, 
        group: '城市基本信息',
        datasetName: '水系面',
        dataService: `${mapService}/maps/${mapName}`,
        lazyLoad: true // 懒加载，点击显示时才加载
      },
      
      // 城市基本信息图层组 - 建筑信息
      { 
        name: `建筑物面@${workspace}@@${mapName}`, 
        type: 'polygon', 
        visible: false, 
        group: '城市基本信息',
        datasetName: '建筑物面',
        dataService: `${mapService}/maps/${mapName}`,
        lazyLoad: true // 懒加载，点击显示时才加载
      },
      
      // 基础设施图层组 - 居民地信息
      { 
        name: `居民地地名点@${workspace}@@${mapName}`, 
        type: 'point', 
        visible: false, 
        group: '基础设施',
        datasetName: '居民地地名点',
        dataService: `${mapService}/maps/${mapName}`,
        lazyLoad: true // 懒加载，点击显示时才加载
      },
      
      // 基础设施图层组 - 公共服务设施
      { 
        name: `学校@${workspace}@@${mapName}`, 
        type: 'point', 
        visible: false, 
        group: '基础设施',
        datasetName: '学校',
        dataService: `${mapService}/maps/${mapName}`,
        lazyLoad: true // 懒加载，点击显示时才加载
      },
      { 
        name: `医院@${workspace}@@${mapName}`, 
        type: 'point', 
        visible: false, 
        group: '基础设施',
        datasetName: '医院',
        dataService: `${mapService}/maps/${mapName}`,
        lazyLoad: true // 懒加载，点击显示时才加载
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
  config.wuhanlayers.forEach((layer, index) => {
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

// ===== LLM 接入配置 =====
export interface LLMApiConfig {
  apiKey: string
  baseUrl: string
  model: string
  temperature: number
  maxTokens: number
}

export const getLLMApiConfig = (): LLMApiConfig => {
  const env = import.meta.env as any
  const apiKey = (env.VITE_LLM_API_KEY as string)
    || (env.VITE_DASHSCOPE_API_KEY as string)
    || (env.DASHSCOPE_API_KEY as string)
    || ''
  const baseUrlRaw = (env.VITE_LLM_BASE_URL as string)
    || (env.VITE_DASHSCOPE_BASE_URL as string)
    || (env.DASHSCOPE_BASE_URL as string)
    || 'https://dashscope.aliyuncs.com/compatible-mode/v1'
  const baseUrl = String(baseUrlRaw).replace(/\/$/, '')
  const model = (env.VITE_LLM_MODEL as string)
    || (env.VITE_DASHSCOPE_MODEL as string)
    || (env.DASHSCOPE_MODEL as string)
    || 'qwen-plus'
  const temperature = Number(
    env.VITE_LLM_TEMPERATURE ?? env.VITE_DASHSCOPE_TEMPERATURE ?? env.DASHSCOPE_TEMPERATURE ?? 0.7
  )
  const maxTokens = Number(
    env.VITE_LLM_MAX_TOKENS ?? env.VITE_DASHSCOPE_MAX_TOKENS ?? env.DASHSCOPE_MAX_TOKENS ?? 3000
  )
  return { apiKey, baseUrl, model, temperature, maxTokens }
}

// ===== Agent Service Base URL =====
export const getAgentApiBaseUrl = (): string => {
  const env = import.meta.env as any
  const base = env.VITE_AGENT_BASE_URL || env.VITE_AGENT_API_BASE_URL || env.AGENT_API_BASE_URL || 'http://localhost:8089'
  return String(base).replace(/\/$/, '')
}

export default createAPIConfig