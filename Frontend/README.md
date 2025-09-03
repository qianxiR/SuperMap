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
  - 最短路径分析
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
├── api/                        # API 接口层（统一请求封装与后端交互）
│   ├── analysis.ts             # 空间分析相关接口（缓冲区/最短路径/叠加）
│   ├── supermap.ts             # SuperMap iServer 相关接口封装
│   ├── user.ts                 # 用户/认证相关接口
│   └── config.ts               # Axios 实例、拦截器、基础配置
│
├── components/                 # 通用组件库（仅组合 UI，不含业务）
│   ├── Layout/                 # 布局组件
│   │   ├── AppHeader.vue       # 顶部导航栏
│   │   ├── AppSidebar.vue      # 侧边栏/工具栏容器
│   │   └── AppMain.vue         # 主内容区域容器
│   ├── Map/                    # 地图基础组件
│   │   ├── MapContainer.vue    # 地图容器（挂载 OpenLayers 地图）
│   │   ├── LayerManager.vue    # 图层管理面板（显示/顺序/样式）
│   │   └── Controls.vue        # 地图控件（缩放/比例尺/定位）
│   └── UI/                     # 复用 UI 组件
│       ├── PanelWindow.vue     # 可停靠/可拖动的面板窗口
│       ├── SecondaryButton.vue # 次级按钮组件
│       ├── DropdownSelect.vue  # 下拉选择组件
│       └── TipWindow.vue       # 浮动提示/通知组件
│
├── composables/                # 组合式函数（业务逻辑与地图交互）
│   ├── useMap.ts               # 地图实例初始化/视图控制/事件注册
│   ├── useLayerManager.ts      # 图层增删改/样式/导入导出
│   ├── useBufferAnalysis.ts    # 缓冲区分析逻辑（Turf + 显示）
│   ├── useShortestPathAnalysis.ts      # 最短路径分析逻辑（Turf.shortestPath）
│   ├── useOverlayAnalysis.ts   # 叠加分析逻辑（intersect/union/...）

