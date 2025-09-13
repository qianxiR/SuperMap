/**
 * 水质监测数据服务
 * 从JSON文件读取水质监测数据
 */

import waterQualityGeoJSON from '@/views/dashboard/ViewPage/水质监测点_GeoJSON.json'

// 水质监测点属性类型定义
interface WaterQualityProperties {
  // 基础信息
  province: string
  watershed: string
  site_name: string
  monitor_time: string
  site_status: string
  formatted_address: string
  match_level: string
  
  // 水质指标
  water_quality_class: string
  water_temperature: number | null
  ph_value: number | null
  dissolved_oxygen: number | null
  conductivity: number | null
  turbidity: number | null
  permanganate_index: number | null
  ammonia_nitrogen: number | null
  total_phosphorus: number | null
  total_nitrogen: number | null
  chlorophyll_a: string
  algae_density: string
  
  // 坐标信息
  longitude: string
  latitude: string
}

// 水质监测点数据
const WATER_QUALITY_DATA = waterQualityGeoJSON

/**
 * 获取水质监测点数据
 * 模拟SuperMap服务接口
 */
export const getWaterQualityData = async (params?: {
  page?: number
  pageSize?: number
  bounds?: [number, number, number, number]
  filter?: Record<string, any>
  timeRange?: { start: string, end: string }
  qualityClass?: string[]
}): Promise<{
  type: string
  features: any[]
  totalCount: number
  page: number
  pageSize: number
}> => {
  // 模拟异步请求
  await new Promise(resolve => setTimeout(resolve, 100))
  
  let features = [...WATER_QUALITY_DATA.features]
  
  // 应用空间过滤
  if (params?.bounds) {
    const [minX, minY, maxX, maxY] = params.bounds
    features = features.filter(feature => {
      const [x, y] = feature.geometry.coordinates
      return x >= minX && x <= maxX && y >= minY && y <= maxY
    })
  }
  
  // 应用属性过滤
  if (params?.filter) {
    features = features.filter(feature => {
      return Object.entries(params.filter!).every(([key, value]) => {
        return (feature.properties as WaterQualityProperties)[key as keyof WaterQualityProperties] === value
      })
    })
  }
  
  // 应用时间范围过滤
  if (params?.timeRange) {
    const { start, end } = params.timeRange
    features = features.filter(feature => {
      const monitorTime = feature.properties.monitor_time
      return monitorTime >= start && monitorTime <= end
    })
  }
  
  // 应用水质类别过滤
  if (params?.qualityClass && params.qualityClass.length > 0) {
    features = features.filter(feature => {
      return params.qualityClass!.includes(feature.properties.water_quality_class)
    })
  }
  
  const totalCount = features.length
  const page = params?.page || 1
  const pageSize = params?.pageSize || 100
  
  // 分页处理
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedFeatures = features.slice(startIndex, endIndex)
  
  return {
    type: "FeatureCollection",
    features: paginatedFeatures,
    totalCount,
    page,
    pageSize
  }
}

/**
 * 获取水质监测点图层信息
 */
export const getWaterQualityLayerInfo = () => {
  return {
    name: "水质监测点",
    type: "vector",
    source: "water_quality",
    geometryType: "Point",
    featureCount: WATER_QUALITY_DATA.features.length,
    bounds: calculateBounds(WATER_QUALITY_DATA.features),
    fields: [
      { name: "province", type: "string" },
      { name: "watershed", type: "string" },
      { name: "site_name", type: "string" },
      { name: "monitor_time", type: "string" },
      { name: "water_quality_class", type: "string" },
      { name: "water_temperature", type: "number" },
      { name: "ph_value", type: "number" },
      { name: "dissolved_oxygen", type: "number" },
      { name: "conductivity", type: "number" },
      { name: "turbidity", type: "number" },
      { name: "permanganate_index", type: "number" },
      { name: "ammonia_nitrogen", type: "number" },
      { name: "total_phosphorus", type: "number" },
      { name: "total_nitrogen", type: "number" },
      { name: "chlorophyll_a", type: "string" },
      { name: "algae_density", type: "string" },
      { name: "site_status", type: "string" },
      { name: "formatted_address", type: "string" },
      { name: "match_level", type: "string" }
    ]
  }
}

/**
 * 获取水质统计数据
 */
export const getWaterQualityStats = () => {
  const features = WATER_QUALITY_DATA.features
  
  // 统计水质类别分布
  const qualityClassStats = {}
  const provinceStats = {}
  const watershedStats = {}
  
  features.forEach(feature => {
    const props = feature.properties as WaterQualityProperties
    
    // 水质类别统计
    const qualityClass = props.water_quality_class
    qualityClassStats[qualityClass] = (qualityClassStats[qualityClass] || 0) + 1
    
    // 省份统计
    const province = props.province
    provinceStats[province] = (provinceStats[province] || 0) + 1
    
    // 流域统计
    const watershed = props.watershed
    watershedStats[watershed] = (watershedStats[watershed] || 0) + 1
  })
  
  return {
    totalCount: features.length,
    qualityClassStats,
    provinceStats,
    watershedStats,
    bounds: calculateBounds(features)
  }
}

/**
 * 计算要素边界
 */
const calculateBounds = (features: any[]): [number, number, number, number] => {
  if (features.length === 0) return [0, 0, 0, 0]
  
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  
  features.forEach(feature => {
    const [x, y] = feature.geometry.coordinates
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  })
  
  return [minX, minY, maxX, maxY]
}
