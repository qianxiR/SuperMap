#!/bin/bash

# 前后端联调启动脚本

echo "🚀 启动前后端联调环境..."

# 检查后端服务是否运行
echo "📡 检查后端服务状态..."
if curl -s http://localhost:8000/health > /dev/null; then
    echo "✅ 后端服务运行正常 (http://localhost:8000)"
else
    echo "❌ 后端服务未运行，请先启动后端服务"
    echo "💡 在后端目录运行: python -m uvicorn user.main:app --reload --host 0.0.0.0 --port 8000"
    exit 1
fi

# 启动前端开发服务器
echo "🌐 启动前端开发服务器..."
echo "📱 前端地址: http://localhost:5173"
echo "🔗 后端API: http://localhost:8000/api/v1"
echo "📚 API文档: http://localhost:8000/docs"

npm run dev
