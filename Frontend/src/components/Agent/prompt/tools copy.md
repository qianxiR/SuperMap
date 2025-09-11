map 图层显示/隐藏（ToggleLayerVisibility）
实现位置与函数: Frontend/src/composables/useLayerManager.ts → togglelayerVisibility(layerId: string)
核心逻辑: 依据 mapStore.vectorlayers 查找目标 OpenLayers 图层；未加载则 loadLazyLayer()；显示时启用建筑物 2.5D 样式；隐藏时清空 selectionStore、popupStore、analysisStore 并更新 visible 状态。
监听与触发: 
- 图层面板勾选/开关控件 change 事件触发 togglelayerVisibility
- 可能的快捷按钮或菜单项点击事件触发（取决于 UI 面板实现）

query 按属性选择、导出、保存
导出为 GeoJSON
实现位置与函数: Frontend/src/composables/useLayerExport.ts
- exportSingleLayerAsGeoJSON(layerKey: string, customFileName?: string)
- exportLayersAsGeoJSON(layers: LayerItem[], groupName: string)
- exportFeaturesAsGeoJSON(features: any[], fileName: string, exportInfo?)
监听与触发:
- 图层列表中的“导出”按钮点击 → exportSingleLayerAsGeoJSON
- 批量导出入口（分组或多选）点击 → exportLayersAsGeoJSON
- 结果面板/分析结果的“导出结果”按钮 → exportFeaturesAsGeoJSON

保存到图层
实现位置与函数: Frontend/src/composables/useLayerManager.ts
- saveFeaturesAslayer(features, layerName, sourceType)
- saveDrawAslayer(layerName?)
监听与触发:
- 查询/分析结果面板“保存为图层”按钮点击 → saveFeaturesAslayer
- 绘制工具完成后在面板点击“保存绘制” → saveDrawAslayer

按属性选择要素（Feature Query）
表单与触发: Frontend/src/views/dashboard/management-analysis/traditional/tools/FeatureQueryPanel.vue
地图交互与高亮: Frontend/src/composables/useMapInteraction.ts、mapStore.ts、selectionStore
监听与触发:
- FeatureQueryPanel.vue 提交按钮 click/submit → 读取 layer/field/operator/value 调用查询逻辑
- 地图点击事件由 useMapInteraction 注册，对选中结果进行高亮并写入 selectionStore
- 清除按钮 click → 清空 selectionStore 并取消高亮

analysis 四个空间分析 POST API（Buffer/Intersection/Erase/ShortestPath）
面板与表单: 
- Buffer: Frontend/src/views/dashboard/management-analysis/traditional/tools/BufferAnalysisPanel.vue
- Intersection: Frontend/src/views/dashboard/management-analysis/traditional/tools/IntersectionAnalysisPanel.vue
- Erase: Frontend/src/views/dashboard/management-analysis/traditional/tools/EraseAnalysisPanel.vue
- Shortest Path: Frontend/src/views/dashboard/management-analysis/traditional/tools/ShortestPathAnalysisPanel.vue
请求目标: http://localhost:8087/api/v1/spatial-analysis/{buffer|intersection|erase|shortest-path}
监听与触发:
- 各面板表单提交按钮 click/submit → 采集参数（半径、对象A/B、起终点等）→ 发起 POST → 接收 GeoJSON → 通过 useLayerManager 保存并渲染为结果图层
- “导出结果”点击 → 调用 useLayerExport 导出 GeoJSON
- “清除结果”点击 → 从 mapStore 中移除对应临时结果图层