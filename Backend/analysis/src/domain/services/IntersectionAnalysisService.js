/**
 * 相交分析领域服务
 */
const turf = require('@turf/turf');
const { prepareTurfAnalysisInput, executeTurfAnalysis, validateGeometryCompatibility } = require('../../infrastructure/geometryConverter');
const GeometryProcessingService = require('./GeometryProcessingService');

class IntersectionAnalysisService {
  constructor() {
    this.geometryProcessor = new GeometryProcessingService();
  }

  /**
   * 执行相交分析
   * 
   * 输入数据格式：
   * @param {Object} targetData - 目标图层GeoJSON数据
   * @param {Object} maskData - 遮罩图层GeoJSON数据
   * @param {Object} options - 分析选项
   * 
   * 数据处理方法：
   * 1. 验证输入数据
   * 2. 执行相交计算
   * 3. 计算统计信息
   * 4. 格式化结果
   * 
   * 输出数据格式：
   * 相交分析结果对象
   */
  async executeIntersectionAnalysis(targetData, maskData, options) {
    if (!targetData || !maskData) {
      throw new Error('目标数据和遮罩数据不能为空');
    }

    const startTime = Date.now();

    console.log('[IntersectionAnalysisService] 开始处理相交分析:', {
      targetFeatures: targetData.features?.length || 0,
      maskFeatures: maskData.features?.length || 0,
      options: options
    });

    // 验证GeoJSON格式
    if (targetData.type !== 'FeatureCollection' || maskData.type !== 'FeatureCollection') {
      throw new Error('输入数据必须是FeatureCollection格式');
    }

    // 使用统一的几何处理服务过滤和验证要素
    const processedTargetData = this.geometryProcessor.filterAndValidateFeatures(targetData);
    const processedMaskData = this.geometryProcessor.filterAndValidateFeatures(maskData);

    const targetFeatures = processedTargetData.features || [];
    const maskFeatures = processedMaskData.features || [];

    if (targetFeatures.length === 0 || maskFeatures.length === 0) {
      throw new Error('目标图层或遮罩图层过滤后没有有效要素');
    }

    console.log('[IntersectionAnalysisService] 几何要素处理完成:', {
      targetOriginal: targetData.features?.length || 0,
      targetProcessed: targetFeatures.length,
      maskOriginal: maskData.features?.length || 0,
      maskProcessed: maskFeatures.length
    });

    console.log('[IntersectionAnalysisService] 开始执行相交计算');

    // 执行相交分析
    const results = await this._performIntersectionCalculation(
      targetFeatures, 
      maskFeatures, 
      options
    );

    const endTime = Date.now();
    const processingTime = endTime - startTime;

    // 计算统计信息
    const statistics = this._calculateStatistics(
      targetFeatures.length,
      maskFeatures.length,
      results.length,
      processingTime
    );

    console.log('[IntersectionAnalysisService] 相交分析完成:', {
      resultsCount: results.length,
      processingTime: processingTime,
      statistics: statistics
    });

    return {
      results: results,
      statistics: statistics,
      metadata: {
        version: '1.0.0',
        algorithm: 'turf-intersect',
        coordinateSystem: 'EPSG:4326',
        batchSize: options.batchSize || 100
      }
    };
  }

