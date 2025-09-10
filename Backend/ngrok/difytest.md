# Dify 空间分析API测试提示词

## 📋 最新更新说明 (2024-01-10)

### ✅ 已完成的Schema优化
1. **移除多余参数**：
   - 缓冲区分析：移除了 `featureFilter`、`options.returnGeometry`、`options.returnProperties`
   - 保留核心参数：`sourceData`、`bufferSettings`、`options.resultLayerName`

2. **添加缺失参数**：
   - 最短路径分析：添加了 `obstacleData` 参数支持障碍物数据

3. **参数对齐**：
   - 相交分析：添加了 `enableStatistics` 和 `coordinateSystem` 参数
   - 擦除分析：添加了 `enableStatistics` 和 `coordinateSystem` 参数

4. **支持的单位类型**：
   - 最短路径分析：支持 `kilometers`、`miles`、`meters`、`degrees`、`radians`

### 🎯 当前可用的API路径
- ✅ `/api/v1/spatial-analysis/buffer` (POST) - 缓冲区分析
- ✅ `/api/v1/spatial-analysis/erase` (POST) - 擦除分析  
- ✅ `/api/v1/spatial-analysis/intersection` (POST) - 相交分析
- ✅ `/api/v1/spatial-analysis/shortest-path` (POST) - 最短路径分析

## 系统提示词 (System Prompt)

你是一个专业的空间分析助手，能够帮助用户执行各种地理空间分析任务。你拥有以下分析能力：

### 可用功能
1. **缓冲区分析** - 为点、线、面要素创建缓冲区
2. **擦除分析** - 计算两个图层的几何差集
3. **相交分析** - 计算两个图层的几何交集
4. **最短路径分析** - 计算两点间的最短路径

### 工作流程
1. 理解用户的空间分析需求
2. 识别所需的分析类型和参数
3. 调用相应的API函数
4. 解释分析结果并提供可视化建议

### 响应格式
- 使用清晰的中文回复
- 提供具体的参数建议
- 解释分析结果的含义
- 给出后续操作建议

## 用户测试场景

### 场景1：缓冲区分析测试
**用户输入：**
```
我想为武汉市的一个学校创建1000米的缓冲区，用来分析学校周边的影响范围。
```

**期望响应：**
- 识别这是缓冲区分析需求
- 调用ExecuteBufferAnalysis函数
- 提供合适的参数配置
- 解释缓冲区分析的意义

### 场景2：擦除分析测试
**用户输入：**
```
我有两个区域：一个是城市规划区域，另一个是自然保护区。我想知道规划区域中哪些部分不在自然保护区内。
```

**期望响应：**
- 识别这是擦除分析需求
- 调用ExecuteEraseAnalysis函数
- 解释擦除分析的结果含义

### 场景3：相交分析测试
**用户输入：**
```
我想分析商业区和住宅区的重叠部分，看看哪些地方既是商业区又是住宅区。
```

**期望响应：**
- 识别这是相交分析需求
- 调用ExecuteIntersectionAnalysis函数
- 解释相交分析的应用场景

### 场景4：最短路径分析测试
**用户输入：**
```
我想计算从武汉大学到华中科技大学的最短路径，用于规划最佳通勤路线。
```

**期望响应：**
- 识别这是最短路径分析需求
- 调用ExecuteShortestPathAnalysis函数
- 提供路径规划建议

## 测试数据模板

### ⚠️ 重要说明：Dify JSON转义问题解决方案

**问题：** Dify会将JSON字符串中的引号转义为 `\"`，导致JSON格式失效。

**解决方案：**
1. **修改Schema定义**：将 `$ref` 引用改为具体的 `type: "object"` 定义
2. **分别填写参数**：在Dify中为每个参数单独填写JSON，而不是使用完整的请求体
3. **避免嵌套引用**：直接定义对象结构，避免使用组件引用
4. **不支持null值**：Dify不支持 `null` 值，可选参数使用空对象 `{}` 代替

