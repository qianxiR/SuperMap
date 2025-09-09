/**
 * 图层验证工具函数
 * 用于验证图层的几何类型和基本属性
 */

/**
 * 检查图层是否为面图层
 * 输入数据格式：OpenLayers图层对象和图层名称
 * 数据处理方法：检查图层中前几个要素的几何类型，判断是否包含面几何类型
 * 输出数据格式：验证结果对象，包含是否有效和错误信息
 */
export function checkLayerGeometryType(
  layer: any, 
  layerName: string, 
  requiredType: 'polygon' | 'line' | 'point' | 'any' = 'polygon'
): { isValid: boolean; message?: string } {
  const source = layer.getSource()
  if (!source) {
    return { isValid: false, message: `图层 ${layerName} 没有数据源` }
  }

  const features = source.getFeatures()
  if (!features || features.length === 0) {
    return { isValid: false, message: `图层 ${layerName} 没有要素数据` }
  }

  // 检查前几个要素的几何类型
  const sampleSize = Math.min(5, features.length)
  const geometryTypes = new Set()
  
  for (let i = 0; i < sampleSize; i++) {
    const geometry = features[i].getGeometry()
    if (geometry) {
      const type = geometry.getType()
      geometryTypes.add(type)
    }
  }

  // 根据要求的几何类型进行检查
  switch (requiredType) {
    case 'polygon':
      const hasPolygon = Array.from(geometryTypes).some(type => 
        type === 'Polygon' || type === 'MultiPolygon'
      )
      if (!hasPolygon) {
        const types = Array.from(geometryTypes).join(', ')
        return { 
          isValid: false, 
          message: `图层 ${layerName} 不是面图层，当前几何类型: ${types}。需要面图层数据。` 
        }
      }
      break

    case 'line':
      const hasLine = Array.from(geometryTypes).some(type => 
        type === 'LineString' || type === 'MultiLineString'
      )
      if (!hasLine) {
        const types = Array.from(geometryTypes).join(', ')
        return { 
          isValid: false, 
          message: `图层 ${layerName} 不是线图层，当前几何类型: ${types}。需要线图层数据。` 
        }
      }
      break

    case 'point':
      const hasPoint = Array.from(geometryTypes).some(type => 
        type === 'Point' || type === 'MultiPoint'
      )
      if (!hasPoint) {
        const types = Array.from(geometryTypes).join(', ')
        return { 
          isValid: false, 
          message: `图层 ${layerName} 不是点图层，当前几何类型: ${types}。需要点图层数据。` 
        }
      }
      break

    case 'any':
      // 任何几何类型都可以
      break
  }

  return { isValid: true }
}

/**
 * 检查图层是否有效（有数据源和要素）
 * 输入数据格式：OpenLayers图层对象和图层名称
 * 数据处理方法：检查图层是否有数据源和要素数据
 * 输出数据格式：验证结果对象，包含是否有效和错误信息
 */
export function checkLayerValidity(
  layer: any, 
  layerName: string
): { isValid: boolean; message?: string } {
  const source = layer.getSource()
  if (!source) {
    return { isValid: false, message: `图层 ${layerName} 没有数据源` }
  }

  const features = source.getFeatures()
  if (!features || features.length === 0) {
    return { isValid: false, message: `图层 ${layerName} 没有要素数据` }
  }

  return { isValid: true }
}

/**
 * 获取图层的几何类型信息
 * 输入数据格式：OpenLayers图层对象
 * 数据处理方法：分析图层中要素的几何类型分布
 * 输出数据格式：几何类型信息对象
 */
export function getLayerGeometryInfo(layer: any): {
  types: string[]
  primaryType: string
  featureCount: number
} {
  const source = layer.getSource()
  if (!source) {
    return { types: [], primaryType: 'unknown', featureCount: 0 }
  }

  const features = source.getFeatures()
  if (!features || features.length === 0) {
    return { types: [], primaryType: 'unknown', featureCount: 0 }
  }

  const typeCount = new Map<string, number>()
  
  for (const feature of features) {
    const geometry = feature.getGeometry()
    if (geometry) {
      const type = geometry.getType()
      typeCount.set(type, (typeCount.get(type) || 0) + 1)
    }
  }

  const types = Array.from(typeCount.keys())
  const primaryType = types.reduce((a, b) => 
    (typeCount.get(a) || 0) > (typeCount.get(b) || 0) ? a : b, 
    types[0] || 'unknown'
  )

  return {
    types,
    primaryType,
    featureCount: features.length
  }
}
