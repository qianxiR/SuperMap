@echo off
chcp 65001 >nul
echo ========================================
echo     ngrok 隧道启动脚本
echo ========================================
echo.

:: 设置颜色
color 0B

echo [INFO] 正在启动 ngrok 隧道...
echo.

:: 启动 ngrok 隧道 (端口 8087 - 分析服务)
echo 启动 ngrok 隧道 (端口 8087)...
start "ngrok tunnel" cmd /k "ngrok http 8087"

:: 等待 3 秒让 ngrok 启动
echo 等待 ngrok 启动...
timeout /t 3 /nobreak >nul

:: 更新配置文件
echo [INFO] 正在更新配置文件...
python update_config.py

echo.
echo ========================================
echo     ngrok 隧道启动完成！
echo ========================================
echo.
echo 请查看 ngrok 窗口获取公网地址
echo 配置文件已自动更新
echo.
echo 按任意键关闭此窗口...
pause >nul
