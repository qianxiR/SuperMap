/**
 * 几何处理服务 - 统一处理点、线、面要素
 */
const turf = require('@turf/turf');

class GeometryProcessingService {
  /**
   * 过滤和验证几何要素
   * 
   * 输入数据格式：
   * @param {Object} geoJsonData - GeoJSON FeatureCollection对象
   * @param {Object} options - 处理选项
   * 
   * 数据处理方法：
   * 1. 遍历所有要素
   * 2. 验证几何有效性
   * 3. 过滤无效要素
   * 4. 处理闭合线要素
   * 
   * 输出数据格式：
   * 过滤后的GeoJSON FeatureCollection对象
   */
  filterAndValidateFeatures(geoJsonData, options = {}) {
    if (!geoJsonData || !geoJsonData.features || !Array.isArray(geoJsonData.features)) {
      return geoJsonData;
    }

    const {
      removeClosedLines = true,
      supportedTypes = ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon'],
      validateGeometry = true
    } = options;

    const validFeatures = [];
    let removedCount = 0;
    let invalidCount = 0;

    for (const feature of geoJsonData.features) {
      if (!feature || !feature.geometry) {
        invalidCount++;
        continue;
      }

      const geometry = feature.geometry;
      const geometryType = geometry.type;

      // 检查几何类型是否支持
      if (!supportedTypes.includes(geometryType)) {
        console.log(`[GeometryProcessingService] 跳过不支持的几何类型: ${geometryType}`);
        removedCount++;
        continue;
      }

      // 验证几何有效性
      if (validateGeometry && !this._validateGeometry(feature)) {
        console.log(`[GeometryProcessingService] 跳过无效几何要素: ${geometryType}`);
        invalidCount++;
        continue;
      }

      // 处理闭合线要素
      if (removeClosedLines && this._isClosedLineGeometry(geometry)) {
        console.log(`[GeometryProcessingService] 移除闭合的线要素: ${geometryType}`);
        removedCount++;
        continue;
      }

      // 保留有效的要素
      validFeatures.push(feature);
    }

    console.log('[GeometryProcessingService] 几何要素过滤统计:', {
      original: geoJsonData.features.length,
      valid: validFeatures.length,
      removed: removedCount,
      invalid: invalidCount
    });

    return {
      type: 'FeatureCollection',
      features: validFeatures
    };
  }

  /**
   * 检查是否为闭合的线几何体
   * 
   * 输入数据格式：
   * @param {Object} geometry - 几何对象
   * 
   * 数据处理方法：
   * 1. 检查几何类型
   * 2. 验证线要素是否闭合
   * 
   * 输出数据格式：
   * 布尔值，表示是否为闭合线
   */
  _isClosedLineGeometry(geometry) {
    if (!geometry || !geometry.coordinates) {
      return false;
    }

    const geometryType = geometry.type;

    if (geometryType === 'LineString') {
      return this._isLineClosed(geometry.coordinates);
    } else if (geometryType === 'MultiLineString') {
      // 对于多线要素，检查是否有任何线段闭合
      return geometry.coordinates.some(lineCoords => 
        this._isLineClosed(lineCoords)
      );
    }

    return false;
  }

  /**
   * 检查线要素是否闭合
   * 
   * 输入数据格式：
   * @param {Array} coordinates - 线要素的坐标数组
   * 
   * 数据处理方法：
   * 1. 检查坐标数组长度
   * 2. 比较首尾坐标是否相同
   * 3. 考虑坐标精度误差
   * 
   * 输出数据格式：
   * 布尔值，表示线是否闭合
   */
  _isLineClosed(coordinates) {
    if (!coordinates || coordinates.length < 3) {
      return false;
    }

    const first = coordinates[0];
    const last = coordinates[coordinates.length - 1];

    if (!first || !last || first.length < 2 || last.length < 2) {
      return false;
    }

    // 检查首尾坐标是否相同（考虑浮点数精度）
    const tolerance = 1e-10; // 坐标精度容差
    const isClosed = Math.abs(first[0] - last[0]) < tolerance && 
                     Math.abs(first[1] - last[1]) < tolerance;

    return isClosed;
  }

  /**
   * 验证几何数据有效性
   * 
   * 输入数据格式：
   * @param {Object} feature - GeoJSON要素
   * 
   * 数据处理方法：
   * 1. 检查几何类型
   * 2. 验证坐标数据
   * 3. 检查几何有效性
   * 
   * 输出数据格式：
   * 布尔值，表示是否有效
   */
  _validateGeometry(feature) {
    if (!feature || !feature.geometry) {
      return false;
    }

    const geometry = feature.geometry;
    if (!geometry.type || !geometry.coordinates) {
      return false;
    }

    // 使用turf验证几何有效性
    try {
      return turf.booleanValid(feature);
    } catch (error) {
      console.warn('[GeometryProcessingService] 几何验证失败:', error);
      return false;
    }
  }

  /**
   * 分析几何类型分布
   * 
   * 输入数据格式：
   * @param {Array} features - 要素数组
   * 
   * 数据处理方法：
   * 1. 统计几何类型
   * 2. 计算分布比例
   * 
   * 输出数据格式：
   * 几何类型分布对象
   */
  analyzeGeometryTypes(features) {
    const typeCount = {};
    
    features.forEach(feature => {
      const type = feature?.geometry?.type || 'Unknown';
      typeCount[type] = (typeCount[type] || 0) + 1;
    });

    const total = features.length;
    const distribution = {};
    
    Object.keys(typeCount).forEach(type => {
      distribution[type] = {
        count: typeCount[type],
        percentage: Math.round((typeCount[type] / total) * 100)
      };
    });

    return distribution;
  }

  /**
   * 获取支持的几何类型
   * 
   * 输出数据格式：
   * 支持的几何类型数组
   */
  getSupportedGeometryTypes() {
    return ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon'];
  }

  /**
   * 检查几何类型兼容性
   * 
   * 输入数据格式：
   * @param {string} type1 - 第一个几何类型
   * @param {string} type2 - 第二个几何类型
   * @param {string} operation - 操作类型（intersect, difference, union等）
   * 
   * 数据处理方法：
   * 1. 检查几何类型组合
   * 2. 验证操作兼容性
   * 
   * 输出数据格式：
   * 布尔值，表示是否兼容
   */
  checkGeometryCompatibility(type1, type2, operation) {
    const supportedTypes = this.getSupportedGeometryTypes();
    
    if (!supportedTypes.includes(type1) || !supportedTypes.includes(type2)) {
      return false;
    }

    // 根据操作类型检查兼容性
    switch (operation) {
      case 'intersect':
      case 'difference':
      case 'union':
        // 所有几何类型组合都支持这些操作
        return true;
      default:
        return true;
    }
  }
}

module.exports = GeometryProcessingService;
