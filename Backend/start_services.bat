@echo off
chcp 65001 >nul
echo ========================================
echo     SuperMap 后端服务批量启动脚本
echo ========================================
echo.

:: 设置颜色
color 0A

echo [INFO] 检查并终止占用端口的进程...
echo.

:: 终止占用端口8087的进程 (Analysis服务)
echo 检查端口 8087...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8087') do (
    echo 终止进程 %%a (端口 8087)
    taskkill /f /pid %%a >nul 2>&1
)

:: 终止占用端口8088的进程 (User服务)  
echo 检查端口 8088...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8088') do (
    echo 终止进程 %%a (端口 8088)
    taskkill /f /pid %%a >nul 2>&1
)

echo 端口检查完成
echo.
echo [INFO] 正在启动后端服务...
echo.

:: 启动 Analysis 服务 (Node.js)
echo [1/2] 启动 Analysis 服务 (Node.js)...
start "Analysis Service" cmd /k "cd /d %~dp0analysis && echo 启动 Analysis 服务... && npm run dev"

:: 等待2秒
timeout /t 2 /nobreak >nul

:: 启动 User 服务 (Python FastAPI)
echo [2/2] 启动 User 服务 (Python FastAPI)...
start "User Service" cmd /k "cd /d %~dp0 && echo 激活 conda py310 环境... && conda activate py310 && echo 启动 User 服务... && python -m uvicorn user.main:app --reload --host 0.0.0.0 --port 8088"

echo.
echo ========================================
echo     服务启动完成！
echo ========================================
echo.
echo Analysis 服务: 运行在独立窗口 (http://0.0.0.0:8087)
echo User 服务: 运行在独立窗口 (http://0.0.0.0:8088)
echo.
echo 按任意键关闭此窗口...
pause >nul
