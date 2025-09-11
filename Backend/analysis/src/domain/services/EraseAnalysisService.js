/**
 * 擦除分析领域服务
 */
const turf = require('@turf/turf');
const { prepareTurfAnalysisInput, executeTurfAnalysis, validateGeometryCompatibility } = require('../../infrastructure/geometryConverter');
const GeometryProcessingService = require('./GeometryProcessingService');

class EraseAnalysisService {
  constructor() {
    this.geometryProcessor = new GeometryProcessingService();
  }

  /**
   * 执行擦除分析
   * 
   * 输入数据格式：
   * @param {Object} targetData - 目标图层GeoJSON数据
   * @param {Object} eraseData - 擦除图层GeoJSON数据
   * @param {Object} options - 分析选项
   * 
   * 数据处理方法：
   * 1. 验证输入数据
   * 2. 执行擦除计算
   * 3. 计算统计信息
   * 4. 格式化结果
   * 
   * 输出数据格式：
   * 擦除分析结果对象
   */
  async executeEraseAnalysis(targetData, eraseData, options) {
    if (!targetData || !eraseData) {
      throw new Error('目标数据和擦除数据不能为空');
    }

    const startTime = Date.now();

    console.log('[EraseAnalysisService] 开始处理擦除分析:', {
      targetFeatures: targetData.features?.length || 0,
      eraseFeatures: eraseData.features?.length || 0,
      options: options
    });

    // 验证GeoJSON格式
    if (targetData.type !== 'FeatureCollection' || eraseData.type !== 'FeatureCollection') {
      throw new Error('输入数据必须是FeatureCollection格式');
    }

    // 使用统一的几何处理服务过滤和验证要素
    const processedTargetData = this.geometryProcessor.filterAndValidateFeatures(targetData);
    const processedEraseData = this.geometryProcessor.filterAndValidateFeatures(eraseData);

    const targetFeatures = processedTargetData.features || [];
    const eraseFeatures = processedEraseData.features || [];

    if (targetFeatures.length === 0 || eraseFeatures.length === 0) {
      throw new Error('目标图层或擦除图层过滤后没有有效要素');
    }

    console.log('[EraseAnalysisService] 几何要素处理完成:', {
      targetOriginal: targetData.features?.length || 0,
      targetProcessed: targetFeatures.length,
      eraseOriginal: eraseData.features?.length || 0,
      eraseProcessed: eraseFeatures.length
    });

    console.log('[EraseAnalysisService] 开始执行擦除计算');

    // 执行擦除分析
    const results = await this._performEraseCalculation(
      targetFeatures, 
      eraseFeatures, 
      options
    );

    const endTime = Date.now();
    const processingTime = endTime - startTime;

    // 计算统计信息
    const statistics = this._calculateStatistics(
      targetFeatures.length,
      eraseFeatures.length,
      results.length,
      processingTime
    );

    console.log('[EraseAnalysisService] 擦除分析完成:', {
      resultsCount: results.length,
      processingTime: processingTime,
      statistics: statistics
    });

    return {
      results: results,
      statistics: statistics,
      metadata: {
        version: '1.0.0',
        algorithm: 'turf-difference',
        coordinateSystem: 'EPSG:4326',
        batchSize: options.batchSize || 100
      }
    };
  }

