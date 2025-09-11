/**
 * 擦除分析用例
 */
const { EraseAnalysisRequestDTO, EraseAnalysisResponseDTO } = require('../dtos/EraseAnalysisDTO');
const EraseAnalysisService = require('../../domain/services/EraseAnalysisService');

class EraseAnalysisUseCase {
  /**
   * 擦除分析用例构造函数
   * 
   * 输入数据格式：
   * @param {Object} dependencies - 依赖注入
   * @param {Object} dependencies.layerRepository - 图层仓库
   * 
   * 数据处理方法：
   * 1. 初始化依赖服务
   * 2. 创建领域服务实例
   * 
   * 输出数据格式：
   * EraseAnalysisUseCase实例
   */
  constructor(dependencies = {}) {
    this.layerRepository = dependencies.layerRepository;
    this.eraseAnalysisService = new EraseAnalysisService();
  }

  /**
   * 执行擦除分析
   * 
   * 输入数据格式：
   * @param {EraseAnalysisRequestDTO} requestDTO - 请求DTO
   * 
   * 数据处理方法：
   * 1. 验证请求数据
   * 2. 处理图层数据
   * 3. 执行擦除分析
   * 4. 生成响应DTO
   * 
   * 输出数据格式：
   * EraseAnalysisResponseDTO实例
   */
  async execute(requestDTO) {
    try {
      console.log('[EraseAnalysisUseCase] 开始执行擦除分析用例');

      // 1. 验证请求数据
      if (!requestDTO) {
        throw new Error('请求数据不能为空');
      }

      // 2. 提取请求数据
      const { targetData, eraseData, analysisOptions, options } = requestDTO;

      console.log('[EraseAnalysisUseCase] 请求数据:', {
        targetFeatures: targetData.features?.length || 0,
        eraseFeatures: eraseData.features?.length || 0,
        analysisOptions: analysisOptions,
        options: options
      });

      // 3. 执行擦除分析
      const analysisResult = await this.eraseAnalysisService.executeEraseAnalysis(
        targetData,
        eraseData,
        analysisOptions
      );

      console.log('[EraseAnalysisUseCase] 分析结果:', {
        resultsCount: analysisResult.results.length,
        statistics: analysisResult.statistics
      });

      // 4. 创建响应DTO
      const responseDTO = new EraseAnalysisResponseDTO({
        id: `erase_${Date.now()}`,
        name: options.resultLayerName || '擦除分析结果',
        results: analysisResult.results,
        statistics: analysisResult.statistics,
        metadata: analysisResult.metadata
      });

      console.log('[EraseAnalysisUseCase] 擦除分析用例执行完成');

      return responseDTO;

    } catch (error) {
      console.error('[EraseAnalysisUseCase] 执行擦除分析用例失败:', error);
      throw new Error(`擦除分析失败: ${error.message}`);
    }
  }

  /**
   * 获取分析选项
   * 
   * 输出数据格式：
   * 分析选项对象
   */
  async getAnalysisOptions() {
    try {
      console.log('[EraseAnalysisUseCase] 获取擦除分析选项');

      const options = this.eraseAnalysisService.getAnalysisOptions();

      return {
        success: true,
        data: {
          options: options,
          description: '擦除分析参数选项',
          version: '1.0.0'
        }
      };

    } catch (error) {
      console.error('[EraseAnalysisUseCase] 获取分析选项失败:', error);
      throw new Error(`获取分析选项失败: ${error.message}`);
    }
  }

  /**
   * 验证分析数据
   * 
   * 输入数据格式：
   * @param {Object} targetData - 目标数据
   * @param {Object} eraseData - 擦除数据
   * 
   * 数据处理方法：
   * 1. 检查数据量
   * 2. 生成性能警告
   * 
   * 输出数据格式：
   * 验证结果对象
   */
  async validateAnalysisData(targetData, eraseData) {
    try {
      console.log('[EraseAnalysisUseCase] 验证分析数据');

      const validation = {
        isValid: true,
        errors: [],
        warnings: []
      };

      // 检查数据量
      if (targetData?.features?.length > 1000) {
        validation.warnings.push('目标图层要素数量较多，可能影响性能');
      }

      if (eraseData?.features?.length > 1000) {
        validation.warnings.push('擦除图层要素数量较多，可能影响性能');
      }

      const totalPairs = (targetData?.features?.length || 0) * (eraseData?.features?.length || 0);
      if (totalPairs > 10000) {
        validation.warnings.push(`总组合数 ${totalPairs} 较大，建议分批处理`);
      }

      console.log('[EraseAnalysisUseCase] 数据验证完成:', validation);

      return validation;

    } catch (error) {
      console.error('[EraseAnalysisUseCase] 数据验证失败:', error);
      return {
        isValid: false,
        errors: [`数据验证失败: ${error.message}`],
        warnings: []
      };
    }
  }

