/**
 * 要素数据处理工具
 * 保留实际使用的核心功能
 */

import { GeoJSON } from 'ol/format'
import type { default as OlMap } from 'ol/Map'

/**
 * 获取要素的几何类型
 * @param feature 要素对象
 * @returns 几何类型字符串
 */
export function getFeatureGeometryType(feature: any): string {
  const geometry = feature.geometry || feature.getGeometry?.()
  if (!geometry) return '未知'
  
  const geometryType = geometry.getType?.() || geometry.type
  return geometryType || '未知'
}

/**
 * 获取要素的几何信息描述
 * @param feature 要素对象
 * @returns 几何信息描述字符串
 */
export function getFeatureGeometryDescription(feature: any): string {
  const geometry = feature.geometry || feature.getGeometry?.()
  if (!geometry) return '未知坐标'
  
  try {
    const geometryType = geometry.getType?.() || geometry.type
    const coords = geometry.getCoordinates?.() || geometry.coordinates
    
    if (!coords) return '坐标解析失败'
    
    switch (geometryType) {
      case 'Point':
        if (Array.isArray(coords) && coords.length >= 2) {
          return `点坐标: ${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}`
        }
        return '点坐标解析失败'
      
      case 'LineString':
        if (Array.isArray(coords) && coords.length >= 2) {
          const length = calculateLineLength(coords)
          return `线长度: ${length.toFixed(4)}千米`
        }
        return '线长度计算失败'
      
      case 'Polygon':
        if (Array.isArray(coords) && coords.length > 0) {
          const area = calculatePolygonArea(coords[0])
          return `面面积: ${area.toFixed(4)}平方千米`
        }
        return '面积计算失败'
      
      case 'MultiPoint':
        if (Array.isArray(coords) && coords.length > 0) {
          const firstPoint = coords[0]
          if (Array.isArray(firstPoint) && firstPoint.length >= 2) {
            return `${coords.length}个点, 起始: ${firstPoint[0].toFixed(6)}, ${firstPoint[1].toFixed(6)}`
          }
        }
        return '多点坐标解析失败'
      
      case 'MultiLineString':
        if (Array.isArray(coords) && coords.length > 0) {
          let totalLength = 0
          coords.forEach((lineCoords: number[][]) => {
            if (Array.isArray(lineCoords)) {
              totalLength += calculateLineLength(lineCoords)
            }
          })
          return `多线总长度: ${totalLength.toFixed(4)}千米`
        }
        return '多线长度计算失败'
      
      case 'MultiPolygon':
        if (Array.isArray(coords) && coords.length > 0) {
          let totalArea = 0
          coords.forEach((polygonCoords: number[][][]) => {
            if (Array.isArray(polygonCoords) && polygonCoords.length > 0) {
              totalArea += calculatePolygonArea(polygonCoords[0])
            }
          })
          return `多面总面积: ${totalArea.toFixed(4)}平方千米`
        }
        return '多面面积计算失败'
      
      default:
        if (Array.isArray(coords) && coords.length >= 2 && typeof coords[0] === 'number') {
          return `${geometryType}坐标: ${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}`
        }
        return `${geometryType || '未知类型'}`
    }
  } catch (error) {
    console.error('几何信息解析错误:', error)
    return '几何信息解析失败'
  }
}

/**
 * 获取要素的完整信息（包括几何信息）
 * @param feature 要素对象
 * @returns 完整的要素信息数组
 */
export function getFeatureCompleteInfo(feature: any): Array<{label: string, value: string}> {
  if (!feature) return []
  
  const properties = feature.getProperties ? feature.getProperties() : feature.properties || {}
  const info: Array<{label: string, value: string}> = []
  
  // 所有属性字段
  Object.keys(properties).forEach(key => {
    if (key !== 'geometry') {
      const value = properties[key]
      const displayValue = value !== undefined && value !== null ? String(value) : '(空值)'
      info.push({ label: key, value: displayValue })
    }
  })
  
  return info
}

// 几何计算函数
function calculateLineLength(coordinates: number[][]): number {
  if (!coordinates || coordinates.length < 2) return 0
  
  let totalLength = 0
  for (let i = 1; i < coordinates.length; i++) {
    const [lon1, lat1] = coordinates[i - 1]
    const [lon2, lat2] = coordinates[i]
    totalLength += haversineDistance(lat1, lon1, lat2, lon2)
  }
  return totalLength
}

