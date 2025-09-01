"""
API v1 版本路由管理器
统一管理所有功能模块的路由分组
"""
from fastapi import APIRouter

from analysis.api.v1.analysis.analysis import router as analysis_router

# 创建主路由
api_v1_router = APIRouter()

# 分析模块路由组
analysis_router_group = APIRouter(prefix="/analysis", tags=["空间分析"])
analysis_router_group.include_router(analysis_router)
api_v1_router.include_router(analysis_router_group)

# 空间数据模块路由组
spatial_data_router = APIRouter(prefix="/spatial-data", tags=["空间数据"])
api_v1_router.include_router(spatial_data_router)

# TODO: 后续添加其他模块路由
# statistics_router = APIRouter(prefix="/statistics", tags=["统计分析"])
# visualization_router = APIRouter(prefix="/visualization", tags=["数据可视化"])
