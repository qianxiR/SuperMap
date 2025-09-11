/**
 * 缓冲区分析用例
 */
const Geometry = require('../../domain/entities/Geometry');
const BufferAnalysisService = require('../../domain/services/BufferAnalysisService');
const { BufferAnalysisResponseDTO } = require('../dtos/BufferAnalysisDTO');

class BufferAnalysisUseCase {
  /**
   * 缓冲区分析用例构造函数
   * 
   * 输入数据格式：
   * @param {Object} dependencies - 依赖注入
   * @param {Object} dependencies.geometryRepository - 几何数据仓库
   * @param {Object} dependencies.layerRepository - 图层数据仓库
   * 
   * 数据处理方法：
   * 1. 注入依赖服务
   * 2. 初始化领域服务
   * 
   * 输出数据格式：
   * BufferAnalysisUseCase实例
   */
  constructor(dependencies = {}) {
    this.geometryRepository = dependencies.geometryRepository;
    this.layerRepository = dependencies.layerRepository;
    this.bufferAnalysisService = new BufferAnalysisService();
  }

  /**
   * 执行缓冲区分析用例
   * 
   * 输入数据格式：
   * @param {BufferAnalysisRequestDTO} requestDTO - 请求DTO
   * 
   * 数据处理方法：
   * 1. 获取源数据（图层ID或直接GeoJSON）
   * 2. 应用要素过滤
   * 3. 创建几何实体
   * 4. 执行缓冲区分析
   * 5. 生成响应DTO
   * 
   * 输出数据格式：
   * BufferAnalysisResponseDTO实例
   */
  async execute(requestDTO) {
    try {
      // 1. 获取源数据
      const sourceData = await this._getSourceData(requestDTO);
      
      // 2. 应用要素过滤
      const filteredFeatures = this._applyFeatureFilter(
        sourceData.features, 
        requestDTO.featureFilter
      );

      // 3. 准备GeoJSON数据
      console.log('[BufferAnalysisUseCase] 过滤后的要素:', {
        count: filteredFeatures.length,
        features: filteredFeatures.map(f => ({ id: f.properties?.id, type: f.geometry?.type }))
      });
      
      // 创建GeoJSON FeatureCollection
      const geoJSONData = {
        type: 'FeatureCollection',
        features: filteredFeatures
      };
      

      // 4. 执行缓冲区分析
      const analysisResult = await this.bufferAnalysisService.executeBufferAnalysis(
        geoJSONData,
        requestDTO.bufferSettings
      );

      // 5. 生成响应DTO
      console.log('[BufferAnalysisUseCase] 分析结果:', {
        resultsCount: analysisResult.results.length,
        results: analysisResult.results.map(r => ({ type: r.geometry?.type }))
      });
      
      const formattedFeatures = this._formatFeatures(analysisResult.results);
      console.log('[BufferAnalysisUseCase] 格式化后的要素:', {
        featuresCount: formattedFeatures.length,
        features: formattedFeatures
      });
      
      const responseData = {
        resultId: this._generateResultId(),
        resultName: requestDTO.options.resultLayerName,
        sourceLayerName: sourceData.layerName,
        bufferSettings: analysisResult.settings,
        statistics: analysisResult.statistics,
        features: formattedFeatures,
        executionTime: analysisResult.executionTime
      };

      return new BufferAnalysisResponseDTO(responseData);

    } catch (error) {
      console.error('缓冲区分析用例执行失败:', error);
      throw new Error(`缓冲区分析失败: ${error.message}`);
    }
  }

  /**
   * 获取源数据
   * 
   * 输入数据格式：
   * @param {BufferAnalysisRequestDTO} requestDTO - 请求DTO
   * 
   * 数据处理方法：
   * 1. 检查数据源类型
   * 2. 从图层仓库或直接使用GeoJSON数据
   * 3. 验证数据完整性
   * 
   * 输出数据格式：
   * 源数据对象
   */
  async _getSourceData(requestDTO) {
    if (requestDTO.sourceLayerId) {
      return await this._getLayerData(requestDTO.sourceLayerId);
    } else if (requestDTO.sourceData) {
      return this._processGeoJSONData(requestDTO.sourceData);
    } else {
      throw new Error('未提供有效的源数据');
    }
  }

