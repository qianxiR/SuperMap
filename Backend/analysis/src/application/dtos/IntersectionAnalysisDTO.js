/**
 * 相交分析数据传输对象
 */

class IntersectionAnalysisRequestDTO {
  /**
   * 相交分析请求DTO构造函数
   * 
   * 输入数据格式：
   * @param {Object} data - 请求数据对象
   * @param {Object} data.targetData - 目标图层GeoJSON数据
   * @param {Object} data.maskData - 遮罩图层GeoJSON数据
   * @param {Object} data.analysisOptions - 分析选项
   * @param {Object} data.options - 其他选项
   * 
   * 数据处理方法：
   * 1. 验证请求数据格式
   * 2. 转换数据格式
   * 3. 设置默认值
   * 
   * 输出数据格式：
   * IntersectionAnalysisRequestDTO实例
   */
  constructor(data) {
    this._validateRequestData(data);
    this.targetData = this._createTargetData(data.targetData);
    this.maskData = this._createMaskData(data.maskData);
    this.analysisOptions = this._createAnalysisOptions(data.analysisOptions);
    this.options = this._createOptions(data.options);
  }

  /**
   * 验证请求数据
   * 
   * 输入数据格式：
   * @param {Object} data - 请求数据
   * 
   * 数据处理方法：
   * 1. 检查必需字段
   * 2. 验证数据格式
   * 
   * 输出数据格式：
   * 无返回值，验证失败时抛出错误
   */
  _validateRequestData(data) {
    if (!data) {
      throw new Error('请求数据不能为空');
    }

    if (!data.targetData) {
      throw new Error('目标图层数据不能为空');
    }

    if (!data.maskData) {
      throw new Error('遮罩图层数据不能为空');
    }
  }

  /**
   * 创建目标数据对象
   * 
   * 输入数据格式：
   * @param {Object} targetData - 目标图层GeoJSON数据
   * 
   * 数据处理方法：
   * 1. 验证GeoJSON格式
   * 2. 设置默认值
   * 
   * 输出数据格式：
   * 目标数据对象
   */
  _createTargetData(targetData) {
    if (!targetData || !targetData.type) {
      throw new Error('目标图层数据格式无效');
    }

    return {
      type: targetData.type,
      features: targetData.features || [],
      properties: targetData.properties || {}
    };
  }

  /**
   * 创建遮罩数据对象
   * 
   * 输入数据格式：
   * @param {Object} maskData - 遮罩图层GeoJSON数据
   * 
   * 数据处理方法：
   * 1. 验证GeoJSON格式
   * 2. 设置默认值
   * 
   * 输出数据格式：
   * 遮罩数据对象
   */
  _createMaskData(maskData) {
    if (!maskData || !maskData.type) {
      throw new Error('遮罩图层数据格式无效');
    }

    return {
      type: maskData.type,
      features: maskData.features || [],
      properties: maskData.properties || {}
    };
  }

  /**
   * 创建分析选项
   * 
   * 输入数据格式：
   * @param {Object} analysisOptions - 分析选项
   * 
   * 数据处理方法：
   * 1. 设置默认值
   * 2. 验证参数范围
   * 
   * 输出数据格式：
   * 分析选项对象
   */
  _createAnalysisOptions(analysisOptions) {
    const options = analysisOptions || {};
    
    return {
      batchSize: options.batchSize || 100,
      enableProgress: options.enableProgress !== false,
      returnGeometry: options.returnGeometry !== false
    };
  }

  /**
   * 创建其他选项
   * 
   * 输入数据格式：
   * @param {Object} options - 其他选项
   * 
   * 数据处理方法：
   * 1. 设置默认值
   * 2. 验证参数
   * 
   * 输出数据格式：
   * 选项对象
   */
  _createOptions(options) {
    const opts = options || {};
    
    return {
      resultLayerName: opts.resultLayerName || '相交分析结果',
      enableStatistics: opts.enableStatistics !== false,
      coordinateSystem: opts.coordinateSystem || 'EPSG:4326'
    };
  }

