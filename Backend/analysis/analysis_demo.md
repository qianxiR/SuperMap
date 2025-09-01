# 分析服务API接口定义

## 设计说明

### SuperMap服务集成
- 保留SuperMap iServer服务调用
- 通过我们的API接口封装SuperMap分析功能
- 提供统一的REST API接口给前端调用
- 支持异步任务处理和状态跟踪

---

## 1. 服务区分析 (Service Area Analysis)

### API接口定义
```http
POST /api/v1/analysis/service-area
Content-Type: application/json
```

### 请求参数
```json
{
  "name": "服务区分析任务",
  "description": "分析指定中心点的服务覆盖范围",
  "facility_points": [
    {
      "id": "facility_001",
      "name": "医院A",
      "geometry": {
        "type": "Point",
        "coordinates": [116.3974, 39.9093]
      },
      "attributes": {
        "type": "hospital",
        "capacity": 1000
      }
    }
  ],
  "break_values": [5, 10, 15, 20],
  "break_units": "minutes",
  "impedance": "time",
  "travel_mode": "driving",
  "supermap_config": {
    "service_url": "https://iserver.supermap.io/iserver/services/networkanalyst-changchun/restjsr/networkanalyst",
    "dataset": "RoadNet@Changchun",
    "weight_field": "length",
    "result_setting": {
      "returnEdgeFeatures": true,
      "returnEdgeGeometry": true,
      "returnNodeFeatures": true,
      "returnNodeGeometry": true,
      "returnPathGuides": true,
      "returnRoutes": true
    }
  },
  "include_geometry": true,
  "include_attributes": true
}
```

### 响应数据
```json
{
  "success": true,
  "message": "服务区分析任务创建成功",
  "data": {
    "task_id": "task_123456",
    "task_name": "服务区分析任务",
    "status": "pending",
    "supermap_request": {
      "centers": [{"x": 116.3974, "y": 39.9093}],
      "isAnalyzeById": false,
      "parameter": {
        "resultSetting": {...},
        "weightFieldName": "length"
      }
    }
  }
}
```

### SuperMap服务调用
```javascript
// 内部调用SuperMap服务
var parameter = new ol.supermap.FindServiceAreasParameters({
    centers: [point],
    isAnalyzeById: false,
    parameter: analystParameter
});

new ol.supermap.NetworkAnalystService(serviceUrl).findServiceAreas(parameter)
```

---

## 2. 最优路径分析 (Optimal Path Analysis)

### API接口定义
```http
POST /api/v1/analysis/path
Content-Type: application/json
```

### 请求参数
```json
{
  "name": "最优路径分析任务",
  "description": "计算起点到终点的最优路径",
  "origin": {
    "geometry": {
      "type": "Point",
      "coordinates": [116.3974, 39.9093]
    },
    "attributes": {
      "name": "起点A",
      "type": "origin"
    }
  },
  "destination": {
    "geometry": {
      "type": "Point",
      "coordinates": [116.4074, 39.9193]
    },
    "attributes": {
      "name": "终点B",
      "type": "destination"
    }
  },
  "waypoints": [
    {
      "geometry": {
        "type": "Point",
        "coordinates": [116.4024, 39.9143]
      },
      "attributes": {
        "name": "途经点1",
        "type": "waypoint"
      }
    }
  ],
  "impedance": "time",
  "travel_mode": "driving",
  "optimization": "fastest",
  "supermap_config": {
    "service_url": "https://iserver.supermap.io/iserver/services/networkanalyst-changchun/restjsr/networkanalyst",
    "dataset": "RoadNet@Changchun",
    "weight_field": "length",
    "result_setting": {
      "returnEdgeFeatures": true,
      "returnEdgeGeometry": true,
      "returnNodeFeatures": true,
      "returnNodeGeometry": true,
      "returnPathGuides": true,
      "returnRoutes": true
    }
  },
  "include_geometry": true,
  "include_guide": true
}
```

### 响应数据
```json
{
  "success": true,
  "message": "最优路径分析任务创建成功",
  "data": {
    "task_id": "task_123457",
    "task_name": "最优路径分析任务",
    "status": "pending",
    "supermap_request": {
      "nodes": [
        {"x": 116.3974, "y": 39.9093},
        {"x": 116.4024, "y": 39.9143},
        {"x": 116.4074, "y": 39.9193}
      ],
      "hasLeastEdgeCount": false,
      "parameter": {
        "resultSetting": {...},
        "weightFieldName": "length"
      }
    }
  }
}
```

### SuperMap服务调用
```javascript
// 内部调用SuperMap服务
var findPathParameter = new ol.supermap.FindPathParameters({
    isAnalyzeById: false,
    nodes: [originPoint, waypoint, destinationPoint],
    hasLeastEdgeCount: false,
    parameter: analystParameter
});

new ol.supermap.NetworkAnalystService(serviceUrl).findPath(findPathParameter)
```

---

## 3. 缓冲区分析 (Buffer Analysis)

### API接口定义
```http
POST /api/v1/analysis/buffer
Content-Type: application/json
```

