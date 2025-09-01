"""
PostgreSQL仓储实现
"""
from typing import Optional, List, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from sqlalchemy.orm import selectinload

from analysis.domains.analysis.entities import (
    AnalysisTask, AnalysisResult, SpatialData, 
    AnalysisStatus, AnalysisType, SuperMapRequest, SuperMapResult
)
from analysis.domains.analysis.repositories import (
    AnalysisTaskRepository, AnalysisResultRepository, SpatialDataRepository
)
from analysis.infrastructure.database.postgres.models import (
    AnalysisTaskModel, AnalysisResultModel, SpatialDataModel
)


class PostgreSQLAnalysisTaskRepository(AnalysisTaskRepository):
    """PostgreSQL分析任务仓储实现"""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def create(self, task: AnalysisTask) -> AnalysisTask:
        """创建分析任务"""
        task_model = AnalysisTaskModel(
            id=task.id,
            name=task.name,
            description=task.description,
            analysis_type=task.analysis_type.value,
            parameters=task.parameters,
            status=task.status.value,
            created_by=task.created_by,
            created_at=task.created_at,
            updated_at=task.updated_at,
            started_at=task.started_at,
            completed_at=task.completed_at,
            progress=task.progress,
            supermap_request=task.supermap_request.to_dict() if task.supermap_request else None,
            supermap_result=task.supermap_result.to_dict() if task.supermap_result else None,
            error_message=task.error_message
        )
        
        self.session.add(task_model)
        await self.session.commit()
        await self.session.refresh(task_model)
        
        return task
    
    async def get_by_id(self, task_id: UUID) -> Optional[AnalysisTask]:
        """根据ID获取分析任务"""
        stmt = select(AnalysisTaskModel).where(AnalysisTaskModel.id == task_id)
        result = await self.session.execute(stmt)
        task_model = result.scalar_one_or_none()
        
        if not task_model:
            return None
        
        return self._model_to_entity(task_model)
    
    async def get_by_user(self, user_id: str) -> List[AnalysisTask]:
        """获取用户的分析任务列表"""
        stmt = select(AnalysisTaskModel).where(AnalysisTaskModel.created_by == user_id)
        result = await self.session.execute(stmt)
        task_models = result.scalars().all()
        
        return [self._model_to_entity(task_model) for task_model in task_models]
    
    async def get_by_status(self, status: AnalysisStatus) -> List[AnalysisTask]:
        """根据状态获取分析任务列表"""
        stmt = select(AnalysisTaskModel).where(AnalysisTaskModel.status == status.value)
        result = await self.session.execute(stmt)
        task_models = result.scalars().all()
        
        return [self._model_to_entity(task_model) for task_model in task_models]
    
    async def update(self, task: AnalysisTask) -> AnalysisTask:
        """更新分析任务"""
        stmt = (
            update(AnalysisTaskModel)
            .where(AnalysisTaskModel.id == task.id)
            .values(
                name=task.name,
                description=task.description,
                analysis_type=task.analysis_type.value,
                parameters=task.parameters,
                status=task.status.value,
                updated_at=task.updated_at,
                started_at=task.started_at,
                completed_at=task.completed_at,
                progress=task.progress,
                supermap_request=task.supermap_request.to_dict() if task.supermap_request else None,
                supermap_result=task.supermap_result.to_dict() if task.supermap_result else None,
                error_message=task.error_message
            )
        )
        
        await self.session.execute(stmt)
        await self.session.commit()
        
        return task
    
    async def delete(self, task_id: UUID) -> bool:
        """删除分析任务"""
        stmt = delete(AnalysisTaskModel).where(AnalysisTaskModel.id == task_id)
        result = await self.session.execute(stmt)
        await self.session.commit()
        
        return result.rowcount > 0
    
    async def list_tasks(
        self,
        skip: int = 0,
        limit: int = 100,
        status: Optional[AnalysisStatus] = None,
        analysis_type: Optional[AnalysisType] = None
    ) -> List[AnalysisTask]:
        """列出分析任务"""
        stmt = select(AnalysisTaskModel)
        
        if status:
            stmt = stmt.where(AnalysisTaskModel.status == status.value)
        if analysis_type:
            stmt = stmt.where(AnalysisTaskModel.analysis_type == analysis_type.value)
        
        stmt = stmt.offset(skip).limit(limit)
        result = await self.session.execute(stmt)
        task_models = result.scalars().all()
        
        return [self._model_to_entity(task_model) for task_model in task_models]
    
    def _model_to_entity(self, task_model: AnalysisTaskModel) -> AnalysisTask:
        """将模型转换为实体"""
        # 转换SuperMap请求
        supermap_request = None
        if task_model.supermap_request:
            supermap_request = SuperMapRequest(
                service_type=task_model.supermap_request["service_type"],
                method=task_model.supermap_request["method"],
                parameters=task_model.supermap_request["parameters"],
                config=task_model.supermap_request["config"],
                created_at=task_model.supermap_request["created_at"]
            )
        
        # 转换SuperMap结果
        supermap_result = None
        if task_model.supermap_result:
            supermap_result = SuperMapResult(
                success=task_model.supermap_result["success"],
                processed_at=task_model.supermap_result["processed_at"],
                data=task_model.supermap_result.get("data"),
                error_message=task_model.supermap_result.get("error_message"),
                service_response=task_model.supermap_result.get("service_response")
            )
        
        return AnalysisTask(
            id=task_model.id,
            name=task_model.name,
            description=task_model.description,
            analysis_type=AnalysisType(task_model.analysis_type),
            parameters=task_model.parameters,
            status=AnalysisStatus(task_model.status),
            created_by=task_model.created_by,
            created_at=task_model.created_at,
            updated_at=task_model.updated_at,
            started_at=task_model.started_at,
            completed_at=task_model.completed_at,
            progress=task_model.progress,
            supermap_request=supermap_request,
            supermap_result=supermap_result,
            error_message=task_model.error_message
        )


