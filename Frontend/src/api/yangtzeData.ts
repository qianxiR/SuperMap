/**
 * 长江流域数据服务
 * 从JSON文件读取长江面和长江线数据
 */

// 动态导入JSON文件
const loadYangtzeSurfaceData = async () => {
  const response = await fetch('/src/views/dashboard/ViewPage/长江面.geojson')
  return await response.json()
}

const loadYangtzeLineData = async () => {
  const response = await fetch('/src/views/dashboard/ViewPage/长江线.geojson')
  return await response.json()
}

// 缓存数据
let YANGTZE_SURFACE_DATA: any = null
let YANGTZE_LINE_DATA: any = null

/**
 * 获取长江面数据
 * 模拟SuperMap服务接口
 */
export const getYangtzeSurfaceData = async (params?: {
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
  // 加载数据（如果尚未加载）
  if (!YANGTZE_SURFACE_DATA) {
    YANGTZE_SURFACE_DATA = await loadYangtzeSurfaceData()
  }
  
  let features = [...YANGTZE_SURFACE_DATA.features]
  
  // 应用空间过滤
  if (params?.bounds) {
    const [minX, minY, maxX, maxY] = params.bounds
    features = features.filter(feature => {
      // 对于面要素，检查是否与边界框相交
      const geometry = feature.geometry
      if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
        // 简化的边界框相交检查
        const coords = geometry.type === 'Polygon' ? geometry.coordinates[0] : geometry.coordinates[0][0]
        return coords.some(([x, y]: [number, number]) => 
          x >= minX && x <= maxX && y >= minY && y <= maxY
        )
      }
      return false
    })
  }
  
  // 应用属性过滤
  if (params?.filter) {
    features = features.filter(feature => {
      return Object.entries(params.filter!).every(([key, value]) => {
        return feature.properties[key] === value
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
 * 获取长江线数据
 * 模拟SuperMap服务接口
 */
export const getYangtzeLineData = async (params?: {
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
  // 加载数据（如果尚未加载）
  if (!YANGTZE_LINE_DATA) {
    YANGTZE_LINE_DATA = await loadYangtzeLineData()
  }
  
  let features = [...YANGTZE_LINE_DATA.features]
  
  // 应用空间过滤
  if (params?.bounds) {
    const [minX, minY, maxX, maxY] = params.bounds
    features = features.filter(feature => {
      // 对于线要素，检查是否与边界框相交
      const geometry = feature.geometry
      if (geometry.type === 'LineString' || geometry.type === 'MultiLineString') {
        const coords = geometry.type === 'LineString' ? geometry.coordinates : geometry.coordinates[0]
        return coords.some(([x, y]: [number, number]) => 
          x >= minX && x <= maxX && y >= minY && y <= maxY
        )
      }
      return false
    })
  }
  
  // 应用属性过滤
  if (params?.filter) {
    features = features.filter(feature => {
      return Object.entries(params.filter!).every(([key, value]) => {
        return feature.properties[key] === value
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
 * 获取长江面图层信息
 */
export const getYangtzeSurfaceLayerInfo = async () => {
  if (!YANGTZE_SURFACE_DATA) {
    YANGTZE_SURFACE_DATA = await loadYangtzeSurfaceData()
  }
  
  return {
    name: "长江面",
    type: "vector",
    source: "yangtze_surface",
    geometryType: "MultiPolygon",
    featureCount: YANGTZE_SURFACE_DATA.features.length,
    bounds: calculateBounds(YANGTZE_SURFACE_DATA.features),
    fields: [
      { name: "name", type: "string" },
      { name: "type", type: "string" }
    ]
  }
}

/**
 * 获取长江线图层信息
 */
export const getYangtzeLineLayerInfo = async () => {
  if (!YANGTZE_LINE_DATA) {
    YANGTZE_LINE_DATA = await loadYangtzeLineData()
  }
  
  return {
    name: "长江线",
    type: "vector",
    source: "yangtze_line",
    geometryType: "LineString",
    featureCount: YANGTZE_LINE_DATA.features.length,
    bounds: calculateBounds(YANGTZE_LINE_DATA.features),
    fields: [
      { name: "name", type: "string" },
      { name: "type", type: "string" }
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
    const geometry = feature.geometry
    let coords: number[][] = []
    
    if (geometry.type === 'Point') {
      coords = [geometry.coordinates]
    } else if (geometry.type === 'LineString') {
      coords = geometry.coordinates
    } else if (geometry.type === 'Polygon') {
      coords = geometry.coordinates[0]
    } else if (geometry.type === 'MultiPolygon') {
      coords = geometry.coordinates[0][0]
    } else if (geometry.type === 'MultiLineString') {
      coords = geometry.coordinates[0]
    }
    
    coords.forEach(([x, y]) => {
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    })
  })
  
  return [minX, minY, maxX, maxY]
}
