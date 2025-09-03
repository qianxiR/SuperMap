import type { ServiceResponse } from '@/types/map'

// 分析相关的类型定义


export interface DistanceParams {
  startPoint: {
    type: string
    coordinates: number[]
  }
  endPoint: {
    type: string
    coordinates: number[]
  }
  pathType: 'shortest' | 'fastest' | 'scenic'
  transportMode: 'walking' | 'cycling' | 'driving' | 'transit'
}

export interface BufferParams {
  geometry: {
    type: string
    coordinates: number[]
  }
  distance: number
  unit: 'meters' | 'kilometers'
  settings?: {
    radius: number
    semicircleLineSegment: number
  }
}

export interface AnalysisResult {
  success: boolean
  data?: any
  error?: string
}



export class AnalysisAPI {
  private baseUrl: string
  private apiKey?: string

  constructor(baseUrl: string = 'http://localhost:3000/api', apiKey?: string) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ServiceResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`
    
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    }
    
    if (this.apiKey) {
      defaultHeaders['Authorization'] = `Bearer ${this.apiKey}`
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return {
        success: true,
        data,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      }
    }
  }





  // 距离分析API
  async distanceAnalysis(params: DistanceParams): Promise<ServiceResponse<any>> {
    return this.request('/analysis/distance', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  }

  // 缓冲区分析API
  async bufferAnalysis(params: BufferParams): Promise<ServiceResponse<any>> {
    return this.request('/analysis/buffer', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  }

  // 获取分析历史
  async getAnalysisHistory(): Promise<ServiceResponse<any[]>> {
    return this.request('/analysis/history')
  }

  // 保存分析结果
  async saveAnalysisResult(result: any): Promise<ServiceResponse<any>> {
    return this.request('/analysis/save', {
      method: 'POST',
      body: JSON.stringify(result),
    })
  }
}

// 创建默认实例
export const analysisAPI = new AnalysisAPI()