class PostgreSQLAnalysisResultRepository(AnalysisResultRepository):
    """PostgreSQL分析结果仓储实现"""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def create(self, result: AnalysisResult) -> AnalysisResult:
        """创建分析结果"""
        result_model = AnalysisResultModel(
            id=result.id,
            task_id=result.task_id,
            result_type=result.result_type,
            data=result.data,
            result_metadata=result.metadata,
            created_at=result.created_at
        )
        
        self.session.add(result_model)
        await self.session.commit()
        await self.session.refresh(result_model)
        
        return result
    
    async def get_by_id(self, result_id: UUID) -> Optional[AnalysisResult]:
        """根据ID获取分析结果"""
        stmt = select(AnalysisResultModel).where(AnalysisResultModel.id == result_id)
        result = await self.session.execute(stmt)
        result_model = result.scalar_one_or_none()
        
        if not result_model:
            return None
        
        return self._model_to_entity(result_model)
    
    async def get_by_task_id(self, task_id: UUID) -> List[AnalysisResult]:
        """根据任务ID获取分析结果列表"""
        stmt = select(AnalysisResultModel).where(AnalysisResultModel.task_id == task_id)
        result = await self.session.execute(stmt)
        result_models = result.scalars().all()
        
        return [self._model_to_entity(result_model) for result_model in result_models]
    
    async def update(self, result: AnalysisResult) -> AnalysisResult:
        """更新分析结果"""
        stmt = (
            update(AnalysisResultModel)
            .where(AnalysisResultModel.id == result.id)
            .values(
                result_type=result.result_type,
                data=result.data,
                result_metadata=result.metadata
            )
        )
        
        await self.session.execute(stmt)
        await self.session.commit()
        
        return result
    
    async def delete(self, result_id: UUID) -> bool:
        """删除分析结果"""
        stmt = delete(AnalysisResultModel).where(AnalysisResultModel.id == result_id)
        result = await self.session.execute(stmt)
        await self.session.commit()
        
        return result.rowcount > 0
    
    async def delete_by_task_id(self, task_id: UUID) -> bool:
        """根据任务ID删除分析结果"""
        stmt = delete(AnalysisResultModel).where(AnalysisResultModel.task_id == task_id)
        result = await self.session.execute(stmt)
        await self.session.commit()
        
        return result.rowcount > 0
    
    def _model_to_entity(self, result_model: AnalysisResultModel) -> AnalysisResult:
        """将模型转换为实体"""
        return AnalysisResult(
            id=result_model.id,
            task_id=result_model.task_id,
            result_type=result_model.result_type,
            data=result_model.data,
            metadata=result_model.result_metadata,
            created_at=result_model.created_at
        )


