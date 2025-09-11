/**
 * 几何实体 - 领域层核心实体
 */
const turf = require('@turf/turf');

class Geometry {
  /**
   * 几何实体构造函数
   * 
   * 输入数据格式：
   * @param {Object} geojson - GeoJSON格式的几何数据
   * @param {Object} properties - 几何属性
   * 
   * 数据处理方法：
   * 1. 验证GeoJSON格式
   * 2. 创建Turf几何对象
   * 3. 存储属性和元数据
   * 
   * 输出数据格式：
   * Geometry实体实例
   */
  constructor(geojson, properties = {}) {
    this._validateGeoJSON(geojson);
    this.geojson = geojson;
    this.properties = properties;
    this.id = properties.id || this._generateId();
    this.createdAt = new Date();
  }

  /**
   * 获取几何类型
   * 
   * 输入数据格式：
   * 无
   * 
   * 数据处理方法：
   * 从GeoJSON中提取几何类型
   * 
   * 输出数据格式：
   * 字符串类型的几何类型
   */
  getType() {
    return this.geojson.geometry.type;
  }

  /**
   * 获取坐标数据
   * 
   * 输入数据格式：
   * 无
   * 
   * 数据处理方法：
   * 从GeoJSON中提取坐标数组
   * 
   * 输出数据格式：
   * 坐标数组
   */
  getCoordinates() {
    return this.geojson.geometry.coordinates;
  }

  /**
   * 检查几何是否有效
   * 
   * 输入数据格式：
   * 无
   * 
   * 数据处理方法：
   * 验证几何数据的完整性和有效性
   * 
   * 输出数据格式：
   * 布尔值
   */
  isValid() {
    return this.geojson && 
           this.geojson.geometry && 
           this.geojson.geometry.coordinates &&
           this.geojson.geometry.coordinates.length > 0;
  }

  /**
   * 转换为Turf几何对象
   * 
   * 输入数据格式：
   * 无
   * 
   * 数据处理方法：
   * 根据几何类型创建对应的Turf几何对象
   * 
   * 输出数据格式：
   * Turf几何对象
   */
  toTurfGeometry() {
    const { type, coordinates } = this.geojson.geometry;
    
    switch (type) {
      case 'Point':
        return turf.point(coordinates);
      case 'LineString':
        return turf.lineString(coordinates);
      case 'Polygon':
        return turf.polygon(coordinates);
      case 'MultiPoint':
        return turf.multiPoint(coordinates);
      case 'MultiLineString':
        return turf.multiLineString(coordinates);
      case 'MultiPolygon':
        return turf.multiPolygon(coordinates);
      default:
        throw new Error(`不支持的几何类型: ${type}`);
    }
  }

  /**
   * 验证GeoJSON格式
   * 
   * 输入数据格式：
   * @param {Object} geojson - GeoJSON对象
   * 
   * 数据处理方法：
   * 检查必需字段和格式
   * 
   * 输出数据格式：
   * 无（抛出异常如果无效）
   */
  _validateGeoJSON(geojson) {
    if (!geojson || !geojson.geometry) {
      throw new Error('无效的GeoJSON格式：缺少geometry字段');
    }
    
    const { type, coordinates } = geojson.geometry;
    if (!type || !coordinates) {
      throw new Error('无效的GeoJSON格式：缺少type或coordinates字段');
    }
    
    const validTypes = ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon'];
    if (!validTypes.includes(type)) {
      throw new Error(`不支持的几何类型: ${type}`);
    }
  }

  /**
   * 生成唯一ID
   * 
   * 输入数据格式：
   * 无
   * 
   * 数据处理方法：
   * 使用时间戳和随机数生成唯一标识符
   * 
   * 输出数据格式：
   * 字符串格式的ID
   */
  _generateId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `geom_${timestamp}_${random}`;
  }
}

module.exports = Geometry;
