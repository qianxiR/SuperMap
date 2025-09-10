#!/usr/bin/env python3
"""
ngrok 配置更新脚本
自动获取当前 ngrok 隧道地址并更新配置文件
"""

import json
import requests
import os
import sys
from pathlib import Path

def get_ngrok_tunnels():
    """获取当前 ngrok 隧道信息"""
    try:
        # ngrok API 地址
        response = requests.get('http://localhost:4040/api/tunnels', timeout=5)
        if response.status_code == 200:
            data = response.json()
            tunnels = data.get('tunnels', [])
            
            # 查找 HTTPS 隧道
            for tunnel in tunnels:
                if tunnel.get('proto') == 'https':
                    return tunnel.get('public_url')
            
            # 如果没有 HTTPS，返回第一个 HTTP 隧道
            if tunnels:
                return tunnels[0].get('public_url')
                
    except Exception as e:
        print(f"获取 ngrok 隧道信息失败: {e}")
    
    return None

def update_openapi_schema(ngrok_url):
    """更新 OpenAPI schema 文件"""
    schema_path = Path(__file__).parent / 'openai_function_schema.json'
    
    try:
        with open(schema_path, 'r', encoding='utf-8') as f:
            schema = json.load(f)
        
        # 更新服务器地址
        if 'servers' in schema and schema['servers']:
            schema['servers'][0]['url'] = ngrok_url
        else:
            schema['servers'] = [{'url': ngrok_url}]
        
        with open(schema_path, 'w', encoding='utf-8') as f:
            json.dump(schema, f, indent=2, ensure_ascii=False)
        
        print(f"✅ 已更新 OpenAPI schema: {ngrok_url}")
        return True
        
    except Exception as e:
        print(f"❌ 更新 OpenAPI schema 失败: {e}")
        return False

def update_frontend_config(ngrok_url):
    """更新前端配置文件"""
    frontend_config_path = Path(__file__).parent.parent.parent / 'Frontend' / 'src' / 'api' / 'config.ts'
    
    try:
        with open(frontend_config_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 替换 ngrok 地址
        import re
        pattern = r"baseUrl: `\$\{import\.meta\.env\.VITE_ANALYSIS_SERVICE_BASE_URL \|\| '[^']*'\}"
        replacement = f"baseUrl: `${{import.meta.env.VITE_ANALYSIS_SERVICE_BASE_URL || '{ngrok_url}'}}"
        
        new_content = re.sub(pattern, replacement, content)
        
        if new_content != content:
            with open(frontend_config_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"✅ 已更新前端配置: {ngrok_url}")
            return True
        else:
            print("⚠️  前端配置无需更新")
            return True
            
    except Exception as e:
        print(f"❌ 更新前端配置失败: {e}")
        return False

def main():
    """主函数"""
    print("🔍 正在获取 ngrok 隧道信息...")
    
    ngrok_url = get_ngrok_tunnels()
    
    if not ngrok_url:
        print("❌ 未找到 ngrok 隧道，请确保 ngrok 正在运行")
        print("💡 启动命令: ngrok http 8087")
        sys.exit(1)
    
    print(f"🌐 找到 ngrok 隧道: {ngrok_url}")
    
    # 更新配置文件
    success1 = update_openapi_schema(ngrok_url)
    success2 = update_frontend_config(ngrok_url)
    
    if success1 and success2:
        print("🎉 配置更新完成！")
        print(f"📋 服务地址: {ngrok_url}")
        print("🔄 请重启前端服务以应用新配置")
    else:
        print("❌ 配置更新失败")
        sys.exit(1)

if __name__ == '__main__':
    main()