class PostgreSQLSpatialDataRepository(SpatialDataRepository):
    """PostgreSQL空间数据仓储实现"""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def create(self, spatial_data: SpatialData) -> SpatialData:
        """创建空间数据"""
        data_model = SpatialDataModel(
            id=spatial_data.id,
            name=spatial_data.name,
            data_type=spatial_data.data_type,
            geometry=spatial_data.geometry,
            attributes=spatial_data.attributes,
            crs=spatial_data.crs,
            created_at=spatial_data.created_at,
            updated_at=spatial_data.updated_at
        )
        
        self.session.add(data_model)
        await self.session.commit()
        await self.session.refresh(data_model)
        
        return spatial_data
    
    async def get_by_id(self, data_id: UUID) -> Optional[SpatialData]:
        """根据ID获取空间数据"""
        stmt = select(SpatialDataModel).where(SpatialDataModel.id == data_id)
        result = await self.session.execute(stmt)
        data_model = result.scalar_one_or_none()
        
        if not data_model:
            return None
        
        return self._model_to_entity(data_model)
    
    async def get_by_name(self, name: str) -> Optional[SpatialData]:
        """根据名称获取空间数据"""
        stmt = select(SpatialDataModel).where(SpatialDataModel.name == name)
        result = await self.session.execute(stmt)
        data_model = result.scalar_one_or_none()
        
        if not data_model:
            return None
        
        return self._model_to_entity(data_model)
    
    async def get_by_type(self, data_type: str) -> List[SpatialData]:
        """根据类型获取空间数据列表"""
        stmt = select(SpatialDataModel).where(SpatialDataModel.data_type == data_type)
        result = await self.session.execute(stmt)
        data_models = result.scalars().all()
        
        return [self._model_to_entity(data_model) for data_model in data_models]
    
    async def update(self, spatial_data: SpatialData) -> SpatialData:
        """更新空间数据"""
        stmt = (
            update(SpatialDataModel)
            .where(SpatialDataModel.id == spatial_data.id)
            .values(
                name=spatial_data.name,
                geometry=spatial_data.geometry,
                attributes=spatial_data.attributes,
                updated_at=spatial_data.updated_at
            )
        )
        
        await self.session.execute(stmt)
        await self.session.commit()
        
        return spatial_data
    
    async def delete(self, data_id: UUID) -> bool:
        """删除空间数据"""
        stmt = delete(SpatialDataModel).where(SpatialDataModel.id == data_id)
        result = await self.session.execute(stmt)
        await self.session.commit()
        
        return result.rowcount > 0
    
    async def list_data(
        self,
        skip: int = 0,
        limit: int = 100,
        data_type: Optional[str] = None
    ) -> List[SpatialData]:
        """列出空间数据"""
        stmt = select(SpatialDataModel)
        
        if data_type:
            stmt = stmt.where(SpatialDataModel.data_type == data_type)
        
        stmt = stmt.offset(skip).limit(limit)
        result = await self.session.execute(stmt)
        data_models = result.scalars().all()
        
        return [self._model_to_entity(data_model) for data_model in data_models]
    
    async def search_by_geometry(
        self,
        geometry: Dict[str, Any],
        spatial_relation: str = "intersects"
    ) -> List[SpatialData]:
        """根据几何关系搜索空间数据"""
        # TODO: 实现空间查询
        # 这里需要根据具体的空间数据库扩展来实现
        # 例如使用PostGIS的ST_Intersects等函数
        
        # 临时实现：返回所有数据
        stmt = select(SpatialDataModel)
        result = await self.session.execute(stmt)
        data_models = result.scalars().all()
        
        return [self._model_to_entity(data_model) for data_model in data_models]
    
    def _model_to_entity(self, data_model: SpatialDataModel) -> SpatialData:
        """将模型转换为实体"""
        return SpatialData(
            id=data_model.id,
            name=data_model.name,
            data_type=data_model.data_type,
            geometry=data_model.geometry,
            attributes=data_model.attributes,
            crs=data_model.crs,
            created_at=data_model.created_at,
            updated_at=data_model.updated_at
        )
