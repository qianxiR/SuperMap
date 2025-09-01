import type { ServiceResponse } from '@/types/map'
import { createAPIConfig } from '@/utils/config'

/**
 * SuperMap iClient API 优化使用指南
 * 
 * 官方推荐的最佳实践：
 * 1. 设置 returnFeaturesOnly = true 来提升性能
 * 2. 合理使用分页加载大数据集
 * 
 * 性能优化要点：
 * - 设置 returnFeaturesOnly = true 减少数据传输
 * - 使用空间边界过滤减少查询范围
 * - 合理设置分页大小（建议10000-50000）
 * 
 * 使用示例：
 * ```typescript
 * // ✅ 推荐：使用优化的要素查询
 * const featuresResult = await superMapClient.getFeaturesByBoundsOptimized(
 *   ['wuhan:武汉_县级'],
 *   [113.7, 29.97, 115.08, 31.36],
 *   { fromIndex: 0, toIndex: 9999 }
 * )
 * ```
 */
export class SuperMapError extends Error {
  constructor(
    message: string,
    public code?: number,
    public type: 'network' | 'service' | 'timeout' = 'service'
  ) {
    super(message)
    this.name = 'SuperMapError'
  }
}

export class SuperMapClient {
  private config = createAPIConfig()
  
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    retries: number = this.config.retryCount
  ): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      if (retries > 0 && this.shouldRetry(error)) {
        await this.delay(Math.pow(2, this.config.retryCount - retries) * 1000) // 指数退避
        return this.executeWithRetry(operation, retries - 1)
      }
      throw error
    }
  }

  private shouldRetry(error: any): boolean {
    // 网络错误或超时错误可以重试
    return error instanceof SuperMapError && 
           (error.type === 'network' || error.type === 'timeout')
  }



  async checkServiceHealth(): Promise<ServiceResponse<boolean>> {
    return this.executeWithRetry(async () => {
      try {
        // 使用服务根URL进行健康检查
        const testUrl = `${this.config.baseUrl}/iserver/services/map-guanlifenxipingtai/rest/maps/wuhan_map`
        const response = await fetch(testUrl, { 
          method: 'HEAD',
          signal: AbortSignal.timeout(this.config.timeout)
        })
        
        return {
          success: response.ok,
          data: response.ok,
          error: response.ok ? undefined : `HTTP ${response.status}`
        }
      } catch (error) {
        return {
          success: false,
          data: false,
          error: error instanceof Error ? error.message : '服务健康检查失败'
        }
      }
    })
  }

  /**
   * 获取数据集的要素列表信息
   * @param datasetName 数据集名称
   */
  async getFeaturesList(datasetName: string): Promise<ServiceResponse<any>> {
    return this.executeWithRetry(async () => {
      try {
        const parts = datasetName.split('@')
        const dataset = parts[0]
        const datasource = parts[1] || 'wuhan'
        
        const url = `${this.config.baseUrl}/${this.config.dataService}/datasources/${datasource}/datasets/${dataset}/features.json`
        const response = await fetch(url, {
          signal: AbortSignal.timeout(this.config.timeout)
        })
        
        if (!response.ok) {
          throw new SuperMapError(`获取要素列表失败: HTTP ${response.status}`, response.status)
        }
        
        const data = await response.json()
        return {
          success: true,
          data: {
            startIndex: data.startIndex || 0,
            featureCount: data.featureCount || 0,
            totalCount: data.totalCount || 0,
            currentCount: data.currentCount || 0
          },
          error: undefined
        }
      } catch (error) {
        return {
          success: false,
          data: null,
          error: error instanceof Error ? error.message : '获取要素列表失败'
        }
      }
    })
  }



  /**
   * 优化的要素查询方法 - 使用官方推荐的参数配置
   * @param datasetNames 数据集名称数组
   * @param bounds 空间边界范围
   * @param options 查询选项
   */
  async getFeaturesByBoundsOptimized(
    datasetNames: string[],
    bounds: number[],
    options: {
      fromIndex?: number
      toIndex?: number
      maxFeatures?: number
      attributeFilter?: string
      spatialQueryMode?: string
    } = {}
  ): Promise<ServiceResponse<any>> {
    return this.executeWithRetry(async () => {
      try {
        const datasetName = datasetNames[0]
        const parts = datasetName.split(':')
        const datasource = parts[0]
        const dataset = parts[1]
        
        // 构建查询参数
        const params = new URLSearchParams({
          returnContent: 'true',
          returnFeaturesOnly: 'true', // ✅ 官方推荐：设置为true提升性能
          maxFeatures: (options.maxFeatures || -1).toString(),
          fromIndex: (options.fromIndex || 0).toString(),
          toIndex: (options.toIndex || -1).toString(),
          bounds: bounds.join(','),
          spatialQueryMode: options.spatialQueryMode || 'INTERSECT'
        })
        
        if (options.attributeFilter) {
          params.append('attributeFilter', options.attributeFilter)
        }
        
        const url = `${this.config.baseUrl}/${this.config.dataService}/datasources/${datasource}/datasets/${dataset}/features.json?${params}`
        const response = await fetch(url, {
          signal: AbortSignal.timeout(this.config.timeout)
        })
        
        if (!response.ok) {
          throw new SuperMapError(`要素查询失败: HTTP ${response.status}`, response.status)
        }
        
        const data = await response.json()
        return {
          success: true,
          data: data,
          error: undefined
        }
      } catch (error) {
        return {
          success: false,
          data: null,
          error: error instanceof Error ? error.message : '要素查询失败'
        }
      }
    })
  }

  /**
   * 加载数据集的所有要素
   * @param datasetName 数据集名称
   * @param batchSize 批次大小
   * @param progressCallback 进度回调函数
   */
  async getAllFeatures(
    datasetName: string, 
    batchSize: number = 10000,
    progressCallback?: (loaded: number, total: number) => void
  ): Promise<ServiceResponse<any[]>> {
    return this.executeWithRetry(async () => {
      try {

        
        // 首先获取数据集信息
        const listResult = await this.getFeaturesList(datasetName)
        if (!listResult.success) {
          throw new Error(listResult.error || '获取数据集信息失败')
        }
        
        const totalCount = listResult.data.totalCount || listResult.data.featureCount || 0
        const allFeatures: any[] = []
        
        // 分页加载所有要素
        for (let fromIndex = 0; fromIndex < totalCount; fromIndex += batchSize) {
          const toIndex = Math.min(fromIndex + batchSize - 1, totalCount - 1)
          
          const batchResult = await this.getFeaturesBatch(datasetName, fromIndex, toIndex)
          if (batchResult.success && batchResult.data) {
            allFeatures.push(...batchResult.data)
            
            // 调用进度回调
            if (progressCallback) {
              progressCallback(allFeatures.length, totalCount)
            }
          } else {
            console.warn(`批次加载失败: ${fromIndex}-${toIndex}`)
          }
        }
        
        return {
          success: true,
          data: allFeatures,
          error: undefined
        }
      } catch (error) {
        return {
          success: false,
          data: [],
          error: error instanceof Error ? error.message : '加载所有要素失败'
        }
      }
    })
  }

  /**
   * 加载指定范围的要素
   * @param datasetName 数据集名称
   * @param startIndex 起始索引
   * @param endIndex 结束索引
   */
  async getFeaturesBatch(
    datasetName: string, 
    startIndex: number, 
    endIndex: number
  ): Promise<ServiceResponse<any[]>> {
    return this.executeWithRetry(async () => {
      try {
        const parts = datasetName.split('@')
        const dataset = parts[0]
        const datasource = parts[1] || 'wuhan'
        
        const url = `${this.config.baseUrl}/${this.config.dataService}/datasources/${datasource}/datasets/${dataset}/features.json`
        const params = new URLSearchParams({
          fromIndex: startIndex.toString(),
          toIndex: endIndex.toString(),
          returnContent: 'true',
          returnFeaturesOnly: 'true'
        })
        
        const response = await fetch(`${url}?${params}`, {
          signal: AbortSignal.timeout(this.config.timeout)
        })
        
        if (!response.ok) {
          throw new SuperMapError(`获取要素批次失败: HTTP ${response.status}`, response.status)
        }
        
        const data = await response.json()
        return {
          success: true,
          data: data.features || [],
          error: undefined
        }
      } catch (error) {
        return {
          success: false,
          data: [],
          error: error instanceof Error ? error.message : '获取要素批次失败'
        }
      }
    })
  }
}

export const superMapClient = new SuperMapClient()