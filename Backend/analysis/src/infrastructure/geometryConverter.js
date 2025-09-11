/**
 * 几何转换工具函数 - 后端版本
 * 用于在GeoJSON和Turf.js之间进行几何数据转换
 */

const turf = require('@turf/turf');

/**
 * 将GeoJSON要素转换为turf几何对象
 * 输入数据格式：GeoJSON Feature对象
 * 数据处理方法：直接从GeoJSON中提取几何信息，创建对应的turf几何对象
 * 输出数据格式：turf几何对象（Feature类型）
 */
const convertGeoJSONToTurfGeometry = (feature) => {
  if (!feature || !feature.geometry) {
    console.warn('[GeometryConverter] 无效的GeoJSON要素:', feature);
    return null;
  }
  
  const { type, coordinates } = feature.geometry;
  if (!type || !coordinates) {
    console.warn('[GeometryConverter] 缺少几何类型或坐标:', feature);
    return null;
  }
  
  try {
    let turfFeature;
    
    switch (type) {
      case 'Point':
        turfFeature = turf.point(coordinates);
        break;
      case 'LineString':
        turfFeature = turf.lineString(coordinates);
        break;
      case 'Polygon':
        turfFeature = turf.polygon(coordinates);
        break;
      case 'MultiPoint':
        turfFeature = turf.multiPoint(coordinates);
        break;
      case 'MultiLineString':
        turfFeature = turf.multiLineString(coordinates);
        break;
      case 'MultiPolygon':
        turfFeature = turf.multiPolygon(coordinates);
        break;
      default:
        console.warn('[GeometryConverter] 不支持的几何类型:', type);
        return null;
    }
    
    // 保留原始属性
    if (feature.properties) {
      turfFeature.properties = { ...feature.properties };
    }
    
    return turfFeature;
  } catch (error) {
    console.error('[GeometryConverter] 转换失败:', error, feature);
    return null;
  }
};

/**
 * 将GeoJSON要素数组转换为turf几何对象数组
 * 输入数据格式：GeoJSON Feature数组
 * 数据处理方法：批量转换每个要素为turf几何对象，过滤无效要素
 * 输出数据格式：turf几何对象数组
 */
const convertGeoJSONFeaturesToTurfGeometries = (features) => {
  if (!Array.isArray(features)) {
    console.warn('[GeometryConverter] 输入不是数组:', features);
    return [];
  }
  
  console.log(`[GeometryConverter] 开始转换 ${features.length} 个要素`);
  
  const turfFeatures = [];
  const failedFeatures = [];
  
  features.forEach((feature, index) => {
    const turfFeature = convertGeoJSONToTurfGeometry(feature);
    if (turfFeature) {
      turfFeatures.push(turfFeature);
    } else {
      failedFeatures.push({ index, feature });
      console.warn(`[GeometryConverter] 要素 ${index} 转换失败:`, {
        type: feature.type,
        geometryType: feature.geometry?.type,
        hasCoordinates: !!feature.geometry?.coordinates
      });
    }
  });
  
  console.log(`[GeometryConverter] 转换完成: ${features.length} -> ${turfFeatures.length}`);
  if (failedFeatures.length > 0) {
    console.warn(`[GeometryConverter] ${failedFeatures.length} 个要素转换失败`);
  }
  
  return turfFeatures;
};

/**
 * 将turf几何对象转换为GeoJSON格式
 * 输入数据格式：turf几何对象
 * 数据处理方法：直接返回turf对象的GeoJSON表示
 * 输出数据格式：GeoJSON Feature对象
 */
const convertTurfGeometryToGeoJSON = (turfFeature) => {
  if (!turfFeature) {
    return null;
  }
  
  try {
    // turf对象本身就是GeoJSON格式
    return {
      type: 'Feature',
      geometry: turfFeature.geometry,
      properties: turfFeature.properties || {}
    };
  } catch (error) {
    console.error('[GeometryConverter] 转换turf到GeoJSON失败:', error);
    return null;
  }
};

/**
 * 将turf几何对象数组转换为GeoJSON FeatureCollection
 * 输入数据格式：turf几何对象数组
 * 数据处理方法：批量转换并包装为FeatureCollection
 * 输出数据格式：GeoJSON FeatureCollection对象
 */
const convertTurfGeometriesToGeoJSONCollection = (turfFeatures) => {
  if (!Array.isArray(turfFeatures)) {
    return null;
  }
  
  const features = turfFeatures.map(convertTurfGeometryToGeoJSON).filter(Boolean);
  
  return {
    type: 'FeatureCollection',
    features: features
  };
};

/**
 * 为缓冲区分析准备输入数据
 * 输入数据格式：GeoJSON FeatureCollection
 * 数据处理方法：转换为turf格式并验证
 * 输出数据格式：turf几何对象数组
 */
