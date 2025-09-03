# Database Storage Service

临时数据存储服务，提供空间数据的CRUD操作和文件存储功能。

## 🚀 快速启动

### 1. 安装依赖
```bash
cd database
pip install -r requirements.txt
```

### 2. 启动服务
```bash
# 方式1: 使用启动脚本
python start_server.py

# 方式2: 直接启动
python -m uvicorn database.main:app --reload --host 0.0.0.0 --port 8002
```

### 3. 访问服务
- **服务地址**: http://localhost:8002
- **API文档**: http://localhost:8002/docs
- **健康检查**: http://localhost:8002/health

## 📋 功能特性

### 空间数据管理
- ✅ 创建、读取、更新、删除空间数据
- ✅ 支持GeoJSON格式
- ✅ 自动计算边界框和要素数量
- ✅ 支持标签和元数据
- ✅ 空间范围查询

### 文件存储
- ✅ 文件上传和下载
- ✅ 支持多种文件格式
- ✅ 文件大小限制（默认100MB）
- ✅ 文件标签管理
- ✅ 批量操作支持

### 数据导出
- ✅ GeoJSON导出到数据库
- ✅ 批量导出支持
- ✅ 多种导出格式
- ✅ 数据验证和统计

## 🔗 API接口

### 空间数据接口 (`/api/v1/spatial-data`)
- `POST /` - 创建空间数据
- `POST /batch` - 批量创建空间数据
- `GET /{data_id}` - 获取空间数据
- `GET /` - 列出空间数据
- `PUT /{data_id}` - 更新空间数据
- `DELETE /{data_id}` - 删除空间数据
- `GET /{data_id}/download` - 下载空间数据
- `POST /{data_id}/validate` - 验证空间数据

### 文件存储接口 (`/api/v1/files`)
- `POST /upload` - 上传文件
- `POST /upload/batch` - 批量上传文件
- `GET /{file_id}` - 获取文件信息
- `GET /` - 列出文件
- `GET /{file_id}/download` - 下载文件
- `DELETE /{file_id}` - 删除文件
- `POST /{file_id}/tags` - 更新文件标签
- `GET /types/supported` - 获取支持的文件类型
- `POST /{file_id}/validate` - 验证文件

### 数据导出接口 (`/api/v1/export`)
- `POST /to-database` - 导出GeoJSON到数据库
- `POST /to-database/batch` - 批量导出到数据库
- `POST /to-file` - 导出到文件
- `GET /formats` - 获取支持的导出格式
- `POST /validate` - 验证导出数据

## 📁 存储结构

```
storage/
├── geojson/           # GeoJSON文件存储
├── files/             # 上传文件存储
├── exports/           # 导出文件存储
├── backups/           # 备份文件
├── spatial_data_metadata.json  # 空间数据元数据
└── files_metadata.json         # 文件元数据
```

## ⚙️ 配置选项

### 环境变量
- `PORT` - 服务端口（默认: 8002）
- `HOST` - 服务主机（默认: 0.0.0.0）
- `STORAGE_PATH` - 存储路径（默认: ./storage）
- `MAX_FILE_SIZE` - 最大文件大小（默认: 100MB）
- `ALLOWED_EXTENSIONS` - 允许的文件扩展名

### 支持的文件类型
- `.geojson` - GeoJSON地理空间数据
- `.json` - JSON数据文件
- `.shp` - ESRI Shapefile
- `.zip` - ZIP压缩文件
- `.csv` - CSV表格数据

## 💡 使用示例

### 1. 导出GeoJSON到数据库
```bash
curl -X POST "http://localhost:8002/api/v1/export/to-database" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "我的分析结果",
    "description": "缓冲区分析结果",
    "geojson_data": {
      "type": "FeatureCollection",
      "features": []
    },
    "tags": ["缓冲区", "分析结果"],
    "metadata": {
      "source": "buffer_analysis",
      "created_by": "user123"
    }
  }'
```

### 2. 上传文件
```bash
curl -X POST "http://localhost:8002/api/v1/files/upload" \
  -F "file=@data.geojson" \
  -F "description=上传的GeoJSON文件" \
  -F "tags=[\"地理数据\", \"测试\"]"
```

### 3. 获取空间数据列表
```bash
curl "http://localhost:8002/api/v1/spatial-data?limit=10&skip=0"
```

## 🔧 开发说明

### 项目结构
```
database/
├── api/               # API接口层
│   └── v1/           # API版本1
├── core/              # 核心模块
│   ├── config.py     # 配置管理
│   └── storage.py    # 存储逻辑
├── schemas/           # 数据模型
├── main.py           # 主入口
├── start_server.py   # 启动脚本
└── requirements.txt  # 依赖文件
```

### 核心类
- `SpatialDataStorage` - 空间数据存储
- `FileStorage` - 文件存储
- `Settings` - 配置管理

## 🚨 注意事项

1. **数据持久化**: 当前使用JSON文件存储元数据，生产环境建议使用数据库
2. **文件安全**: 上传的文件会直接保存到本地，注意文件权限设置
3. **存储空间**: 定期清理不需要的文件和备份
4. **并发安全**: 当前实现不支持高并发，生产环境需要优化

## 📞 技术支持

如有问题，请查看：
1. API文档: http://localhost:8002/docs
2. 服务日志: 控制台输出
3. 健康检查: http://localhost:8002/health