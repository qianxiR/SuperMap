@echo off
echo 启动代理服务器...

REM 检查Python
python --version >nul 2>&1
if errorlevel 1 (
    echo 错误: 未找到Python
    pause
    exit /b 1
)

REM 安装依赖
pip install -r requirements_proxy.txt >nul 2>&1

REM 启动服务器
echo 目标: http://127.0.0.1:8087
echo 代理: http://117.175.156.232:5001
echo.
set USE_GUNICORN=false
python proxy_server.py

pause