  /**
   * 获取分析统计信息
   * 
   * 输入数据格式：
   * @param {Object} targetData - 目标数据
   * @param {Object} eraseData - 擦除数据
   * 
   * 数据处理方法：
   * 1. 分析数据特征
   * 2. 计算预估信息
   * 3. 生成统计报告
   * 
   * 输出数据格式：
   * 统计信息对象
   */
  async getAnalysisStatistics(targetData, eraseData) {
    try {
      console.log('[EraseAnalysisUseCase] 获取分析统计信息');

      const targetFeatures = targetData?.features || [];
      const eraseFeatures = eraseData?.features || [];

      // 分析几何类型分布
      const targetGeometryTypes = this._analyzeGeometryTypes(targetFeatures);
      const eraseGeometryTypes = this._analyzeGeometryTypes(eraseFeatures);

      // 计算预估信息
      const totalPairs = targetFeatures.length * eraseFeatures.length;
      const estimatedTime = this._estimateProcessingTime(totalPairs);

      const statistics = {
        targetLayer: {
          featureCount: targetFeatures.length,
          geometryTypes: targetGeometryTypes
        },
        eraseLayer: {
          featureCount: eraseFeatures.length,
          geometryTypes: eraseGeometryTypes
        },
        analysis: {
          totalPairs: totalPairs,
          estimatedTime: estimatedTime,
          complexity: this._assessComplexity(totalPairs)
        }
      };

      console.log('[EraseAnalysisUseCase] 统计信息生成完成:', statistics);

      return statistics;

    } catch (error) {
      console.error('[EraseAnalysisUseCase] 获取统计信息失败:', error);
      throw new Error(`获取统计信息失败: ${error.message}`);
    }
  }

  /**
   * 分析几何类型分布
   * 
   * 输入数据格式：
   * @param {Array} features - 要素数组
   * 
   * 数据处理方法：
   * 1. 统计几何类型
   * 2. 计算分布比例
   * 
   * 输出数据格式：
   * 几何类型分布对象
   */
  _analyzeGeometryTypes(features) {
    const typeCount = {};
    
    features.forEach(feature => {
      const type = feature?.geometry?.type || 'Unknown';
      typeCount[type] = (typeCount[type] || 0) + 1;
    });

    const total = features.length;
    const distribution = {};
    
    Object.keys(typeCount).forEach(type => {
      distribution[type] = {
        count: typeCount[type],
        percentage: Math.round((typeCount[type] / total) * 100)
      };
    });

    return distribution;
  }

  /**
   * 预估处理时间
   * 
   * 输入数据格式：
   * @param {number} totalPairs - 总组合数
   * 
   * 数据处理方法：
   * 1. 基于历史数据估算
   * 2. 考虑系统性能
   * 
   * 输出数据格式：
   * 预估时间（毫秒）
   */
  _estimateProcessingTime(totalPairs) {
    // 基于经验公式估算处理时间
    const baseTime = 100; // 基础时间 100ms
    const timePerPair = 0.1; // 每对组合 0.1ms
    return Math.round(baseTime + (totalPairs * timePerPair));
  }

  /**
   * 评估分析复杂度
   * 
   * 输入数据格式：
   * @param {number} totalPairs - 总组合数
   * 
   * 数据处理方法：
   * 1. 根据组合数分级
   * 2. 提供复杂度建议
   * 
   * 输出数据格式：
   * 复杂度等级字符串
   */
  _assessComplexity(totalPairs) {
    if (totalPairs <= 100) {
      return 'low';
    } else if (totalPairs <= 1000) {
      return 'medium';
    } else if (totalPairs <= 10000) {
      return 'high';
    } else {
      return 'very-high';
    }
  }
}

module.exports = EraseAnalysisUseCase;
