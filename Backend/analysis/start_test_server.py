"""
测试服务器启动脚本
用于启动 Analysis 服务进行测试
"""
import uvicorn
import asyncio
import sys
import os

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from analysis.main import app
from analysis.core.database import init_db


async def setup_database():
    """初始化数据库"""
    try:
        await init_db()
        print("✅ 数据库初始化成功")
    except Exception as e:
        print(f"❌ 数据库初始化失败: {e}")
        print("⚠️  将使用内存存储进行测试")


def start_test_server():
    """启动测试服务器"""
    print("🚀 启动 Analysis 测试服务器")
    print("=" * 50)
    
    # 初始化数据库
    asyncio.run(setup_database())
    
    # 启动服务器
    uvicorn.run(
        "analysis.main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )


if __name__ == "__main__":
    start_test_server()