function calculatePolygonArea(coordinates: number[][]): number {
  if (!coordinates || coordinates.length < 3) return 0
  
  let area = 0
  const n = coordinates.length
  
  for (let i = 0; i < n - 1; i++) {
    const [x1, y1] = coordinates[i]
    const [x2, y2] = coordinates[i + 1]
    area += x1 * y2 - x2 * y1
  }
  
  const earthRadius = 6371
  const latRad = coordinates[0][1] * Math.PI / 180
  const kmPerDegLat = earthRadius * Math.PI / 180
  const kmPerDegLon = kmPerDegLat * Math.cos(latRad)
  
  return Math.abs(area * kmPerDegLat * kmPerDegLon / 2)
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * 从Openlayers图层提取GeoJSON数据
 * 
 * 输入数据格式：
 * @param layer - Openlayers图层对象
 * @param map - Openlayers地图对象（可选，用于获取投影信息）
 * @param options - 提取选项
 * @param options.featureProjection - 要素投影（默认从地图获取或使用EPSG:3857）
 * @param options.dataProjection - 输出数据投影（默认EPSG:4326）
 * @param options.enableLogging - 是否启用详细日志（默认true）
 * 
 * 数据处理方法：
 * 1. 验证图层和源数据有效性
 * 2. 获取图层中的所有要素
 * 3. 使用Openlayers GeoJSON格式器转换数据
 * 4. 验证和解析GeoJSON数据
 * 5. 进行数据完整性检查
 * 
 * 输出数据格式：
 * GeoJSON FeatureCollection对象或null（如果提取失败）
 */
export function extractGeoJSONFromlayer(
  layer: any, 
  map?: OlMap, 
  options: {
    featureProjection?: string
    dataProjection?: string
    enableLogging?: boolean
  } = {}
): any {
  const {
    featureProjection,
    dataProjection = 'EPSG:4326',
    enableLogging = true
  } = options

  if (!layer || !layer.getSource) {
    if (enableLogging) {
      console.error('[GeoJSONExtractor] 无效的图层对象')
    }
    return null
  }

  const source = layer.getSource()
  if (!source || !source.getFeatures) {
    if (enableLogging) {
      console.error('[GeoJSONExtractor] 图层没有有效的源数据')
    }
    return null
  }

  const features = source.getFeatures()
  if (!features || features.length === 0) {
    if (enableLogging) {
      console.error('[GeoJSONExtractor] 图层中没有要素')
    }
    return null
  }

  if (enableLogging) {
    console.log(`[GeoJSONExtractor] 图层包含 ${features.length} 个要素`)
  }

  // 确定要素投影
  const finalFeatureProjection = featureProjection || 
    map?.getView().getProjection() || 
    'EPSG:3857'

  // 使用Openlayers的GeoJSON格式器提取数据
  const geoJSONFormat = new GeoJSON()
  const geoJSONData = geoJSONFormat.writeFeatures(features, {
    featureProjection: finalFeatureProjection,
    dataProjection: dataProjection
  })

  try {
    const parsedData = JSON.parse(geoJSONData)
    
    if (enableLogging) {
      console.log('[GeoJSONExtractor] 成功提取GeoJSON数据:', {
        type: parsedData.type,
        featureCount: parsedData.features?.length || 0,
        projection: {
          from: finalFeatureProjection,
          to: dataProjection
        },
        features: parsedData.features?.map((f: any, index: number) => ({
          index: index,
          id: f.properties?.id || 'unknown',
          type: f.geometry?.type,
          coordinates: f.geometry?.coordinates ? 'present' : 'missing',
          coordinateSample: f.geometry?.coordinates ? 
            (Array.isArray(f.geometry.coordinates[0]) ? 
              f.geometry.coordinates[0].slice(0, 2) : 
              f.geometry.coordinates.slice(0, 2)) : 
            'no-coords'
        })) || []
      })
      
      // 验证数据完整性
      if (parsedData.features && parsedData.features.length > 0) {
        console.log('[GeoJSONExtractor] 数据完整性检查:')
        console.log(`  - 总要素数: ${parsedData.features.length}`)
        console.log(`  - 第一个要素:`, parsedData.features[0])
        console.log(`  - 最后一个要素:`, parsedData.features[parsedData.features.length - 1])
        
        // 检查是否有重复的要素
        const uniqueIds = new Set(parsedData.features.map((f: any) => f.properties?.id || 'no-id'))
        console.log(`  - 唯一ID数量: ${uniqueIds.size}`)
        if (uniqueIds.size !== parsedData.features.length) {
          console.warn('[GeoJSONExtractor] 警告: 发现重复的要素ID')
        }
      }
    }
    
    return parsedData
  } catch (error) {
    if (enableLogging) {
      console.error('[GeoJSONExtractor] 解析GeoJSON数据失败:', error)
    }
    return null
  }
}

/**
 * 从Openlayers要素数组提取GeoJSON数据
 * 
 * 输入数据格式：
 * @param features - Openlayers要素数组
 * @param map - Openlayers地图对象（可选，用于获取投影信息）
 * @param options - 提取选项
 * 
 * 数据处理方法：
 * 1. 验证要素数组有效性
 * 2. 使用Openlayers GeoJSON格式器转换数据
 * 3. 验证和解析GeoJSON数据
 * 
 * 输出数据格式：
 * GeoJSON FeatureCollection对象或null（如果提取失败）
 */
export function extractGeoJSONFromFeatures(
  features: any[], 
  map?: OlMap, 
  options: {
    featureProjection?: string
    dataProjection?: string
    enableLogging?: boolean
  } = {}
): any {
  const {
    featureProjection,
    dataProjection = 'EPSG:4326',
    enableLogging = true
  } = options

  if (!features || !Array.isArray(features) || features.length === 0) {
    if (enableLogging) {
      console.error('[GeoJSONExtractor] 无效的要素数组')
    }
    return null
  }

  if (enableLogging) {
    console.log(`[GeoJSONExtractor] 处理 ${features.length} 个要素`)
  }

  // 确定要素投影
  const finalFeatureProjection = featureProjection || 
    map?.getView().getProjection() || 
    'EPSG:3857'

  // 使用Openlayers的GeoJSON格式器提取数据
  const geoJSONFormat = new GeoJSON()
  const geoJSONData = geoJSONFormat.writeFeatures(features, {
    featureProjection: finalFeatureProjection,
    dataProjection: dataProjection
  })

  try {
    const parsedData = JSON.parse(geoJSONData)
    
    if (enableLogging) {
      console.log('[GeoJSONExtractor] 成功提取要素GeoJSON数据:', {
        type: parsedData.type,
        featureCount: parsedData.features?.length || 0,
        projection: {
          from: finalFeatureProjection,
          to: dataProjection
        }
      })
    }
    
    return parsedData
  } catch (error) {
    if (enableLogging) {
      console.error('[GeoJSONExtractor] 解析要素GeoJSON数据失败:', error)
    }
    return null
  }
}
