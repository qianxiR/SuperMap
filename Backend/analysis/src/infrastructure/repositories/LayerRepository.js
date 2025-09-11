/**
 * 图层数据仓库 - 基础设施层
 * 负责从数据源获取图层数据
 */
const Geometry = require('../../domain/entities/Geometry');

class LayerRepository {
  /**
   * 图层数据仓库构造函数
   * 
   * 输入数据格式：
   * 无参数
   * 
   * 数据处理方法：
   * 1. 初始化数据源连接
   * 2. 设置默认配置
   * 
   * 输出数据格式：
   * LayerRepository实例
   */
  constructor() {
    this.dataSource = this._initializeDataSource();
  }

  /**
   * 根据图层ID查找图层数据
   * 
   * 输入数据格式：
   * @param {string} layerId - 图层标识符
   * 
   * 数据处理方法：
   * 1. 验证图层ID
   * 2. 从数据源获取要素数据
   * 3. 转换为标准格式
   * 
   * 输出数据格式：
   * Promise<Object> - 图层数据对象
   */
  async findById(layerId) {
    if (!layerId) {
      throw new Error('图层ID不能为空');
    }

    try {
      // 根据图层ID获取对应的测试数据
      const features = this._getTestFeaturesByLayerId(layerId);
      
      if (!features || features.length === 0) {
        throw new Error(`图层 ${layerId} 不存在或没有数据`);
      }

      // 返回符合用例期望的格式
      return {
        id: layerId,
        name: this._getLayerName(layerId),
        features: features,
        metadata: {
          featureCount: features.length,
          geometryTypes: this._getGeometryTypes(features),
          bounds: this._calculateBounds(features)
        }
      };
    } catch (error) {
      console.error(`获取图层数据失败 [${layerId}]:`, error.message);
      throw new Error(`获取图层数据失败: ${error.message}`);
    }
  }

