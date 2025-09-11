/**
 * 最短路径分析控制器 - API层
 */
const { ShortestPathAnalysisRequestDTO } = require('../../application/dtos/ShortestPathAnalysisDTO');
const ShortestPathAnalysisUseCase = require('../../application/useCases/ShortestPathAnalysisUseCase');
const LayerRepository = require('../../infrastructure/repositories/LayerRepository');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class ShortestPathAnalysisController {
  /**
   * 最短路径分析控制器构造函数
   * 
   * 输入数据格式：
   * @param {Object} dependencies - 依赖注入
   * 
   * 数据处理方法：
   * 1. 初始化依赖服务
   * 2. 创建用例实例
   * 
   * 输出数据格式：
   * ShortestPathAnalysisController实例
   */
  constructor(dependencies = {}) {
    this.layerRepository = dependencies.layerRepository || new LayerRepository();
    this.shortestPathAnalysisUseCase = new ShortestPathAnalysisUseCase({
      layerRepository: this.layerRepository
    });
  }

  /**
   * 执行最短路径分析
   * 
   * 输入数据格式：
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * 
   * 数据处理方法：
   * 1. 验证请求数据
   * 2. 创建请求DTO
   * 3. 执行分析用例
   * 4. 返回响应结果
   * 
   * 输出数据格式：
   * JSON格式的API响应
   */
  async executeShortestPathAnalysis(req, res) {
    try {
      // 验证请求数据
      this._validateRequest(req);

      // 创建请求DTO
      const requestDTO = new ShortestPathAnalysisRequestDTO(req.body);

      // 执行分析用例
      const responseDTO = await this.shortestPathAnalysisUseCase.execute(requestDTO);

      // 返回标准GeoJSON FeatureCollection，起始点和终点已包含在features中
      const apiResponse = responseDTO.toApiResponse();
      const features = apiResponse?.data?.features || [];
      const responseData = { 
        type: 'FeatureCollection', 
        features,
        statistics: apiResponse?.data?.statistics, // 包含统计信息
        resultId: apiResponse?.data?.resultId // 包含结果ID
      };

      const filename = `analysis-result-${uuidv4()}.json`;
      const downloadsDir = path.join(__dirname, '..', '..', '..', 'downloads');
      const filePath = path.join(downloadsDir, filename);

      try {
        await fs.mkdir(downloadsDir, { recursive: true });
        await fs.writeFile(filePath, JSON.stringify(responseData, null, 2));

        const downloadUrl = `${req.protocol}://${req.get('host')}/api/v1/spatial-analysis/download/${filename}`;

        res.status(200).json({
          ...responseData,
          downloadUrl: downloadUrl
        });

      } catch (fileError) {
        console.error('导出JSON文件失败:', fileError);
        res.status(200).json(responseData);
      }

    } catch (error) {
      console.error('最短路径分析控制器错误:', error);
      this._handleError(res, error);
    }
  }

  /**
   * 验证请求数据
   * 
   * 输入数据格式：
   * @param {Object} req - Express请求对象
   * 
   * 数据处理方法：
   * 1. 检查请求体存在性
   * 2. 验证必需字段
   * 3. 检查数据格式
   * 
   * 输出数据格式：
   * 无（抛出异常如果无效）
   */
  _validateRequest(req) {
    if (!req.body) {
      throw new Error('请求体不能为空');
    }

    const { startPoint, endPoint, analysisOptions } = req.body;

    // 验证起点
    if (!startPoint) {
      throw new Error('startPoint不能为空');
    }

    if (!this._isValidPoint(startPoint)) {
      throw new Error('startPoint必须是有效的GeoJSON Point格式');
    }

    // 验证终点
    if (!endPoint) {
      throw new Error('endPoint不能为空');
    }

    if (!this._isValidPoint(endPoint)) {
      throw new Error('endPoint必须是有效的GeoJSON Point格式');
    }

    // 验证分析选项
    if (analysisOptions) {
      if (analysisOptions.units && !['kilometers', 'miles', 'meters', 'degrees', 'radians'].includes(analysisOptions.units)) {
        throw new Error('analysisOptions.units必须是kilometers、miles、meters、degrees或radians之一');
      }
      
      if (analysisOptions.resolution && (typeof analysisOptions.resolution !== 'number' || analysisOptions.resolution < 100 || analysisOptions.resolution > 10000)) {
        throw new Error('analysisOptions.resolution必须在100-10000之间');
      }
    }

    // 验证障碍物数据（可选）
    const { obstacleData } = req.body;
    if (obstacleData && obstacleData !== null && typeof obstacleData === 'object') {
      if (obstacleData.type && obstacleData.type !== 'FeatureCollection') {
        throw new Error('obstacleData必须是FeatureCollection格式或空对象');
      }
    }
  }

  /**
   * 验证点格式
   * 
   * 输入数据格式：
   * @param {Object} point - 点对象
   * 
   * 数据处理方法：
   * 检查GeoJSON Point格式
   * 
   * 输出数据格式：
   * 布尔值
   */
  _isValidPoint(point) {
    if (!point || typeof point !== 'object') {
      return false;
    }
    
    return point.type === 'Point' && 
           Array.isArray(point.coordinates) && 
           point.coordinates.length >= 2 &&
           typeof point.coordinates[0] === 'number' &&
           typeof point.coordinates[1] === 'number';
  }

  /**
   * 处理错误响应
   * 
   * 输入数据格式：
   * @param {Object} res - Express响应对象
   * @param {Error} error - 错误对象
   * 
   * 数据处理方法：
   * 1. 确定错误类型
   * 2. 设置HTTP状态码
   * 3. 格式化错误响应
   * 
   * 输出数据格式：
   * JSON格式的错误响应
   */
  _handleError(res, error) {
    let statusCode = 500;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let message = '服务器内部错误';

    // 根据错误类型设置响应
    if (error.message.includes('不能为空') || error.message.includes('无效')) {
      statusCode = 400;
      errorCode = 'INVALID_PARAMETER';
      message = error.message;
    } else if (error.message.includes('不存在')) {
      statusCode = 404;
      errorCode = 'LAYER_NOT_FOUND';
      message = error.message;
    } else if (error.message.includes('不支持')) {
      statusCode = 400;
      errorCode = 'UNSUPPORTED_OPERATION';
      message = error.message;
    }

    res.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message: message,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      timestamp: new Date().toISOString(),
      requestId: req.requestId || 'unknown'
    });
  }
}

module.exports = ShortestPathAnalysisController;
