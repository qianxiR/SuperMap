# 空间分析服务 API 文档


## 基础信息

**服务地址**: `https://your-domain.com/api/v1/spatial-analysis`  
**数据格式**: JSON  
**几何数据格式**: GeoJSON (RFC 7946)  
**坐标系**: WGS84 (EPSG:4326)  
**重要说明**: 所有空间分析函数内部使用Turf.js库，需要FeatureCollection格式的输入数据  
**认证方式**: Bearer Token

## 数据格式说明

### Turf.js FeatureCollection格式要求

所有空间分析函数内部使用Turf.js库，需要FeatureCollection格式的输入数据。以下是数据转换的详细说明：

#### 1. 输入数据转换流程

```typescript
// 1. 从OpenLayers要素获取数据
const features = layer.getSource().getFeatures()

// 2. 转换为Turf格式
const turfFeatures = convertFeaturesToTurfGeometries(features)

// 3. 为分析函数准备FeatureCollection格式
const featureCollection = prepareTurfAnalysisInput(feature1, feature2)
```

#### 2. FeatureCollection标准格式

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point|LineString|Polygon|MultiPoint|MultiLineString|MultiPolygon",
        "coordinates": [lng, lat] | [[lng, lat], ...] | [[[lng, lat], ...]]
      },
      "properties": {
        "id": "feature_001",
        "name": "要素名称",
        // 其他属性...
      }
    }
  ]
}
```

#### 3. 几何坐标格式规范

```typescript
// 点坐标
[114.123456, 30.456789]  // [经度, 纬度]

// 线坐标
[[114.1, 30.4], [114.2, 30.5], [114.3, 30.6]]

// 面坐标
[[[114.1, 30.4], [114.2, 30.4], [114.2, 30.5], [114.1, 30.5], [114.1, 30.4]]]
```

#### 4. 各分析函数的数据处理方式

**缓冲区分析**：
- 输入：OpenLayers要素数组
- 预处理：`convertFeaturesToTurfGeometries(features)` - 转换为Turf格式
- 处理：`turfBuffer(turfFeature, radius, options)` - 对每个要素创建缓冲区
- 后处理：`ensurePolygonGeometry()` - 确保结果为多边形类型
- 输出：缓冲区多边形要素数组

**相交分析**：
- 输入：两个OpenLayers要素数组（目标图层和遮罩图层）
- 预处理：`convertFeaturesToTurfGeometries()` - 转换为Turf格式
- 处理：`prepareTurfAnalysisInput(feature1, feature2)` → `turfIntersect(featureCollection)`
- 后处理：异步批量处理，避免阻塞UI
- 输出：相交区域要素数组

**擦除分析**：
- 输入：两个OpenLayers要素数组（目标图层和擦除图层）
- 预处理：`convertFeaturesToTurfGeometries()` - 转换为Turf格式
- 处理：Web Worker + `prepareTurfAnalysisInput()` → `turfDifference(featureCollection)`
- 后处理：在后台线程执行，避免阻塞主线程
- 输出：差集要素数组

**最短路径分析**：
- 输入：OpenLayers点要素（起点和终点）
- 预处理：`convertFeatureToTurfGeometry(startPoint/endPoint)` - 转换为Turf格式
- 障碍物处理：`convertLayerToObstacles(layerId)` - 将图层转换为障碍物FeatureCollection
- 处理：`shortestPath(startCoords, endCoords, options)` - 计算最短路径
- 后处理：`calculatePathDistance()` - 计算路径距离
- 输出：路径线要素

#### 5. 数据预处理详细流程

**缓冲区分析预处理**：
```typescript
// 1. 获取OpenLayers要素
const features = layer.getSource().getFeatures()

// 2. 转换为Turf格式
const turfFeatures = convertFeaturesToTurfGeometries(features)

// 3. 几何类型验证
const supportedTypes = ['Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon']
const validFeatures = turfFeatures.filter(f => supportedTypes.includes(f.geometry.type))

// 4. 缓冲区计算
for (const turfFeature of validFeatures) {
  const buffered = turfBuffer(turfFeature, radius, { units: 'meters', steps })
  const finalGeometry = ensurePolygonGeometry(buffered.geometry)
}
```

**最短路径分析预处理**：
```typescript
// 1. 转换起点和终点
const startTurfFeature = convertFeatureToTurfGeometry(startPoint)
const endTurfFeature = convertFeatureToTurfGeometry(endPoint)

