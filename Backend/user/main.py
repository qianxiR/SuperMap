"""
SuperMap GIS + AI Backend - FastAPI应用主入口
"""
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uvicorn

from user.core.config import settings
from user.api.v1 import api_v1_router

'''
python -m uvicorn user.main:app --reload --host 0.0.0.0 --port 8088

'''

@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时执行
    print("🚀 User Service 正在启动...")
    print(f"📊 配置环境: {settings.environment}")
    print(f"🔐 JWT算法: {settings.algorithm}")
    print("📚 DOCUMENT: http://localhost:8088/docs")
    print("📄 JSON: http://localhost:8088/openapi.json")
    print("🔍 健康检查: http://localhost:8088/health")
    yield
    # 关闭时执行
    print("🛑 User Service 正在关闭...")


# 创建FastAPI应用实例
app = FastAPI(
    title="User Service",
    version="1.0.0",
    description="用户管理微服务 - 提供用户认证、授权和用户信息管理功能",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# 配置CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 全局异常处理器
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """HTTP异常处理器"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.detail,
            "error_code": exc.status_code
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """通用异常处理器"""
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "服务器内部错误",
            "detail": str(exc) if settings.debug else None,
            "error_code": 500
        }
    )


# 保留最小接口集：仅通过统一路由器暴露API


# 根级健康检查（便于外部探活 /health）
@app.get("/health")
async def root_health() -> dict:
    return {"status": "ok"}


# 注册API路由 - 使用统一的路由管理器
app.include_router(
    api_v1_router,
    prefix=settings.api_v1_prefix
)

# 调试：打印所有注册的路由
print("🔍 已注册的路由:")
for route in app.routes:
    print(f"  {type(route).__name__}: {str(route)}")


# 开发环境启动
if __name__ == "__main__":
    uvicorn.run(
        "user.main:app",
        host="localhost",
        port=8088,
        reload=settings.debug,
        log_level=settings.log_level.lower()
    )