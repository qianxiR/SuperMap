/**
 * 水文监测点数据服务
 * 从JSON文件读取水文监测点数据
 */

import hydrologyGeoJSON from '@/views/dashboard/ViewPage/水文监测点_GeoJSON.json'

// 水文监测点属性类型定义
interface HydrologyProperties {
  测站名: string
  测站代: number
  地址: string
  东经: number
  北纬: number
  水系代: number
  测站类: number
  编号: number
}

// 水文监测点数据
const HYDROLOGY_DATA = hydrologyGeoJSON

/**
 * 获取水文监测点数据
 * 模拟SuperMap服务接口
 */
export const getHydrologyData = async (params?: {
  page?: number
  pageSize?: number
  bounds?: [number, number, number, number]
  filter?: Record<string, any>
}): Promise<{
  type: string
  features: any[]
  totalCount: number
  page: number
  pageSize: number
}> => {
  // 模拟异步请求
  await new Promise(resolve => setTimeout(resolve, 100))
  
  let features = [...HYDROLOGY_DATA.features]
  
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
        return (feature.properties as HydrologyProperties)[key as keyof HydrologyProperties] === value
      })
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
 * 获取水文监测点图层信息
 */
export const getHydrologyLayerInfo = () => {
  return {
    name: "水文监测点",
    type: "vector",
    source: "hydrology",
    geometryType: "Point",
    featureCount: HYDROLOGY_DATA.features.length,
    bounds: calculateBounds(HYDROLOGY_DATA.features),
    fields: [
      { name: "测站名", type: "string" },
      { name: "测站代", type: "number" },
      { name: "地址", type: "string" },
      { name: "东经", type: "number" },
      { name: "北纬", type: "number" },
      { name: "水系代", type: "number" },
      { name: "测站类", type: "number" },
      { name: "编号", type: "number" }
    ]
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
