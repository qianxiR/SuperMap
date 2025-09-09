#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Dify代理服务器
将外部请求转发到本地8087服务
"""

from flask import Flask, request, Response, jsonify
import requests
import logging
import time
from datetime import datetime
import json
import platform

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('proxy.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# 本地API服务地址
TARGET_BASE_URL = "http://127.0.0.1:8087"

# 请求超时设置
REQUEST_TIMEOUT = 30

@app.before_request
def log_request_info():
    """记录请求信息"""
    logger.info(f"收到请求: {request.method} {request.url}")
    logger.info(f"请求头: {dict(request.headers)}")
    if request.is_json:
        logger.info(f"请求体: {request.get_json()}")

@app.after_request
def log_response_info(response):
    """记录响应信息"""
    logger.info(f"响应状态: {response.status_code}")
    return response

@app.route("/health", methods=["GET"])
def health_check():
    """健康检查接口"""
    return jsonify({
        "status": "healthy",
        "service": "Dify Proxy Server",
        "target": TARGET_BASE_URL,
        "platform": platform.system(),
        "timestamp": datetime.now().isoformat()
    })

@app.route("/<path:path>", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
def proxy_request(path):
    """代理所有请求到本地服务"""
    try:
        # 构造目标URL
        target_url = f"{TARGET_BASE_URL}/{path}"
        
        # 记录开始时间
        start_time = time.time()
        
        # 准备请求头（过滤hop-by-hop头部，避免冲突）
        hop_by_hop_headers = {
            'connection', 'keep-alive', 'proxy-authenticate',
            'proxy-authorization', 'te', 'trailers', 'transfer-encoding',
            'upgrade', 'host'
        }
        headers = {}
        for key, value in request.headers:
            if key.lower() not in hop_by_hop_headers:
                headers[key] = value
        
        # 准备请求数据
        request_data = None
        if request.method in ["POST", "PUT", "PATCH"]:
            if request.is_json:
                request_data = json.dumps(request.get_json(), ensure_ascii=False)
                headers["Content-Type"] = "application/json"
            else:
                request_data = request.get_data()
        
        # 转发请求
        logger.info(f"转发请求到: {target_url}")
        response = requests.request(
            method=request.method,
            url=target_url,
            headers=headers,
            params=request.args,
            data=request_data,
            cookies=request.cookies,
            allow_redirects=False,
            timeout=REQUEST_TIMEOUT
        )
        
        # 计算响应时间
        response_time = time.time() - start_time
        logger.info(f"响应时间: {response_time:.3f}s")
        
        # 准备响应头（过滤hop-by-hop头部）
        hop_by_hop_response_headers = {
            'connection', 'keep-alive', 'proxy-authenticate',
            'proxy-authorization', 'te', 'trailers', 'transfer-encoding',
            'upgrade', 'content-encoding', 'content-length'
        }
        response_headers = []
        for key, value in response.raw.headers.items():
            if key.lower() not in hop_by_hop_response_headers:
                response_headers.append((key, value))
        
        # 返回响应
        return Response(
            response.content,
            status=response.status_code,
            headers=response_headers
        )
        
    except requests.exceptions.Timeout:
        logger.error("请求超时")
        return jsonify({
            "error": "请求超时",
            "message": "本地服务响应超时，请稍后重试"
        }), 504
        
    except requests.exceptions.ConnectionError:
        logger.error("连接错误")
        return jsonify({
            "error": "连接错误",
            "message": "无法连接到本地服务，请检查服务是否启动"
        }), 502
        
    except Exception as e:
        logger.error(f"代理请求失败: {str(e)}")
        return jsonify({
            "error": "代理请求失败",
            "message": str(e)
        }), 500

@app.errorhandler(404)
def not_found(error):
    """404错误处理"""
    return jsonify({
        "error": "路径不存在",
        "message": f"请求的路径 {request.path} 不存在"
    }), 404

@app.errorhandler(500)
def internal_error(error):
    """500错误处理"""
    return jsonify({
        "error": "服务器内部错误",
        "message": "代理服务器发生内部错误"
    }), 500

if __name__ == "__main__":
    import os
    
    # 检测操作系统
    system = platform.system()
    logger.info(f"检测到操作系统: {system}")
    
    # 检查是否使用Waitress (Windows生产服务器)
    use_waitress = os.getenv("USE_WAITRESS", "true").lower() == "true"
    
    if system == "Windows" and use_waitress:
        try:
            from waitress import serve
            logger.info("使用Waitress生产服务器启动 (Windows兼容)...")
            logger.info(f"目标服务: {TARGET_BASE_URL}")
            logger.info("监听地址: 0.0.0.0:5001")
            logger.info("工作线程: 4")
            
            # 使用Waitress启动 (Windows兼容的生产服务器)
            serve(app, host="0.0.0.0", port=5001, threads=4)
            
        except ImportError:
            logger.warning("Waitress未安装，使用Flask开发服务器")
            use_waitress = False
    
    if not use_waitress:
        logger.info("使用Flask开发服务器启动...")
        logger.info(f"目标服务: {TARGET_BASE_URL}")
        logger.info("监听地址: 0.0.0.0:5001")
        if system == "Windows":
            logger.warning("警告: 这是开发服务器，建议安装Waitress用于生产环境")
        
        # 启动Flask开发服务器
        app.run(
            host="0.0.0.0",
            port=5001,
            debug=False,
            threaded=True
        )