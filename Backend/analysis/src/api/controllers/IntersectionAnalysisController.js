/**
 * 相交分析控制器 - API层
 */
const { IntersectionAnalysisRequestDTO } = require('../../application/dtos/IntersectionAnalysisDTO');
const IntersectionAnalysisUseCase = require('../../application/useCases/IntersectionAnalysisUseCase');
const LayerRepository = require('../../infrastructure/repositories/LayerRepository');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class IntersectionAnalysisController {
  /**
   * 相交分析控制器构造函数
   * 
   * 输入数据格式：
   * @param {Object} dependencies - 依赖注入
   * 
   * 数据处理方法：
   * 1. 初始化依赖服务
   * 2. 创建用例实例
   * 
   * 输出数据格式：
   * IntersectionAnalysisController实例
   */
  constructor(dependencies = {}) {
    this.layerRepository = dependencies.layerRepository || new LayerRepository();
    this.intersectionAnalysisUseCase = new IntersectionAnalysisUseCase({
      layerRepository: this.layerRepository
    });
  }

  /**
   * 执行相交分析
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
  async executeIntersectionAnalysis(req, res) {
    try {
      console.log('[IntersectionAnalysisController] 收到相交分析请求');

      // 验证请求数据
      this._validateRequest(req);

      // 创建请求DTO
      const requestDTO = new IntersectionAnalysisRequestDTO(req.body);

      console.log('[IntersectionAnalysisController] 请求DTO创建成功:', {
        targetFeatures: requestDTO.targetData.features?.length || 0,
        maskFeatures: requestDTO.maskData.features?.length || 0,
        targetData: {
          type: requestDTO.targetData.type,
          featuresCount: requestDTO.targetData.features?.length
        },
        maskData: {
          type: requestDTO.maskData.type,
          featuresCount: requestDTO.maskData.features?.length
        }
      });

      // 执行分析用例
      const responseDTO = await this.intersectionAnalysisUseCase.execute(requestDTO);

      console.log('[IntersectionAnalysisController] 分析完成:', {
        resultsCount: responseDTO.results.length,
        statistics: responseDTO.statistics
      });

      // 返回标准GeoJSON FeatureCollection
      const apiResponse = responseDTO.toApiResponse();
      const result = apiResponse?.data?.features || [];
      
      // 获取第一个目标要素的属性作为模板（按用户需求）
      const firstTargetProps = Array.isArray(req.body?.targetData?.features) && req.body.targetData.features[0]?.properties
        ? req.body.targetData.features[0].properties
        : {};
      
      // 改进的属性处理函数 - 深度克隆并保留原始数据结构
      const preserveProperties = (props) => {
        if (!props || typeof props !== 'object') return {};
        try {
          // 使用深度克隆保留原始数据结构
          return JSON.parse(JSON.stringify(props));
        } catch (error) {
          console.warn('属性序列化失败，使用空对象:', error);
          return {};
        }
      };
      
      const features = result.map(item => {
        const preservedProps = preserveProperties(firstTargetProps);
        
        return {
          type: 'Feature',
          geometry: item.geometry,
          properties: {
            // 保留第一个目标要素的原始属性
            ...preservedProps,
            // 添加分析元数据
            _analysis: {
              type: 'intersection',
              sourceLayer: 'target',
              maskLayer: 'mask',
              processedAt: new Date().toISOString()
            }
          }
        };
      });
      
      const resultGeoJSON = { type: 'FeatureCollection', features };

      const filename = `analysis-result-${uuidv4()}.json`;
      const downloadsDir = path.join(__dirname, '..', '..', '..', 'downloads');
      const filePath = path.join(downloadsDir, filename);

      try {
        await fs.mkdir(downloadsDir, { recursive: true });
        await fs.writeFile(filePath, JSON.stringify(resultGeoJSON, null, 2));

        const downloadUrl = `${req.protocol}://${req.get('host')}/api/v1/spatial-analysis/download/${filename}`;

        res.status(200).json({
          ...resultGeoJSON,
          downloadUrl: downloadUrl
        });

      } catch (fileError) {
        console.error('导出JSON文件失败:', fileError);
        res.status(200).json(resultGeoJSON);
      }

    } catch (error) {
      console.error('[IntersectionAnalysisController] 相交分析执行失败:', error);

      // 返回错误响应
      res.status(400).json({
        success: false,
        error: {
          message: error.message,
          type: 'IntersectionAnalysisError'
        },
        message: '相交分析执行失败'
      });
    }
  }

  /**
   * 验证请求数据
   * 
   * 输入数据格式：
   * @param {Object} req - Express请求对象
   * 
   * 数据处理方法：
   * 1. 检查请求体
   * 2. 验证必需字段
   * 3. 检查数据格式
   * 
   * 输出数据格式：
   * 无返回值，验证失败时抛出错误
   */
  _validateRequest(req) {
    if (!req.body) {
      throw new Error('请求体不能为空');
    }

    const { targetData, maskData } = req.body;

    if (!targetData) {
      throw new Error('目标图层数据不能为空');
    }

    if (!maskData) {
      throw new Error('遮罩图层数据不能为空');
    }

    // 验证GeoJSON格式
    if (targetData.type !== 'FeatureCollection') {
      throw new Error('目标图层数据必须是FeatureCollection格式');
    }

    if (maskData.type !== 'FeatureCollection') {
      throw new Error('遮罩图层数据必须是FeatureCollection格式');
    }

    // 验证要素数组
    if (!Array.isArray(targetData.features)) {
      throw new Error('目标图层要素数据必须是数组格式');
    }

    if (!Array.isArray(maskData.features)) {
      throw new Error('遮罩图层要素数据必须是数组格式');
    }

    // 几何要素过滤现在在领域服务层统一处理
    console.log('[IntersectionAnalysisController] 数据验证完成，几何处理将在领域服务层执行');
  }

  /**
   * 处理错误响应
   * 
   * 输入数据格式：
   * @param {Error} error - 错误对象
   * @param {Object} res - Express响应对象
   * 
   * 数据处理方法：
   * 1. 记录错误日志
   * 2. 格式化错误信息
   * 3. 返回错误响应
   * 
   * 输出数据格式：
   * JSON格式的错误响应
   */
  _handleError(error, res) {
    console.error('[IntersectionAnalysisController] 处理错误:', error);

    const statusCode = error.statusCode || 500;
    const errorMessage = error.message || '服务器内部错误';

    res.status(statusCode).json({
      success: false,
      error: {
        message: errorMessage,
        type: error.type || 'InternalServerError',
        timestamp: new Date().toISOString()
      },
      message: '相交分析请求处理失败'
    });
  }
}

module.exports = IntersectionAnalysisController;
