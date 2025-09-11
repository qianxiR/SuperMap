/**
 * 最短路径分析DTO
 */
class ShortestPathAnalysisRequestDTO {
  /**
   * 最短路径分析请求DTO构造函数
   * 
   * 输入数据格式：
   * @param {Object} data - 请求数据
   * @param {Object} data.startPoint - 起点坐标
   * @param {Object} data.endPoint - 终点坐标
   * @param {Object} data.analysisOptions - 分析选项
   * @param {Object} data.options - 其他选项
   * 
   * 数据处理方法：
   * 1. 验证必需字段
   * 2. 设置默认值
   * 3. 转换数据格式
   * 
   * 输出数据格式：
   * ShortestPathAnalysisRequestDTO实例
   */
  constructor(data) {
    this._validateRequestData(data);
    this.startPoint = this._createPoint(data.startPoint);
    this.endPoint = this._createPoint(data.endPoint);
    this.analysisOptions = this._createAnalysisOptions(data.analysisOptions);
    this.options = this._createOptions(data.options);
    this.obstacleData = data.obstacleData || null;
  }

  /**
   * 验证请求数据
   * 
   * 输入数据格式：
   * @param {Object} data - 请求数据
   * 
   * 数据处理方法：
   * 检查起点和终点是否有效
   * 
   * 输出数据格式：
   * 无（抛出异常如果无效）
   */
  _validateRequestData(data) {
    if (!data.startPoint) {
      throw new Error('startPoint不能为空');
    }
    
    if (!data.endPoint) {
      throw new Error('endPoint不能为空');
    }
    
    if (!this._isValidPoint(data.startPoint)) {
      throw new Error('startPoint必须是有效的GeoJSON Point格式');
    }
    
    if (!this._isValidPoint(data.endPoint)) {
      throw new Error('endPoint必须是有效的GeoJSON Point格式');
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
   * 创建点对象
   * 
   * 输入数据格式：
   * @param {Object} point - 点数据
   * 
   * 数据处理方法：
   * 标准化点格式
   * 
   * 输出数据格式：
   * 标准化的点对象
   */
  _createPoint(point) {
    return {
      type: 'Point',
      coordinates: [point.coordinates[0], point.coordinates[1]]
    };
  }

  /**
   * 创建分析选项
   * 
   * 输入数据格式：
   * @param {Object} options - 分析选项
   * 
   * 数据处理方法：
   * 设置默认分析选项
   * 
   * 输出数据格式：
   * 分析选项对象
   */
  _createAnalysisOptions(options) {
    return {
      units: options?.units || 'kilometers',
      resolution: options?.resolution || 1000,
      obstacleLayerId: options?.obstacleLayerId || null,
      costField: options?.costField || null
    };
  }

  /**
   * 创建其他选项
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
      calculateDistance: options?.calculateDistance !== false,
      calculateDuration: options?.calculateDuration !== false,
      averageSpeed: options?.averageSpeed || 50
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
      startPoint: this.startPoint,
      endPoint: this.endPoint,
      analysisOptions: this.analysisOptions,
      options: this.options,
      obstacleData: this.obstacleData
    };
  }
}

class ShortestPathAnalysisResponseDTO {
  /**
   * 最短路径分析响应DTO构造函数
   * 
   * 输入数据格式：
   * @param {Object} data - 响应数据
   * @param {string} data.resultId - 结果ID
   * @param {string} data.resultName - 结果名称
   * @param {Object} data.pathGeometry - 路径几何
   * @param {Object} data.statistics - 统计信息
   * @param {string} data.executionTime - 执行时间
   * 
   * 数据处理方法：
   * 1. 验证数据完整性
   * 2. 格式化响应结构
   * 3. 添加元数据
   * 
   * 输出数据格式：
   * ShortestPathAnalysisResponseDTO实例
   */
  constructor(data) {
    this.resultId = data.resultId || this._generateResultId();
    this.resultName = data.resultName || '最短路径分析结果';
    this.pathGeometry = data.pathGeometry;
    this.statistics = data.statistics;
    this.executionTime = data.executionTime;
    this.startPoint = data.startPoint; // 保存起始点坐标
    this.endPoint = data.endPoint; // 保存终点坐标
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
    return `shortest_path_result_${timestamp}`;
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
    const features = [];
    
    // 添加起始点作为 Feature
    if (this.startPoint) {
      features.push({
        type: 'Feature',
        geometry: this.startPoint,
        properties: {
          id: `${this.resultId}_start`,
          name: '起始点',
          analysisType: 'shortest-path-start',
          createdAt: this.timestamp
        }
      });
    }
    
    // 添加终点作为 Feature
    if (this.endPoint) {
      features.push({
        type: 'Feature',
        geometry: this.endPoint,
        properties: {
          id: `${this.resultId}_end`,
          name: '终点',
          analysisType: 'shortest-path-end',
          createdAt: this.timestamp
        }
      });
    }
    
    // 添加路径线作为 Feature
    if (this.pathGeometry) {
      features.push({
        type: 'Feature',
        geometry: this.pathGeometry,
        properties: {
          id: this.resultId,
          name: this.resultName,
          analysisType: 'shortest-path',
          distance: this.statistics?.distance || 0,
          duration: this.statistics?.duration || 0,
          pathType: 'optimal',
          createdAt: this.timestamp,
          processedAt: this.timestamp,
          executionTime: this.executionTime
        }
      });
    }
    
    return {
      success: true,
      data: {
        resultId: this.resultId,
        resultName: this.resultName,
        features: features,
        statistics: this.statistics,
        executionTime: this.executionTime
      },
      message: '最短路径分析执行成功',
      timestamp: this.timestamp
    };
  }
}

module.exports = {
  ShortestPathAnalysisRequestDTO,
  ShortestPathAnalysisResponseDTO
};
