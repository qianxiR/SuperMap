// API配置文件
export interface APIConfig {
  baseUrl: string
  timeout: number
  retryCount: number
  apiKey?: string
}

// 环境配置
const configs: Record<string, APIConfig> = {
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

// 获取当前环境配置
export function getAPIConfig(): APIConfig {
  const env = import.meta.env.MODE || 'development'
  return configs[env] || configs.development
}

// 创建API客户端配置
export function createAPIClientConfig() {
  const config = getAPIConfig()
  return {
    baseURL: config.baseUrl,
    timeout: config.timeout,
    headers: {
      'Content-Type': 'application/json',
      ...(config.apiKey && { Authorization: `Bearer ${config.apiKey}` }),
    },
  }
}