  /**
   * 执行相交计算
   * 
   * 输入数据格式：
   * @param {Array} targetFeatures - 目标要素数组
   * @param {Array} maskFeatures - 遮罩要素数组
   * @param {Object} options - 计算选项
   * 
   * 数据处理方法：
   * 1. 合并所有遮罩要素为单个要素
   * 2. 对每个目标要素执行单次相交操作
   * 3. 合并相交结果
   * 
   * 输出数据格式：
   * 相交结果数组
   */
  async _performIntersectionCalculation(targetFeatures, maskFeatures, options) {
    const results = [];
    const batchSize = Math.min(options.batchSize || 50, 100);

    console.log('[IntersectionAnalysisService] 开始优化的相交计算:', {
      targetCount: targetFeatures.length,
      maskCount: maskFeatures.length,
      batchSize: batchSize
    });

    // 获取第一个目标要素的属性作为模板
    const firstTargetProps = targetFeatures.length > 0 && targetFeatures[0].properties 
      ? JSON.parse(JSON.stringify(targetFeatures[0].properties)) 
      : {};

    try {
      // 第一步：合并所有遮罩要素为单个要素
      const mergedMaskFeature = this._mergeMaskFeatures(maskFeatures);
      
      if (!mergedMaskFeature) {
        console.warn('[IntersectionAnalysisService] 遮罩要素合并失败，回退到逐个处理模式');
        return this._performIntersectionCalculationLegacy(targetFeatures, maskFeatures, options);
      }

      console.log('[IntersectionAnalysisService] 遮罩要素合并完成，开始处理目标要素');

      // 第二步：对每个目标要素执行相交操作
      for (let i = 0; i < targetFeatures.length; i += batchSize) {
        const targetBatch = targetFeatures.slice(i, i + batchSize);
        
        for (const targetFeature of targetBatch) {
          try {
            // 执行单次相交操作
            const intersection = executeTurfAnalysis(targetFeature, mergedMaskFeature, 'intersect');
            
            if (intersection && intersection.geometry) {
              // 如果结果包含多个部分，尝试合并
              const mergedResult = this._mergeResultGeometry(intersection);
              
              const resultItem = {
                id: `intersection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: `相交区域 ${results.length + 1}`,
                geometry: mergedResult.geometry,
                properties: {
                  // 保留第一个目标要素的原始属性
                  ...firstTargetProps,
                  // 添加分析元数据
                  analysisType: 'intersection',
                  sourceLayer: 'target',
                  maskLayer: 'mask',
                  processedAt: new Date().toISOString()
                },
                sourceTargetLayerName: '目标图层',
                sourceMaskLayerName: '遮罩图层',
                createdAt: new Date().toISOString()
              };
              results.push(resultItem);
            }
          } catch (error) {
            console.warn('[IntersectionAnalysisService] 相交计算失败:', error.message);
          }
        }
        
        // 强制垃圾回收
        if (global.gc) {
          global.gc();
        }
      }

      console.log(`[IntersectionAnalysisService] 优化相交计算完成，结果数: ${results.length}`);
      return results;

    } catch (error) {
      console.error('[IntersectionAnalysisService] 优化相交计算失败，回退到传统模式:', error);
      return this._performIntersectionCalculationLegacy(targetFeatures, maskFeatures, options);
    }
  }

  /**
   * 合并遮罩要素为单个要素
   * 
   * 输入数据格式：
   * @param {Array} maskFeatures - 遮罩要素数组
   * 
   * 数据处理方法：
   * 1. 过滤有效的几何要素
   * 2. 使用turf.union合并所有要素
   * 3. 返回合并后的要素
   * 
   * 输出数据格式：
   * 合并后的turf要素或null
   */
  _mergeMaskFeatures(maskFeatures) {
    if (!Array.isArray(maskFeatures) || maskFeatures.length === 0) {
      return null;
    }

    try {
      // 过滤出有效的几何要素（支持点、线、面）
      const validFeatures = maskFeatures.filter(feature => {
        if (!feature || !feature.geometry) return false;
        const geomType = feature.geometry.type;
        return ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon'].includes(geomType);
      });

      if (validFeatures.length === 0) {
        console.warn('[IntersectionAnalysisService] 没有有效的遮罩要素可以合并');
        return null;
      }

      if (validFeatures.length === 1) {
        console.log('[IntersectionAnalysisService] 只有一个遮罩要素，直接返回');
        return validFeatures[0];
      }

      console.log(`[IntersectionAnalysisService] 开始合并 ${validFeatures.length} 个遮罩要素`);

      // 逐步合并所有要素
      let mergedFeature = validFeatures[0];
      
      for (let i = 1; i < validFeatures.length; i++) {
        try {
          const unionResult = executeTurfAnalysis(mergedFeature, validFeatures[i], 'union');
          
          if (unionResult && unionResult.geometry) {
            mergedFeature = unionResult;
          }
        } catch (error) {
          console.warn(`[IntersectionAnalysisService] 合并第 ${i} 个要素失败:`, error.message);
        }
      }

      console.log('[IntersectionAnalysisService] 遮罩要素合并完成');
      return mergedFeature;

    } catch (error) {
      console.error('[IntersectionAnalysisService] 遮罩要素合并失败:', error);
      return null;
    }
  }

  /**
   * 合并结果几何体（如果包含多个部分）
   * 
   * 输入数据格式：
   * @param {Object} resultFeature - 相交结果要素
   * 
   * 数据处理方法：
   * 1. 检查几何体类型
   * 2. 如果是MultiPolygon，尝试合并为单个Polygon
   * 3. 返回优化后的几何体
   * 
   * 输出数据格式：
   * 优化后的要素
   */
  _mergeResultGeometry(resultFeature) {
    if (!resultFeature || !resultFeature.geometry) {
      return resultFeature;
    }

    try {
      const geometry = resultFeature.geometry;
      
      // 如果是MultiPolygon且包含多个部分，尝试合并
      if (geometry.type === 'MultiPolygon' && geometry.coordinates.length > 1) {
        console.log(`[IntersectionAnalysisService] 尝试合并 ${geometry.coordinates.length} 个多边形部分`);
        
        // 创建包含所有部分的FeatureCollection
        const features = geometry.coordinates.map(coords => 
          turf.polygon(coords)
        );
        const featureCollection = turf.featureCollection(features);
        
        // 尝试合并所有部分
        let mergedFeature = features[0];
        for (let i = 1; i < features.length; i++) {
          try {
            const unionResult = executeTurfAnalysis(mergedFeature, features[i], 'union');
            if (unionResult && unionResult.geometry) {
              mergedFeature = unionResult;
            }
          } catch (error) {
            // 如果合并失败，保持原样
            console.warn(`[IntersectionAnalysisService] 合并第 ${i} 个部分失败:`, error.message);
          }
        }
        
        return mergedFeature;
      }
      
      return resultFeature;
    } catch (error) {
      console.warn('[IntersectionAnalysisService] 结果几何体合并失败:', error.message);
      return resultFeature;
    }
  }

  /**
   * 传统相交计算方式（回退方案）
   * 
   * 输入数据格式：
   * @param {Array} targetFeatures - 目标要素数组
   * @param {Array} maskFeatures - 遮罩要素数组
   * @param {Object} options - 计算选项
   * 
   * 数据处理方法：
   * 1. 遍历所有要素组合
   * 2. 执行相交计算
   * 3. 收集有效结果
   * 
   * 输出数据格式：
   * 相交结果数组
   */
  async _performIntersectionCalculationLegacy(targetFeatures, maskFeatures, options) {
    const results = [];
    const totalPairs = targetFeatures.length * maskFeatures.length;
    const batchSize = Math.min(options.batchSize || 50, 100);

    console.log('[IntersectionAnalysisService] 使用传统相交计算模式:', {
      targetCount: targetFeatures.length,
      maskCount: maskFeatures.length,
      totalPairs: totalPairs,
      batchSize: batchSize
    });

    // 获取第一个目标要素的属性作为模板
    const firstTargetProps = targetFeatures.length > 0 && targetFeatures[0].properties 
      ? JSON.parse(JSON.stringify(targetFeatures[0].properties)) 
      : {};

    // 分批处理避免内存溢出
    for (let i = 0; i < targetFeatures.length; i += batchSize) {
      const targetBatch = targetFeatures.slice(i, i + batchSize);
      
      for (let j = 0; j < maskFeatures.length; j += batchSize) {
        const maskBatch = maskFeatures.slice(j, j + batchSize);
        
        for (const targetFeature of targetBatch) {
          for (const maskFeature of maskBatch) {
            try {
              const intersection = executeTurfAnalysis(targetFeature, maskFeature, 'intersect');
              
              if (intersection && intersection.geometry) {
                const resultItem = {
                  id: `intersection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  name: `相交区域 ${results.length + 1}`,
                  geometry: intersection.geometry,
                  properties: {
                    // 保留第一个目标要素的原始属性
                    ...firstTargetProps,
                    // 添加分析元数据
                    analysisType: 'intersection',
                    sourceLayer: 'target',
                    maskLayer: 'mask',
                    processedAt: new Date().toISOString()
                  },
                  sourceTargetLayerName: '目标图层',
                  sourceMaskLayerName: '遮罩图层',
                  createdAt: new Date().toISOString()
                };
                results.push(resultItem);
              }
            } catch (error) {
              // 静默处理错误，避免大量日志输出
            }
          }
        }
        
        // 强制垃圾回收
        if (global.gc) {
          global.gc();
        }
      }
    }

