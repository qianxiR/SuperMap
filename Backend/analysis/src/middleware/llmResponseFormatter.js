/**
 * LLM友好的响应格式化中间件
 * 将技术性响应转换为自然语言描述
 */

class LLMResponseFormatter {
  /**
   * 格式化缓冲区分析响应
   */
  static formatBufferResponse(originalResponse) {
    if (!originalResponse.success) {
      return {
        success: false,
        message: `缓冲区分析失败：${originalResponse.error?.message || '未知错误'}`,
        error: originalResponse.error
      };
    }

    const { data } = originalResponse;
    const { statistics } = data;
    
    const message = `缓冲区分析执行成功！` +
      `源图层"${data.sourceLayerName}"包含${statistics.inputFeatureCount}个要素，` +
      `生成了${statistics.outputFeatureCount}个缓冲区，` +
      `总面积为${statistics.totalArea.toLocaleString()}${statistics.areaUnit}，` +
      `执行时间${data.executionTime}。`;

    return {
      success: true,
      message,
      data: {
        ...data,
        summary: {
          sourceLayer: data.sourceLayerName,
          inputFeatures: statistics.inputFeatureCount,
          outputFeatures: statistics.outputFeatureCount,
          totalArea: `${statistics.totalArea.toLocaleString()} ${statistics.areaUnit}`,
          executionTime: data.executionTime
        }
      }
    };
  }

  /**
   * 格式化相交分析响应
   */
  static formatIntersectionResponse(originalResponse) {
    if (!originalResponse.success) {
      return {
        success: false,
        message: `相交分析失败：${originalResponse.error?.message || '未知错误'}`,
        error: originalResponse.error
      };
    }

    const { data } = originalResponse;
    const { statistics } = data;
    
    const message = `相交分析执行成功！` +
      `目标图层包含${statistics.targetFeatureCount}个要素，` +
      `掩膜图层包含${statistics.maskFeatureCount}个要素，` +
      `共处理${statistics.totalPairs}对要素组合，` +
      `找到${statistics.totalResults}个相交区域，` +
      `成功率${statistics.successRate}%。`;

    return {
      success: true,
      message,
      data: {
        ...data,
        summary: {
          targetFeatures: statistics.targetFeatureCount,
          maskFeatures: statistics.maskFeatureCount,
          totalPairs: statistics.totalPairs,
          intersectionCount: statistics.totalResults,
          successRate: `${statistics.successRate}%`
        }
      }
    };
  }

  /**
   * 格式化擦除分析响应
   */
  static formatEraseResponse(originalResponse) {
    if (!originalResponse.success) {
      return {
        success: false,
        message: `擦除分析失败：${originalResponse.error?.message || '未知错误'}`,
        error: originalResponse.error
      };
    }

    const { data } = originalResponse;
    const { statistics } = data;
    
    const message = `擦除分析执行成功！` +
      `目标图层包含${statistics.targetFeatureCount}个要素，` +
      `擦除图层包含${statistics.eraseFeatureCount}个要素，` +
      `共处理${statistics.totalPairs}对要素组合，` +
      `生成${statistics.totalResults}个擦除区域，` +
      `成功率${statistics.successRate}%。`;

    return {
      success: true,
      message,
      data: {
        ...data,
        summary: {
          targetFeatures: statistics.targetFeatureCount,
          eraseFeatures: statistics.eraseFeatureCount,
          totalPairs: statistics.totalPairs,
          eraseCount: statistics.totalResults,
          successRate: `${statistics.successRate}%`
        }
      }
    };
  }

  /**
   * 格式化最短路径分析响应
   */
  static formatShortestPathResponse(originalResponse) {
    if (!originalResponse.success) {
      return {
        success: false,
        message: `最短路径分析失败：${originalResponse.error?.message || '未知错误'}`,
        error: originalResponse.error
      };
    }

    const { data } = originalResponse;
    const { statistics } = data;
    
    const message = `最短路径分析执行成功！` +
      `起点到终点的最短距离为${statistics.distance}${statistics.distanceUnit}，` +
      `预计用时${statistics.duration}${statistics.durationUnit}，` +
      `平均速度${statistics.averageSpeed}${statistics.speedUnit}，` +
      `路径复杂度${statistics.complexity}级，` +
      `执行时间${data.executionTime}。`;

    return {
      success: true,
      message,
      data: {
        ...data,
        summary: {
          distance: `${statistics.distance} ${statistics.distanceUnit}`,
          duration: `${statistics.duration} ${statistics.durationUnit}`,
          averageSpeed: `${statistics.averageSpeed} ${statistics.speedUnit}`,
          complexity: `${statistics.complexity}级`,
          executionTime: data.executionTime
        }
      }
    };
  }

  /**
   * 通用错误响应格式化
   */
  static formatErrorResponse(error, operation = '操作') {
    let message = `${operation}失败：`;
    
    if (error.code) {
      switch (error.code) {
        case 'INVALID_PARAMETER':
          message += '请求参数无效';
          break;
        case 'LAYER_NOT_FOUND':
          message += '指定的图层不存在';
          break;
        case 'INVALID_GEOMETRY':
          message += '几何数据格式错误';
          break;
        case 'ANALYSIS_FAILED':
          message += '分析计算失败';
          break;
        case 'QUOTA_EXCEEDED':
          message += '请求频率超限，请稍后重试';
          break;
        default:
          message += error.message || '未知错误';
      }
    } else {
      message += error.message || '未知错误';
    }

    return {
      success: false,
      message,
      error: {
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message || '未知错误',
        details: error.details || null
      }
    };
  }
}

module.exports = LLMResponseFormatter;