│   ├── useFeatureQuery.ts      # 要素属性/空间查询
│   ├── useEditing.ts           # 要素编辑（绘制/修改/删除）
│   ├── useSelection.ts         # 选择交互（点击/框选）
│   ├── useTheme.ts             # 主题与配色（明暗/主题色）
│   └── usePersist.ts           # 本地持久化（localStorage/session）
│
├── stores/                     # Pinia 状态中心（仅存状态与纯操作）
│   ├── mapStore.ts             # 地图/视图/底图/当前中心与缩放
│   ├── layerStore.ts           # 图层清单/可见性/顺序/当前选中图层
│   ├── analysisStore.ts        # 分析工具启用状态/面板状态/运行态
│   ├── selectionStore.ts       # 选择要素集合/来源/高亮层引用
│   ├── areaSelectionStore.ts   # 区域选择（矩形/多边形）
│   ├── featureQueryStore.ts    # 属性/空间查询条件与结果
│   ├── userStore.ts            # 用户/会话/权限（前端态）
│   ├── uiStore.ts              # 全局 UI 状态（主题/折叠/尺寸）
│   └── modeStateStore.ts       # 模式切换（LLM 模式/传统模式）
│
├── views/                      # 页面与业务面板
│   ├── auth/                   # 登录/注册/找回密码
│   ├── dashboard/              # 主工作台
│   │   ├── TraditionalMode.vue # 传统 GIS 工作台（工具面板容器）
│   │   ├── LLMMode.vue         # LLM 智能模式工作台
│   │   └── tools/              # 各类分析/工具面板
│   │       ├── BufferAnalysisPanel.vue     # 缓冲区分析面板
│   │       ├── DistanceAnalysisPanel.vue   # 最短路径/距离分析面板
│   │       ├── OverlayAnalysisPanel.vue    # 叠加分析面板
│   │       ├── FeatureQueryPanel.vue       # 要素查询面板
│   │       └── EditTools.vue               # 编辑工具面板
│   └── misc/                  # 其他页面（关于/设置/示例）
│
├── router/                     # 路由配置
│   └── index.ts                # 路由表/守卫/懒加载配置
│
├── styles/                     # 全局样式与主题
│   └── theme.css               # 主题变量（颜色/间距/阴影）
│
├── types/                      # 全局类型定义
│   ├── analysis.d.ts           # 分析相关类型（参数/结果）
│   ├── feature.d.ts            # 要素与图层类型
│   └── common.d.ts             # 通用工具类型
│
├── utils/                      # 工具库（纯函数/无副作用优先）
│   ├── selectionIO.ts          # 选择要素保存/读取（GeoJSON/Features）
│   ├── geometry.ts             # 几何转换/坐标系/测量
│   ├── download.ts             # 导出结果（GeoJSON/CSV/PNG）
│   ├── mapStyle.ts             # 样式生成（使用 theme.css 变量）
│   └── logger.ts               # 统一日志/埋点（可选）
│
├── main.js                     # 应用入口（创建应用、注册插件、挂载）
├── App.vue                     # 根组件（布局骨架与 <router-view/>）
└── router/guard.d.ts           # 路由守卫类型（可选）
```

### src 目录详解

- api: 统一封装请求与后端交互；每个模块一个文件，集中在 `config.ts` 创建 Axios 实例与拦截器。
- components: 纯 UI 组件与布局组件，不包含业务状态；优先复用与组合。
- composables: 组合式函数，承载业务逻辑与地图交互，返回明确的 API（state + actions）。
- stores: Pinia 状态中心，只存状态与同步/异步 action；禁止直接操作 DOM。
- views: 页面与业务面板，负责组合 components 与 composables，尽量保持“薄视图”。
- router: 路由表与守卫，按需做动态路由与懒加载。
- styles: 全局主题与变量，颜色需引用 `theme.css` 变量（支持暗色模式）。
- types: 跨模块共享的类型定义，避免在实现中重复声明。
- utils: 纯函数工具库，避免耦合框架与全局状态，可单测。

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

### 构建项目

```bash
pnpm build
```
构建产物将生成在 `dist` 目录中。

## 🔧 开发指南

## 🧩 UI 组件库


- **AutoScrollContainer** (`src/components/UI/AutoScrollContainer.vue`): 自动滚动容器，提供按索引/元素滚动、顶部/底部滚动、滚动信息回传；支持 selectedIndex 联动与居中显示。样式为窄滚动条、平滑滚动、无横向滚动，使用主题变量 `--scrollbar-*`。
- **ButtonGroup** (`src/components/UI/ButtonGroup.vue`): 分段按钮组，`buttons[{id,text}]` + `activeButton` 控制选中，发射 `select`。样式为圆角容器+透明按钮，激活态使用 `--accent` 高亮。
- **ConfirmDialog** (`src/components/UI/ConfirmDialog.vue`): 确认对话框，`visible/title/message/confirmText/cancelText`，发射 `confirm/cancel/close`，遮罩点击或 visible=false 均触发关闭。样式为面板+阴影+简化淡入，按钮分 primary/secondary。
- **DropdownSelect** (`src/components/UI/DropdownSelect.vue`): 轻量下拉选择，`v-model` + `options[{value,label,disabled}]`，键盘 Enter/Escape 支持，失焦/外点关闭。样式为面板边框、聚焦描边、选项滚动条，使用 `--accent`、`--border` 等变量。
- **EditModal** (`src/components/UI/EditModal.vue`): 多表单编辑弹窗（api-key/preference/prompt/agent），包含表单校验与保存回传 `save(data)`；集成 `DropdownSelect`。样式为圆角面板、分区、页脚主/次按钮。
- **IconButton** (`src/components/UI/IconButton.vue`): 图标按钮，支持 `size='small|medium|large'` 与禁用态，发射 `click`。样式为方形圆角、悬浮微动效、SVG 图标深度选择器尺寸同步。
- **LLMInputGroup** (`src/components/UI/LLMInputGroup.vue`): 输入组，`as='input|textarea'`，`v-model`、Enter 事件与自动高度调整（textarea）。样式为透明背景、无边框、细滚动条，使用 `--sub` 占位色。
- **NotificationManager** (`src/components/UI/NotificationManager.vue`): 通知管理器，暴露 `addNotification/removeNotification`，接管 `NotificationToast` 队列与过渡。
- **NotificationToast** (`src/components/UI/NotificationToast.vue`): 浮动提示，支持 success/error/info、自动关闭（duration）与手动关闭。样式为左侧色条、面板+边框+阴影、底部固定，过渡从底部滑入/出。
- **PanelContainer** (`src/components/UI/PanelContainer.vue`): 面板容器，`compact/bordered/shadowed/animated` 可选。样式使用 `--panel/--border/--glow`，带淡入动画与响应式内边距。
- **PanelWindow** (`src/components/UI/PanelWindow.vue`): 面板窗口/浮窗，支持嵌入模式、位置与尺寸、可聚焦、关闭、滚动持久化。样式为边框+阴影+标题区+可滚动内容，带淡入动画。
- **PrimaryButton** (`src/components/UI/PrimaryButton.vue`): 按钮（primary/secondary/danger），支持禁用与 active 高亮，发射 `click`。样式遵循主题按钮变量。
- **QueryConditionRow** (`src/components/UI/QueryConditionRow.vue`): 查询条件行，字段名输入 + 操作符下拉 + 值输入，依据字段类型提示与转换，发射 `update(condition)`。样式为卡片分区布局。
- **SecondaryButton** (`src/components/UI/SecondaryButton.vue`): 次级按钮（primary/secondary/danger），支持 loading 态与 active，发射 `click`。样式含微动效与 loading spinner。
- **SplitPanel** (`src/components/UI/SplitPanel.vue`): 面板分割器，封装 splitpanes，支持方向、主题（default/chat/custom）与自定义 slot。样式覆盖 splitter 与 pane。
- **TipWindow** (`src/components/UI/TipWindow.vue`): 轻提示容器，文本与可选图标，变体 info/warning/success/error。样式为左色条卡片，禁用动画防闪烁。
- **TraditionalInputGroup** (`src/components/UI/TraditionalInputGroup.vue`): 传统输入组，`type=input|textarea|select`，统一输入样式与交互，发射 `update:modelValue/enter`。

## 🔄 数据交互与状态管理

以下为 6 个基础工具（来自 tools 文件）的数据交互逻辑与状态管理要点，均按“输入数据格式 / 调用的函数 / 返回数据格式”列出。

1) 图层管理（layer manager）
- 输入数据格式: `layerId: string`；操作 `toggle|remove`
- 调用的函数: `useLayerManager().toggleLayerVisibility(layerId)` / `useLayerManager().removeLayer(layerId)`
- 返回数据格式: `void | boolean`（移除返回布尔值）
- 状态管理: `mapStore.vectorLayers`；选择高亮通过 `mapStore.selectLayer` 清理，同步 `selectionStore`/`popupStore`/`featureQueryStore`

### 图层管理：位置、数据接入与自动同步

- 位置:
  - 面板组件: `src/views/dashboard/traditional/tools/LayerManager.vue`
  - 业务逻辑: `src/composables/useLayerManager.ts`
  - 状态源: `src/stores/mapStore.ts` 的 `vectorLayers: MapLayer[]`

- 数据接入方法:
  - 图层管理面板以 `mapStore.vectorLayers` 为单一数据源；本地保存的图层通过 `useLayerManager().saveFeaturesAsLayer(features, name, sourceType)` 写入，`source='local'`。
  - SuperMap 服务图层在地图初始化时写入 `vectorLayers`，`source='supermap'`。

- 监听外部数据变化并自动加入列表:
  - 当其他模块向 `ol.Map` 添加图层（如第三方/外部图层）时，监听 `map.getLayers()` 的 `add`/`remove` 事件，同步到 `mapStore.vectorLayers`，并标记 `source='external'`。

2) 按属性选择要素（attribute selection）
- 输入数据格式: `QueryConfig`（`{ condition: { fieldName: string, operator: 'eq'|'gt'|'lt'|'gte'|'lte'|'like', value: string|number|boolean } }`），以及 `selectedLayerId: string`
- 调用的函数: `useFeatureQueryStore().executeQuery()`
- 返回数据格式: `{ success: boolean, data: ol.Feature[], totalCount: number, queryType: 'frontend', error?: string }`
- 状态管理: `featureQueryStore.queryResults`、`selectedFeatureIndex`；结果以 `sourceTag='query'` 高亮到 `mapStore.selectLayer`

- 按属性选择 → 另存为图层:
  - 使用 `useFeatureQueryStore().queryResults`（`ol.Feature[]`）作为输入
  - 调用 `useLayerManager().saveFeaturesAsLayer(results, layerName, 'query')`
  - 成功后将以 `source='local'`、`sourceType='query'` 的新矢量图层加入 `mapStore.vectorLayers`

3) 按区域选择要素（area selection）
- 位置：Frontend\src\composables\useFeatureQuery.ts
- 输入数据格式: 拉框范围 `extent: [minX, minY, maxX, maxY]`
- 调用的函数: `useFeatureSelection().selectFeaturesInExtent(extent)`
- 返回数据格式: `ol.Feature[]`（每个要素 `sourceTag='area'`）
- 状态管理: `areaSelectionStore.selectedFeatures`、`selectedFeatureIndex`；高亮渲染 `mapStore.selectLayer`

- 按区域选择 → 另存为图层:
  - 使用 `useAreaSelectionStore().selectedFeatures`（`ol.Feature[]`）作为输入
  - 调用 `useLayerManager().saveFeaturesAsLayer(results, layerName, 'area')`
  - 成功后将以 `source='local'`、`sourceType='area'` 的新矢量图层加入 `mapStore.vectorLayers`


4) 缓冲区分析（buffer）
- 输入数据格式: `selectedFeature: ol.Feature`，`bufferDistance: number`，`selectedAnalysisLayerId: string`
- 调用的函数: `useBufferAnalysis().executeBufferAnalysis()`
- 返回数据格式: 暂为 UI 演示；实际应为 `GeoJSON Feature | FeatureCollection`
- 状态管理: 本地 `ref`（`selectedFeature`, `bufferDistance`, `selectedAnalysisLayerId`）；提示通过 `analysisStore`

- 缓冲区分析结果 → 另存为图层:
  - 输入数据格式: `features: ol.Feature[]`（由缓冲结果 GeoJSON 转换）；`layerName: string`；`sourceType?: 'draw'|'area'|'query'`
  - 调用的函数: `useLayerManager().saveFeaturesAsLayer(features, layerName, sourceType)`
  - 返回数据格式: `Promise<boolean>`

5) 最短路径分析（shortest-path）
- 输入数据格式: `startPoint: ol.Feature`，`endPoint: ol.Feature`
- 调用的函数: `useShortestPathAnalysis().executePathAnalysis()`
- 返回数据格式: `{ distance: number, duration: number, pathType: string } | null`
- 状态管理: 本地 `ref`（`startPoint`, `endPoint`, `analysisResults`）；提示通过 `analysisStore`

- 最短路径 → 另存为图层:
  - 输入数据格式: `features: ol.Feature[]`（由起终点构造 `LineString`）; `layerName: string`; `sourceType?: 'draw'|'area'|'query'`
  - 调用的函数: `useLayerManager().saveFeaturesAsLayer(features, layerName, sourceType)`
  - 返回数据格式: `Promise<boolean>`



### 组件开发

- **组件位置**: 组件根据职责划分存放在 `src/components/` 下的 `UI`, `Map`, `Layout` 目录中。
- **命名规范**: 组件文件名使用 `PascalCase` (例如: `MapViewer.vue`)。
- **脚本语法**: 统一使用 `<script setup lang="ts">` 语法糖。
- **Props & Emits**: 使用 TypeScript 定义 `props` 和 `emits`，确保类型安全。

### 状态管理 (Pinia)

- **模块化**: 每个功能模块拥有独立的 store 文件，存放于 `src/stores/`。
- **命名规范**: store 文件名使用 `camelCase` (例如: `mapStore.ts`)，导出的 store 使用 `use...Store` 格式 (例如: `useMapStore`)。
- **风格**: 推荐使用 Composition API 风格定义 store，以获得更好的类型推断。
- **数据解构**: 在组件中使用 `storeToRefs` 来解构 state 和 getters，以保持其响应性。

### 路由管理

- **配置文件**: 路由定义在 `src/router/index.ts` 中。
- **懒加载**: 页面组件 (`views`) 应使用动态导入 (`() => import(...)`) 实现懒加载。

## 📜 核心约定

- **API 风格**: 功能实现遵循 “输入 -> 处理 -> 输出” 的三段式模式，不包含回退或校验逻辑。
- **颜色规范**: 颜色统一使用 `src/styles/theme.css` 中定义的 CSS 变量，禁止硬编码颜色值。
- **单位标准**:
  - 面积: 平方千米
  - 距离: 千米
  - 坐标: 度 (保留 6 位小数)
- **选择与IO**:
  - 不同来源的选择要素存储在各自的 store 中 (`selectionStore`, `areaSelectionStore`, `featureQueryStore`)。
  - 地图高亮通过 `mapStore.selectLayer` 统一管理。
  - 使用 `src/utils/selectionIO.ts` 中的工具函数进行要素的保存与读取。

## 🤝 贡献指南

我们欢迎所有形式的贡献！

1.  **Fork** 本仓库。
2.  **创建** 你的特性分支 (`git checkout -b feature/AmazingFeature`)。
3.  **提交** 你的修改 (`git commit -m 'Add some AmazingFeature'`)。
4.  **推送** 到分支 (`git push origin feature/AmazingFeature`)。
5.  **打开** 一个 Pull Request。

请确保你的代码遵循项目的开发规范和核心约定。

---
*此 README 文件旨在反映项目的当前状态。如有变更，请及时更新。*
