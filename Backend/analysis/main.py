"""
Analysis Service - FastAPI应用主入口
GIS空间分析微服务
"""
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uvicorn

from analysis.core.config import settings
from analysis.api.v1 import api_v1_router

'''
python -m uvicorn analysis.main:app --reload --host 0.0.0.0 --port 8001
'''

@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时执行
    print("🚀 Analysis Service 正在启动...")
    print(f"📊 配置环境: {settings.environment}")
    print(f"🗺️  SuperMap服务: {settings.supermap_server_url}")
    yield
    # 关闭时执行
    print("🛑 Analysis Service 正在关闭...")


# 创建FastAPI应用实例
app = FastAPI(
    title="Analysis Service",
    version="1.0.0",
    description="GIS空间分析微服务 - 提供空间分析、数据处理、统计分析功能",
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


# 根级健康检查
@app.get("/health")
async def root_health() -> dict:
    return {"status": "ok", "service": "analysis"}


# 注册API路由
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
        "analysis.main:app",
        host="0.0.0.0",
        port=8001,
        reload=True
    )
