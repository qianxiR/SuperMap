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

:: 终止占用端口8090的进程 (Agent服务)
echo 检查端口 8090...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8090') do (
    echo 终止进程 %%a (端口 8090)
    taskkill /f /pid %%a >nul 2>&1
)

echo 端口检查完成
echo.
:: 询问是否启动 ngrok 隧道
echo [INFO] 是否启动 ngrok 隧道？(y/n)
set /p ngrok_choice="请输入选择 (y/n): "

if /i "%ngrok_choice%"=="y" (
    echo [INFO] 正在启动 ngrok 隧道...
    start "ngrok tunnel" cmd /k "cd /d %~dp0Backend\ngrok && echo 启动 ngrok 隧道... && ngrok http 8087"
    echo 等待 ngrok 启动...
    timeout /t 3 /nobreak >nul
    echo [INFO] 正在更新配置文件...
    cd /d %~dp0Backend\ngrok
    python update_config.py
    cd /d %~dp0
    echo ngrok 隧道启动完成！
    echo.
) else (
    echo 跳过 ngrok 隧道启动
    echo.
)

echo [INFO] 正在启动后端服务和前端服务...
echo.

:: 启动 Analysis 服务 (Node.js)
echo [1/4] 启动 Analysis 服务 (Node.js)...
start "Analysis Service" cmd /k "cd /d %~dp0Backend\analysis && echo 启动 Analysis 服务... && npm run dev"

:: 等待2秒
timeout /t 2 /nobreak >nul

:: 启动 User 服务 (Python FastAPI)
echo [2/4] 启动 User 服务 (Python FastAPI)...
start "User Service" cmd /k "cd /d %~dp0Backend && echo 激活 conda py310 环境... && conda activate py310 && echo 启动 User 服务... && python -m uvicorn user.main:app --reload --host 0.0.0.0 --port 8088"

:: 等待2秒
timeout /t 2 /nobreak >nul

:: 启动 Agent 服务 (Python FastAPI)
echo [3/4] 启动 Agent 服务 (Python FastAPI)...
start "Agent Service" cmd /k "cd /d %~dp0Backend && echo 激活 conda py310 环境... && conda activate py310 && echo 启动 Agent 服务... && python -m uvicorn agent.app:app --reload --host 0.0.0.0 --port 8090"

:: 等待2秒
timeout /t 2 /nobreak >nul

:: 启动 Frontend 服务 (Vue.js)
echo [4/4] 启动 Frontend 服务 (Vue.js)...
start "Frontend Service" cmd /k "cd /d %~dp0Frontend && echo 启动 Frontend 服务... && npm run dev"

echo.
echo ========================================
echo     服务启动完成！
echo ========================================
echo.
echo Analysis 服务: 运行在独立窗口 (http://0.0.0.0:8087)
echo User 服务: 运行在独立窗口 (http://0.0.0.0:8088)
echo Agent 服务: 运行在独立窗口 (http://0.0.0.0:8090)
echo Frontend 服务: 运行在独立窗口 (http://localhost:5173)
if /i "%ngrok_choice%"=="y" (
    echo ngrok 隧道: 运行在独立窗口 (公网访问)
    echo 配置文件已自动更新为最新的 ngrok 地址
)
echo.
echo 🚀 Agent服务功能:
echo    - LLM聊天 (自动注入prompt.md): http://0.0.0.0:8090/agent/chat
echo    - API密钥管理: http://0.0.0.0:8090/api/v1/api-keys
echo    - 提示词管理: http://0.0.0.0:8090/api/v1/prompts
echo    - 知识库管理: http://0.0.0.0:8090/api/v1/knowledge
echo    - API文档: http://0.0.0.0:8090/docs
echo.
echo 按任意键关闭此窗口...
pause >nul
