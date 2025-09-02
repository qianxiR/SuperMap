@echo off
chcp 65001 >nul

echo 🚀 启动前后端联调环境...

echo 📡 检查后端服务状态...
curl -s http://localhost:8000/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ 后端服务运行正常 (http://localhost:8000)
) else (
    echo ❌ 后端服务未运行，请先启动后端服务
    echo 💡 在后端目录运行: python -m uvicorn user.main:app --reload --host 0.0.0.0 --port 8000
    pause
    exit /b 1
)

echo 🌐 启动前端开发服务器...
echo 📱 前端地址: http://localhost:5173
echo 🔗 后端API: http://localhost:8000/api/v1
echo 📚 API文档: http://localhost:8000/docs

npm run dev
