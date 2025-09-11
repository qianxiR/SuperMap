/**
 * 缓冲区分析控制器 - API层
 */
const { BufferAnalysisRequestDTO } = require('../../application/dtos/BufferAnalysisDTO');
const BufferAnalysisUseCase = require('../../application/useCases/BufferAnalysisUseCase');
const LayerRepository = require('../../infrastructure/repositories/LayerRepository');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class BufferAnalysisController {
  /**
   * 缓冲区分析控制器构造函数
   * 
   * 输入数据格式：
   * @param {Object} dependencies - 依赖注入
   * 
   * 数据处理方法：
   * 1. 初始化依赖服务
   * 2. 创建用例实例
   * 
   * 输出数据格式：
   * BufferAnalysisController实例
   */
  constructor(dependencies = {}) {
    this.layerRepository = dependencies.layerRepository || new LayerRepository();
    this.bufferAnalysisUseCase = new BufferAnalysisUseCase({
      layerRepository: this.layerRepository
    });
  }

  /**
   * 执行缓冲区分析
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
  async executeBufferAnalysis(req, res) {
    try {
      // 验证请求数据
      this._validateRequest(req);

      // 创建请求DTO
      const requestDTO = new BufferAnalysisRequestDTO(req.body);

      // 执行分析用例
      const responseDTO = await this.bufferAnalysisUseCase.execute(requestDTO);

      // 返回标准GeoJSON FeatureCollection
      const apiResponse = responseDTO.toApiResponse();
      const resultFeatures = apiResponse?.data?.features || [];
      const inputFeatures = Array.isArray(req.body?.sourceData?.features) ? req.body.sourceData.features : [];
      
      // 属性处理函数 - 深度克隆并保留原始数据结构
      const preserveProperties = (props) => {
        if (!props || typeof props !== 'object') return {};
        try {
          return JSON.parse(JSON.stringify(props));
        } catch (error) {
          console.warn('属性序列化失败，使用空对象:', error);
          return {};
        }
      };
      
      // 计算面积辅助函数
      const calculateArea = (geometry) => {
        try {
          const turf = require('@turf/turf');
          return turf.area(turf.feature(geometry));
        } catch (error) {
          return 0;
        }
      };
      
      // 在控制器层处理属性合并和元数据添加
      const finalFeatures = resultFeatures.map((feature, idx) => {
        const originalProps = inputFeatures[idx]?.properties || {};
        const preservedProps = preserveProperties(originalProps);
        
        return {
          type: 'Feature',
          geometry: feature.geometry,
          properties: {
            // 保留所有原始属性
            ...preservedProps,
            // 添加缓冲区分析元数据
            _buffer: {
              id: `buffer_${originalProps.id || 'unknown'}_${Date.now()}`,
              name: `${originalProps.name || '几何要素'}_缓冲区`,
              sourceFeatureId: originalProps.id || 'unknown',
              distance: req.body?.bufferSettings?.radius || 0,
              unit: 'meters',
              area: calculateArea(feature.geometry),
              createdAt: new Date().toISOString()
            },
            // 添加分析元数据
            _analysis: {
              type: 'buffer',
              radius: req.body?.bufferSettings?.radius || 0,
              unit: 'meters',
              sourceLayer: 'original',
              processedAt: new Date().toISOString()
            }
          }
        };
      });
      
      const resultGeoJSON = { type: 'FeatureCollection', features: finalFeatures };

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
        // 即便文件写入失败，也返回分析结果
        res.status(200).json(resultGeoJSON);
      }

    } catch (error) {
      console.error('缓冲区分析控制器错误:', error);
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

    const { sourceData, bufferSettings } = req.body;

    // 验证数据源
    if (!sourceData) {
      throw new Error('sourceData是必需字段');
    }

    // 验证缓冲区设置
    if (!bufferSettings) {
      throw new Error('bufferSettings不能为空');
    }

    if (typeof bufferSettings.radius !== 'number' || bufferSettings.radius <= 0) {
      throw new Error('bufferSettings.radius必须为正数');
    }
    
    if (bufferSettings.semicircleLineSegment && 
        (typeof bufferSettings.semicircleLineSegment !== 'number' || 
         bufferSettings.semicircleLineSegment < 1 || 
         bufferSettings.semicircleLineSegment > 64)) {
      throw new Error('bufferSettings.semicircleLineSegment必须在1-64之间');
    }
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

module.exports = BufferAnalysisController;