    console.log(`[IntersectionAnalysisService] 传统相交计算完成，结果数: ${results.length}`);
    return results;
  }

  /**
   * 计算统计信息
   * 
   * 输入数据格式：
   * @param {number} targetCount - 目标要素数量
   * @param {number} maskCount - 遮罩要素数量
   * @param {number} resultCount - 结果数量
   * @param {number} processingTime - 处理时间
   * 
   * 数据处理方法：
   * 1. 计算基本统计
   * 2. 计算成功率
   * 3. 格式化统计信息
   * 
   * 输出数据格式：
   * 统计信息对象
   */
  _calculateStatistics(targetCount, maskCount, resultCount, processingTime) {
    const totalPairs = targetCount * maskCount;
    const successRate = totalPairs > 0 ? (resultCount / totalPairs) * 100 : 0;

    return {
      totalResults: resultCount,
      targetFeatureCount: targetCount,
      maskFeatureCount: maskCount,
      totalPairs: totalPairs,
      processingTime: processingTime,
      successRate: Math.round(successRate * 100) / 100
    };
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
      console.warn('[IntersectionAnalysisService] 几何验证失败:', error);
      return false;
    }
  }

  /**
   * 获取分析选项
   * 
   * 输出数据格式：
   * 分析选项对象
   */
  getAnalysisOptions() {
    return {
      batchSize: {
        type: 'number',
        default: 100,
        min: 10,
        max: 1000,
        description: '批处理大小，控制每次处理的要素组合数量'
      },
      enableProgress: {
        type: 'boolean',
        default: true,
        description: '是否启用进度显示'
      },
      returnGeometry: {
        type: 'boolean',
        default: true,
        description: '是否返回几何数据'
      }
    };
  }
}

module.exports = IntersectionAnalysisService;
