/**
 * 缓冲区分析领域服务
 */
const turf = require('@turf/turf');
const { prepareBufferAnalysisInput, formatBufferAnalysisResults } = require('../../infrastructure/geometryConverter');

class BufferAnalysisService {
  /**
   * 执行缓冲区分析
   * 
   * 输入数据格式：
   * @param {Object} geoJSONData - GeoJSON数据（FeatureCollection或Feature）
   * @param {BufferSettings} settings - 缓冲区设置
   * 
   * 数据处理方法：
   * 1. 使用geometryConverter转换GeoJSON为turf格式
   * 2. 遍历每个几何实体执行缓冲区计算
   * 3. 处理结果合并
   * 4. 格式化输出结果
   * 
   * 输出数据格式：
   * 缓冲区分析结果对象
   */
  async executeBufferAnalysis(geoJSONData, settings) {
    if (!geoJSONData) {
      throw new Error('GeoJSON数据不能为空');
    }

    const startTime = Date.now();

    // 使用geometryConverter准备输入数据
    console.log('[BufferAnalysisService] 开始处理GeoJSON数据:', {
      type: geoJSONData.type,
      featureCount: geoJSONData.features?.length || 0
    });

    const turfFeatures = prepareBufferAnalysisInput(geoJSONData);
    console.log(`[BufferAnalysisService] 转换完成，准备处理 ${turfFeatures.length} 个turf要素`);

    const results = [];
    
    // 分批处理要素避免内存溢出
    const batchSize = Math.min(100, turfFeatures.length);
    for (let i = 0; i < turfFeatures.length; i += batchSize) {
      const batch = turfFeatures.slice(i, i + batchSize);
      
      for (const turfFeature of batch) {
        try {
          const bufferedFeature = await this._createBuffer(turfFeature, settings);
          if (bufferedFeature) {
            results.push(bufferedFeature);
          }
        } catch (error) {
          // 静默处理错误，避免大量日志输出
        }
      }
      
      // 强制垃圾回收
      if (global.gc) {
        global.gc();
      }
    }
    
    console.log('[BufferAnalysisService] 处理完成:', {
      inputCount: turfFeatures.length,
      outputCount: results.length,
      results: results.map(r => ({ type: r.geometry.type }))
    });

    // 合并结果（如果需要）
    let finalResults = results;
    if (settings.unionResults && results.length > 1) {
      finalResults = this._combineResults(results);
    }

    const executionTime = Date.now() - startTime;

    return {
      results: finalResults,
      statistics: this._calculateStatistics(turfFeatures, finalResults),
      executionTime: `${(executionTime / 1000).toFixed(3)}s`,
      settings: settings.toJSON()
    };
  }

  /**
   * 创建单个几何的缓冲区
   * 
   * 输入数据格式：
   * @param {Object} turfFeature - turf几何要素
   * @param {BufferSettings} settings - 缓冲区设置
   * 
   * 数据处理方法：
   * 1. 直接使用turf要素执行缓冲区计算
   * 2. 验证结果
   * 3. 添加缓冲区元数据
   * 
   * 输出数据格式：
   * 缓冲区turf要素
   */
  async _createBuffer(turfFeature, settings) {
    const turfOptions = settings.toTurfOptions();

    // 执行缓冲区计算
    const buffered = turf.buffer(turfFeature, settings.radius, turfOptions);

    // 验证结果
    if (!buffered || !buffered.geometry) {
      return null;
    }

    // 添加缓冲区元数据
    buffered.properties = {
      ...buffered.properties,
      id: `buffer_${turfFeature.properties?.id || 'unknown'}_${Date.now()}`,
      name: `${turfFeature.properties?.name || '几何要素'}_缓冲区`,
      sourceFeatureId: turfFeature.properties?.id || 'unknown',
      bufferDistance: settings.radius,
      bufferUnit: settings.unit,
      area: this._calculateArea(buffered.geometry),
      createdAt: new Date().toISOString()
    };

    return buffered;
  }

  /**
   * 合并多个缓冲区结果为FeatureCollection格式
   * 
   * 输入数据格式：
   * @param {Array<Object>} turfFeatures - turf要素数组
   * 
   * 数据处理方法：
   * 1. 检查要素数量
   * 2. 将所有要素拼接成FeatureCollection格式
   * 3. 添加合并元数据
   * 
   * 输出数据格式：
   * 包含所有要素的FeatureCollection
   */
  _combineResults(turfFeatures) {
    // 如果只有一个或没有要素，直接返回
    if (turfFeatures.length <= 1) {
      return turfFeatures;
    }

    try {
      console.log(`[BufferAnalysisService] 合并 ${turfFeatures.length} 个缓冲区结果`);

      // 创建FeatureCollection格式的合并结果
      const combinedFeature = {
        type: 'Feature',
        geometry: {
          type: 'FeatureCollection',
          features: turfFeatures.map(feature => ({
            type: 'Feature',
            geometry: feature.geometry,
            properties: feature.properties || {}
          }))
        },
        properties: {
          id: `combined_buffer_${Date.now()}`,
          name: '合并缓冲区集合',
          sourceCount: turfFeatures.length,
          totalArea: turfFeatures.reduce((sum, feature) => {
            return sum + (feature.properties?.area || 0);
          }, 0),
          createdAt: new Date().toISOString(),
          combinedType: 'FeatureCollection'
        }
      };

      console.log(`[BufferAnalysisService] 成功合并为FeatureCollection，包含 ${turfFeatures.length} 个要素`);
      return [combinedFeature];

    } catch (error) {
      console.warn('缓冲区合并失败:', error.message);
      // 如果合并失败，返回原始要素
      return turfFeatures;
    }
  }

  /**
   * 计算几何面积
   * 
   * 输入数据格式：
   * @param {Object} geometry - Turf几何对象
   * 
   * 数据处理方法：
   * 使用Turf.js计算面积
   * 
   * 输出数据格式：
   * 面积数值（平方米）
   */
  _calculateArea(geometry) {
    try {
      return turf.area(turf.feature(geometry));
    } catch (error) {
      return 0;
    }
  }

  /**
   * 计算分析统计信息
   * 
   * 输入数据格式：
   * @param {Array<Object>} inputFeatures - 输入turf要素数组
   * @param {Array<Object>} outputFeatures - 输出turf要素数组
   * 
   * 数据处理方法：
   * 1. 计算要素数量
   * 2. 计算总面积
   * 3. 计算处理时间
   * 
   * 输出数据格式：
   * 统计信息对象
   */
  _calculateStatistics(inputFeatures, outputFeatures) {
    const totalArea = outputFeatures.reduce((sum, feature) => {
      return sum + (feature.properties?.area || 0);
    }, 0);

    return {
      inputFeatureCount: inputFeatures.length,
      outputFeatureCount: outputFeatures.length,
      totalArea: Math.round(totalArea * 100) / 100,
      areaUnit: 'square_meters'
    };
  }
}

module.exports = BufferAnalysisService;
