# 空间分析服务 - DDD架构实现

基于 Node.js + Express + DDD (Domain-Driven Design) 架构的空间分析服务，提供缓冲区分析、相交分析、擦除分析、最短路径分析功能。

## 架构设计

### DDD 分层架构

```
src/
├── api/                    # API层 - 处理HTTP请求和响应
│   ├── controllers/        # 控制器
│   └── routes/            # 路由定义
├── application/           # 应用层 - 用例和DTO
│   ├── dtos/             # 数据传输对象
│   └── useCases/         # 用例实现
├── domain/               # 领域层 - 核心业务逻辑
│   ├── entities/         # 实体
│   ├── valueObjects/     # 值对象
│   └── services/         # 领域服务
└── infrastructure/       # 基础设施层 - 外部依赖
    └── repositories/     # 数据仓库
```

### 核心组件

- **领域实体 (Entities)**: Geometry - 几何实体
- **值对象 (Value Objects)**: BufferSettings - 缓冲区设置
- **领域服务 (Domain Services)**: BufferAnalysisService - 缓冲区分析服务
- **应用用例 (Use Cases)**: BufferAnalysisUseCase - 缓冲区分析用例
- **数据仓库 (Repositories)**: LayerRepository - 图层数据仓库

## 功能特性

### 已实现功能

- ✅ **缓冲区分析**: 支持点、线、面要素的缓冲区创建
- ✅ **DDD架构**: 完整的分层架构设计
- ✅ **数据验证**: 使用Joi进行请求参数验证
- ✅ **错误处理**: 统一的错误处理机制
- ✅ **日志记录**: 请求日志和错误日志
- ✅ **模拟数据**: 内置示例图层数据

### 待实现功能

- 🔄 **相交分析**: 两个图层的空间相交计算
- 🔄 **擦除分析**: 图层差集计算
- 🔄 **最短路径分析**: 基于障碍物的路径规划

## 快速开始

### 1. 安装依赖

```bash
cd Backend/analysis
npm install
```

### 2. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

### 3. 测试服务

```bash
# 健康检查
curl http://localhost:3001/health

# 缓冲区分析
curl -X POST http://localhost:8001/api/v1/spatial-analysis/buffer \
  -H "Content-Type: application/json" \
  -d '{
    "sourceLayerId": "wuhan_schools",
    "bufferSettings": {
      "radius": 100,
      "semicircleLineSegment": 10
    }
  }'
```

## API 文档

### 缓冲区分析 API

**端点**: `POST /api/v1/spatial-analysis/buffer`

**请求参数**:
```json
{
  "sourceLayerId": "wuhan_schools",
  "bufferSettings": {
    "radius": 100,
    "semicircleLineSegment": 10
  },
  "featureFilter": {
    "featureIds": ["feature_001"],
    "spatialFilter": {
      "bounds": [114.0, 30.0, 115.0, 31.0]
    }
  },
  "options": {
    "returnGeometry": true,
    "returnProperties": true,
    "resultLayerName": "缓冲区分析结果"
  }
}
```

**参数说明**:
- `sourceLayerId`: 源图层ID（必需）
- `bufferSettings.radius`: 缓冲距离，单位米（必需，范围0.001-100000）
- `bufferSettings.semicircleLineSegment`: 圆弧精度步数（可选，默认10，范围1-64）
- `featureFilter`: 要素过滤条件（可选）
- `options`: 输出选项（可选）

**响应格式**:
```json
{
  "success": true,
  "data": {
    "resultId": "buffer_result_2024-01-01T00:00:00-000Z",
    "resultName": "学校缓冲区分析",
    "sourceLayerName": "武汉市学校",
    "bufferSettings": {
      "radius": 1000,
      "unit": "meters",
      "steps": 8,
      "unionResults": true
    },
    "statistics": {
      "inputFeatureCount": 2,
      "outputFeatureCount": 2,
      "totalArea": 6283185.31,
      "areaUnit": "square_meters"
    },
    "features": [...],
    "executionTime": "0.123s"
  },
  "message": "缓冲区分析执行成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 配置说明

### 环境变量

```bash
# 服务配置
NODE_ENV=development
PORT=3001
API_VERSION=v1

# 请求限制
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# 分析参数限制
MAX_FEATURES_PER_ANALYSIS=10000
MAX_VERTICES_PER_FEATURE=1000
MAX_BUFFER_DISTANCE=100000
MIN_BUFFER_DISTANCE=0.001
```

### 内置示例数据

- `wuhan_schools`: 武汉市学校图层（点要素）
- `wuhan_roads`: 武汉市道路图层（线要素）

## 开发指南

### 添加新的分析功能

1. **领域层**: 创建新的领域服务和值对象
2. **应用层**: 实现用例和DTO
3. **基础设施层**: 添加数据仓库或外部服务
4. **API层**: 创建控制器和路由

### 代码规范

- 使用ES6+语法
- 遵循DDD架构原则
- 完整的错误处理
- 详细的代码注释
- 统一的API响应格式

## 技术栈

- **Node.js**: 18.0.0+
- **Express**: Web框架
- **@turf/turf**: 空间计算库
- **Joi**: 数据验证
- **Winston**: 日志记录
- **Jest**: 单元测试

## 许可证

MIT License
