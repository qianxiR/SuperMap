# Dify代理服务器 (Windows兼容版)

将外部请求转发到本地8087服务的Flask代理服务器，专为Windows系统优化。

## 功能特性

- 支持所有HTTP方法（GET、POST、PUT、DELETE、PATCH、OPTIONS）
- 完整的请求/响应转发
- 详细的日志记录
- 错误处理和超时控制
- 健康检查接口
- Windows兼容的生产服务器 (Waitress)

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements_proxy.txt
```

### 2. 启动服务

```bash
# Windows - 使用Waitress生产服务器 (推荐)
start_proxy_waitress.bat

# Windows - 使用Flask开发服务器
start_proxy.bat

# 直接运行
python proxy_server.py
```

### 3. 测试服务

```bash
# 健康检查
curl http://117.175.156.232:5001/health

# 代理请求
curl http://117.175.156.232:5001/your-endpoint -X POST -d '{"foo":"bar"}'
```

## 服务器选择

### Waitress (推荐 - Windows生产服务器)
- ✅ Windows完全兼容
- ✅ 生产级性能
- ✅ 多线程处理
- ✅ 自动重启机制

### Flask开发服务器
- ⚠️ 仅用于开发测试
- ⚠️ 单线程处理
- ⚠️ 性能有限

## 配置说明

### 环境变量

```bash
# 服务器选择
USE_WAITRESS=true          # 使用Waitress生产服务器
USE_WAITRESS=false         # 使用Flask开发服务器

# 目标服务配置
TARGET_HOST=127.0.0.1
TARGET_PORT=8087

# 请求配置
REQUEST_TIMEOUT=30
```

## 使用场景

### Dify工作流集成

在Dify工作流中配置HTTP请求节点：

```
URL: http://117.175.156.232:5001/your-endpoint
Method: POST
Headers: Content-Type: application/json
Body: {"your": "data"}
```

### 外部API调用

```bash
curl -X POST http://117.175.156.232:5001/api/v1/spatial-analysis/buffer \
  -H "Content-Type: application/json" \
  -d '{
    "sourceLayerId": "wuhan_schools",
    "bufferSettings": {
      "radius": 100,
      "semicircleLineSegment": 10
    }
  }'
```

## 架构说明

```
外部请求 → 117.175.156.232:5001 → 127.0.0.1:8087
    ↓              ↓                    ↓
  Dify/Client   Waitress/Flask       本地API服务
```

## 日志文件

- `proxy.log`: 详细的请求/响应日志
- 控制台输出: 实时日志信息

## 故障排除

### 常见问题

1. **连接错误 (502)**
   - 检查本地8087服务是否启动
   - 确认TARGET_HOST和TARGET_PORT配置正确

2. **请求超时 (504)**
   - 增加REQUEST_TIMEOUT配置值
   - 检查本地服务响应速度

3. **权限问题**
   - 确认服务器防火墙允许5001端口访问
   - 检查Windows防火墙设置

### 调试模式

```bash
# 使用Flask开发服务器进行调试
set USE_WAITRESS=false
python proxy_server.py
```

## Windows特定说明

- **Waitress**: Windows兼容的生产级WSGI服务器
- **自动检测**: 程序会自动检测操作系统并选择合适的服务器
- **防火墙**: 确保Windows防火墙允许5001端口访问
- **权限**: 以管理员身份运行可能需要额外配置

## 安全建议

1. 使用HTTPS（配置SSL证书）
2. 配置Windows防火墙规则
3. 定期更新依赖包
4. 监控日志文件大小
5. 使用非管理员账户运行服务

## 许可证

MIT License