  /**
   * 获取图层元数据信息
   * 
   * 输入数据格式：
   * @param {string} layerId - 图层标识符
   * 
   * 数据处理方法：
   * 1. 查询图层基本信息
   * 2. 统计要素数量
   * 3. 获取几何类型信息
   * 
   * 输出数据格式：
   * Promise<Object> - 图层元数据
   */
  async getLayerMetadata(layerId) {
    if (!layerId) {
      throw new Error('图层ID不能为空');
    }

    try {
      const features = await this.getLayerData(layerId);
      
      // 统计几何类型
      const geometryTypes = new Set();
      features.forEach(feature => {
        if (feature.geometry && feature.geometry.type) {
          geometryTypes.add(feature.geometry.type);
        }
      });

      return {
        layerId: layerId,
        featureCount: features.length,
        geometryTypes: Array.from(geometryTypes),
        bounds: this._calculateBounds(features),
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error(`获取图层元数据失败 [${layerId}]:`, error.message);
      throw new Error(`获取图层元数据失败: ${error.message}`);
    }
  }

  /**
   * 验证图层是否存在
   * 
   * 输入数据格式：
   * @param {string} layerId - 图层标识符
   * 
   * 数据处理方法：
   * 1. 检查图层ID格式
   * 2. 验证数据源连接
   * 
   * 输出数据格式：
   * Promise<boolean> - 图层是否存在
   */
  async layerExists(layerId) {
    if (!layerId) {
      return false;
    }

    try {
      const features = this._getTestFeaturesByLayerId(layerId);
      return features && features.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * 初始化数据源连接
   * 
   * 输入数据格式：
   * 无参数
   * 
   * 数据处理方法：
   * 1. 设置数据源配置
   * 2. 建立连接池
   * 
   * 输出数据格式：
   * Object - 数据源配置对象
   */
  _initializeDataSource() {
    return {
      type: 'memory',
      connectionString: 'in-memory-test-data',
      timeout: 30000,
      retryCount: 3
    };
  }

  /**
   * 根据图层ID获取测试要素数据
   * 
   * 输入数据格式：
   * @param {string} layerId - 图层标识符
   * 
   * 数据处理方法：
   * 1. 根据图层ID返回对应的测试数据
   * 2. 确保数据格式标准化
   * 
   * 输出数据格式：
   * Array - 要素数据数组
   */
  _getTestFeaturesByLayerId(layerId) {
    const testDataMap = {
      'test_points': this._getTestPointFeatures(),
      'wuhan_schools': this._getWuhanSchoolFeatures(),
      'wuhan_roads': this._getWuhanRoadFeatures(),
      'wuhan_hospitals': this._getWuhanHospitalFeatures()
    };

    return testDataMap[layerId] || [];
  }

  /**
   * 获取测试点要素数据
   * 
   * 输入数据格式：
   * 无参数
   * 
   * 数据处理方法：
   * 1. 生成标准点要素
   * 2. 设置属性信息
   * 
   * 输出数据格式：
   * Array - 点要素数组
   */
  _getTestPointFeatures() {
    return [
      {
        type: 'Feature',
        properties: {
          id: 'point_001',
          name: '测试点1',
          type: '测试点'
        },
        geometry: {
          type: 'Point',
          coordinates: [114.298, 30.584]
        }
      },
      {
        type: 'Feature',
        properties: {
          id: 'point_002',
          name: '测试点2',
          type: '测试点'
        },
        geometry: {
          type: 'Point',
          coordinates: [114.305, 30.590]
        }
      },
      {
        type: 'Feature',
        properties: {
          id: 'point_003',
          name: '测试点3',
          type: '测试点'
        },
        geometry: {
          type: 'Point',
          coordinates: [114.312, 30.596]
        }
      }
    ];
  }

  /**
   * 获取武汉学校要素数据
   * 
   * 输入数据格式：
   * 无参数
   * 
   * 数据处理方法：
   * 1. 生成学校点要素
   * 2. 设置学校属性
   * 
   * 输出数据格式：
   * Array - 学校要素数组
   */
  _getWuhanSchoolFeatures() {
    return [
      {
        type: 'Feature',
        properties: {
          id: 'school_001',
          name: '武汉大学',
          type: '大学',
          address: '武汉市武昌区珞珈山'
        },
        geometry: {
          type: 'Point',
          coordinates: [114.358, 30.535]
        }
      },
      {
        type: 'Feature',
        properties: {
          id: 'school_002',
          name: '华中科技大学',
          type: '大学',
          address: '武汉市洪山区珞喻路'
        },
        geometry: {
          type: 'Point',
          coordinates: [114.408, 30.525]
        }
      }
    ];
  }

  /**
   * 获取武汉道路要素数据
   * 
   * 输入数据格式：
   * 无参数
   * 
   * 数据处理方法：
   * 1. 生成道路线要素
   * 2. 设置道路属性
   * 
   * 输出数据格式：
   * Array - 道路要素数组
   */
  _getWuhanRoadFeatures() {
    return [
      {
        type: 'Feature',
        properties: {
          id: 'road_001',
          name: '珞喻路',
          type: '主干道',
          length: 15000
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [114.300, 30.580],
            [114.350, 30.575],
            [114.400, 30.570]
          ]
        }
      }
    ];
  }

  /**
   * 获取武汉医院要素数据
   * 
   * 输入数据格式：
   * 无参数
   * 
   * 数据处理方法：
   * 1. 生成医院点要素
   * 2. 设置医院属性
   * 
   * 输出数据格式：
   * Array - 医院要素数组
   */
  _getWuhanHospitalFeatures() {
    return [
      {
        type: 'Feature',
        properties: {
          id: 'hospital_001',
          name: '武汉协和医院',
          type: '三甲医院',
          address: '武汉市江汉区解放大道'
        },
        geometry: {
          type: 'Point',
          coordinates: [114.275, 30.610]
        }
      }
    ];
  }

  /**
   * 计算要素集合的边界范围
   * 
   * 输入数据格式：
   * @param {Array} features - 要素数组
   * 
   * 数据处理方法：
   * 1. 遍历所有要素坐标
   * 2. 计算最小最大边界
   * 
   * 输出数据格式：
   * Object - 边界范围对象
   */
  _calculateBounds(features) {
    if (!features || features.length === 0) {
      return null;
    }

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    features.forEach(feature => {
      if (feature.geometry && feature.geometry.coordinates) {
        const coords = this._extractCoordinates(feature.geometry);
        coords.forEach(coord => {
          minX = Math.min(minX, coord[0]);
          minY = Math.min(minY, coord[1]);
          maxX = Math.max(maxX, coord[0]);
          maxY = Math.max(maxY, coord[1]);
        });
      }
    });

    return {
      minX, minY, maxX, maxY,
      center: [(minX + maxX) / 2, (minY + maxY) / 2],
      width: maxX - minX,
      height: maxY - minY
    };
  }

  /**
   * 从几何体中提取所有坐标点
   * 
   * 输入数据格式：
   * @param {Object} geometry - 几何体对象
   * 
   * 数据处理方法：
   * 1. 根据几何类型递归提取坐标
   * 2. 返回扁平化坐标数组
   * 
   * 输出数据格式：
   * Array - 坐标点数组
   */
  _extractCoordinates(geometry) {
    const coordinates = [];

    switch (geometry.type) {
      case 'Point':
        coordinates.push(geometry.coordinates);
        break;
      case 'LineString':
        coordinates.push(...geometry.coordinates);
        break;
      case 'Polygon':
        geometry.coordinates.forEach(ring => {
          coordinates.push(...ring);
        });
        break;
      case 'MultiPoint':
        coordinates.push(...geometry.coordinates);
        break;
      case 'MultiLineString':
        geometry.coordinates.forEach(line => {
          coordinates.push(...line);
        });
        break;
      case 'MultiPolygon':
        geometry.coordinates.forEach(polygon => {
          polygon.forEach(ring => {
            coordinates.push(...ring);
          });
        });
        break;
    }

    return coordinates;
  }

  /**
   * 获取图层名称
   * 
   * 输入数据格式：
   * @param {string} layerId - 图层标识符
   * 
   * 数据处理方法：
   * 1. 根据图层ID映射到友好名称
   * 
   * 输出数据格式：
   * string - 图层名称
   */
  _getLayerName(layerId) {
    const nameMap = {
      'test_points': '测试点图层',
      'wuhan_schools': '武汉学校图层',
      'wuhan_roads': '武汉道路图层',
      'wuhan_hospitals': '武汉医院图层'
    };
    return nameMap[layerId] || `图层_${layerId}`;
  }

  /**
   * 获取要素集合的几何类型
   * 
   * 输入数据格式：
   * @param {Array} features - 要素数组
   * 
   * 数据处理方法：
   * 1. 遍历要素提取几何类型
   * 2. 返回去重后的类型列表
   * 
   * 输出数据格式：
   * Array - 几何类型数组
   */
  _getGeometryTypes(features) {
    const types = new Set();
    features.forEach(feature => {
      if (feature.geometry && feature.geometry.type) {
        types.add(feature.geometry.type);
      }
    });
    return Array.from(types);
  }
}

module.exports = LayerRepository;