  /**
   * 序列化DTO为普通对象
   * 
   * 输出数据格式：
   * JSON对象
   */
  toJSON() {
    return {
      targetData: this.targetData,
      maskData: this.maskData,
      analysisOptions: this.analysisOptions,
      options: this.options
    };
  }
}

class IntersectionAnalysisResponseDTO {
  /**
   * 相交分析响应DTO构造函数
   * 
   * 输入数据格式：
   * @param {Object} data - 响应数据
   * @param {Array} data.results - 相交分析结果数组
   * @param {Object} data.statistics - 统计信息
   * @param {Object} data.metadata - 元数据
   * 
   * 数据处理方法：
   * 1. 验证响应数据
   * 2. 格式化结果
   * 3. 计算统计信息
   * 
   * 输出数据格式：
   * IntersectionAnalysisResponseDTO实例
   */
  constructor(data) {
    this.id = data.id || `intersection_${Date.now()}`;
    this.name = data.name || '相交分析结果';
    this.results = this._formatResults(data.results || []);
    this.statistics = this._createStatistics(data.statistics || {});
    this.metadata = this._createMetadata(data.metadata || {});
    this.createdAt = new Date().toISOString();
  }

  /**
   * 格式化结果数据
   * 
   * 输入数据格式：
   * @param {Array} results - 原始结果数组
   * 
   * 数据处理方法：
   * 1. 验证结果格式
   * 2. 添加唯一标识
   * 3. 格式化几何数据
   * 
   * 输出数据格式：
   * 格式化后的结果数组
   */
  _formatResults(results) {
    return results.map((result, index) => ({
      id: result.id || `intersection_${index}_${Date.now()}`,
      name: result.name || `相交区域 ${index + 1}`,
      geometry: result.geometry,
      sourceTargetLayerName: result.sourceTargetLayerName || '目标图层',
      sourceMaskLayerName: result.sourceMaskLayerName || '遮罩图层',
      createdAt: result.createdAt || new Date().toISOString()
    }));
  }

  /**
   * 创建统计信息
   * 
   * 输入数据格式：
   * @param {Object} statistics - 原始统计信息
   * 
   * 数据处理方法：
   * 1. 计算基本统计
   * 2. 添加处理时间
   * 3. 格式化数据
   * 
   * 输出数据格式：
   * 统计信息对象
   */
  _createStatistics(statistics) {
    return {
      totalResults: statistics.totalResults || 0,
      targetFeatureCount: statistics.targetFeatureCount || 0,
      maskFeatureCount: statistics.maskFeatureCount || 0,
      totalPairs: statistics.totalPairs || 0,
      processingTime: statistics.processingTime || 0,
      successRate: statistics.successRate || 0
    };
  }

  /**
   * 创建元数据
   * 
   * 输入数据格式：
   * @param {Object} metadata - 原始元数据
   * 
   * 数据处理方法：
   * 1. 添加系统信息
   * 2. 记录处理参数
   * 3. 格式化元数据
   * 
   * 输出数据格式：
   * 元数据对象
   */
  _createMetadata(metadata) {
    return {
      version: metadata.version || '1.0.0',
      algorithm: metadata.algorithm || 'turf-intersect',
      coordinateSystem: metadata.coordinateSystem || 'EPSG:4326',
      batchSize: metadata.batchSize || 100,
      ...metadata
    };
  }

  /**
   * 序列化DTO为普通对象
   * 
   * 输出数据格式：
   * JSON对象
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      results: this.results,
      statistics: this.statistics,
      metadata: this.metadata,
      createdAt: this.createdAt
    };
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
        resultId: this.id,
        resultName: this.name,
        features: this.results,
        statistics: this.statistics,
        metadata: this.metadata,
        executionTime: this.createdAt
      },
      message: '相交分析执行成功',
      timestamp: this.createdAt
    };
  }
}

module.exports = {
  IntersectionAnalysisRequestDTO,
  IntersectionAnalysisResponseDTO
};
