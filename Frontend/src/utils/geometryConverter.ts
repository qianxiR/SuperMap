/**
 * 几何转换工具函数
 * 用于在OpenLayers和Turf.js之间进行几何数据转换
 */

declare global {
  interface Window {
    turf: any
  }
}

/**
 * 将OpenLayers要素直接转换为turf几何对象
 * 输入数据格式：OpenLayers Feature对象
 * 数据处理方法：直接从OpenLayers几何对象中提取坐标和类型信息，创建对应的turf几何对象
 * 输出数据格式：turf几何对象（Feature类型）
 */
export const convertFeatureToTurfGeometry = (feature: any): any => {
  const geometry = feature.getGeometry()
  if (!geometry) return null
  
  const geometryType = geometry.getType()
  const coordinates = geometry.getCoordinates()
  if (!coordinates) return null
  
  const turf = window.turf
  if (!turf) return null
  
  let turfFeature
  
  if (geometryType === 'Point') {
    turfFeature = turf.point(coordinates)
  } else if (geometryType === 'LineString') {
    turfFeature = turf.lineString(coordinates)
  } else if (geometryType === 'Polygon') {
    turfFeature = turf.polygon(coordinates)
  } else if (geometryType === 'MultiPoint') {
    turfFeature = turf.multiPoint(coordinates)
  } else if (geometryType === 'MultiLineString') {
    turfFeature = turf.multiLineString(coordinates)
  } else if (geometryType === 'MultiPolygon') {
    turfFeature = turf.multiPolygon(coordinates)
  } else {
    return null
  }
  
  return turfFeature
}

/**
 * 将OpenLayers要素数组转换为turf几何对象数组
 * 输入数据格式：OpenLayers Feature数组
 * 数据处理方法：批量转换每个要素为turf几何对象，过滤无效要素
 * 输出数据格式：turf几何对象数组
 */
export const convertFeaturesToTurfGeometries = (features: any[]): any[] => {
  return features.map(convertFeatureToTurfGeometry).filter(Boolean)
}

/**
 * 将turf几何对象转换为OpenLayers几何对象
 * 输入数据格式：turf几何对象（包含geometry属性）
 * 数据处理方法：使用OpenLayers的GeoJSON格式器读取几何数据
 * 输出数据格式：OpenLayers几何对象
 */
export const convertTurfGeometryToOlGeometry = (turfGeometry: any): any => {
  if (!turfGeometry || !turfGeometry.geometry) return null
  
  const format = new window.ol.format.GeoJSON()
  return format.readGeometry(turfGeometry.geometry)
}

/**
 * 将turf几何对象转换为OpenLayers要素
 * 输入数据格式：turf几何对象和属性对象
 * 数据处理方法：先转换为OpenLayers几何对象，再创建Feature
 * 输出数据格式：OpenLayers Feature对象
 */
export const convertTurfGeometryToOlFeature = (turfGeometry: any, properties: any = {}): any => {
  const geometry = convertTurfGeometryToOlGeometry(turfGeometry)
  if (!geometry) return null
  
  return new window.ol.Feature({
    geometry: geometry,
    properties: properties
  })
}

/**
 * 将turf几何对象包装成FeatureCollection格式
 * 输入数据格式：turf几何对象
 * 数据处理方法：将单个几何对象包装成FeatureCollection格式
 * 输出数据格式：FeatureCollection格式的对象
 */
export const wrapTurfGeometryAsFeatureCollection = (turfGeometry: any): any => {
  if (!turfGeometry) return null
  return { type: 'FeatureCollection', features: [turfGeometry] }
}

/**
 * 为turf分析函数准备FeatureCollection格式的输入
 * 输入数据格式：两个turf几何对象
 * 数据处理方法：将两个几何对象组合成一个FeatureCollection格式
 * 输出数据格式：包含两个几何对象的FeatureCollection
 */
export const prepareTurfAnalysisInput = (geometry1: any, geometry2: any): any => {
  if (!geometry1 || !geometry2) return null
  return { type: 'FeatureCollection', features: [geometry1, geometry2] }
}
