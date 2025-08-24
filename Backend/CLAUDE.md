# SuperMap GIS + AI 后端架构记忆文件

## 🎯 项目概述
基于 FastAPI + LangChain 的多智能体 GIS 系统，采用领域驱动设计(DDD)和清洁架构，集成 SuperMap、知识库和多智能体协作能力。

## 🏗️ 核心架构设计

### 架构层次 (自内向外)
```
┌─────────────────────────────────────────────────────┐
│ API Layer (FastAPI)         - 接口层                │
├─────────────────────────────────────────────────────┤
│ Infrastructure Layer        - 基础设施层            │
├─────────────────────────────────────────────────────┤
│ Application Layer           - 应用层                │
├─────────────────────────────────────────────────────┤
│ Domain Layer (DDD)          - 领域层                │
├─────────────────────────────────────────────────────┤
│ Core Layer                  - 核心层                │
└─────────────────────────────────────────────────────┘
```

### 目录结构核心模块
- `app/core/` - 基础设施配置 (数据库、缓存、安全)
- `app/domains/` - 领域层 (agent, gis, knowledge, user)
- `app/application/` - 应用层 (用例、DTO、事件处理)
- `app/infrastructure/` - 基础设施实现 (AI、数据库、外部服务)
- `app/api/` - API 接口层

## 💾 数据库设计

### 数据存储架构 (优化后 3 层存储)
```
┌─────────────────────────────────────────────────────┐
│ 主库: PostgreSQL + PostGIS                         │
│ ├── users (用户数据)                                 │
│ ├── gis_data (空间数据、几何对象)                     │
│ ├── chat_sessions (对话记录)                         │
│ ├── knowledge_docs (知识库文档元数据)                │
│ └── agent_workflows (智能体工作流)                   │
├─────────────────────────────────────────────────────┤
│ 缓存层: Redis Cluster                              │
│ ├── session:* (用户会话)                            │
│ ├── cache:query:* (查询缓存)                        │
│ ├── agent:status:* (智能体状态)                     │
│ └── task:queue:* (任务队列)                         │
├─────────────────────────────────────────────────────┤
│ 向量存储: Qdrant/Weaviate                          │
│ ├── knowledge_vectors (文档向量)                     │
│ ├── gis_vectors (空间特征向量)                       │
│ └── chat_vectors (对话上下文向量)                    │
└─────────────────────────────────────────────────────┘
```

### 核心数据模型
- **空间数据**: PostGIS geometry/geography 类型
- **向量数据**: 1536维 embedding (OpenAI ada-002)
- **会话数据**: JSON 格式存储对话上下文
- **工作流数据**: 智能体执行状态和结果

## 🤖 多智能体架构 (优化版)

### 3层智能体设计
```
┌─────────────────────────────────────────────────────┐
│                Agent Hub 中心                        │
├─────────────────────────────────────────────────────┤
│  Coordinator     →    Executor      →   Aggregator   │
│  协调智能体           执行智能体         聚合智能体    │
│                                                     │
│  ┌─意图理解─┐        ┌─工具调度─┐       ┌─结果聚合─┐    │
│  │知识检索  │        │并行执行  │       │格式化   │    │
│  │任务规划  │        │状态管理  │       │质量控制  │    │
│  └─────────┘        └─────────┘       └─────────┘    │
└─────────────────────────────────────────────────────┘
```

### Function Calling 工作流
1. **Coordinator** 接收用户输入 → 解析意图 → 生成执行计划
2. **Executor** 根据计划 → 并行调用后端服务 Function
3. **Aggregator** 收集结果 → 智能聚合 → 返回最终答案

### 核心 Function 定义
```python
# GIS 分析工具
gis_buffer_analysis()      # 缓冲区分析
gis_distance_analysis()    # 距离分析  
gis_accessibility_query()  # 可达性分析
gis_spatial_query()        # 空间查询

# 知识库工具
knowledge_search()         # 向量检索
knowledge_document_qa()    # 文档问答
knowledge_summarize()      # 知识总结

# SuperMap 服务
supermap_layer_query()     # 图层查询
supermap_map_service()     # 地图服务
supermap_data_analysis()   # 数据分析
```

