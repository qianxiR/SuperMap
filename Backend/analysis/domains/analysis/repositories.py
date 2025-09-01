"""
分析仓储接口
"""
from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any
from uuid import UUID
from analysis.domains.analysis.entities import AnalysisTask, AnalysisResult, SpatialData, AnalysisStatus, AnalysisType


class AnalysisTaskRepository(ABC):
    """分析任务仓储接口"""
    
    @abstractmethod
    async def create(self, task: AnalysisTask) -> AnalysisTask:
        """创建分析任务"""
        pass
    
    @abstractmethod
    async def get_by_id(self, task_id: UUID) -> Optional[AnalysisTask]:
        """根据ID获取分析任务"""
        pass
    
    @abstractmethod
    async def get_by_user(self, user_id: str) -> List[AnalysisTask]:
        """获取用户的分析任务列表"""
        pass
    
    @abstractmethod
    async def get_by_status(self, status: AnalysisStatus) -> List[AnalysisTask]:
        """根据状态获取分析任务列表"""
        pass
    
    @abstractmethod
    async def update(self, task: AnalysisTask) -> AnalysisTask:
        """更新分析任务"""
        pass
    
    @abstractmethod
    async def delete(self, task_id: UUID) -> bool:
        """删除分析任务"""
        pass
    
    @abstractmethod
    async def list_tasks(
        self,
        skip: int = 0,
        limit: int = 100,
        status: Optional[AnalysisStatus] = None,
        analysis_type: Optional[AnalysisType] = None
    ) -> List[AnalysisTask]:
        """列出分析任务"""
        pass


class AnalysisResultRepository(ABC):
    """分析结果仓储接口"""
    
    @abstractmethod
    async def create(self, result: AnalysisResult) -> AnalysisResult:
        """创建分析结果"""
        pass
    
    @abstractmethod
    async def get_by_id(self, result_id: UUID) -> Optional[AnalysisResult]:
        """根据ID获取分析结果"""
        pass
    
    @abstractmethod
    async def get_by_task_id(self, task_id: UUID) -> List[AnalysisResult]:
        """根据任务ID获取分析结果列表"""
        pass
    
    @abstractmethod
    async def update(self, result: AnalysisResult) -> AnalysisResult:
        """更新分析结果"""
        pass
    
    @abstractmethod
    async def delete(self, result_id: UUID) -> bool:
        """删除分析结果"""
        pass
    
    @abstractmethod
    async def delete_by_task_id(self, task_id: UUID) -> bool:
        """根据任务ID删除分析结果"""
        pass


class SpatialDataRepository(ABC):
    """空间数据仓储接口"""
    
    @abstractmethod
    async def create(self, spatial_data: SpatialData) -> SpatialData:
        """创建空间数据"""
        pass
    
    @abstractmethod
    async def get_by_id(self, data_id: UUID) -> Optional[SpatialData]:
        """根据ID获取空间数据"""
        pass
    
    @abstractmethod
    async def get_by_name(self, name: str) -> Optional[SpatialData]:
        """根据名称获取空间数据"""
        pass
    
    @abstractmethod
    async def get_by_type(self, data_type: str) -> List[SpatialData]:
        """根据类型获取空间数据列表"""
        pass
    
    @abstractmethod
    async def update(self, spatial_data: SpatialData) -> SpatialData:
        """更新空间数据"""
        pass
    
    @abstractmethod
    async def delete(self, data_id: UUID) -> bool:
        """删除空间数据"""
        pass
    
    @abstractmethod
    async def list_data(
        self,
        skip: int = 0,
        limit: int = 100,
        data_type: Optional[str] = None
    ) -> List[SpatialData]:
        """列出空间数据"""
        pass
    
    @abstractmethod
    async def search_by_geometry(
        self,
        geometry: Dict[str, Any],
        spatial_relation: str = "intersects"
    ) -> List[SpatialData]:
        """根据几何关系搜索空间数据"""
        pass
