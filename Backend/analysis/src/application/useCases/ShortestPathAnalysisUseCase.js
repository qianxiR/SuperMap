/**
 * 最短路径分析用例
 */
const ShortestPathAnalysisService = require('../../domain/services/ShortestPathAnalysisService');
const { ShortestPathAnalysisResponseDTO } = require('../dtos/ShortestPathAnalysisDTO');

class ShortestPathAnalysisUseCase {
  /**
   * 最短路径分析用例构造函数
   * 
   * 输入数据格式：
   * @param {Object} dependencies - 依赖注入
   * @param {Object} dependencies.layerRepository - 图层数据仓库
   * 
   * 数据处理方法：
   * 1. 注入依赖服务
   * 2. 初始化领域服务
   * 
   * 输出数据格式：
   * ShortestPathAnalysisUseCase实例
   */
  constructor(dependencies = {}) {
    this.layerRepository = dependencies.layerRepository;
    this.shortestPathAnalysisService = new ShortestPathAnalysisService();
  }

  /**
   * 执行最短路径分析用例
   * 
   * 输入数据格式：
   * @param {ShortestPathAnalysisRequestDTO} requestDTO - 请求DTO
   * 
   * 数据处理方法：
   * 1. 获取起点和终点数据
   * 2. 处理障碍物数据（如果有）
   * 3. 执行最短路径分析
   * 4. 生成响应DTO
   * 
   * 输出数据格式：
   * ShortestPathAnalysisResponseDTO实例
   */
  async execute(requestDTO) {
    try {
      console.log('[ShortestPathAnalysisUseCase] 开始执行最短路径分析用例');

      // 1. 获取起点和终点
      const startPoint = requestDTO.startPoint;
      const endPoint = requestDTO.endPoint;
      const analysisOptions = requestDTO.analysisOptions;
      const options = requestDTO.options;

      console.log('[ShortestPathAnalysisUseCase] 分析参数:', {
        startPoint: startPoint.coordinates,
        endPoint: endPoint.coordinates,
        analysisOptions: analysisOptions,
        options: options
      });

      // 2. 处理障碍物数据（如果有）
      let obstacles = null;
      if (requestDTO.obstacleData) {
        // 直接使用前端发送的障碍物数据
        obstacles = requestDTO.obstacleData;
        console.log('[ShortestPathAnalysisUseCase] 使用前端发送的障碍物数据:', {
          obstacleCount: obstacles.features?.length || 0
        });
      } else if (analysisOptions.obstacleLayerId && this.layerRepository) {
        // 从图层仓库获取障碍物数据
        obstacles = await this._getObstacleData(analysisOptions.obstacleLayerId);
      }

      // 3. 构建分析选项
      const analysisServiceOptions = {
        units: analysisOptions.units,
        resolution: analysisOptions.resolution,
        obstacles: obstacles,
        averageSpeed: options.averageSpeed
      };

      // 4. 执行最短路径分析
      const analysisResult = await this.shortestPathAnalysisService.executeShortestPathAnalysis(
        startPoint,
        endPoint,
        analysisServiceOptions
      );

      console.log('[ShortestPathAnalysisUseCase] 分析结果:', {
        pathType: analysisResult.pathGeometry.type,
        statistics: analysisResult.statistics,
        executionTime: analysisResult.executionTime
      });

      // 5. 生成响应DTO
      const responseData = {
        resultId: this._generateResultId(),
        resultName: '最短路径分析结果',
        pathGeometry: analysisResult.pathGeometry,
        statistics: analysisResult.statistics,
        executionTime: analysisResult.executionTime,
        startPoint: startPoint, // 传递起始点坐标
        endPoint: endPoint // 传递终点坐标
      };

      return new ShortestPathAnalysisResponseDTO(responseData);

    } catch (error) {
      console.error('最短路径分析用例执行失败:', error);
      throw new Error(`最短路径分析失败: ${error.message}`);
    }
  }

  /**
   * 获取障碍物数据
   * 
   * 输入数据格式：
   * @param {string} layerId - 图层ID
   * 
   * 数据处理方法：
   * 1. 获取图层要素数据
   * 
   * 输出数据格式：
   * 障碍物FeatureCollection或null
   */
  async _getObstacleData(layerId) {
    if (!this.layerRepository) {
      console.warn('[ShortestPathAnalysisUseCase] 图层仓库未配置，跳过障碍物处理');
      return null;
    }

    try {
      const layerData = await this.layerRepository.findById(layerId);
      console.log(`[ShortestPathAnalysisUseCase] 获取到 ${layerData?.features?.length || 0} 个障碍物要素`);
      return layerData;

    } catch (error) {
      console.error(`[ShortestPathAnalysisUseCase] 获取障碍物数据失败:`, error);
      return null;
    }
  }

  /**
   * 生成结果ID
   * 
   * 输入数据格式：
   * 无
   * 
   * 数据处理方法：
   * 使用时间戳生成唯一标识符
   * 
   * 输出数据格式：
   * 字符串格式的结果ID
   */
  _generateResultId() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `shortest_path_result_${timestamp}`;
  }
}

module.exports = ShortestPathAnalysisUseCase;