  /**
   * 处理GeoJSON数据
   * 
   * 输入数据格式：
   * @param {Object} geoJSONData - GeoJSON数据
   * 
   * 数据处理方法：
   * 1. 标准化为FeatureCollection格式
   * 2. 提取要素数组
   * 
   * 输出数据格式：
   * 标准化的图层数据对象
   */
  _processGeoJSONData(geoJSONData) {
    let features = [];

    if (geoJSONData.type === 'FeatureCollection') {
      features = geoJSONData.features || [];
    } else if (geoJSONData.type === 'Feature') {
      features = [geoJSONData];
    }

    return {
      features: features,
      layerName: '用户提供的GeoJSON数据',
      totalFeatures: features.length
    };
  }

  /**
   * 获取图层数据
   * 
   * 输入数据格式：
   * @param {string} layerId - 图层ID
   * 
   * 数据处理方法：
   * 1. 获取图层要素数据
   * 
   * 输出数据格式：
   * 图层数据对象
   */
  async _getLayerData(layerId) {
    const layerData = await this.layerRepository.findById(layerId);
    return layerData;
  }

  /**
   * 应用要素过滤
   * 
   * 输入数据格式：
   * @param {Array} features - 要素数组
   * @param {Object} filter - 过滤条件
   * 
   * 数据处理方法：
   * 1. 按ID过滤
   * 2. 按空间范围过滤
   * 3. 返回过滤后的要素
   * 
   * 输出数据格式：
   * 过滤后的要素数组
   */
  _applyFeatureFilter(features, filter) {
    let filteredFeatures = features;

    // 按要素ID过滤
    if (filter.featureIds && filter.featureIds.length > 0) {
      filteredFeatures = filteredFeatures.filter(feature => 
        filter.featureIds.includes(feature.properties?.id)
      );
    }

    // 按空间范围过滤
    if (filter.spatialFilter && filter.spatialFilter.bounds) {
      filteredFeatures = this._applySpatialFilter(filteredFeatures, filter.spatialFilter.bounds);
    }

    return filteredFeatures;
  }

  /**
   * 应用空间过滤
   * 
   * 输入数据格式：
   * @param {Array} features - 要素数组
   * @param {Array} bounds - 边界数组 [minLon, minLat, maxLon, maxLat]
   * 
   * 数据处理方法：
   * 检查要素是否在指定边界内
   * 
   * 输出数据格式：
   * 空间过滤后的要素数组
   */
  _applySpatialFilter(features, bounds) {
    const [minLon, minLat, maxLon, maxLat] = bounds;
    
    return features.filter(feature => {
      const coords = this._extractCoordinates(feature.geometry);
      return coords.some(coord => 
        coord[0] >= minLon && coord[0] <= maxLon &&
        coord[1] >= minLat && coord[1] <= maxLat
      );
    });
  }

  /**
   * 提取坐标数组
   * 
   * 输入数据格式：
   * @param {Object} geometry - 几何对象
   * 
   * 数据处理方法：
   * 递归提取所有坐标点
   * 
   * 输出数据格式：
   * 坐标数组
   */
  _extractCoordinates(geometry) {
    const coords = geometry.coordinates;
    
    if (geometry.type === 'Point') {
      return [coords];
    } else if (geometry.type === 'LineString') {
      return coords;
    } else if (geometry.type === 'Polygon') {
      return coords.flat();
    } else if (geometry.type.startsWith('Multi')) {
      return coords.flat(2);
    }
    
    return [];
  }


  /**
   * 格式化要素数据
   * 
   * 输入数据格式：
   * @param {Array<Object>} turfFeatures - turf要素数组
   * 
   * 数据处理方法：
   * 转换为API响应格式
   * 
   * 输出数据格式：
   * 格式化后的要素数组
   */
  _formatFeatures(turfFeatures) {
    return turfFeatures.map(feature => ({
      type: 'Feature',
      geometry: feature.geometry,
      properties: feature.properties || {}
    }));
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
    return `buffer_result_${timestamp}`;
  }
}

module.exports = BufferAnalysisUseCase;