## 🔍 RAG 架构 (检索增强生成)

### RAG 流程设计
```
用户查询 → 意图理解 → 知识检索 → 上下文增强 → 服务调度 → 结果生成
    ↓         ↓         ↓         ↓         ↓         ↓
Coordinator → Vector DB → Context → Executor → Backend → Aggregator
```

### 知识库 RAG 实现
- **文档切片**: 512 token chunks, 50 overlap
- **向量化**: OpenAI text-embedding-ada-002
- **检索策略**: 相似度 + 关键词混合检索
- **重排序**: Cross-encoder 重排序 Top-K 结果

### 服务调度 RAG 增强
```python
# RAG 增强的服务调度流程
class RAGEnhancedOrchestrator:
    async def process_query(self, user_query: str):
        # 1. 检索相关知识
        knowledge = await self.knowledge_retrieval(user_query)
        
        # 2. 增强上下文
        enhanced_context = self.enhance_context(user_query, knowledge)
        
        # 3. 智能服务调度
        services = await self.schedule_services(enhanced_context)
        
        # 4. 执行并聚合结果
        results = await self.execute_and_aggregate(services)
        return results
```

## 🛠️ 后端服务定义

### GIS 服务模块 (app/infrastructure/database/postgres/)
- `BufferAnalysisService` - 缓冲区分析
- `DistanceAnalysisService` - 距离计算  
- `AccessibilityService` - 可达性分析
- `SpatialQueryService` - 空间查询
- `GeometryProcessService` - 几何处理

### 知识库服务模块 (app/infrastructure/vector/)
- `VectorSearchService` - 向量检索
- `DocumentService` - 文档管理
- `EmbeddingService` - 向量化服务
- `QAService` - 问答服务

### SuperMap 集成服务 (app/infrastructure/external/supermap/)
- `LayerManagementService` - 图层管理
- `MapService` - 地图服务代理
- `DataAnalysisService` - 数据分析服务

## 📡 API 接口设计

### 核心接口
- `POST /api/v1/agent/chat` - 多智能体对话
- `POST /api/v1/gis/analysis` - GIS 分析服务
- `POST /api/v1/knowledge/search` - 知识检索
- `GET /api/v1/health` - 健康检查

### 智能体对话接口示例
```json
{
  "message": "分析北京市500米内的医院分布",
  "context": {
    "location": "北京市",
    "analysis_type": "buffer_analysis",
    "radius": 500
  },
  "stream": true
}
```

## 🚀 性能优化策略

### 智能体层优化
- 从 4 层减少到 3 层，降低 30% 延迟
- Executor 支持工具并行调用
- 智能缓存中间结果

### 数据库优化
- PostgreSQL 连接池 (10-20 连接)
- Redis 集群模式，读写分离
- 向量数据库索引优化 (HNSW)

### API 优化
- 异步处理长时间任务
- 流式响应支持
- 请求限流和缓存

## 🔧 开发规范

### 代码组织
- 遵循 DDD 领域驱动设计
- 使用依赖注入 (FastAPI Depends)
- 接口与实现分离

### 数据库操作
- 使用 SQLAlchemy 2.0 异步ORM
- 事务管理和连接池
- 空间数据用 GeoAlchemy2

### 测试策略
- 单元测试: 每个领域服务
- 集成测试: API 端到端
- 性能测试: 智能体响应时间

## 🏃‍♂️ 快速开始命令

```bash
# 启动开发环境
docker-compose up -d postgres redis qdrant
python -m uvicorn app.main:app --reload --port 8000

# 数据库迁移
alembic upgrade head

# 运行测试
pytest app/tests/ -v

# 构建生产镜像
docker build -t supermap-backend .
```

