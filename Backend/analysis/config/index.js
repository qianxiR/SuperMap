/**
 * 应用配置管理
 */
require('dotenv').config();

const config = {
  // 应用基础配置
  app: {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT) || 8087,
    apiVersion: process.env.API_VERSION || 'v1'
  },
  
  // 服务信息
  service: {
    name: process.env.SERVICE_NAME || 'spatial-analysis-service',
    version: process.env.SERVICE_VERSION || '1.0.0'
  },
  
  // CORS配置
  cors: {
    origins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [
      'http://localhost:3000', 
      'http://localhost:5173',
      'http://host.docker.internal:3000',
      'http://172.17.0.1:3000',
      'https://cloud.dify.ai',
      'https://dify.ai',
    ],
    credentials: true
  },
  
  // 请求限制
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  },
  
  // 分析参数限制
  analysisLimits: {
    maxFeaturesPerAnalysis: parseInt(process.env.MAX_FEATURES_PER_ANALYSIS) || 10000,
    maxVerticesPerFeature: parseInt(process.env.MAX_VERTICES_PER_FEATURE) || 1000,
    maxBufferDistance: parseInt(process.env.MAX_BUFFER_DISTANCE) || 100000,
    minBufferDistance: parseFloat(process.env.MIN_BUFFER_DISTANCE) || 0.001
  },
  
  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};

module.exports = config;
