"""
依赖注入容器模块
实现真正的依赖倒置，管理所有服务的生命周期
"""
from typing import Dict, Any
from analysis.domains.analysis.repositories import (
    AnalysisTaskRepository, AnalysisResultRepository, SpatialDataRepository
)
from analysis.domains.analysis.services import AnalysisService
from analysis.application.use_cases.analysis.analysis_use_case import AnalysisUseCase
from analysis.infrastructure.database.postgres.repositories import (
    PostgreSQLAnalysisTaskRepository,
    PostgreSQLAnalysisResultRepository,
    PostgreSQLSpatialDataRepository
)
from sqlalchemy.ext.asyncio import AsyncSession


class Container:
    """依赖注入容器"""
    
    def __init__(self):
        self._services: Dict[str, Any] = {}
        print("🗄️ 使用PostgreSQL仓储连接真实数据库")
    
    def get(self, service_name: str) -> Any:
        """获取服务实例"""
        if service_name not in self._services:
            raise ValueError(f"Service '{service_name}' not found")
        return self._services[service_name]
    
    def register(self, service_name: str, service_instance: Any):
        """注册服务实例"""
        self._services[service_name] = service_instance


# 全局容器实例
container = Container()


# 依赖注入函数
def get_analysis_task_repository() -> AnalysisTaskRepository:
    """获取分析任务仓储"""
    return container.get('analysis_task_repository')


def get_analysis_result_repository() -> AnalysisResultRepository:
    """获取分析结果仓储"""
    return container.get('analysis_result_repository')


def get_spatial_data_repository() -> SpatialDataRepository:
    """获取空间数据仓储"""
    return container.get('spatial_data_repository')


def get_analysis_service() -> AnalysisService:
    """获取分析服务"""
    return container.get('analysis_service')


def get_analysis_use_case() -> AnalysisUseCase:
    """获取分析用例"""
    return container.get('analysis_use_case')


def build_analysis_task_repository(session: AsyncSession) -> AnalysisTaskRepository:
    """基于给定数据库会话创建分析任务仓储。"""
    return PostgreSQLAnalysisTaskRepository(session)


def build_analysis_result_repository(session: AsyncSession) -> AnalysisResultRepository:
    """基于给定数据库会话创建分析结果仓储。"""
    return PostgreSQLAnalysisResultRepository(session)


def build_spatial_data_repository(session: AsyncSession) -> SpatialDataRepository:
    """基于给定数据库会话创建空间数据仓储。"""
    return PostgreSQLSpatialDataRepository(session)


def build_analysis_service(session: AsyncSession) -> AnalysisService:
    """基于给定数据库会话创建分析服务。"""
    task_repository = build_analysis_task_repository(session)
    result_repository = build_analysis_result_repository(session)
    spatial_data_repository = build_spatial_data_repository(session)
    
    return AnalysisService(
        task_repository=task_repository,
        result_repository=result_repository,
        spatial_data_repository=spatial_data_repository
    )


def build_analysis_use_case(session: AsyncSession) -> AnalysisUseCase:
    """基于给定数据库会话创建分析用例。"""
    analysis_service = build_analysis_service(session)
    return AnalysisUseCase(analysis_service)
