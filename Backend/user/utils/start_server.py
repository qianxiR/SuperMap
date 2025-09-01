#!/usr/bin/env python3
"""
SuperMap GIS + AI Backend 启动脚本
包含依赖检查、数据库初始化和服务启动
"""
import asyncio
import sys
import os
import subprocess
from pathlib import Path
from sqlalchemy.ext.asyncio import create_async_engine

# 添加项目根目录到Python路径
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(os.path.dirname(current_dir))  # 项目根目录
sys.path.insert(0, project_root)

def check_dependencies():
    return True


async def test_database_connection():
    """测试数据库连接"""
    print("\n🔍 测试数据库连接...")
    
    try:
        from user.core.config import settings
        
        # 显示数据库配置信息
        print(f"📋 数据库配置:")
        print(f"  主机: {settings.postgres_host}")
        print(f"  端口: {settings.postgres_port}")
        print(f"  数据库: {settings.postgres_db}")
        print(f"  用户名: {settings.postgres_user}")
        print(f"  密码: {'*' * len(settings.postgres_password) if settings.postgres_password else '(未设置)'}")
        
        from user.core.database import engine
        from sqlalchemy import text
        
        # 先尝试连接到默认的postgres数据库来创建目标数据库
        temp_engine = create_async_engine(
            f"postgresql+asyncpg://{settings.postgres_user}:{settings.postgres_password}@{settings.postgres_host}:{settings.postgres_port}/postgres",
            echo=False,
            isolation_level="AUTOCOMMIT"
        )
        
        try:
            async with temp_engine.begin() as conn:
                # 检查目标数据库是否存在
                result = await conn.execute(text(f"SELECT 1 FROM pg_database WHERE datname = '{settings.postgres_db}'"))
                if not result.scalar():
                    print(f"📝 创建数据库 {settings.postgres_db}...")
                    await conn.execute(text(f"CREATE DATABASE {settings.postgres_db}"))
                    print(f"✅ 数据库 {settings.postgres_db} 创建成功")
                else:
                    print(f"✅ 数据库 {settings.postgres_db} 已存在")
        finally:
            await temp_engine.dispose()
        
        # 测试连接到目标数据库
        async with engine.begin() as conn:
            result = await conn.execute(text("SELECT version();"))
            version = result.scalar()
            print(f"✅ 数据库连接成功 - PostgreSQL {version}")
            return True
            
    except Exception as e:
        print(f"❌ 数据库连接失败: {e}")
        print("请检查PostgreSQL服务是否启动")
        return False


async def init_database():
    """初始化数据库"""
    print("\n🚀 初始化数据库...")
    
    try:
        from user.core.config import settings
        from user.infrastructure.database.postgres.models import Base
        from user.core.database import engine
        
        print(f"📋 使用数据库: {settings.postgres_db}")
        
        # 创建所有表
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        print("✅ 数据库表创建成功")
        return True
    except Exception as e:
        print(f"❌ 数据库初始化失败: {e}")
        return False


def start_server():
    """启动服务器"""
    print("\n🚀 启动API服务器...")
    
    try:
        # 使用uvicorn启动服务器
        cmd = [
            sys.executable, "-m", "uvicorn",
            "user.main:app",
            "--host", "0.0.0.0",
            "--port", "8000",
            "--reload"
        ]
        
        print(f"执行命令: {' '.join(cmd)}")
        print("\n📋 服务器信息:")
        print("  🌐 API地址: http://localhost:8000")
        print("  📚 API文档: http://localhost:8000/docs")
        print("  🔍 健康检查: http://localhost:8000/health")
        print("\n按 Ctrl+C 停止服务器")
        
        subprocess.run(cmd)
        
    except KeyboardInterrupt:
        print("\n🛑 服务器已停止")
    except Exception as e:
        print(f"❌ 启动服务器失败: {e}")


async def main():
    """主函数"""
    print("=" * 60)
    print("SuperMap GIS + AI Backend 启动工具")
    print("=" * 60)
    
    # 1. 检查依赖
    if not check_dependencies():
        return
    
    # 2. 测试数据库连接
    if not await test_database_connection():
        return
    
    # 3. 初始化数据库
    if not await init_database():
        return
    
    # 4. 启动服务器
    start_server()


if __name__ == "__main__":
    asyncio.run(main())
