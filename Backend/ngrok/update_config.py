#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ngrok URL 自动更新脚本
从 ngrok API 获取最新的公网地址并更新相关配置文件
"""

import json
import requests
import os
import sys
from pathlib import Path

def get_ngrok_url():
    """从 ngrok API 获取最新的公网地址"""
    try:
        # 获取 ngrok 隧道信息
        response = requests.get('http://localhost:4040/api/tunnels', timeout=5)
        if response.status_code == 200:
            tunnels = response.json()
            for tunnel in tunnels.get('tunnels', []):
                if tunnel.get('proto') == 'https':
                    return tunnel.get('public_url')
        return None
    except Exception as e:
        print(f"获取 ngrok URL 失败: {e}")
        return None

def update_openapi_schema(ngrok_url):
    """更新 OpenAPI schema 文件中的服务器 URL"""
    schema_path = Path(__file__).parent / 'openai_function_schema.json'
    
    try:
        with open(schema_path, 'r', encoding='utf-8') as f:
            schema = json.load(f)
        
        # 更新服务器 URL
        if 'servers' in schema and len(schema['servers']) > 0:
            schema['servers'][0]['url'] = ngrok_url
            print(f"更新 OpenAPI schema 服务器 URL: {ngrok_url}")
        
        with open(schema_path, 'w', encoding='utf-8') as f:
            json.dump(schema, f, indent=2, ensure_ascii=False)
        
        return True
    except Exception as e:
        print(f"更新 OpenAPI schema 失败: {e}")
        return False

def update_frontend_config(ngrok_url):
    """更新前端配置文件中的 API 基础 URL"""
    frontend_config_path = Path(__file__).parent.parent.parent / 'Frontend' / 'src' / 'api' / 'config.ts'
    
    try:
        with open(frontend_config_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 替换硬编码的 ngrok URL
        import re
        pattern = r"https://[a-zA-Z0-9-]+\.ngrok-free\.app"
        new_content = re.sub(pattern, ngrok_url, content)
        
        if new_content != content:
            with open(frontend_config_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"更新前端配置文件 API URL: {ngrok_url}")
            return True
        else:
            print("前端配置文件无需更新")
            return True
            
    except Exception as e:
        print(f"更新前端配置失败: {e}")
        return False

def create_env_file(ngrok_url):
    """创建前端环境变量文件"""
    env_path = Path(__file__).parent.parent.parent / 'Frontend' / '.env.development'
    
    try:
        env_content = f"""# 开发环境配置
VITE_ANALYSIS_SERVICE_BASE_URL={ngrok_url}
VITE_ANALYSIS_SERVICE_API_PREFIX=/api/v1/spatial-analysis
VITE_USER_SERVICE_BASE_URL=http://localhost:8088
VITE_USER_SERVICE_API_PREFIX=/api/v1
VITE_API_TIMEOUT=30000
VITE_API_RETRY_COUNT=3
"""
        
        with open(env_path, 'w', encoding='utf-8') as f:
            f.write(env_content)
        
        print(f"创建环境变量文件: {env_path}")
        return True
    except Exception as e:
        print(f"创建环境变量文件失败: {e}")
        return False

def main():
    """主函数"""
    print("=" * 50)
    print("ngrok URL 自动更新脚本")
    print("=" * 50)
    
    # 获取最新的 ngrok URL
    ngrok_url = get_ngrok_url()
    
    if not ngrok_url:
        print("错误: 无法获取 ngrok URL，请确保 ngrok 正在运行")
        sys.exit(1)
    
    print(f"获取到 ngrok URL: {ngrok_url}")
    
    # 更新配置文件
    success_count = 0
    
    if update_openapi_schema(ngrok_url):
        success_count += 1
    
    if update_frontend_config(ngrok_url):
        success_count += 1
    
    if create_env_file(ngrok_url):
        success_count += 1
    
    print("=" * 50)
    print(f"配置更新完成，成功更新 {success_count}/3 个文件")
    print("=" * 50)

if __name__ == "__main__":
    main()