### 缓冲区分析测试数据
**注意：在Dify中，请分别填写各个参数，不要使用完整的JSON字符串。可选参数可使用空对象 `{}` `**

**sourceData参数：**
```json
{"type":"FeatureCollection","features":[{"type":"Feature","geometry":{"type":"Point","coordinates":[114.305,30.593]},"properties":{"name":"武汉大学","type":"学校"}}]}
```

**bufferSettings参数：**
```json
{"radius":1000,"semicircleLineSegment":10}
```


**options参数：**
```json
{"resultLayerName":"学校缓冲区分析"}
```




### 擦除分析测试数据
**targetData参数：**
```json
{"type":"FeatureCollection","features":[{"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[114.1,30.1],[114.2,30.1],[114.2,30.2],[114.1,30.2],[114.1,30.1]]]},"properties":{"name":"城市规划区域"}}]}
```

**eraseData参数：**
```json
{"type":"FeatureCollection","features":[{"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[114.15,30.15],[114.25,30.15],[114.25,30.25],[114.15,30.25],[114.15,30.15]]]},"properties":{"name":"自然保护区"}}]}
```

**analysisOptions参数（可选）：**
```json
{}
```
或者
```json
{"batchSize":100,"enableProgress":true,"returnGeometry":true}
```

**options参数（可选）：**
```json
{}
```
或者
```json
{"resultLayerName":"规划区域擦除分析","enableStatistics":true,"coordinateSystem":"EPSG:4326"}
```

### 相交分析测试数据
**targetData参数：**
```json
{"type":"FeatureCollection","features":[{"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[114.1,30.1],[114.2,30.1],[114.2,30.2],[114.1,30.2],[114.1,30.1]]]},"properties":{"name":"商业区"}}]}
```

**maskData参数：**
```json
{"type":"FeatureCollection","features":[{"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[114.15,30.15],[114.25,30.15],[114.25,30.25],[114.15,30.25],[114.15,30.15]]]},"properties":{"name":"住宅区"}}]}
```

**analysisOptions参数（可选）：**
```json
{}
```
或者
```json
{"batchSize":100,"enableProgress":true,"returnGeometry":true}
```

**options参数（可选）：**
```json
{}
```
或者
```json
{"resultLayerName":"商业住宅重叠区域","enableStatistics":true,"coordinateSystem":"EPSG:4326"}
```

### 最短路径分析测试数据
**startPoint参数：**
```json
{"type":"Point","coordinates":[114.305,30.593]}
```

**endPoint参数：**
```json
{"type":"Point","coordinates":[114.320,30.610]}
```

**obstacleData参数（可选）：**
```json
{}
```
或者
```json
{"type":"FeatureCollection","features":[{"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[114.31,30.595],[114.315,30.595],[114.315,30.605],[114.31,30.605],[114.31,30.595]]]},"properties":{"name":"障碍物区域"}}]}
```

**⚠️ 重要说明：obstacleData 参数处理**
- 如果不需要障碍物，请使用空对象 `{}`
- 如果需要障碍物，请提供完整的 GeoJSON FeatureCollection 格式
- 后端已修复验证逻辑，支持空对象 `{}` 作为无障碍物的情况

**✅ 最新更新：返回数据包含起始点和终点坐标**
- 后端现在会在返回结果的 `features` 数组中同时保存起始点、终点和路径线
- 起始点：`analysisType: "shortest-path-start"`
- 终点：`analysisType: "shortest-path-end"`  
- 路径线：`analysisType: "shortest-path"`
- 返回格式包含：`features`、`statistics`、`resultId` 等完整信息
- 便于前端进行结果展示和后续处理

**最短路径分析返回数据示例：**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [114.305, 30.593]
      },
      "properties": {
        "id": "shortest_path_result_2024-01-01T00-00-00-000Z_start",
        "name": "起始点",
        "analysisType": "shortest-path-start",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    },
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [114.320, 30.610]
      },
      "properties": {
        "id": "shortest_path_result_2024-01-01T00-00-00-000Z_end",
        "name": "终点",
        "analysisType": "shortest-path-end",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    },
    {
      "type": "Feature",
      "geometry": {
        "type": "LineString",
        "coordinates": [[114.305, 30.593], [114.320, 30.610]]
      },
      "properties": {
        "id": "shortest_path_result_2024-01-01T00-00-00-000Z",
        "name": "最短路径分析结果",
        "analysisType": "shortest-path",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    }
  ],
  "statistics": {
    "distance": 2.5,
    "distanceUnit": "kilometers",
    "duration": 3.0,
    "durationUnit": "minutes",
    "complexity": 2,
    "averageSpeed": 50,
    "speedUnit": "km/h"
  },
  "resultId": "shortest_path_result_2024-01-01T00-00-00-000Z"
}
```

**analysisOptions参数（可选）：**
```json
{}
```
或者
```json
{"units":"kilometers","resolution":1000}
```

**options参数（可选）：**
```json
{}
```
或者
```json
{"returnGeometry":true,"calculateDistance":true,"calculateDuration":true,"averageSpeed":50}
```
