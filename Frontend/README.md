# 🗺️ 智能城市地图分析系统

> 基于 Vue 3 + SuperMap iServer 的现代化 WebGIS 应用，集成 AI 助手与传统 GIS 分析功能

[![Vue](https://img.shields.io/badge/Vue-3.5.18-4FC08D?logo=vue.js)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.0.6-646CFF?logo=vite)](https://vitejs.dev/)
[![SuperMap](https://img.shields.io/badge/SuperMap-iServer-00A0E9)](https://www.supermap.com/)

## 📋 目录

- [项目概述](#项目概述)
- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [使用指南](#使用指南)
- [开发指南](#开发指南)
- [测试](#测试)
- [部署](#部署)
- [贡献指南](#贡献指南)

## 🎯 项目概述

智能城市地图分析系统是一个现代化的 WebGIS 应用，集成了传统 GIS 分析功能与 AI 智能助手。系统采用双模式设计，为用户提供灵活的地图分析体验。

### 核心特性

- **双模式设计**: LLM 智能模式 + 传统 GIS 模式
- **实时地图交互**: 基于 OpenLayers 的高性能地图渲染
- **智能分析工具**: 缓冲区、距离、可达性等空间分析
- **AI 助手集成**: 自然语言交互的地图操作
- **响应式界面**: 现代化 UI 设计，支持主题切换

## ✨ 功能特性

### 🧠 LLM 智能模式
- **自然语言交互**: 通过聊天界面操作地图
- **智能要素识别**: AI 辅助的要素查询与选择
- **上下文感知**: 基于地图状态的智能建议
- **多轮对话**: 支持复杂的地图分析任务

### 🛠️ 传统 GIS 模式
- **图层管理**: 完整的图层控制与样式设置
- **要素查询**: 属性查询与空间查询
- **空间分析**: 
  - 缓冲区分析
  - 距离分析
  - 可达性分析
- **编辑工具**: 要素创建、修改、删除

### 🎨 用户界面
- **响应式设计**: 适配各种屏幕尺寸
- **主题切换**: 明暗主题自动切换
- **通知系统**: 实时操作反馈
- **状态管理**: 完整的应用状态持久化

## 🛠️ 技术栈

### 前端框架
- **Vue 3.5.18**: 渐进式 JavaScript 框架
- **TypeScript 5.9.2**: 类型安全的 JavaScript
- **Vite 7.0.6**: 下一代前端构建工具

### 状态管理
- **Pinia 3.0.3**: Vue 官方推荐的状态管理库

### 地图引擎
- **OpenLayers 10.6.1**: 开源地图库
- **SuperMap iServer**: 企业级 GIS 服务

### UI 组件
- **Ant Design Vue 4.2.6**: 企业级 UI 组件库
- **Splitpanes 4.0.4**: 可拖拽分割面板

### 路由管理
- **Vue Router 4.5.1**: Vue.js 官方路由管理器

## 📁 项目结构

```
src/
├── api/                    # API 接口层
│   ├── supermap.ts        # SuperMap 服务接口
│   ├── analysis.ts        # 分析服务接口
│   └── config.ts          # API 配置
├── components/            # 组件库
│   ├── Layout/           # 布局组件
│   ├── Map/              # 地图组件
│   └── UI/               # 通用 UI 组件
├── composables/          # 组合式函数
│   ├── useMap.ts         # 地图相关逻辑
│   ├── useLayerManager.ts # 图层管理
│   └── ...               # 其他业务逻辑
├── stores/               # 状态管理
│   ├── mapStore.ts       # 地图状态
│   ├── userStore.ts      # 用户状态
│   └── ...               # 其他状态
├── views/                # 页面组件
│   ├── auth/             # 认证页面
│   ├── dashboard/        # 主界面
│   └── ...               # 其他页面
├── router/               # 路由配置
├── styles/               # 样式文件
├── types/                # TypeScript 类型定义
└── utils/                # 工具函数
```

## 🚀 快速开始

### 环境要求

- Node.js >= 20.19.0 或 >= 22.12.0
- npm >= 8.0.0

### 安装依赖

```bash
# 克隆项目
git clone <repository-url>
cd Frontend

# 安装依赖
npm install
```

### 开发环境

```bash
# 启动开发服务器
npm run dev

# 访问应用
# http://localhost:5173
```

### 生产构建

```bash
# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 📖 使用指南

### 1. 用户认证

1. 访问应用首页，自动跳转到登录页面
2. 输入用户名和密码进行登录
3. 首次使用可点击"注册"创建新账户

### 2. LLM 智能模式

1. 登录后默认进入 LLM 模式
2. 在聊天界面输入自然语言指令
3. AI 助手将解析指令并执行相应操作
4. 支持复杂的地图分析任务

**示例指令:**
- "显示所有学校"
- "分析距离地铁站 500 米内的建筑"
- "计算从 A 点到 B 点的最短路径"

### 3. 传统 GIS 模式

1. 点击模式切换按钮进入传统模式
2. 使用工具栏选择分析功能：
   - **图层管理**: 控制图层显示与样式
   - **要素查询**: 按属性或空间条件查询
   - **缓冲区分析**: 创建指定距离的缓冲区
   - **距离分析**: 计算两点间距离
   - **泰森多边形**: 以点代面
   - **图层编辑**: 创建和编辑要素

### 4. 地图交互

- **平移**: 鼠标拖拽
- **缩放**: 鼠标滚轮或缩放控件
- **选择**: 点击选择要素
- **测量**: 使用测量工具

## 🔧 开发指南

### 代码规范

- 使用 TypeScript 进行类型检查
- 遵循 Vue 3 Composition API 规范
- 组件采用 `<script setup>` 语法
- 使用 ESLint 和 Prettier 保持代码风格

### 状态管理

项目使用 Pinia 进行状态管理，主要状态包括：

- `mapStore`: 地图相关状态
- `userStore`: 用户认证状态
- `analysisStore`: 分析工具状态
- `selectionStore`: 要素选择状态

### 组件开发

1. 在 `src/components/` 下创建新组件
2. 使用 TypeScript 定义 Props 和 Emits
3. 遵循单一职责原则
4. 添加适当的注释和文档

### API 集成

- API 接口定义在 `src/api/` 目录
- 使用统一的错误处理机制
- 支持请求重试和超时处理
- 遵循 RESTful 设计原则

## 🧪 测试

### 运行测试

```bash
# 路由测试
npm run test:routing

# 构建测试
npm run test:build

# 运行所有测试
npm run test:all

# 监听模式
npm run test:watch
```

### 测试覆盖

- ✅ 路由配置验证
- ✅ 组件文件存在性检查
- ✅ 构建流程测试
- ✅ 手动测试清单

详细测试指南请参考 [TESTING.md](./TESTING.md)

## 🚀 部署

### 构建生产版本

```bash
npm run build
```

构建产物位于 `dist/` 目录

### 部署配置

1. 配置 Web 服务器（Nginx/Apache）
2. 设置反向代理到 SuperMap iServer
3. 配置 HTTPS 证书
4. 设置环境变量

### 环境变量

详细的环境变量配置说明请参考 [ENV_CONFIG.md](./ENV_CONFIG.md)

#### 基础配置示例

```bash
# SuperMap iServer 服务地址
VITE_SUPERMAP_BASE_URL=http://localhost:8090

# 地图服务路径
VITE_SUPERMAP_MAP_SERVICE=iserver/services/map-WuHan/rest

# 数据服务路径
VITE_SUPERMAP_DATA_SERVICE=iserver/services/data-WuHan/rest/data

# 工作空间和地图名称
VITE_SUPERMAP_WORKSPACE=wuhan
VITE_SUPERMAP_MAP_NAME=武汉

# 地图边界配置（可选）
VITE_SUPERMAP_MAP_EXTENT=113.7,29.97,115.08,31.36
VITE_SUPERMAP_MAP_CENTER=114.37,30.69
VITE_SUPERMAP_MAP_ZOOM=8

# API 配置
VITE_API_TIMEOUT=10000
VITE_API_RETRY_COUNT=3
```

#### 快速切换服务配置

要使用不同的 SuperMap 服务，只需修改环境变量：

```bash
# 使用 data-WuHan 服务
VITE_SUPERMAP_DATA_SERVICE=iserver/services/data-WuHan/rest/data

# 使用 data-guanlifenxipingtai 服务（默认）
VITE_SUPERMAP_DATA_SERVICE=iserver/services/data-guanlifenxipingtai/rest/data
```

## 🤝 贡献指南

### 开发流程

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 代码审查

- 所有代码变更需要经过审查
- 确保测试通过
- 遵循项目代码规范
- 添加必要的文档

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 📞 支持

如有问题或建议，请通过以下方式联系：

- 提交 Issue
- 发送邮件至项目维护者
- 查看项目文档

---

**开发团队**: qianxi
**最后更新**: 2025年9月  
**版本**: 1.0.0
