// API配置文件
export interface APIConfig {
  baseUrl: string
  timeout: number
  retryCount: number
  apiKey?: string
}

// 用户服务配置
const userServiceConfigs: Record<string, APIConfig> = {
  development: {
    baseUrl: 'http://localhost:8000/api/v1',
    timeout: 10000,
    retryCount: 3,
  },
  production: {
    baseUrl: 'https://your-production-api.com/api',
    timeout: 15000,
    retryCount: 3,
    apiKey: import.meta.env.VITE_API_KEY,
  },
  test: {
    baseUrl: 'http://localhost:3001/api',
    timeout: 5000,
    retryCount: 1,
  },
}

// 分析服务配置
const analysisServiceConfigs: Record<string, APIConfig> = {
  development: {
    baseUrl: 'http://localhost:8001/api/v1',
    timeout: 30000,
    retryCount: 3,
  },
  production: {
    baseUrl: 'https://your-analysis-api.com/api/v1',
    timeout: 45000,
    retryCount: 3,
    apiKey: import.meta.env.VITE_ANALYSIS_API_KEY,
  },
  test: {
    baseUrl: 'http://localhost:8001/api/v1',
    timeout: 15000,
    retryCount: 1,
  },
}

// 获取用户服务配置
export function getUserServiceConfig(): APIConfig {
  const env = import.meta.env.MODE || 'development'
  return userServiceConfigs[env] || userServiceConfigs.development
}

// 获取分析服务配置
export function getAnalysisServiceConfig(): APIConfig {
  const env = import.meta.env.MODE || 'development'
  return analysisServiceConfigs[env] || analysisServiceConfigs.development
}

// 获取当前环境配置（保持向后兼容）
export function getAPIConfig(): APIConfig {
  return getUserServiceConfig()
}

// 创建用户服务API客户端配置
export function createUserServiceAPIClientConfig() {
  const config = getUserServiceConfig()
  return {
    baseURL: config.baseUrl,
    timeout: config.timeout,
    headers: {
      'Content-Type': 'application/json',
      ...(config.apiKey && { Authorization: `Bearer ${config.apiKey}` }),
    },
  }
}

// 创建分析服务API客户端配置
export function createAnalysisServiceAPIClientConfig() {
  const config = getAnalysisServiceConfig()
  return {
    baseURL: config.baseUrl,
    timeout: config.timeout,
    headers: {
      'Content-Type': 'application/json',
      ...(config.apiKey && { Authorization: `Bearer ${config.apiKey}` }),
    },
  }
}

// 创建API客户端配置（保持向后兼容）
export function createAPIClientConfig() {
  return createUserServiceAPIClientConfig()
}