## 📝 重要提醒

### 智能体调用流程
1. 所有用户请求通过 `AgentHub` 处理
2. `Coordinator` 负责意图理解和任务分解
3. `Executor` 并行调用具体的后端服务 Function
4. `Aggregator` 聚合结果并格式化返回

### 服务扩展规则
- 新增 GIS 功能在 `app/domains/gis/` 添加领域服务
- 新增 API 在 `app/api/v1/` 对应模块添加路由
- Function Calling 工具在 `app/infrastructure/ai/tools/` 定义

### 监控要点
- 智能体响应时间 < 3秒
- 数据库连接池使用率 < 80%
- Redis 内存使用率 < 70%
- API 错误率 < 1%


  Backend/
  ├── app/
  │   ├── __init__.py
  │   ├── main.py                           # FastAPI应用入口
  │   │
  │   ├── core/                             # 核心基础设施
  │   │   ├── __init__.py
  │   │   ├── config.py                     # 统一配置管理
  │   │   ├── database.py                   # 数据库连接池
  │   │   ├── cache.py                      # Redis缓存
  │   │   ├── security.py                   # 安全相关
  │   │   ├── exceptions.py                 # 异常处理
  │   │   ├── logging.py                    # 日志配置
  │   │   └── middleware.py                 # 中间件
  │   │
  │   ├── domains/                          # 领域层(DDD)
  │   │   ├── __init__.py
  │   │   │
  │   │   ├── agent/                        # 智能体域
  │   │   │   ├── __init__.py
  │   │   │   ├── entities.py               # 实体定义
  │   │   │   ├── value_objects.py          # 值对象
  │   │   │   ├── repositories.py           # 仓储接口
  │   │   │   ├── services.py               # 领域服务
  │   │   │   └── events.py                 # 领域事件
  │   │   │
  │   │   ├── gis/                          # GIS域
  │   │   │   ├── __init__.py
  │   │   │   ├── entities.py
  │   │   │   ├── value_objects.py
  │   │   │   ├── repositories.py
  │   │   │   └── services.py
  │   │   │
  │   │   ├── knowledge/                    # 知识库域
  │   │   │   ├── __init__.py
  │   │   │   ├── entities.py
  │   │   │   ├── value_objects.py
  │   │   │   ├── repositories.py
  │   │   │   └── services.py
  │   │   │
  │   │   └── user/                         # 用户域
  │   │       ├── __init__.py
  │   │       ├── entities.py
  │   │       ├── value_objects.py
  │   │       ├── repositories.py
  │   │       └── services.py
  │   │
  │   ├── application/                      # 应用层
  │   │   ├── __init__.py
  │   │   ├── dto/                          # 数据传输对象
  │   │   │   ├── __init__.py
  │   │   │   ├── agent_dto.py
  │   │   │   ├── gis_dto.py
  │   │   │   ├── knowledge_dto.py
  │   │   │   └── user_dto.py
  │   │   │
  │   │   ├── use_cases/                    # 用例层
  │   │   │   ├── __init__.py
  │   │   │   ├── agent/
  │   │   │   │   ├── __init__.py
  │   │   │   │   ├── chat_use_case.py
  │   │   │   │   └── workflow_use_case.py
  │   │   │   ├── gis/
  │   │   │   │   ├── __init__.py
  │   │   │   │   ├── analysis_use_case.py
  │   │   │   │   └── query_use_case.py
  │   │   │   ├── knowledge/
  │   │   │   │   ├── __init__.py
  │   │   │   │   ├── search_use_case.py
  │   │   │   │   └── document_use_case.py
  │   │   │   └── user/
  │   │   │       ├── __init__.py
  │   │   │       ├── auth_use_case.py
  │   │   │       └── profile_use_case.py
  │   │   │
  │   │   └── handlers/                     # 事件处理器
  │   │       ├── __init__.py
  │   │       ├── agent_handlers.py
  │   │       ├── gis_handlers.py
  │   │       └── notification_handlers.py
  │   │
  │   ├── infrastructure/                   # 基础设施层
  │   │   ├── __init__.py
  │   │   │
  │   │   ├── ai/                           # AI基础设施
  │   │   │   ├── __init__.py
  │   │   │   ├── agent_hub.py              # 优化后的智能体中心
  │   │   │   ├── coordinator.py            # 协调智能体
  │   │   │   ├── executor.py               # 执行智能体  
  │   │   │   ├── aggregator.py             # 聚合智能体
  │   │   │   ├── tools/                    # 工具集
  │   │   │   │   ├── __init__.py
  │   │   │   │   ├── gis_tools.py
  │   │   │   │   ├── knowledge_tools.py
  │   │   │   │   └── analysis_tools.py
  │   │   │   └── prompts/                  # 提示词库
  │   │   │       ├── __init__.py
  │   │   │       ├── coordinator_prompts.py
  │   │   │       ├── executor_prompts.py
  │   │   │       └── aggregator_prompts.py
  │   │   │
  │   │   ├── database/                     # 数据访问层
  │   │   │   ├── __init__.py
  │   │   │   ├── postgres/
  │   │   │   │   ├── __init__.py
  │   │   │   │   ├── connection.py
  │   │   │   │   ├── models.py
  │   │   │   │   └── repositories.py
  │   │   │   ├── redis/
  │   │   │   │   ├── __init__.py
  │   │   │   │   ├── connection.py
  │   │   │   │   └── cache_service.py
  │   │   │   └── vector/
  │   │   │       ├── __init__.py
  │   │   │       ├── qdrant_client.py
  │   │   │       └── vector_service.py
  │   │   │
  │   │   ├── external/                     # 外部服务集成
  │   │   │   ├── __init__.py
  │   │   │   ├── supermap/
  │   │   │   │   ├── __init__.py
  │   │   │   │   ├── client.py
  │   │   │   │   ├── layer_service.py
  │   │   │   │   └── map_service.py
  │   │   │   └── llm/
  │   │   │       ├── __init__.py
  │   │   │       ├── openai_client.py
  │   │   │       └── embedding_client.py
  │   │   │
  │   │   └── monitoring/                   # 监控基础设施
  │   │       ├── __init__.py
  │   │       ├── metrics.py                # 指标收集
  │   │       ├── health_check.py           # 健康检查
  │   │       └── tracing.py                # 分布式追踪
  │   │
  │   ├── api/                              # 接口层
  │   │   ├── __init__.py
  │   │   ├── dependencies.py               # 依赖注入
  │   │   ├── middleware.py                 # API中间件
  │   │   │
  │   │   └── v1/                           # API版本1
  │   │       ├── __init__.py
  │   │       ├── agent/
  │   │       │   ├── __init__.py
  │   │       │   ├── chat.py
  │   │       │   └── workflow.py
  │   │       ├── gis/
  │   │       │   ├── __init__.py
  │   │       │   ├── analysis.py
  │   │       │   └── query.py
  │   │       ├── knowledge/
  │   │       │   ├── __init__.py
  │   │       │   ├── search.py
  │   │       │   └── documents.py
  │   │       ├── user/
  │   │       │   ├── __init__.py
  │   │       │   ├── auth.py
  │   │       │   └── profile.py
  │   │       └── health.py                 # 健康检查接口
  │   │
  │   └── tests/                            # 测试
  │       ├── __init__.py
  │       ├── conftest.py
  │       ├── unit/                         # 单元测试
  │       ├── integration/                  # 集成测试
  │       └── e2e/                          # 端到端测试
  │
  ├── migrations/                           # 数据库迁移
  ├── docker/                               # 容器配置
  ├── scripts/                              # 脚本工具
  ├── requirements.txt
  ├── pyproject.toml                        # 项目配置
  ├── Dockerfile
  ├── docker-compose.yml
  └── README.md