// 2. 提取坐标
const startCoords = startTurfFeature.geometry.coordinates
const endCoords = endTurfFeature.geometry.coordinates

// 3. 处理障碍物（如果存在）
if (obstacleLayerId) {
  const obstacles = convertLayerToObstacles(obstacleLayerId)
  // 将点、线要素转换为小缓冲区作为障碍物
  const polygonFeatures = obstacles.features.map(feature => {
    if (feature.geometry.type === 'Point') {
      return turf.buffer(feature, 0.0001, { units: 'kilometers' })
    }
    return feature
  })
  options.obstacles = turf.featureCollection(polygonFeatures)
}

// 4. 路径计算
const pathResult = shortestPath(startCoords, endCoords, options)
```

**相交分析预处理**：
```typescript
// 1. 获取两个图层的要素
const targetFeatures = targetLayer.getSource().getFeatures()
const maskFeatures = maskLayer.getSource().getFeatures()

// 2. 转换为Turf格式
const targetGeoJson = convertFeaturesToTurfGeometries(targetFeatures)
const maskGeoJson = convertFeaturesToTurfGeometries(maskFeatures)

// 3. 验证数据有效性
if (targetGeoJson.length < 1 || maskGeoJson.length < 1) {
  throw new Error('转换后的几何数据为空，无法执行相交分析')
}

// 4. 异步批量处理相交计算
const processIntersectionAsync = async (): Promise<void> => {
  return new Promise((resolve) => {
    const processBatch = (startI: number, startJ: number) => {
      const batchSize = 100 // 每批处理100个组合
      let currentI = startI
      let currentJ = startJ
      let batchCount = 0

      while (currentI < targetGeoJson.length && batchCount < batchSize) {
        const targetFeature = targetGeoJson[currentI]
        const maskFeature = maskGeoJson[currentJ]

        try {
          // 准备FeatureCollection格式的输入
          const featureCollection = prepareTurfAnalysisInput(targetFeature, maskFeature)
          const intersection = turfIntersect(featureCollection)
          
          if (intersection && intersection.geometry) {
            // 保存相交结果
            results.push({
              id: `intersection_${currentI}_${currentJ}_${Date.now()}`,
              name: `相交区域 ${results.length + 1}`,
              geometry: intersection.geometry,
              sourceTargetLayerName: targetLayerName,
              sourceMaskLayerName: maskLayerName,
              createdAt: new Date().toISOString()
            })
          }
        } catch (error) {
          console.warn(`相交计算失败 [${currentI}, ${currentJ}]:`, error)
        }

        // 移动到下一个组合
        currentJ++
        if (currentJ >= maskGeoJson.length) {
          currentJ = 0
          currentI++
        }

        batchCount++
      }

      // 使用 setTimeout 让出控制权，避免阻塞浏览器
      if (currentI < targetGeoJson.length) {
        setTimeout(() => processBatch(currentI, currentJ), 0)
      } else {
        resolve()
      }
    }

    processBatch(0, 0)
  })
}
```

**擦除分析预处理**：
```typescript
// 1. 获取两个图层的要素
const targetFeatures = targetLayer.getSource().getFeatures()
const eraseFeatures = eraseLayer.getSource().getFeatures()

// 2. 转换为Turf格式
const targetGeoJson = convertFeaturesToTurfGeometries(targetFeatures)
const eraseGeoJson = convertFeaturesToTurfGeometries(eraseFeatures)

// 3. 清理无效数据
const cleanGeoJsonData = (features: any[]): any[] => {
  return features.filter(feature => feature && feature.geometry)
}

// 4. 使用Web Worker进行后台计算
const worker = new Worker(new URL('../workers/eraseWorker.ts', import.meta.url), { type: 'module' })

worker.onmessage = (event) => {
  const { type, results, error } = event.data

  if (type === 'COMPLETE') {
    if (results && results.length > 0) {
      const convertedResults = results.map((result: any) => ({
        id: result.id,
        name: result.name,
        geometry: result.geometry,
        sourceTargetLayerName: targetLayerName,
        sourceEraseLayerName: eraseLayerName,
        createdAt: result.createdAt
      }))
      allResults.push(...convertedResults)
    }
    worker.terminate()
    // 处理完成
  } else if (type === 'ERROR') {
    console.error('擦除分析失败:', error)
    worker.terminate()
  }
}

