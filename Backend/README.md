# SuperMap GIS + AI 智能分析系统 - 后端

<div align="center">

![SuperMap](https://img.shields.io/badge/SuperMap-GIS-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104-green)
![LangChain](https://img.shields.io/badge/LangChain-0.1-orange)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue)
![Python](https://img.shields.io/badge/Python-3.11-yellow)
![Progress](https://img.shields.io/badge/Progress-35%25-orange)

*基于多智能体协作的 GIS 智能分析平台后端服务*

**当前状态**: 🚧 Phase 1 开发中 | **完成度**: 35% | **总文件**: 94个

</div>

---

## 📋 目录

- [🎯 项目概述](#-项目概述)
- [🏗️ 系统架构](#️-系统架构)
- [📊 开发进度](#-开发进度)
- [🚀 快速开始](#-快速开始)
- [🧪 API测试指南](#-api测试指南)
- [🗺️ 核心功能](#️-核心功能)
- [📈 性能监控](#-性能监控)
- [🛠️ 开发指南](#️-开发指南)
- [🔗 相关链接](#-相关链接)

---

## 🎯 项目概述

本项目为**基于GIS-A2A的智能化城市管理分析平台**的后端服务，采用现代化微服务架构，为前端Vue.js应用提供完整的API支持。

### 🎨 架构设计理念

在 **DDD（领域驱动设计）+ 清洁架构** 思想下，系统采用四层架构模式，通过"内层定义规则、外层提供支撑"的协作模式，实现系统的"业务稳定性"与"技术灵活性"。

#### 🔵 领域层（Domain Layer）- 业务"宪法"
**核心作用**: 封装业务领域的"本质逻辑"，是系统的"灵魂"

**具体职责**:
- **定义核心业务概念**: 如"空间要素"、"用户"、"坐标"等实体和值对象
- **制定不可违背的业务规则**: 如"缓冲区半径必须>0"、"用户名必须唯一"
- **抽象数据操作接口**: 规定"需要对数据做什么"，但不涉及"如何做"

**价值**: 确保业务逻辑的稳定性，无论技术框架如何变化，核心业务规则不变

#### 🟢 应用层（Application Layer）- 业务"流程经理"
**核心作用**: 作为领域层与外部的"桥梁"，负责业务流程编排

**具体职责**:
- **串联领域层组件**: 将实体、服务、仓储接口组合完成完整业务用例
- **处理跨领域协作**: 协调多个领域（如GIS域、知识域、用户域）的协作
- **定义输入输出格式**: 通过DTO隔离外部请求与领域层实体

**价值**: 让领域层专注于"核心规则"，应用层专注于"流程落地"

#### 🟡 API层（API Layer）- 系统"对外窗口"
**核心作用**: 系统与外部交互接口，负责"请求入站"和"响应出站"

**具体职责**:
- **定义API资源**: 通过接口端点暴露系统能力
- **处理请求细节**: 参数验证、JWT解析、HTTP方法处理
- **转换响应格式**: 将结果整理为前端需要的JSON结构

**价值**: 隔离外部交互细节，让内层专注于业务逻辑

#### 🔴 基础设施层（Infrastructure Layer）- 系统"技术工具集"
**核心作用**: 为所有内层提供技术支持，屏蔽具体技术实现细节

**具体职责**:
- **实现数据访问**: 用具体数据库实现数据查询、存储
- **封装外部服务**: 将第三方服务封装为系统内部可用工具
- **提供通用技术能力**: 日志、监控、安全等非业务技术需求

**价值**: 隔离技术细节，技术变更不影响内层业务逻辑

### 🎨 与前端功能对应

| 前端功能模块 | 后端服务支持 | 实现状态 |
|-------------|-------------|----------|
| **🤖 LLM智能模式** | `app/infrastructure/ai/` + `app/api/v1/agent/` | ⏳ Phase 3 |
| **🗺️ 传统GIS模式** | `app/api/v1/gis/` + `app/domains/gis/` | 🔥 Phase 1 |
| **👥 用户认证系统** | `app/api/v1/user/` + `app/core/security.py` | ✅ 已完成 |
| **📊 空间分析功能** | `app/application/use_cases/gis/` | ⏳ 待开始 |
| **💬 智能对话助手** | `app/infrastructure/ai/agent_hub.py` | ⏳ Phase 3 |
| **🗃️ 数据持久化** | `app/infrastructure/database/` | ⏳ Phase 2 |

---

## 🏗️ 系统架构

### 🔄 整体架构图

```mermaid
graph TB
    A[用户请求] --> B[FastAPI Gateway]
    B --> C[Agent Hub]
    C --> D[Coordinator Agent]
    C --> E[Executor Agent] 
    C --> F[Aggregator Agent]
    
    D --> G[知识库检索]
    E --> H[GIS Services]
    E --> I[SuperMap Services]
    E --> J[Knowledge Services]
    
    H --> K[(PostgreSQL + PostGIS)]
    I --> L[SuperMap iServer]
    J --> M[(Vector Database)]
    
    F --> N[结果聚合]
    N --> O[用户响应]
    
    style C fill:#e1f5fe
    style K fill:#c8e6c9
    style M fill:#fff3e0
```

### 📁 项目文件架构

```
Backend/
├── app/
│   ├── main.py                           # FastAPI应用入口
│   │
│   ├── core/                             # 核心基础设施
│   │   ├── config.py                     # 统一配置管理
│   │   ├── database.py                   # 数据库连接池
│   │   ├── cache.py                      # Redis缓存
│   │   ├── security.py                   # 安全相关
│   │   ├── exceptions.py                 # 异常处理
│   │   ├── logging.py                    # 日志配置
│   │   └── middleware.py                 # 中间件
│   │
│   ├── domains/                          # 领域层(DDD)
│   │   ├── agent/                        # 智能体域
│   │   │   ├── entities.py               # 实体定义
│   │   │   ├── value_objects.py          # 值对象
│   │   │   ├── repositories.py           # 仓储接口
│   │   │   ├── services.py               # 领域服务
│   │   │   └── events.py                 # 领域事件
│   │   │
│   │   ├── gis/                          # GIS域
│   │   │   ├── entities.py
│   │   │   ├── value_objects.py
│   │   │   ├── repositories.py
│   │   │   └── services.py
│   │   │
│   │   ├── knowledge/                    # 知识库域
│   │   │   ├── entities.py
│   │   │   ├── value_objects.py
│   │   │   ├── repositories.py
│   │   │   └── services.py
│   │   │
│   │   └── user/                         # 用户域
│   │       ├── entities.py
│   │       ├── value_objects.py
│   │       ├── repositories.py
│   │       └── services.py
│   │
│   ├── application/                      # 应用层
│   │   ├── dto/                          # 数据传输对象
│   │   │   ├── agent_dto.py
│   │   │   ├── gis_dto.py
│   │   │   ├── knowledge_dto.py
│   │   │   └── user_dto.py
│   │   │
│   │   ├── use_cases/                    # 用例层
│   │   │   ├── agent/
│   │   │   │   ├── chat_use_case.py
│   │   │   │   └── workflow_use_case.py
│   │   │   ├── gis/
│   │   │   │   ├── analysis_use_case.py
│   │   │   │   └── query_use_case.py
│   │   │   ├── knowledge/
│   │   │   │   ├── search_use_case.py
│   │   │   │   └── document_use_case.py
│   │   │   └── user/
│   │   │       ├── auth_use_case.py
│   │   │       └── profile_use_case.py
│   │   │
│   │   └── handlers/                     # 事件处理器
│   │       ├── agent_handlers.py
│   │       ├── gis_handlers.py
│   │       └── notification_handlers.py
│   │
│   ├── infrastructure/                   # 基础设施层
│   │   ├── ai/                           # AI基础设施
│   │   │   ├── agent_hub.py              # 智能体中心
│   │   │   ├── coordinator.py            # 协调智能体
│   │   │   ├── executor.py               # 执行智能体  
│   │   │   ├── aggregator.py             # 聚合智能体
│   │   │   ├── tools/                    # 工具集
│   │   │   │   ├── gis_tools.py
│   │   │   │   ├── knowledge_tools.py
│   │   │   │   └── analysis_tools.py
│   │   │   └── prompts/                  # 提示词库
│   │   │       ├── coordinator_prompts.py
│   │   │       ├── executor_prompts.py
│   │   │       └── aggregator_prompts.py
│   │   │
│   │   ├── database/                     # 数据访问层
│   │   │   ├── postgres/
│   │   │   │   ├── connection.py
│   │   │   │   ├── models.py
│   │   │   │   └── repositories.py
│   │   │   ├── redis/
│   │   │   │   ├── connection.py
│   │   │   │   └── cache_service.py
│   │   │   └── vector/
│   │   │       ├── qdrant_client.py
│   │   │       └── vector_service.py
│   │   │
│   │   ├── external/                     # 外部服务集成
│   │   │   ├── supermap/
│   │   │   │   ├── client.py
│   │   │   │   ├── layer_service.py
│   │   │   │   └── map_service.py
│   │   │   └── llm/
│   │   │       ├── openai_client.py
│   │   │       └── embedding_client.py
│   │   │
│   │   └── monitoring/                   # 监控基础设施
│   │       ├── metrics.py                # 指标收集
│   │       ├── health_check.py           # 健康检查
│   │       └── tracing.py                # 分布式追踪
│   │
│   ├── api/                              # 接口层
│   │   ├── dependencies.py               # 依赖注入
│   │   ├── middleware.py                 # API中间件
│   │   │
│   │   └── v1/                           # API版本1
│   │       ├── agent/
│   │       │   ├── chat.py
│   │       │   └── workflow.py
│   │       ├── gis/
│   │       │   ├── analysis.py
│   │       │   └── query.py
│   │       ├── knowledge/
│   │       │   ├── search.py
│   │       │   └── documents.py
│   │       ├── user/
│   │       │   ├── auth.py
│   │       │   └── profile.py
│   │       └── health.py                 # 健康检查接口
│   │
│   └── tests/                            # 测试
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
```

### 🛠️ 技术栈

| 分层 | 技术选型 | 说明 |
|------|----------|------|
| **API 层** | FastAPI + Uvicorn | 高性能异步 Web 框架 |
| **智能体层** | LangChain + OpenAI | 多智能体协作框架 |
| **应用层** | Python 3.11 + Pydantic | 业务逻辑 + 数据验证 |
| **数据层** | PostgreSQL + PostGIS | 关系型 + 空间数据库 |
| **缓存层** | Redis Cluster | 分布式缓存 |
| **向量层** | Qdrant/Weaviate | 向量数据库 |
| **监控** | Prometheus + Grafana | 系统监控 |

---

## 📊 开发进度

### 🔥 当前阶段: Phase 1 - 传统模式API实现
**目标**: 实现前端传统模式下所有GIS功能的后端API支持

#### 📈 进度概览
- **总体进度**: 35% (35/100)
- **Phase 1 进度**: 60% (9/15)
- **预计完成时间**: 3天内

#### ✅ 已完成 (8项)
- [x] **项目架构设计** - 完整的DDD+清洁架构设计 ✅
- [x] **目录结构搭建** - 94个文件的完整项目结构 ✅
- [x] **用户认证系统** - JWT认证机制实现 ✅ 100%
- [x] **基础API框架** - FastAPI应用入口和中间件 ✅ 100%
- [x] **依赖注入模块** - 用户认证和权限控制依赖 ✅ 100%
- [x] **用户DTO重构** - 专门的DTO文件分离 ✅ 100%
- [x] **API文档编写** - 完整的用户认证API文档 ✅ 100%
- [x] **编码问题修复** - 修复所有中文编码和类型错误 ✅ 100%

#### 🔄 进行中 (1项)
- [ ] **SuperMap客户端** - SuperMap服务集成封装 ⏳ 20%

#### ⏳ 本周计划 (6项)
- [ ] **SuperMap客户端** - SuperMap服务集成封装
- [ ] **图层管理API** - 图层CRUD、显示控制
- [ ] **空间分析API** - 缓冲区、距离、可达性分析
- [ ] **要素查询API** - 属性查询、空间查询
- [ ] **配置管理系统** - 环境变量、配置文件
- [ ] **异常处理机制** - 统一错误处理

### 📊 详细进度跟踪

| 阶段 | 任务 | 状态 | 进度 | 负责人 | 截止时间 |
|------|------|------|------|--------|----------|
| **Phase 1.1** | 用户认证系统 | ✅ 已完成 | 100% | Dev Team | 已完成 |
| **Phase 1.2** | 基础API框架 | ✅ 已完成 | 100% | Dev Team | 已完成 |
| **Phase 1.3** | 依赖注入模块 | ✅ 已完成 | 100% | Dev Team | 已完成 |
| **Phase 1.4** | SuperMap服务代理 | 🔄 进行中 | 20% | Dev Team | 本周五 |
| **Phase 1.5** | GIS核心功能API | ⏳ 待开始 | 0% | Dev Team | 下周二 |
| **Phase 2.1** | 数据库架构设计 | ⏳ 待开始 | 0% | DB Team | 2周内 |
| **Phase 3.1** | 多智能体系统 | ⏳ 待开始 | 0% | AI Team | 4周内 |

### 🎯 本周重点目标
1. **✅ 用户认证系统已完成** - 支持前端登录注册功能
2. **✅ 基础API框架已完成** - FastAPI应用基础结构
3. **开始SuperMap集成** - SuperMap服务客户端封装
4. **开始GIS功能开发** - 图层管理API实现

**📋 查看完整开发路线图**: [PROJECT_PROGRESS.md](./PROJECT_PROGRESS.md)

### 🎉 最新完成功能 (2024-01-15)

#### ✅ **用户认证系统完整实现**
- **8个API端点**: 注册、登录、资料管理、密码修改等
- **完整文档**: 详细API文档和快速参考指南
- **DTO重构**: 专门的用户数据传输对象
- **依赖注入**: 统一的认证和权限控制
- **编码修复**: 解决所有中文编码和类型错误

#### ✅ **技术栈完善**
- **JWT认证**: python-jose + passlib 完整集成
- **类型安全**: 完整的类型注解和验证
- **错误处理**: 统一的HTTP错误响应
- **文档生成**: 自动生成Swagger/OpenAPI文档

#### 🔄 **当前进行中**
- **SuperMap集成**: 开始SuperMap服务客户端封装
- **GIS功能**: 准备开发图层管理和空间分析API

---

## 🚀 快速开始

### 1. 环境要求

- Python 3.11+
- Docker & Docker Compose
- PostgreSQL 15+ (with PostGIS)
- Redis 7+
- Git

### 2. 项目设置

```bash
# 1. 克隆项目
git clone <repository-url>
cd SuperMap/Backend

# 2. 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. 安装依赖
pip install -r requirements.txt

# 4. 复制环境变量
cp .env.example .env
# 编辑 .env 文件，配置数据库和 API 密钥
```

### 3. 启动服务

```bash
# 启动数据库服务
docker-compose up -d postgres redis qdrant

# 数据库迁移
alembic upgrade head

# 启动开发服务器
python -m uvicorn app.main:app --reload --port 8000
```

### 4. 验证部署

```bash
# 健康检查
curl http://localhost:8000/api/v1/health

# API 文档
open http://localhost:8000/docs
```

---

## 🧪 API测试指南

### 🚀 快速启动

```bash
# 1. 激活环境
conda activate pyside6

# 2. 进入Backend目录
cd Backend

# 3. 启动服务
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 📚 API文档访问
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **健康检查**: http://localhost:8000/health

### 🔐 用户认证API测试

#### 1. 用户注册
```bash
curl -X POST "http://localhost:8000/api/v1/user/register" \
  -H "Content-Type: application/jso

## 🏭 部署配置

### Docker 生产环境

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  backend:
    build: 
      context: .
      dockerfile: Dockerfile.prod
    environment:
      - ENVIRONMENT=production
      - DATABASE_URL=postgresql://...
      - REDIS_URL=redis://...
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '2'
          memory: 4G
```

### Kubernetes 部署

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: supermap-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: supermap-backend
  template:
    spec:
      containers:
      - name: backend
        image: supermap/backend:latest
        resources:
          requests:
            memory: "2Gi"
            cpu: "1"
          limits:
            memory: "4Gi"
            cpu: "2"
```

## 📈 性能监控

### 关键指标

| 指标类型 | 目标值 | 监控方式 |
|----------|--------|----------|
| **API 响应时间** | P95 < 500ms | Prometheus + Grafana |
| **智能体处理时间** | P95 < 3s | 自定义 Metrics |
| **数据库连接** | 使用率 < 80% | PostgreSQL Exporter |
| **缓存命中率** | > 90% | Redis Metrics |
| **向量检索延迟** | P99 < 100ms | Qdrant Metrics |

### 告警规则

```yaml
# prometheus/alerts.yml
groups:
- name: supermap-backend
  rules:
  - alert: HighResponseTime
    expr: histogram_quantile(0.95, http_request_duration_seconds) > 0.5
    for: 2m
    
  - alert: DatabaseConnectionHigh  
    expr: pg_stat_activity_count / pg_settings_max_connections > 0.8
    for: 5m
```

## 🧪 测试

### 运行测试

```bash
# 单元测试
pytest app/tests/unit/ -v

# 集成测试  
pytest app/tests/integration/ -v

# 端到端测试
pytest app/tests/e2e/ -v

# 性能测试
locust -f tests/performance/locustfile.py --host=http://localhost:8000
```

### 测试覆盖率

```bash
# 生成覆盖率报告
pytest --cov=app --cov-report=html
open htmlcov/index.html
```

## 🛠️ 开发指南

### 项目结构

```
Backend/
├── app/
│   ├── core/                 # 核心配置
│   ├── domains/              # 领域模型 (DDD)
│   │   ├── agent/           # 智能体域
│   │   ├── gis/             # GIS 域
│   │   ├── knowledge/       # 知识库域
│   │   └── user/            # 用户域
│   ├── application/          # 应用层
│   │   ├── use_cases/       # 用例
│   │   ├── dto/             # 数据传输对象
│   │   └── handlers/        # 事件处理
│   ├── infrastructure/       # 基础设施
│   │   ├── ai/              # AI 服务
│   │   ├── database/        # 数据访问
│   │   └── external/        # 外部集成
│   └── api/                 # API 层
├── migrations/              # 数据库迁移
└── tests/                   # 测试用例
```

### 代码规范

```bash
# 代码格式化
black app/
isort app/

# 类型检查
mypy app/

# 代码质量检查  
flake8 app/
pylint app/
```

### 新功能开发流程

1. **领域建模**: 在 `app/domains/` 定义实体和服务
2. **用例实现**: 在 `app/application/use_cases/` 实现业务逻辑  
3. **基础设施**: 在 `app/infrastructure/` 实现技术细节
4. **API 接口**: 在 `app/api/` 暴露 HTTP 接口
5. **测试用例**: 编写单元和集成测试
6. **文档更新**: 更新 API 文档和部署文档

## 🔗 相关链接

- [API 文档](http://localhost:8000/docs)
- [SuperMap 官网](https://www.supermap.com)
- [LangChain 文档](https://python.langchain.com)
- [FastAPI 文档](https://fastapi.tiangolo.com)
- [PostGIS 文档](https://postgis.net)

## 👥 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)  
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📜 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📞 支持

如有问题或建议，请：

- 创建 [Issue](../../issues)
- 发送邮件至: [your-email@example.com](mailto:your-email@example.com)
- 加入我们的 [Discord](https://discord.gg/your-invite) 社区

---

<div align="center">
Made with ❤️ by SuperMap GIS Team
</div>