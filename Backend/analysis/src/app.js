/**
 * 空间分析服务主应用 - 基于DDD架构
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const config = require('../config');
const bufferRoutes = require('./api/routes/buffer');
const shortestPathRoutes = require('./api/routes/shortestPath');
const intersectionRoutes = require('./api/routes/intersection');
const eraseRoutes = require('./api/routes/erase');
const downloadRoutes = require('./api/routes/download'); // 引入新的下载路由
const { errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/requestLogger');
const swaggerSpecs = require('./config/swagger');

const app = express();

// 内存管理优化
if (global.gc) {
  setInterval(() => {
    global.gc();
  }, 30000); // 每30秒执行一次垃圾回收
}

// 安全中间件 - 配置CSP以允许Swagger UI内联脚本
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  }
}));

// 压缩中间件
app.use(compression());

// CORS配置
app.use(cors({
  ...config.cors,
  allowedHeaders: [
    'Origin',
    'X-Requested-With', 
    'Content-Type',
    'Accept',
    'Authorization'
  ],
  exposedHeaders: ['Content-Disposition'],
  // 确保预检请求正确处理
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

// 手动处理OPTIONS请求
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// 请求日志
app.use(morgan('combined'));
app.use(requestLogger);

// 请求限制
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    error: {
      code: 'QUOTA_EXCEEDED',
      message: '请求频率超限，请稍后重试'
    }
  }
});
app.use(limiter);

// 解析JSON请求体
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: config.service.name,
    version: config.service.version,
    architecture: 'DDD (Domain-Driven Design)',
    timestamp: new Date().toISOString()
  });
});

// Swagger UI 静态文件
const swaggerUi = require('swagger-ui-dist');
const pathToSwaggerUi = swaggerUi.absolutePath();
const path = require('path');

// 设置 downloads 目录为静态文件目录
app.use('/downloads', express.static(path.join(__dirname, '../downloads')));

// 提供 Swagger UI 静态文件
app.use('/swagger-ui', express.static(pathToSwaggerUi));

// Swagger JSON 文档
app.get('/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpecs);
});

// Swagger UI 页面
app.get('/docs', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="description" content="空间分析服务 API 文档" />
      <title>空间分析服务 API 文档</title>
      <link rel="stylesheet" type="text/css" href="/swagger-ui/swagger-ui.css" />
      <style>
        html {
          box-sizing: border-box;
          overflow: -moz-scrollbars-vertical;
          overflow-y: scroll;
        }
        *, *:before, *:after {
          box-sizing: inherit;
        }
        body {
          margin:0;
          background: #fafafa;
        }
        .swagger-ui .topbar {
          background-color: #2c3e50;
        }
        .swagger-ui .topbar .download-url-wrapper {
          display: none;
        }
        .swagger-ui .topbar .title {
          color: white;
        }
        .swagger-ui .topbar .title:after {
          content: " - 空间分析服务";
        }
      </style>
    </head>
    <body>
      <div id="swagger-ui"></div>
      <script src="/swagger-ui/swagger-ui-bundle.js"></script>
      <script src="/swagger-ui/swagger-ui-standalone-preset.js"></script>
      <script>
        window.onload = function() {
          const ui = SwaggerUIBundle({
            url: '/swagger.json',
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
              SwaggerUIBundle.presets.apis,
              SwaggerUIStandalonePreset
            ],
            plugins: [
              SwaggerUIBundle.plugins.DownloadUrl
            ],
            layout: "StandaloneLayout",
            validatorUrl: null,
            tryItOutEnabled: true,
            supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
            docExpansion: 'list',
            defaultModelsExpandDepth: 3,
            defaultModelExpandDepth: 3,
            requestInterceptor: function(request) {
              console.log('API Request:', request);
              return request;
            },
            responseInterceptor: function(response) {
              console.log('API Response:', response);
              return response;
            }
          });
          window.ui = ui;
        };
      </script>
    </body>
    </html>
  `);
});

// API路由
const apiPrefix = `/api/${config.app.apiVersion}/spatial-analysis`;
app.use(`${apiPrefix}/buffer`, bufferRoutes);
app.use(`${apiPrefix}/shortest-path`, shortestPathRoutes);
app.use(`${apiPrefix}/intersection`, intersectionRoutes);
app.use(`${apiPrefix}/erase`, eraseRoutes);
app.use(`${apiPrefix}/download`, downloadRoutes); // 注册新的下载路由

// 根路径信息
app.get('/', (req, res) => {
  res.json({
    service: config.service.name,
    version: config.service.version,
    description: '空间分析服务 - 基于DDD架构的缓冲区分析、相交分析、擦除分析、最短路径分析',
    architecture: {
      pattern: 'Domain-Driven Design (DDD)',
      layers: [
        'API Layer - 处理HTTP请求和响应',
        'Application Layer - 用例和DTO',
        'Domain Layer - 核心业务逻辑和实体',
        'Infrastructure Layer - 外部依赖和技术实现'
      ]
    },
    endpoints: {
      buffer: `${apiPrefix}/buffer`,
      intersection: `${apiPrefix}/intersection`,
      erase: `${apiPrefix}/erase`,
      shortestPath: `${apiPrefix}/shortest-path`
    },
    documentation: '/docs',
    health: '/health'
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `路径 ${req.originalUrl} 不存在`
    }
  });
});

// 错误处理中间件
app.use(errorHandler);

// 启动服务器
const server = app.listen(config.app.port, () => {
  console.log(`🚀 ${config.service.name} v${config.service.version} 启动成功`);
  console.log(`📡 服务地址: http://localhost:${config.app.port}`);
  console.log(`🔧 环境: ${config.app.env}`);
  console.log(`🏗️  架构: DDD (Domain-Driven Design)`);
  console.log(`📚 Swagger UI: http://localhost:${config.app.port}/docs`);
  console.log(`📄 Swagger JSON: http://localhost:${config.app.port}/swagger.json`);
  console.log(`🔍 健康检查: http://localhost:${config.app.port}/health`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('🛑 收到SIGTERM信号，正在关闭服务器...');
  server.close(() => {
    console.log('✅ 服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 收到SIGINT信号，正在关闭服务器...');
  server.close(() => {
    console.log('✅ 服务器已关闭');
    process.exit(0);
  });
});

module.exports = app;