  /**
   * 执行擦除计算
   * 
   * 输入数据格式：
   * @param {Array} targetFeatures - 目标要素数组
   * @param {Array} eraseFeatures - 擦除要素数组
   * @param {Object} options - 计算选项
   * 
   * 数据处理方法：
   * 1. 合并所有擦除要素为单个MultiPolygon
   * 2. 对每个目标要素执行单次擦除操作
   * 3. 合并擦除结果
   * 
   * 输出数据格式：
   * 擦除结果数组
   */
  async _performEraseCalculation(targetFeatures, eraseFeatures, options) {
    const results = [];
    const batchSize = Math.min(options.batchSize || 50, 100);

    console.log('[EraseAnalysisService] 开始优化的擦除计算:', {
      targetCount: targetFeatures.length,
      eraseCount: eraseFeatures.length,
      batchSize: batchSize
    });

    // 获取第一个目标要素的属性作为模板
    const firstTargetProps = targetFeatures.length > 0 && targetFeatures[0].properties 
      ? JSON.parse(JSON.stringify(targetFeatures[0].properties)) 
      : {};

    try {
      // 第一步：合并所有擦除要素为单个MultiPolygon
      const mergedEraseFeature = this._mergeEraseFeatures(eraseFeatures);
      
      if (!mergedEraseFeature) {
        console.warn('[EraseAnalysisService] 擦除要素合并失败，回退到逐个处理模式');
        return this._performEraseCalculationLegacy(targetFeatures, eraseFeatures, options);
      }

      console.log('[EraseAnalysisService] 擦除要素合并完成，开始处理目标要素');

      // 第二步：对每个目标要素执行擦除操作
      for (let i = 0; i < targetFeatures.length; i += batchSize) {
        const targetBatch = targetFeatures.slice(i, i + batchSize);
        
        for (const targetFeature of targetBatch) {
          try {
            // 执行单次擦除操作
            const difference = executeTurfAnalysis(targetFeature, mergedEraseFeature, 'difference');
            
            if (difference && difference.geometry) {
              // 如果结果包含多个部分，尝试合并
              const mergedResult = this._mergeResultGeometry(difference);
              
              const resultItem = {
                id: `erase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: `擦除区域 ${results.length + 1}`,
                geometry: mergedResult.geometry,
                properties: {
                  // 保留第一个目标要素的原始属性
                  ...firstTargetProps,
                  // 添加分析元数据
                  analysisType: 'erase',
                  sourceLayer: 'target',
                  eraseLayer: 'erase',
                  processedAt: new Date().toISOString()
                },
                sourceTargetLayerName: '目标图层',
                sourceEraseLayerName: '擦除图层',
                createdAt: new Date().toISOString()
              };
              results.push(resultItem);
            }
          } catch (error) {
            console.warn('[EraseAnalysisService] 擦除计算失败:', error.message);
          }
        }
        
        // 强制垃圾回收
        if (global.gc) {
          global.gc();
        }
      }

      console.log(`[EraseAnalysisService] 优化擦除计算完成，结果数: ${results.length}`);
      return results;

    } catch (error) {
      console.error('[EraseAnalysisService] 优化擦除计算失败，回退到传统模式:', error);
      return this._performEraseCalculationLegacy(targetFeatures, eraseFeatures, options);
    }
  }

  /**
   * 合并擦除要素为单个MultiPolygon
   * 
   * 输入数据格式：
   * @param {Array} eraseFeatures - 擦除要素数组
   * 
   * 数据处理方法：
   * 1. 过滤有效的面要素
   * 2. 使用turf.union合并所有要素
   * 3. 返回合并后的要素
   * 
   * 输出数据格式：
   * 合并后的turf要素或null
   */
  _mergeEraseFeatures(eraseFeatures) {
    if (!Array.isArray(eraseFeatures) || eraseFeatures.length === 0) {
      return null;
    }

    try {
      // 过滤出有效的几何要素（支持点、线、面）
      const validPolygonFeatures = eraseFeatures.filter(feature => {
        if (!feature || !feature.geometry) return false;
        const geomType = feature.geometry.type;
        return ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon'].includes(geomType);
      });

      if (validPolygonFeatures.length === 0) {
        console.warn('[EraseAnalysisService] 没有有效的几何要素可以合并');
        return null;
      }

      if (validPolygonFeatures.length === 1) {
        console.log('[EraseAnalysisService] 只有一个擦除要素，直接返回');
        return validPolygonFeatures[0];
      }

      console.log(`[EraseAnalysisService] 开始合并 ${validPolygonFeatures.length} 个擦除要素`);

      // 逐步合并所有要素
      let mergedFeature = validPolygonFeatures[0];
      
      for (let i = 1; i < validPolygonFeatures.length; i++) {
        try {
          const unionResult = executeTurfAnalysis(mergedFeature, validPolygonFeatures[i], 'union');
          
          if (unionResult && unionResult.geometry) {
            mergedFeature = unionResult;
          }
        } catch (error) {
          console.warn(`[EraseAnalysisService] 合并第 ${i} 个要素失败:`, error.message);
        }
      }

      console.log('[EraseAnalysisService] 擦除要素合并完成');
      return mergedFeature;

    } catch (error) {
      console.error('[EraseAnalysisService] 擦除要素合并失败:', error);
      return null;
    }
  }

  /**
   * 合并结果几何体（如果包含多个部分）
   * 
   * 输入数据格式：
   * @param {Object} resultFeature - 擦除结果要素
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
        console.log(`[EraseAnalysisService] 尝试合并 ${geometry.coordinates.length} 个多边形部分`);
        
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
            console.warn(`[EraseAnalysisService] 合并第 ${i} 个部分失败:`, error.message);
          }
        }
        
        return mergedFeature;
      }
      
      return resultFeature;
    } catch (error) {
      console.warn('[EraseAnalysisService] 结果几何体合并失败:', error.message);
      return resultFeature;
    }
  }

  /**
   * 传统擦除计算方式（回退方案）
   * 
   * 输入数据格式：
   * @param {Array} targetFeatures - 目标要素数组
   * @param {Array} eraseFeatures - 擦除要素数组
   * @param {Object} options - 计算选项
   * 
   * 数据处理方法：
   * 1. 遍历所有要素组合
   * 2. 执行差集计算
   * 3. 收集有效结果
   * 
   * 输出数据格式：
   * 擦除结果数组
   */
  async _performEraseCalculationLegacy(targetFeatures, eraseFeatures, options) {
    const results = [];
    const totalPairs = targetFeatures.length * eraseFeatures.length;
    const batchSize = Math.min(options.batchSize || 50, 100);

    console.log('[EraseAnalysisService] 使用传统擦除计算模式:', {
      targetCount: targetFeatures.length,
      eraseCount: eraseFeatures.length,
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
      
      for (let j = 0; j < eraseFeatures.length; j += batchSize) {
        const eraseBatch = eraseFeatures.slice(j, j + batchSize);
        
        for (const targetFeature of targetBatch) {
          for (const eraseFeature of eraseBatch) {
            try {
              const difference = executeTurfAnalysis(targetFeature, eraseFeature, 'difference');
              
              if (difference && difference.geometry) {
                const resultItem = {
                  id: `erase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  name: `擦除区域 ${results.length + 1}`,
                  geometry: difference.geometry,
                  properties: {
                    // 保留第一个目标要素的原始属性
                    ...firstTargetProps,
                    // 添加分析元数据
                    analysisType: 'erase',
                    sourceLayer: 'target',
                    eraseLayer: 'erase',
                    processedAt: new Date().toISOString()
                  },
                  sourceTargetLayerName: '目标图层',
                  sourceEraseLayerName: '擦除图层',
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

    console.log(`[EraseAnalysisService] 传统擦除计算完成，结果数: ${results.length}`);
    return results;
  }

  /**
   * 计算统计信息
   * 
   * 输入数据格式：
   * @param {number} targetCount - 目标要素数量
   * @param {number} eraseCount - 擦除要素数量
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
  _calculateStatistics(targetCount, eraseCount, resultCount, processingTime) {
    const totalPairs = targetCount * eraseCount;
    const successRate = totalPairs > 0 ? (resultCount / totalPairs) * 100 : 0;

    return {
      totalResults: resultCount,
      targetFeatureCount: targetCount,
      eraseFeatureCount: eraseCount,
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
      console.warn('[EraseAnalysisService] 几何验证失败:', error);
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

module.exports = EraseAnalysisService;