const prepareBufferAnalysisInput = (geoJSONData) => {
  if (!geoJSONData) {
    throw new Error('输入数据不能为空');
  }
  
  console.log('[GeometryConverter] 接收到的GeoJSON数据:', {
    type: geoJSONData.type,
    hasFeatures: !!geoJSONData.features,
    featureCount: geoJSONData.features?.length || 0
  });
  
  let features = [];
  
  if (geoJSONData.type === 'FeatureCollection') {
    features = geoJSONData.features || [];
    console.log(`[GeometryConverter] FeatureCollection包含 ${features.length} 个要素`);
    
    // 详细检查每个要素
    features.forEach((feature, index) => {
      console.log(`[GeometryConverter] 要素 ${index}:`, {
        type: feature.type,
        geometryType: feature.geometry?.type,
        hasCoordinates: !!feature.geometry?.coordinates,
        properties: feature.properties ? Object.keys(feature.properties) : 'no-properties'
      });
    });
    
  } else if (geoJSONData.type === 'Feature') {
    features = [geoJSONData];
    console.log('[GeometryConverter] 单个Feature要素');
  } else {
    throw new Error('不支持的GeoJSON类型，只支持Feature或FeatureCollection');
  }
  
  if (features.length === 0) {
    throw new Error('没有找到有效的要素数据');
  }
  
  console.log(`[GeometryConverter] 准备缓冲区分析输入: ${features.length} 个要素`);
  
  const turfFeatures = convertGeoJSONFeaturesToTurfGeometries(features);
  
  console.log(`[GeometryConverter] 转换结果: ${turfFeatures.length} 个turf要素`);
  
  if (turfFeatures.length === 0) {
    throw new Error('没有有效的几何数据可以处理');
  }
  
  return turfFeatures;
};

/**
 * 格式化缓冲区分析结果
 * 输入数据格式：turf几何对象数组
 * 数据处理方法：转换为标准GeoJSON格式并添加元数据
 * 输出数据格式：GeoJSON FeatureCollection
 */
const formatBufferAnalysisResults = (turfResults, settings, sourceLayerName) => {
  if (!Array.isArray(turfResults)) {
    return null;
  }
  
  const features = turfResults.map((result, index) => {
    const geoJSONFeature = convertTurfGeometryToGeoJSON(result);
    if (geoJSONFeature) {
      // 添加缓冲区分析元数据
      geoJSONFeature.properties = {
        ...geoJSONFeature.properties,
        bufferId: `buffer_${Date.now()}_${index}`,
        bufferRadius: settings.radius,
        bufferUnit: settings.unit,
        sourceLayer: sourceLayerName,
        analysisType: 'buffer',
        createdAt: new Date().toISOString()
      };
    }
    return geoJSONFeature;
  }).filter(Boolean);
  
  return {
    type: 'FeatureCollection',
    features: features
  };
};

/**
 * 准备最短路径分析输入数据
 * 输入数据格式：GeoJSON Point对象
 * 数据处理方法：验证点格式并转换为turf Point对象
 * 输出数据格式：turf Point对象
 */
const prepareShortestPathInput = (point) => {
  if (!point || !point.type || point.type !== 'Point') {
    console.warn('[GeometryConverter] 无效的起点或终点:', point);
    return null;
  }
  
  if (!Array.isArray(point.coordinates) || point.coordinates.length < 2) {
    console.warn('[GeometryConverter] 无效的坐标数据:', point.coordinates);
    return null;
  }
  
  try {
    const turfPoint = turf.point(point.coordinates);
    console.log('[GeometryConverter] 成功转换点坐标:', point.coordinates);
    return turfPoint;
  } catch (error) {
    console.error('[GeometryConverter] 点坐标转换失败:', error);
    return null;
  }
};

/**
 * 处理障碍物数据
 * 输入数据格式：障碍物FeatureCollection
 * 数据处理方法：将点、线要素转换为小缓冲区作为障碍物
 * 输出数据格式：turf FeatureCollection格式的障碍物
 */
const processObstacles = (obstacleData) => {
  if (!obstacleData || !obstacleData.features || obstacleData.features.length === 0) {
    console.log('[GeometryConverter] 没有障碍物数据');
    return null;
  }
  
  try {
    const processedObstacles = [];
    
    obstacleData.features.forEach((feature, index) => {
      if (!feature.geometry) {
        console.warn(`[GeometryConverter] 障碍物要素 ${index} 缺少几何信息`);
        return;
      }
      
      const geometryType = feature.geometry.type;
      let obstacleFeature = null;
      
      switch (geometryType) {
        case 'Point':
          // 点要素转换为小缓冲区
          obstacleFeature = turf.buffer(feature, 0.01, { units: 'kilometers' });
          break;
          
        case 'LineString':
          // 线要素转换为缓冲区
          obstacleFeature = turf.buffer(feature, 0.005, { units: 'kilometers' });
          break;
          
        case 'Polygon':
        case 'MultiPolygon':
          // 面要素直接使用
          obstacleFeature = feature;
          break;
          
        case 'MultiPoint':
          // 多点要素转换为多个小缓冲区
          feature.geometry.coordinates.forEach(coord => {
            const pointFeature = turf.point(coord);
            const bufferedPoint = turf.buffer(pointFeature, 0.01, { units: 'kilometers' });
            processedObstacles.push(bufferedPoint);
          });
          return;
          
        case 'MultiLineString':
          // 多线要素转换为多个缓冲区
          feature.geometry.coordinates.forEach(coords => {
            const lineFeature = turf.lineString(coords);
            const bufferedLine = turf.buffer(lineFeature, 0.005, { units: 'kilometers' });
            processedObstacles.push(bufferedLine);
          });
          return;
          
        default:
          console.warn(`[GeometryConverter] 不支持的障碍物几何类型: ${geometryType}`);
          return;
      }
      
      if (obstacleFeature) {
        processedObstacles.push(obstacleFeature);
      }
    });
    
    if (processedObstacles.length === 0) {
      console.log('[GeometryConverter] 没有有效的障碍物要素');
      return null;
    }
    
    const obstacleCollection = turf.featureCollection(processedObstacles);
    console.log(`[GeometryConverter] 成功处理 ${processedObstacles.length} 个障碍物要素`);
    
    return obstacleCollection;
  } catch (error) {
    console.error('[GeometryConverter] 障碍物处理失败:', error);
    return null;
  }
};

