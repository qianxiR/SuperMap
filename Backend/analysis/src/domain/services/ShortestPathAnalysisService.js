/**
 * 最短路径分析领域服务
 */
const turf = require('@turf/turf');
const { prepareShortestPathInput, processObstacles } = require('../../infrastructure/geometryConverter');

class ShortestPathAnalysisService {
  /**
   * 执行最短路径分析
   * 
   * 输入数据格式：
   * @param {Object} startPoint - 起点GeoJSON Point
   * @param {Object} endPoint - 终点GeoJSON Point
   * @param {Object} options - 分析选项
   * 
   * 数据处理方法：
   * 1. 使用geometryConverter转换输入数据
   * 2. 处理障碍物数据
   * 3. 执行最短路径计算
   * 4. 计算路径统计信息
   * 
   * 输出数据格式：
   * 最短路径分析结果对象
   */
  async executeShortestPathAnalysis(startPoint, endPoint, options) {
    if (!startPoint || !endPoint) {
      throw new Error('起点和终点不能为空');
    }

    const startTime = Date.now();

    console.log('[ShortestPathAnalysisService] 开始处理最短路径分析:', {
      startPoint: startPoint.coordinates,
      endPoint: endPoint.coordinates,
      options: options
    });

    // 使用geometryConverter准备输入数据
    const turfStartPoint = prepareShortestPathInput(startPoint);
    const turfEndPoint = prepareShortestPathInput(endPoint);

    console.log('[ShortestPathAnalysisService] 转换完成，准备计算最短路径');

    // 提取坐标
    const startCoords = turfStartPoint.geometry.coordinates;
    const endCoords = turfEndPoint.geometry.coordinates;

    const start = [startCoords[0], startCoords[1]];
    const end = [endCoords[0], endCoords[1]];

    // 构建turf选项
    const turfOptions = {
      units: options.units || 'kilometers',
      resolution: options.resolution || 1000
    };

    // 处理障碍物
    if (options.obstacles) {
      const processedObstacles = processObstacles(options.obstacles);
      if (processedObstacles) {
        turfOptions.obstacles = processedObstacles;
        console.log('[ShortestPathAnalysisService] 已加载障碍物数据:', {
          obstacleCount: processedObstacles.features.length
        });
      }
    }

    console.log('[ShortestPathAnalysisService] 执行最短路径计算:', {
      start: start,
      end: end,
      options: turfOptions
    });

    // 执行最短路径计算
    const pathResult = turf.shortestPath(start, end, turfOptions);

    if (!pathResult || !pathResult.geometry) {
      throw new Error('最短路径计算失败，无法生成有效路径');
    }

    console.log('[ShortestPathAnalysisService] 最短路径计算完成:', {
      pathType: pathResult.geometry.type,
      coordinates: pathResult.geometry.coordinates?.length || 0
    });

    // 计算路径统计信息
    const statistics = this._calculatePathStatistics(pathResult, options);

    const executionTime = Date.now() - startTime;

    return {
      pathGeometry: pathResult.geometry,
      statistics: statistics,
      executionTime: `${(executionTime / 1000).toFixed(3)}s`,
      options: options
    };
  }

  /**
   * 计算路径统计信息
   * 
   * 输入数据格式：
   * @param {Object} pathResult - turf路径结果
   * @param {Object} options - 分析选项
   * 
   * 数据处理方法：
   * 1. 计算路径距离
   * 2. 计算预计时间
   * 3. 计算路径复杂度
   * 
   * 输出数据格式：
   * 统计信息对象
   */
  _calculatePathStatistics(pathResult, options) {
    // 计算路径距离
    const distance = this._calculatePathDistance(pathResult);
    
    // 计算预计时间
    const duration = this._calculatePathDuration(distance, options.averageSpeed || 50);
    
    // 计算路径复杂度（坐标点数量）
    const complexity = this._calculatePathComplexity(pathResult);

    return {
      distance: Math.round(distance * 100) / 100,
      distanceUnit: options.units || 'kilometers',
      duration: Math.round(duration * 100) / 100,
      durationUnit: 'minutes',
      complexity: complexity,
      averageSpeed: options.averageSpeed || 50,
      speedUnit: 'km/h'
    };
  }

  /**
   * 计算路径距离
   * 
   * 输入数据格式：
   * @param {Object} pathResult - turf路径结果
   * 
   * 数据处理方法：
   * 使用turf.js计算路径长度
   * 
   * 输出数据格式：
   * 距离数值
   */
  _calculatePathDistance(pathResult) {
    try {
      return turf.length(pathResult, { units: 'kilometers' });
    } catch (error) {
      console.warn('路径距离计算失败:', error);
      return 0;
    }
  }

  /**
   * 计算路径时间
   * 
   * 输入数据格式：
   * @param {number} distance - 路径距离（公里）
   * @param {number} averageSpeed - 平均速度（公里/小时）
   * 
   * 数据处理方法：
   * 根据距离和速度计算时间
   * 
   * 输出数据格式：
   * 时间数值（分钟）
   */
  _calculatePathDuration(distance, averageSpeed) {
    if (averageSpeed <= 0) {
      return 0;
    }
    
    const hours = distance / averageSpeed;
    return hours * 60; // 转换为分钟
  }

  /**
   * 计算路径复杂度
   * 
   * 输入数据格式：
   * @param {Object} pathResult - turf路径结果
   * 
   * 数据处理方法：
   * 统计路径坐标点数量
   * 
   * 输出数据格式：
   * 复杂度数值
   */
  _calculatePathComplexity(pathResult) {
    try {
      const coordinates = pathResult.geometry.coordinates;
      if (Array.isArray(coordinates)) {
        return coordinates.length;
      }
      return 0;
    } catch (error) {
      console.warn('路径复杂度计算失败:', error);
      return 0;
    }
  }
}

module.exports = ShortestPathAnalysisService;
