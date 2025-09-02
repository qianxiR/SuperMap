# SuperMap Backend - 用户认证服务（FastAPI）

<div align="center">

![FastAPI](https://img.shields.io/badge/FastAPI-0.104-green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue)
![Python](https://img.shields.io/badge/Python-3.11-yellow)
![Progress](https://img.shields.io/badge/Progress-60%25-green)

*基于 FastAPI 的用户认证与账号管理后端服务*


</div>

---

## 📋 目录
---

### 🏗️ 系统架构（当前状态）

#### 分层定义与作用
- 接口层 API：对外提供 HTTP/协议接口，负责请求接收、依赖装配、响应序列化与错误映射。
- 应用层 Application：承载用例编排与事务脚本，定义 DTO，组织领域能力与技术实现协作，产出稳定的应用级返回模型。
- 领域层 Domain：封装核心业务模型（实体、值对象、领域服务）与仓储抽象，保持纯粹并独立于具体技术。
- 基础设施层 Infrastructure：实现技术细节与外部系统适配（数据库、缓存、外部服务、消息、观测性等），通过抽象供上层访问。
- 核心横切 Core：配置、日志、安全、异常、容器、数据库会话等技术基座，供各层复用，不承载领域规则。
- 工程配套：文档、脚本、测试、依赖与迁移等工程化支持。

#### 四问四答（按实现落地）
- 1) 基础设施服务实现的具体功能：实现仓储与外部系统适配，提供稳定的技术能力（存取、统计、事务、会话等）。
- 2) 领域层定义的具体规则：以值对象和实体表达业务不变式与约束，领域服务组合规则并依赖仓储抽象。
- 3) 应用层如何编排：用例接收 DTO，执行业务流程（校验、授权、组合领域与仓储），返回统一响应模型。
- 4) API 层如何发送请求及完整链条：HTTP → API 反序列化与依赖装配 → 用例编排 → 领域规则与仓储访问 → 应用装配响应 → API 返回。


#### 依赖方向（技术单向依赖）
- API → Application → Domain(抽象) → Infrastructure(实现)
- Core 为横切，被各层引用；不承载领域逻辑。

#### 技术调用链（纯技术流水）
- HTTP 请求 → `app/api/v1/*`
- DTO 组装 → `app/application/dto/*`
- 用例编排 → `app/application/use_cases/*`
- 领域抽象 & 仓储接口 → `app/domains/*`
- 具体实现访问外部资源 → `app/infrastructure/**`
- 返回结果序列化 → API 层响应

#### 🧱 架构现状总结（基于当前代码）
- API 层：`app/api/v1/**`、`app/main.py`。仅保留用户与健康检查路由（GIS 模块已移除）。
- Application 层：
  - DTO 定义与数据校验（`app/application/dto/**`）。
  - 用例层以 `AuthUseCase` 为核心，负责编排认证流程，并依赖领域服务。
- Domain 层：
  - 用户领域实体与仓储抽象（`app/domains/user/**`）。
  - 领域服务 `UserService` 汇聚通用用户能力（去重校验、资料更新、统计、登录标识查询、最后登录时间更新、密码修改）。
- Infrastructure 层：
  - PostgreSQL 仓储实现（`app/infrastructure/database/postgres/repositories.py`、`models.py`）。
- Core 层：配置/安全/数据库/容器等横切能力（`app/core/**`）。

变更要点（近期）
- 统一依赖注入：API 通过 `app/core/container.py` 的会话态构建器获取用例（`build_auth_use_case(session)`）。
- 用例精简：`AuthUseCase` 改为依赖 `UserService`，去除重复仓储调用与校验代码。
- 移除了 GIS 模块：删除 `app/api/v1/gis/**`、`app/domains/gis/**`、`app/infrastructure/external/supermap/**` 与相关 DTO。

