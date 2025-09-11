/**
 * 缓冲区分析DTO
 */
class BufferAnalysisRequestDTO {
  /**
   * 缓冲区分析请求DTO构造函数
   * 
   * 输入数据格式：
   * @param {Object} data - 请求数据
   * @param {Object} data.sourceData - 源GeoJSON数据
   * @param {Object} data.bufferSettings - 缓冲区设置
   * @param {Object} data.featureFilter - 要素过滤条件
   * @param {Object} data.options - 选项设置
   * 
   * 数据处理方法：
   * 1. 验证必需字段
   * 2. 设置默认值
   * 3. 转换数据格式
   * 
   * 输出数据格式：
   * BufferAnalysisRequestDTO实例
   */
  constructor(data) {
    this._validateSourceData(data);
    this.sourceData = data.sourceData;
    this.bufferSettings = this._createBufferSettings(data.bufferSettings);
    this.featureFilter = this._createFeatureFilter(data.featureFilter);
    this.options = this._createOptions(data.options);
  }

  /**
   * 验证源数据
   * 
   * 输入数据格式：
   * @param {Object} data - 请求数据
   * 
   * 数据处理方法：
   * 检查sourceData是否存在且为有效的GeoJSON格式
   * 
   * 输出数据格式：
   * 无（抛出异常如果无效）
   */
  _validateSourceData(data) {
    if (!data.sourceData) {
      throw new Error('sourceData是必需字段');
    }
    
    if (!this._isValidGeoJSON(data.sourceData)) {
      throw new Error('sourceData必须是有效的GeoJSON格式');
    }
  }

  /**
   * 验证GeoJSON格式
   * 
   * 输入数据格式：
   * @param {Object} data - GeoJSON数据
   * 
   * 数据处理方法：
   * 检查GeoJSON基本结构
   * 
   * 输出数据格式：
   * 布尔值
   */
  _isValidGeoJSON(data) {
    if (!data || typeof data !== 'object') {
      return false;
    }
    
    if (data.type === 'FeatureCollection') {
      return Array.isArray(data.features) && 
             data.features.every(feature => 
               feature && 
               feature.type === 'Feature' && 
               feature.geometry && 
               feature.geometry.type && 
               feature.geometry.coordinates
             );
    }
    
    if (data.type === 'Feature') {
      return data.geometry && 
             data.geometry.type && 
             data.geometry.coordinates;
    }
    
    return false;
  }

  /**
   * 创建缓冲区设置
   * 
   * 输入数据格式：
   * @param {Object} bufferSettings - 缓冲区设置对象
   * 
   * 数据处理方法：
   * 创建BufferSettings值对象
   * 
   * 输出数据格式：
   * BufferSettings实例
   */
  _createBufferSettings(bufferSettings) {
    if (!bufferSettings) {
      throw new Error('bufferSettings不能为空');
    }

    const BufferSettings = require('../../domain/valueObjects/BufferSettings');
    return new BufferSettings(
      bufferSettings.radius,
      'meters', // 固定使用米作为单位
      bufferSettings.semicircleLineSegment || 10, // 默认值改为10
      true // 默认合并结果
    );
  }

  /**
   * 创建要素过滤器
   * 
   * 输入数据格式：
   * @param {Object} featureFilter - 要素过滤对象
   * 
   * 数据处理方法：
   * 设置默认过滤条件
   * 
   * 输出数据格式：
   * 过滤条件对象
   */
  _createFeatureFilter(featureFilter) {
    return {
      featureIds: featureFilter?.featureIds || [],
      spatialFilter: featureFilter?.spatialFilter || null
    };
  }

  /**
   * 创建选项设置
   * 
   * 输入数据格式：
   * @param {Object} options - 选项对象
   * 
   * 数据处理方法：
   * 设置默认选项值
   * 
   * 输出数据格式：
   * 选项对象
   */
  _createOptions(options) {
    return {
      returnGeometry: options?.returnGeometry !== false,
      returnProperties: options?.returnProperties !== false,
      resultLayerName: options?.resultLayerName || '缓冲区分析结果'
    };
  }

  /**
   * 转换为JSON格式
   * 
   * 输入数据格式：
   * 无
   * 
   * 数据处理方法：
   * 序列化DTO为普通对象
   * 
   * 输出数据格式：
   * JSON对象
   */
  toJSON() {
    return {
      sourceData: this.sourceData,
      bufferSettings: this.bufferSettings.toJSON(),
      featureFilter: this.featureFilter,
      options: this.options
    };
  }
}

class BufferAnalysisResponseDTO {
  /**
   * 缓冲区分析响应DTO构造函数
   * 
   * 输入数据格式：
   * @param {Object} data - 响应数据
   * @param {string} data.resultId - 结果ID
   * @param {string} data.resultName - 结果名称
   * @param {string} data.sourceLayerName - 源图层名称
   * @param {Object} data.bufferSettings - 缓冲区设置
   * @param {Object} data.statistics - 统计信息
   * @param {Array} data.features - 结果要素数组
   * @param {string} data.executionTime - 执行时间
   * 
   * 数据处理方法：
   * 1. 验证数据完整性
   * 2. 格式化响应结构
   * 3. 添加元数据
   * 
   * 输出数据格式：
   * BufferAnalysisResponseDTO实例
   */
  constructor(data) {
    this.resultId = data.resultId || this._generateResultId();
    this.resultName = data.resultName || '缓冲区分析结果';
    this.sourceLayerName = data.sourceLayerName || '未知图层';
    this.bufferSettings = data.bufferSettings;
    this.statistics = data.statistics;
    this.features = data.features || [];
    this.executionTime = data.executionTime;
    this.timestamp = new Date().toISOString();
  }

  /**
   * 生成结果ID
   * 
   * 输入数据格式：
   * 无
   * 
   * 数据处理方法：
   * 使用时间戳生成唯一ID
   * 
   * 输出数据格式：
   * 字符串格式的结果ID
   */
  _generateResultId() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `buffer_result_${timestamp}`;
  }

  /**
   * 转换为API响应格式
   * 
   * 输入数据格式：
   * 无
   * 
   * 数据处理方法：
   * 格式化为标准API响应
   * 
   * 输出数据格式：
   * API响应对象
   */
  toApiResponse() {
    return {
      success: true,
      data: {
        resultId: this.resultId,
        resultName: this.resultName,
        sourceLayerName: this.sourceLayerName,
        bufferSettings: this.bufferSettings,
        statistics: this.statistics,
        features: this.features,
        executionTime: this.executionTime
      },
      message: '缓冲区分析执行成功',
      timestamp: this.timestamp
    };
  }
}

module.exports = {
  BufferAnalysisRequestDTO,
  BufferAnalysisResponseDTO
};