// 5. 发送数据到Worker
worker.postMessage({
  type: 'PROCESS_ALL',
  data: {
    targetFeatures: cleanGeoJsonData(targetGeoJson),
    eraseFeatures: cleanGeoJsonData(eraseGeoJson),
    targetLayerName: targetLayerName,
    eraseLayerName: eraseLayerName
  }
})

// Worker内部处理逻辑
const computeErase = (targetFeature: any, eraseFeature: any): any | null => {
  try {
    // 准备FeatureCollection格式的输入
    const featureCollection = prepareTurfAnalysisInput(targetFeature, eraseFeature)
    const difference = turfDifference(featureCollection)
    
    if (difference && difference.geometry) {
      return {
        id: `erase_${Date.now()}`,
        name: `擦除区域`,
        geometry: difference.geometry,
        sourceTargetLayerName: targetLayerName,
        sourceEraseLayerName: eraseLayerName,
        createdAt: new Date().toISOString()
      }
    }
    return null
  } catch (error) {
    console.warn('擦除计算失败:', error)
    return null
  }
}
```

#### 6. 数据验证和清理

```typescript
// 清理无效数据
const cleanGeoJsonData = (features: any[]): any[] => {
  return features.filter(feature => feature && feature.geometry)
}

// 几何有效性检查
const validFeatures = features.filter((f: any) => f && f.geometry)

// 确保几何类型为多边形（缓冲区分析专用）
const ensurePolygonGeometry = (geometry: any): any => {
  if (!geometry || !geometry.type) return null
  
  switch (geometry.type) {
    case 'Polygon':
    case 'MultiPolygon':
      return geometry
    case 'Point':
    case 'LineString':
      console.warn('缓冲区结果仍为点/线类型，可能缓冲区距离过小')
      return null
    default:
      console.warn(`未知的几何类型: ${geometry.type}`)
      return null
  }
}
```

## 通用响应格式

### 成功响应
```json
{
  "success": true,
  "data": {},
  "message": "操作成功",
  "timestamp": "2024-01-01T00:00:00Z",
  "requestId": "uuid-string"
}
```

### 错误响应
```json
{
  "success": false,
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "参数验证失败",
    "details": "layerId 不能为空"
  },
  "timestamp": "2024-01-01T00:00:00Z",
  "requestId": "uuid-string"
}
```

## 1. 缓冲区分析 API

### 接口信息
- **路径**: `POST /api/v1/spatial-analysis/buffer`
- **功能**: 对指定要素创建缓冲区
- **描述**: 为点、线、面要素创建指定距离的缓冲区
- **内部实现**: 使用Turf.js的buffer函数，输入数据经过以下预处理：
  1. 从OpenLayers要素转换为Turf格式
  2. 验证几何类型支持性
  3. 对每个要素执行缓冲区计算
  4. 确保结果为多边形类型
### 请求参数

```json
{
  "sourceLayerId": "string",
  "bufferSettings": {
    "radius": 1000,
    "unit": "meters|kilometers|feet|miles",
    "semicircleLineSegment": 8,
    "unionResults": true
  },
  "featureFilter": {
    "featureIds": ["id1", "id2"],
    "spatialFilter": {
      "bounds": [minLon, minLat, maxLon, maxLat]
    }
  },
  "options": {
    "returnGeometry": true,
    "returnProperties": true,
    "resultLayerName": "缓冲区分析结果"
  }
}
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sourceLayerId | string | 是 | 源图层标识符 |
| bufferSettings.radius | number | 是 | 缓冲距离 |
| bufferSettings.unit | string | 是 | 距离单位：meters、kilometers、feet、miles |
| bufferSettings.semicircleLineSegment | number | 否 | 圆弧精度，默认8 |
| bufferSettings.unionResults | boolean | 否 | 是否合并结果，默认true |
| featureFilter.featureIds | array | 否 | 指定要素ID列表 |
| featureFilter.spatialFilter | object | 否 | 空间过滤条件 |
| options.resultLayerName | string | 否 | 结果图层名称 |

### 响应数据

```json
{
  "success": true,
  "data": {
    "resultId": "buffer_result_20240101_001",
    "resultName": "缓冲区分析结果",
    "sourceLayerName": "武汉市学校",
    "bufferSettings": {
      "radius": 1000,
      "unit": "meters",
      "semicircleLineSegment": 8
    },
    "statistics": {
      "inputFeatureCount": 5,
      "outputFeatureCount": 5,
      "totalArea": 7853981.63,
      "areaUnit": "square_meters"
    },
    "features": [
      {
        "type": "Feature",
        "geometry": {
          "type": "Polygon",
          "coordinates": [[[114.1, 30.4], [114.2, 30.4], [114.2, 30.5], [114.1, 30.5], [114.1, 30.4]]]
        },
        "properties": {
          "id": "buffer_001",
          "name": "学校1_缓冲区",
          "sourceFeatureId": "school_001",
          "bufferDistance": 1000,
          "area": 3141592.65,
          "sourceName": "武汉大学"
        }
      }
    ],
    "executionTime": "0.123s"
  }
}
```