文件组织（关键目录）
```
user/
  api/
    v1/
      __init__.py              # 路由聚合
      health.py                # 健康检查
      user/
        auth.py                # 认证 API（依赖容器用例）
        user_dto.py            # API 层专属 DTO（如有）
  application/
    dto/
      user_dto.py              # 应用层 DTO
    use_cases/
      user/
        auth_use_case.py       # 认证用例（依赖 UserService）
  domains/
    user/
      entities.py              # 用户实体
      repositories.py          # 仓储抽象
      services.py              # 用户领域服务
  infrastructure/
    database/
      postgres/
        models.py              # SQLAlchemy 模型
        repositories.py        # PostgreSQL 仓储实现
    monitoring/                # 监控/日志（如存在）
  core/
    config.py                  # 配置（Pydantic Settings）
    database.py                # 数据库会话（AsyncSession）
    security.py                # 安全/JWT 相关
    container.py               # 依赖注入容器与构建器
  main.py                      # FastAPI 应用入口（用户服务）

analysis/
  api/
    v1/
      analysis/
        analysis.py            # 分析任务 API（创建/查询/列表/状态）
  application/
    dto/
      analysis_dto.py          # 分析 DTO（任务/响应/列表/Geometry）
    use_cases/
      analysis/
        analysis_use_case.py   # 分析用例编排
  domains/
    analysis/
      entities.py              # 实体：AnalysisTask/SuperMapRequest/Result/枚举
      repositories.py          # 仓储抽象（任务/结果/空间数据）
      services.py              # 领域服务（任务生命周期/进度/删除）
  infrastructure/
    database/
      postgres/
        models.py              # ORM 模型（analysis_tasks/analysis_results/...）
        repositories.py        # 仓储实现
    external/
      supermap_service.py      # SuperMap 集成（如有）
  core/
    config.py                  # 分析模块配置（如独立）
    container.py               # 分析用依赖注入
    database.py                # 分析模块数据库（如独立）
  main.py                      # 分析服务入口（如独立运行）

main.py                         # 聚合入口（如有）
requirements.txt                # 依赖
```


### 📚 API文档访问
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **健康检查**: http://localhost:8000/health

#### 📡 API 概览（用户模块）

- `POST /api/v1/user/register` 注册
- `POST /api/v1/user/login` 登录
- `GET /api/v1/user/profile` 获取资料
- `GET /api/v1/user/me` 当前用户信息
- `GET /api/v1/user/stats` 统计
- `POST /api/v1/user/update-profile` 更新资料
- `POST /api/v1/user/change-password` 修改密码
- `POST /api/v1/user/logout` 登出


#### 新功能开发流程

1. **领域建模**: 在 `app/domains/` 定义实体和服务
2. **用例实现**: 在 `app/application/use_cases/` 实现业务逻辑  
3. **基础设施**: 在 `app/infrastructure/` 实现技术细节
4. **API 接口**: 在 `app/api/` 暴露 HTTP 接口
5. **测试用例**: 编写单元和集成测试
6. **文档更新**: 更新 API 文档和部署文档


### 🚀 快速启动

```bash
# 1. 激活环境
conda activate pyside6

# 2. 进入Backend目录
cd Backend

# 3. 启动服务
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### ⚙️ 配置（环境变量）

将必要配置写入系统环境变量或项目根目录 `.env`（优先级：环境变量 > `.env` > 代码默认）：

- 数据库（参考 `app/core/config.py`）
  - `POSTGRES_USER`（默认：postgres）
  - `POSTGRES_PASSWORD`（默认：001117）
  - `POSTGRES_HOST`（默认：localhost）
  - `POSTGRES_PORT`（默认：5432）
  - `POSTGRES_DB`（默认：supermap_gis）
- 安全
  - `SECRET_KEY`（默认见代码，建议覆盖）
  - `ALGORITHM`（默认：HS256）
  - `ACCESS_TOKEN_EXPIRE_MINUTES`（默认：30）

连接串由上述字段拼装：
`postgresql+asyncpg://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}`



### 🔗 相关链接

- [API 文档](http://localhost:8000/docs)
- [FastAPI 文档](https://fastapi.tiangolo.com)
- [SQLAlchemy 文档](https://docs.sqlalchemy.org)

### 👥 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)  
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📜 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。


graph TD
  A["Backend/"]
  A --> B["analysis/"]
  A --> C["user/"]
  A --> H["agent/"]
  A --> D["main.py"]
  A --> E["requirements.txt"]
  A --> F["package.json"]
  A --> G[".cursor/"]