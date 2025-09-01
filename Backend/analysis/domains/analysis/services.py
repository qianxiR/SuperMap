"""
分析领域服务
"""
from typing import Optional, List, Dict, Any
from uuid import UUID
from analysis.domains.analysis.entities import (
    AnalysisTask, AnalysisResult, SpatialData, 
    AnalysisStatus, AnalysisType, SuperMapRequest, SuperMapResult
)
from analysis.domains.analysis.repositories import (
    AnalysisTaskRepository, AnalysisResultRepository, SpatialDataRepository
)



class AnalysisService:
    """分析服务"""
    
    def __init__(
        self,
        task_repository: AnalysisTaskRepository,
        result_repository: AnalysisResultRepository,
        spatial_data_repository: SpatialDataRepository
    ):
        self.task_repository = task_repository
        self.result_repository = result_repository
        self.spatial_data_repository = spatial_data_repository
    
    async def create_analysis_task(
        self,
        name: str,
        analysis_type: AnalysisType,
        parameters: Dict[str, Any],
        created_by: str,
        description: Optional[str] = None
    ) -> AnalysisTask:
        """创建分析任务"""
        task = AnalysisTask.create_new(
            name=name,
            analysis_type=analysis_type,
            parameters=parameters,
            created_by=created_by,
            description=description
        )
        return await self.task_repository.create(task)
    
    async def get_analysis_task(self, task_id: UUID) -> Optional[AnalysisTask]:
        """获取分析任务"""
        return await self.task_repository.get_by_id(task_id)
    
    async def get_user_tasks(self, user_id: str) -> List[AnalysisTask]:
        """获取用户的分析任务列表"""
        return await self.task_repository.get_by_user(user_id)
    
    async def get_tasks_by_status(self, status: AnalysisStatus) -> List[AnalysisTask]:
        """根据状态获取分析任务列表"""
        return await self.task_repository.get_by_status(status)
    
    async def update_task_status(
        self,
        task_id: UUID,
        status: AnalysisStatus,
        supermap_result: Optional[SuperMapResult] = None,
        error_message: Optional[str] = None
    ) -> Optional[AnalysisTask]:
        """更新任务状态"""
        task = await self.task_repository.get_by_id(task_id)
        if not task:
            return None
        
        if status == AnalysisStatus.PROCESSING:
            task.start_processing()
        elif status == AnalysisStatus.COMPLETED and supermap_result:
            task.complete(supermap_result)
        elif status == AnalysisStatus.FAILED:
            task.fail(error_message or "分析失败", supermap_result)
        elif status == AnalysisStatus.CANCELLED:
            task.cancel()
        
        return await self.task_repository.update(task)
    
    async def update_task_progress(self, task_id: UUID, progress: float) -> Optional[AnalysisTask]:
        """更新任务进度"""
        task = await self.task_repository.get_by_id(task_id)
        if not task:
            return None
        
        task.update_progress(progress)
        return await self.task_repository.update(task)
    
    async def delete_analysis_task(self, task_id: UUID) -> bool:
        """删除分析任务"""
        # 先删除相关的结果
        await self.result_repository.delete_by_task_id(task_id)
        # 再删除任务
        return await self.task_repository.delete(task_id)
    
    async def list_analysis_tasks(
        self,
        skip: int = 0,
        limit: int = 100,
        status: Optional[AnalysisStatus] = None,
        analysis_type: Optional[AnalysisType] = None
    ) -> List[AnalysisTask]:
        """列出分析任务"""
        return await self.task_repository.list_tasks(
            skip=skip,
            limit=limit,
            status=status,
            analysis_type=analysis_type
        )
    
    async def create_analysis_result(
        self,
        task_id: UUID,
        result_type: str,
        data: Dict[str, Any],
        metadata: Optional[Dict[str, Any]] = None
    ) -> AnalysisResult:
        """创建分析结果"""
        result = AnalysisResult.create_new(
            task_id=task_id,
            result_type=result_type,
            data=data,
            metadata=metadata
        )
        return await self.result_repository.create(result)
    
    async def get_analysis_result(self, result_id: UUID) -> Optional[AnalysisResult]:
        """获取分析结果"""
        return await self.result_repository.get_by_id(result_id)
    
    async def get_task_results(self, task_id: UUID) -> List[AnalysisResult]:
        """获取任务的分析结果列表"""
        return await self.result_repository.get_by_task_id(task_id)
    
    async def create_spatial_data(
        self,
        name: str,
        data_type: str,
        geometry: Dict[str, Any],
        attributes: Dict[str, Any],
        crs: str = "EPSG:4326"
    ) -> SpatialData:
        """创建空间数据"""
        spatial_data = SpatialData.create_new(
            name=name,
            data_type=data_type,
            geometry=geometry,
            attributes=attributes,
            crs=crs
        )
        return await self.spatial_data_repository.create(spatial_data)
    
    async def get_spatial_data(self, data_id: UUID) -> Optional[SpatialData]:
        """获取空间数据"""
        return await self.spatial_data_repository.get_by_id(data_id)
    
    async def get_spatial_data_by_name(self, name: str) -> Optional[SpatialData]:
        """根据名称获取空间数据"""
        return await self.spatial_data_repository.get_by_name(name)
    
    async def get_spatial_data_by_type(self, data_type: str) -> List[SpatialData]:
        """根据类型获取空间数据列表"""
        return await self.spatial_data_repository.get_by_type(data_type)
    
    async def search_spatial_data(
        self,
        geometry: Dict[str, Any],
        spatial_relation: str = "intersects"
    ) -> List[SpatialData]:
        """搜索空间数据"""
        return await self.spatial_data_repository.search_by_geometry(
            geometry=geometry,
            spatial_relation=spatial_relation
        )
    
    async def list_spatial_data(
        self,
        skip: int = 0,
        limit: int = 100,
        data_type: Optional[str] = None
    ) -> List[SpatialData]:
        """列出空间数据"""
        return await self.spatial_data_repository.list_data(
            skip=skip,
            limit=limit,
            data_type=data_type
        )
    
    async def delete_spatial_data(self, data_id: UUID) -> bool:
        """删除空间数据"""
        return await self.spatial_data_repository.delete(data_id)
    

    

    