### 使用示例

```bash
curl -X POST "https://your-domain.com/api/v1/spatial-analysis/buffer" \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceLayerId": "wuhan_schools",
    "bufferSettings": {
      "radius": 500,
      "unit": "meters",
      "semicircleLineSegment": 8,
      "unionResults": true
    },
    "options": {
      "resultLayerName": "学校500米缓冲区"
    }
  }'
```

## 2. 最短路径分析 API

### 接口信息
- **路径**: `POST /api/v1/spatial-analysis/shortest-path`
- **功能**: 计算两点间的最短路径
- **描述**: 基于起点和终点计算最优路径，支持障碍物避让
- **内部实现**: 使用Turf.js的shortestPath函数，输入数据经过以下预处理：
  1. 将起点和终点转换为Turf格式并提取坐标
  2. 处理障碍物图层（将点、线要素转换为小缓冲区）
  3. 执行最短路径计算
  4. 计算路径距离和预计时间

### 请求参数

```json
{
  "startPoint": {
    "type": "Point",
    "coordinates": [114.123, 30.456]
  },
  "endPoint": {
    "type": "Point", 
    "coordinates": [114.234, 30.567]
  },
  "analysisOptions": {
    "units": "kilometers|miles|meters",
    "resolution": 1000,
    "obstacleLayerId": "string",
    "costField": "string"
  },
  "options": {
    "returnGeometry": true,
    "calculateDistance": true,
    "calculateDuration": true,
    "averageSpeed": 50
  }
}
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| startPoint | object | 是 | 起点坐标，GeoJSON Point格式 |
| endPoint | object | 是 | 终点坐标，GeoJSON Point格式 |
| analysisOptions.units | string | 否 | 距离单位，默认kilometers |
| analysisOptions.resolution | number | 否 | 网格分辨率(米)，默认1000 |
| analysisOptions.obstacleLayerId | string | 否 | 障碍物图层ID |
| analysisOptions.costField | string | 否 | 成本字段名称 |
| options.averageSpeed | number | 否 | 平均速度(km/h)，用于计算时间 |

### 响应数据

```json
{
  "success": true,
  "data": {
    "resultId": "path_result_20240101_001",
    "pathInfo": {
      "startPoint": {
        "type": "Point",
        "coordinates": [114.123, 30.456]
      },
      "endPoint": {
        "type": "Point",
        "coordinates": [114.234, 30.567]
      },
      "totalDistance": 15.67,
      "totalDuration": 18.8,
      "distanceUnit": "kilometers",
      "durationUnit": "minutes"
    },
    "path": {
      "type": "Feature",
      "geometry": {
        "type": "LineString",
        "coordinates": [[114.123, 30.456], [114.125, 30.458], [114.234, 30.567]]
      },
      "properties": {
        "id": "path_001",
        "name": "最短路径",
        "distance": 15.67,
        "duration": 18.8,
        "waypointCount": 156,
        "hasObstacles": true
      }
    },
    "executionTime": "0.234s"
  }
}
```

### 使用示例

```bash
curl -X POST "https://your-domain.com/api/v1/spatial-analysis/shortest-path" \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "startPoint": {
      "type": "Point",
      "coordinates": [114.123, 30.456]
    },
    "endPoint": {
      "type": "Point",
      "coordinates": [114.234, 30.567]
    },
    "analysisOptions": {
      "units": "kilometers",
      "resolution": 1000,
      "obstacleLayerId": "wuhan_water"
    },
    "options": {
      "calculateDistance": true,
      "calculateDuration": true,
      "averageSpeed": 60
    }
  }'