/**
 * 格式化最短路径分析结果
 * 输入数据格式：turf路径结果对象
 * 数据处理方法：提取路径几何信息和统计信息
 * 输出数据格式：格式化的路径结果对象
 */
const formatShortestPathResults = (pathResult, options = {}) => {
  if (!pathResult || !pathResult.geometry) {
    console.warn('[GeometryConverter] 无效的路径结果:', pathResult);
    return null;
  }
  
  try {
    const result = {
      geometry: pathResult.geometry,
      properties: {
        id: `path_${Date.now()}`,
        name: '最短路径',
        type: 'shortest_path',
        createdAt: new Date().toISOString(),
        ...options
      }
    };
    
    console.log('[GeometryConverter] 成功格式化路径结果:', {
      type: result.geometry.type,
      coordinates: result.geometry.coordinates?.length || 0
    });
    
    return result;
  } catch (error) {
    console.error('[GeometryConverter] 路径结果格式化失败:', error);
    return null;
  }
};

/**
 * 为turf分析函数准备FeatureCollection格式的输入
 * 输入数据格式：两个turf几何对象
 * 数据处理方法：将两个几何对象组合成一个FeatureCollection格式
 * 输出数据格式：包含两个几何对象的FeatureCollection
 */
const prepareTurfAnalysisInput = (geometry1, geometry2) => {
  if (!geometry1 || !geometry2) {
    console.warn('[GeometryConverter] 无效的几何对象:', { geometry1: !!geometry1, geometry2: !!geometry2 });
    return null;
  }
  
  return { 
    type: 'FeatureCollection', 
    features: [geometry1, geometry2] 
  };
};

/**
 * 统一的turf分析执行器
 * 输入数据格式：两个几何对象和分析类型
 * 数据处理方法：根据分析类型调用相应的turf函数
 * 输出数据格式：分析结果或null
 */
const executeTurfAnalysis = (geometry1, geometry2, analysisType) => {
  if (!geometry1 || !geometry2 || !analysisType) {
    console.warn('[GeometryConverter] 无效的分析参数:', { 
      geometry1: !!geometry1, 
      geometry2: !!geometry2, 
      analysisType: analysisType 
    });
    return null;
  }

  try {
    const featureCollection = prepareTurfAnalysisInput(geometry1, geometry2);
    
    switch (analysisType) {
      case 'intersect':
        return turf.intersect(featureCollection);
      case 'difference':
        return turf.difference(featureCollection);
      case 'union':
        return turf.union(featureCollection);
      default:
        console.warn('[GeometryConverter] 不支持的分析类型:', analysisType);
        return null;
    }
  } catch (error) {
    console.error('[GeometryConverter] turf分析执行失败:', error);
    return null;
  }
};

/**
 * 验证几何类型兼容性
 * 输入数据格式：两个几何对象和分析类型
 * 数据处理方法：检查几何类型是否支持指定的分析操作
 * 输出数据格式：布尔值，表示是否兼容
 */
const validateGeometryCompatibility = (geometry1, geometry2, analysisType) => {
  if (!geometry1 || !geometry2 || !analysisType) {
    return false;
  }

  const type1 = geometry1.geometry?.type || geometry1.type;
  const type2 = geometry2.geometry?.type || geometry2.type;

  const supportedTypes = ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon'];
  
  if (!supportedTypes.includes(type1) || !supportedTypes.includes(type2)) {
    return false;
  }

  // 所有支持的几何类型组合都支持intersect、difference、union操作
  return ['intersect', 'difference', 'union'].includes(analysisType);
};

module.exports = {
  convertGeoJSONToTurfGeometry,
  convertGeoJSONFeaturesToTurfGeometries,
  convertTurfGeometryToGeoJSON,
  convertTurfGeometriesToGeoJSONCollection,
  prepareBufferAnalysisInput,
  formatBufferAnalysisResults,
  prepareShortestPathInput,
  formatShortestPathResults,
  processObstacles,
  prepareTurfAnalysisInput,
  executeTurfAnalysis,
  validateGeometryCompatibility
};
