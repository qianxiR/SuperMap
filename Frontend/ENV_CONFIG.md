# SuperMap 环境变量配置说明

## 概述
本项目支持通过环境变量配置 SuperMap iServer 服务的连接参数，避免硬编码服务路径。

## 环境变量列表

### 基础服务配置
| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `VITE_SUPERMAP_BASE_URL` | `http://localhost:8090` | SuperMap iServer 基础服务器地址 |
| `VITE_SUPERMAP_MAP_SERVICE` | `iserver/services/map-guanlifenxipingtai/rest` | 地图服务路径 |
| `VITE_SUPERMAP_DATA_SERVICE` | `iserver/services/data-guanlifenxipingtai/rest/data` | 数据服务路径 |

### 工作空间配置
| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `VITE_SUPERMAP_WORKSPACE` | `wuhan` | 数据源工作空间名称 |
| `VITE_SUPERMAP_MAP_NAME` | `wuhan_map` | 地图服务中的地图名称 |
| `VITE_SUPERMAP_DATASET_NAME` | `` | 数据集名称（可选） |

### 地图边界配置
| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `VITE_SUPERMAP_MAP_EXTENT` | `113.7,29.97,115.08,31.36` | 地图边界范围 [minLon,minLat,maxLon,maxLat] |
| `VITE_SUPERMAP_MAP_CENTER` | `114.37,30.69` | 地图中心点 [lon,lat] |
| `VITE_SUPERMAP_MAP_ZOOM` | `8` | 初始缩放级别 |

### 底图服务配置
| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `VITE_SUPERMAP_BASEMAP_LIGHT` | SuperMap在线浅色底图 | 浅色主题底图服务地址 |
| `VITE_SUPERMAP_BASEMAP_DARK` | SuperMap在线深色底图 | 深色主题底图服务地址 |
| `VITE_SUPERMAP_FALLBACK_BASEMAP_LIGHT` | 备用浅色底图 | 备用浅色主题底图服务地址 |
| `VITE_SUPERMAP_FALLBACK_BASEMAP_DARK` | 备用深色底图 | 备用深色主题底图服务地址 |

### API 配置
| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `VITE_API_TIMEOUT` | `10000` | API 请求超时时间（毫秒） |
| `VITE_API_RETRY_COUNT` | `3` | API 请求重试次数 |
| `VITE_DEV_MODE` | `true` | 开发模式标识 |

## 配置示例

### 使用 data-WuHan 服务
```bash
# .env 或 .env.production
VITE_SUPERMAP_BASE_URL=http://localhost:8090
VITE_SUPERMAP_MAP_SERVICE=iserver/services/map-WuHan/rest
VITE_SUPERMAP_DATA_SERVICE=iserver/services/data-WuHan/rest/data
VITE_SUPERMAP_WORKSPACE=wuhan
VITE_SUPERMAP_MAP_NAME=武汉

# 地图边界配置（可选，使用默认值）
VITE_SUPERMAP_MAP_EXTENT=113.7,29.97,115.08,31.36
VITE_SUPERMAP_MAP_CENTER=114.37,30.69
VITE_SUPERMAP_MAP_ZOOM=8
```

### 使用 data-guanlifenxipingtai 服务（默认）
```bash
# .env 或 .env.production
VITE_SUPERMAP_BASE_URL=http://localhost:8090
VITE_SUPERMAP_MAP_SERVICE=iserver/services/map-guanlifenxipingtai/rest
VITE_SUPERMAP_DATA_SERVICE=iserver/services/data-guanlifenxipingtai/rest/data
VITE_SUPERMAP_WORKSPACE=wuhan
VITE_SUPERMAP_MAP_NAME=wuhan_map

# 地图边界配置（可选，使用默认值）
VITE_SUPERMAP_MAP_EXTENT=113.7,29.97,115.08,31.36
VITE_SUPERMAP_MAP_CENTER=114.37,30.69
VITE_SUPERMAP_MAP_ZOOM=8
```

## 生成的 URL 示例

### 数据服务 URL
- **配置**: `VITE_SUPERMAP_DATA_SERVICE=iserver/services/data-WuHan/rest/data`
- **生成**: `http://localhost:8090/iserver/services/data-WuHan/rest/data/datasources/wuhan/datasets/水系线/features.json`

### 地图服务 URL
- **配置**: `VITE_SUPERMAP_MAP_SERVICE=iserver/services/map-WuHan/rest`
- **生成**: `http://localhost:8090/iserver/services/map-WuHan/rest/maps/武汉`

## 注意事项

1. **环境变量优先级**: 环境变量值会覆盖代码中的默认值
2. **开发环境**: 使用 `.env` 文件配置开发环境
3. **生产环境**: 使用 `.env.production` 文件配置生产环境
4. **安全考虑**: 不要将包含敏感信息的 `.env` 文件提交到版本控制系统
5. **重启服务**: 修改环境变量后需要重启开发服务器才能生效

## 故障排除

### 问题：实际访问的 URL 与配置不符
**原因**: 环境变量未正确设置或未生效
**解决**: 
1. 检查环境变量文件是否存在
2. 确认变量名拼写正确
3. 重启开发服务器
4. 检查浏览器控制台是否有相关错误

### 问题：服务连接失败
**原因**: 服务地址或路径配置错误
**解决**:
1. 验证 SuperMap iServer 服务是否正常运行
2. 检查服务路径是否正确
3. 确认网络连接正常
4. 查看服务器日志获取详细错误信息