```

## 3. 相交分析 API

### 接口信息
- **路径**: `POST /api/v1/spatial-analysis/intersection`
- **功能**: 计算两个图层的相交区域
- **描述**: 计算目标图层与遮罩图层的空间相交部分
- **内部实现**: 使用Turf.js的intersect函数，输入数据经过以下预处理：
  1. 将两个图层的要素转换为Turf格式
  2. 验证数据有效性
  3. 异步批量处理两两相交计算
  4. 使用setTimeout避免阻塞UI

### 请求参数

```json
{
  "targetLayerId": "string",
  "maskLayerId": "string",
  "analysisOptions": {
    "unionResults": true,
    "preserveAttributes": true,
    "attributeMergeStrategy": "target|mask|both"
  },
  "featureFilter": {
    "targetFeatureIds": ["id1", "id2"],
    "maskFeatureIds": ["id3", "id4"]
  },
  "options": {
    "returnGeometry": true,
    "returnProperties": true,
    "resultLayerName": "相交分析结果"
  }
}
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| targetLayerId | string | 是 | 目标图层标识符 |
| maskLayerId | string | 是 | 遮罩图层标识符 |
| analysisOptions.unionResults | boolean | 否 | 是否合并结果，默认true |
| analysisOptions.preserveAttributes | boolean | 否 | 是否保留属性，默认true |
| analysisOptions.attributeMergeStrategy | string | 否 | 属性合并策略：target(目标)、mask(遮罩)、both(两者) |
| featureFilter.targetFeatureIds | array | 否 | 目标图层要素ID列表 |
| featureFilter.maskFeatureIds | array | 否 | 遮罩图层要素ID列表 |

### 响应数据

```json
{
  "success": true,
  "data": {
    "resultId": "intersection_result_20240101_001",
    "resultName": "相交分析结果",
    "sourceLayers": {
      "targetLayer": "武汉市行政区",
      "maskLayer": "武汉市水域"
    },
    "statistics": {
      "targetFeatureCount": 10,
      "maskFeatureCount": 5,
      "intersectionCount": 8,
      "totalArea": 1234567.89,
      "areaUnit": "square_meters"
    },
    "features": [
      {
        "type": "Feature",
        "geometry": {
          "type": "Polygon",
          "coordinates": [[[114.1, 30.4], [114.2, 30.4], [114.2, 30.5], [114.1, 30.5], [114.1, 30.4]]]
        },
        "properties": {
          "id": "intersection_001",
          "name": "相交区域1",
          "targetFeatureId": "district_001",
          "maskFeatureId": "water_001",
          "area": 123456.78,
          "targetAttributes": {
            "districtName": "江岸区",
            "population": 800000
          },
          "maskAttributes": {
            "waterName": "长江",
            "waterType": "river"
          }
        }
      }
    ],
    "executionTime": "0.456s"
  }
}
```

### 使用示例

```bash
curl -X POST "https://your-domain.com/api/v1/spatial-analysis/intersection" \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "targetLayerId": "wuhan_districts",
    "maskLayerId": "wuhan_water",
    "analysisOptions": {
      "unionResults": true,
      "preserveAttributes": true,
      "attributeMergeStrategy": "both"
    },
    "options": {
      "resultLayerName": "行政区与水域相交"
    }
  }'
```

## 4. 擦除分析 API

### 接口信息
- **路径**: `POST /api/v1/spatial-analysis/erase`
- **功能**: 从目标图层中擦除与擦除图层相交的部分
- **描述**: 计算目标图层减去擦除图层后的剩余区域
- **内部实现**: 使用Turf.js的difference函数，输入数据经过以下预处理：
  1. 将两个图层的要素转换为Turf格式
  2. 清理无效数据
  3. 使用Web Worker在后台线程执行差集计算
  4. 避免阻塞主线程，提升用户体验

### 请求参数

