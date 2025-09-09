# 使用 ngrok 公网穿透方案

## 步骤1：安装 ngrok

### 方法A：直接下载安装
1. 访问 https://ngrok.com/download
2. 下载 Windows 版本
3. 解压到任意目录（建议 C:\ngrok\）
4. 将 ngrok.exe 所在目录添加到系统环境变量 PATH

### 方法B：使用 Chocolatey（推荐）
```powershell
# 如果没有 Chocolatey，先安装：
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# 安装 ngrok
choco install ngrok
```

## 步骤2：注册并获取 Auth Token
1. 访问 https://dashboard.ngrok.com/signup 注册账号
2. 登录后访问 https://dashboard.ngrok.com/get-started/your-authtoken
3. 复制你的 authtoken
4. 在 PowerShell 中配置：
```powershell
ngrok config add-authtoken YOUR_TOKEN_HERE
```

## 步骤3：启动服务
1. 先启动 FastAPI 服务
2. 再启动 ngrok 穿透
3. 复制生成的公网地址更新到 OpenAPI schema

## 注意事项
- 免费版 ngrok 每次重启会生成新的随机域名
- 付费版可以使用固定域名
- 确保防火墙允许 ngrok 访问网络