### 请求参数
```json
{
  "name": "缓冲区分析任务",
  "description": "对指定几何要素进行缓冲区分析",
  "input_geometry": {
    "type": "LineString",
    "coordinates": [[116.3974, 39.9093], [116.4074, 39.9193]]
  },
  "buffer_settings": {
    "distance": 100,
    "unit": "meters",
    "end_type": "round",
    "join_type": "round",
    "semicircle_line_segment": 10,
    "left_distance": 100,
    "right_distance": 100
  },
  "supermap_config": {
    "service_url": "https://iserver.supermap.io/iserver/services/spatialanalyst-changchun/restjsr/spatialanalyst",
    "dataset": "RoadLine2@Changchun",
    "filter_query": "NAME='团结路'"
  },
  "coordinate_system": "EPSG:4326",
  "include_attributes": true,
  "output_format": "geojson"
}
```

### 响应数据
```json
{
  "success": true,
  "message": "缓冲区分析任务创建成功",
  "data": {
    "task_id": "task_123458",
    "task_name": "缓冲区分析任务",
    "status": "pending",
    "supermap_request": {
      "dataset": "RoadLine2@Changchun",
      "filterQueryParameter": {
        "attributeFilter": "NAME='团结路'"
      },
      "bufferSetting": {
        "endType": "ROUND",
        "leftDistance": {"value": 100},
        "rightDistance": {"value": 100},
        "semicircleLineSegment": 10
      }
    }
  }
}
```

### SuperMap服务调用
```javascript
// 内部调用SuperMap服务
var dsBufferAnalystParameters = new ol.supermap.DatasetBufferAnalystParameters({
    dataset: "RoadLine2@Changchun",
    filterQueryParameter: new ol.supermap.FilterParameter({
        attributeFilter: "NAME='团结路'"
    }),
    bufferSetting: new ol.supermap.BufferSetting({
        endType: ol.supermap.BufferEndType.ROUND,
        leftDistance: {value: 100},
        rightDistance: {value: 100},
        semicircleLineSegment: 10
    })
});

new ol.supermap.SpatialAnalystService(serviceUrl).bufferAnalysis(dsBufferAnalystParameters)
```

---

## 4. 任务状态查询

### API接口定义
```http
GET /api/v1/analysis/tasks/{task_id}
```

### 响应数据
```json
{
  "success": true,
  "data": {
    "task_id": "task_123456",
    "name": "服务区分析任务",
    "type": "service_area",
    "status": "completed",
    "progress": 100,
    "created_at": "2024-01-01T10:00:00Z",
    "started_at": "2024-01-01T10:00:05Z",
    "completed_at": "2024-01-01T10:00:30Z",
    "supermap_result": {
      "service_areas": [
        {
          "facility_id": "facility_001",
          "break_value": 5,
          "geometry": {
            "type": "Polygon",
            "coordinates": [[[116.39, 39.90], [116.40, 39.91], ...]]
          },
          "area": 1250000,
          "attributes": {
            "coverage_ratio": 0.85
          }
        }
      ],
      "statistics": {
        "total_area": 5000000,
        "total_population": 200000,
        "average_coverage": 0.78
      }
    }
  }
}
```

---

## 5. 任务列表查询

### API接口定义
```http
GET /api/v1/analysis/tasks?status=completed&type=service_area&limit=10&offset=0
```

### 响应数据
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "task_id": "task_123456",
        "name": "服务区分析任务",
        "type": "service_area",
        "status": "completed",
        "created_at": "2024-01-01T10:00:00Z",
        "supermap_service": "networkanalyst-changchun"
      }
    ],
    "total": 100,
    "limit": 10,
    "offset": 0
  }
}
```

---

## 6. 通用错误响应

### 错误响应格式
```json
{
  "success": false,
  "message": "错误描述",
  "error_code": "ANALYSIS_ERROR",
  "details": {
    "field": "错误字段",
    "reason": "具体错误原因",
    "supermap_error": "SuperMap服务错误信息"
  }
}
```

### 常见错误码
- `INVALID_GEOMETRY`: 几何数据无效
- `INVALID_PARAMETERS`: 参数无效
- `ANALYSIS_FAILED`: 分析失败
- `SUPERMAP_SERVICE_ERROR`: SuperMap服务错误
- `TASK_NOT_FOUND`: 任务不存在
- `SERVICE_UNAVAILABLE`: 服务不可用

---

## 7. SuperMap服务配置

### 服务配置示例
```json
{
  "supermap_services": {
    "network_analyst": {
      "service_url": "https://iserver.supermap.io/iserver/services/networkanalyst-changchun/restjsr/networkanalyst",
      "dataset": "RoadNet@Changchun",
      "weight_field": "length",
      "timeout": 30000
    },
    "spatial_analyst": {
      "service_url": "https://iserver.supermap.io/iserver/services/spatialanalyst-changchun/restjsr/spatialanalyst",
      "timeout": 30000
    }
  }
}
```

---

## 设计特点

### 1. **SuperMap服务集成**
- 保留SuperMap iServer服务调用
- 通过配置管理SuperMap服务参数
- 支持多种SuperMap服务类型

### 2. **统一API接口**
- 提供标准化的REST API
- 统一的请求/响应格式
- 支持异步任务处理

### 3. **灵活配置**
- 可配置的SuperMap服务参数
- 支持多种分析类型
- 可扩展的分析配置

### 4. **错误处理**
- 完整的错误响应机制
- SuperMap服务错误处理
- 详细的错误信息返回

### 后续更新计划
1. **API接口设计**: 基于以上定义更新FastAPI接口
2. **SuperMap服务集成**: 实现SuperMap服务调用逻辑
3. **任务管理**: 实现异步任务处理和状态跟踪
4. **数据库设计**: 优化任务和结果存储结构