```json
{
  "targetLayerId": "string",
  "eraseLayerId": "string",
  "analysisOptions": {
    "unionTargetFeatures": true,
    "unionEraseFeatures": true,
    "preserveAttributes": true
  },
  "featureFilter": {
    "targetFeatureIds": ["id1", "id2"],
    "eraseFeatureIds": ["id3", "id4"]
  },
  "options": {
    "returnGeometry": true,
    "returnProperties": true,
    "resultLayerName": "擦除分析结果"
  }
}
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| targetLayerId | string | 是 | 目标图层标识符 |
| eraseLayerId | string | 是 | 擦除图层标识符 |
| analysisOptions.unionTargetFeatures | boolean | 否 | 是否合并目标要素，默认true |
| analysisOptions.unionEraseFeatures | boolean | 否 | 是否合并擦除要素，默认true |
| analysisOptions.preserveAttributes | boolean | 否 | 是否保留属性，默认true |
| featureFilter.targetFeatureIds | array | 否 | 目标图层要素ID列表 |
| featureFilter.eraseFeatureIds | array | 否 | 擦除图层要素ID列表 |

### 响应数据

```json
{
  "success": true,
  "data": {
    "resultId": "erase_result_20240101_001",
    "resultName": "擦除分析结果",
    "sourceLayers": {
      "targetLayer": "武汉市行政区",
      "eraseLayer": "武汉市水域"
    },
    "statistics": {
      "targetFeatureCount": 10,
      "eraseFeatureCount": 3,
      "resultFeatureCount": 7,
      "erasedArea": 234567.89,
      "remainingArea": 987654.32,
      "areaUnit": "square_meters"
    },
    "features": [
      {
        "type": "Feature",
        "geometry": {
          "type": "Polygon",
          "coordinates": [[[114.1, 30.4], [114.2, 30.4], [114.2, 30.5], [114.1, 30.5], [114.1, 30.4]]]
        },
        "properties": {
          "id": "erase_001",
          "name": "擦除后区域1",
          "originalTargetId": "district_001",
          "area": 123456.78,
          "originalAttributes": {
            "districtName": "江岸区",
            "population": 800000
          }
        }
      }
    ],
    "executionTime": "0.567s"
  }
}
```

### 使用示例

```bash
curl -X POST "https://your-domain.com/api/v1/spatial-analysis/erase" \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "targetLayerId": "wuhan_districts",
    "eraseLayerId": "wuhan_water",
    "analysisOptions": {
      "unionTargetFeatures": true,
      "unionEraseFeatures": true,
      "preserveAttributes": true
    },
    "options": {
      "resultLayerName": "行政区擦除水域"
    }
  }'
```


## 总结


API文档更新总结
1. 四个分析功能的预处理流程说明
缓冲区分析：
输入：OpenLayers要素数组
预处理：convertFeaturesToTurfGeometries(features) - 转换为Turf格式
处理：turfBuffer(turfFeature, radius, options) - 对每个要素创建缓冲区
后处理：ensurePolygonGeometry() - 确保结果为多边形类型
输出：缓冲区多边形要素数组
相交分析：
输入：两个OpenLayers要素数组（目标图层和遮罩图层）
预处理：convertFeaturesToTurfGeometries() - 转换为Turf格式
处理：prepareTurfAnalysisInput(feature1, feature2) → turfIntersect(featureCollection)
后处理：异步批量处理，避免阻塞UI
输出：相交区域要素数组
擦除分析：
输入：两个OpenLayers要素数组（目标图层和擦除图层）
预处理：convertFeaturesToTurfGeometries() - 转换为Turf格式
处理：Web Worker + prepareTurfAnalysisInput() → turfDifference(featureCollection)
后处理：在后台线程执行，避免阻塞主线程
输出：差集要素数组
最短路径分析：
输入：OpenLayers点要素（起点和终点）
预处理：convertFeatureToTurfGeometry(startPoint/endPoint) - 转换为Turf格式
障碍物处理：convertLayerToObstacles(layerId) - 将图层转换为障碍物FeatureCollection
处理：shortestPath(startCoords, endCoords, options) - 计算最短路径
后处理：calculatePathDistance() - 计算路径距离
输出：路径线要素


## 错误代码说明

| 错误代码 | HTTP状态码 | 说明 |
|----------|------------|------|
| INVALID_PARAMETER | 400 | 参数验证失败 |
| LAYER_NOT_FOUND | 404 | 图层不存在 |
| INVALID_GEOMETRY | 400 | 几何数据无效 |
| ANALYSIS_FAILED | 500 | 分析计算失败 |
| QUOTA_EXCEEDED | 429 | 请求配额超限 |
| UNAUTHORIZED | 401 | 未授权访问 |
| FORBIDDEN | 403 | 禁止访问 |

## 使用限制

1. **请求频率**: 每分钟最多100次请求
2. **数据量限制**: 单次分析最多处理10000个要素
3. **几何复杂度**: 单个要素最多1000个顶点
4. **并发限制**: 每个用户最多3个并发分析任务

## 认证说明

所有API请求都需要在请求头中包含有效的Bearer Token：

```bash
Authorization: Bearer your-access-token
```

Token可以通过登录接口获取，有效期为24小时。

## 版本信息

- **当前版本**: v1.0.0
- **API版本**: v1
- **最后更新**: 2024-01-01

## 联系信息

- **技术支持**: support@your-domain.com
- **API文档**: https://docs.your-domain.com
- **状态页面**: https://status.your-domain.com
