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
    baseUrl: `${import.meta.env.VITE_USER_SERVICE_BASE_URL || 'http://localhost:8088'}${import.meta.env.VITE_USER_SERVICE_API_PREFIX || '/api/v1'}`,
    timeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 10000,
    retryCount: parseInt(import.meta.env.VITE_API_RETRY_COUNT) || 3,
  },
  production: {
    baseUrl: `${import.meta.env.VITE_USER_SERVICE_BASE_URL}${import.meta.env.VITE_USER_SERVICE_API_PREFIX}`,
    timeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 15000,
    retryCount: parseInt(import.meta.env.VITE_API_RETRY_COUNT) || 3,
    apiKey: import.meta.env.VITE_API_KEY,
  },
  test: {
    baseUrl: `${import.meta.env.VITE_USER_SERVICE_BASE_URL || 'http://localhost:8088'}${import.meta.env.VITE_USER_SERVICE_API_PREFIX || '/api/v1'}`,
    timeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 5000,
    retryCount: parseInt(import.meta.env.VITE_API_RETRY_COUNT) || 1,
  },
}

// 分析服务配置
const analysisServiceConfigs: Record<string, APIConfig> = {
  development: {
    baseUrl: `${import.meta.env.VITE_ANALYSIS_SERVICE_BASE_URL || 'https://4ccf891f6a10.ngrok-free.app'}${import.meta.env.VITE_ANALYSIS_SERVICE_API_PREFIX || '/api/v1/spatial-analysis'}`,
    timeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 30000,
    retryCount: parseInt(import.meta.env.VITE_API_RETRY_COUNT) || 3,
  },
  production: {
    baseUrl: `${import.meta.env.VITE_ANALYSIS_SERVICE_BASE_URL}${import.meta.env.VITE_ANALYSIS_SERVICE_API_PREFIX}`,
    timeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 45000,
    retryCount: parseInt(import.meta.env.VITE_API_RETRY_COUNT) || 3,
    apiKey: import.meta.env.VITE_ANALYSIS_API_KEY,
  },
  test: {
    baseUrl: `${import.meta.env.VITE_ANALYSIS_SERVICE_BASE_URL || 'https://4ccf891f6a10.ngrok-free.app'}${import.meta.env.VITE_ANALYSIS_SERVICE_API_PREFIX || '/api/v1/spatial-analysis'}`,
    timeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 15000,
    retryCount: parseInt(import.meta.env.VITE_API_RETRY_COUNT) || 1,
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
