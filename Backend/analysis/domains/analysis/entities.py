"""
分析实体模块
"""
from dataclasses import dataclass
from datetime import datetime
from typing import Optional, Dict, Any, List, Union
from uuid import UUID, uuid4
from enum import Enum


class AnalysisType(str, Enum):
    """分析类型枚举"""
    CUSTOM = "custom"


class AnalysisStatus(str, Enum):
    """分析状态枚举"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class SuperMapRequest:
    """SuperMap请求数据"""
    service_type: str
    method: str
    parameters: Dict[str, Any]
    config: Dict[str, Any]
    created_at: datetime
    
    def __post_init__(self):
        if not self.created_at:
            self.created_at = datetime.utcnow()
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            "service_type": self.service_type,
            "method": self.method,
            "parameters": self.parameters,
            "config": self.config,
            "created_at": self.created_at.isoformat()
        }


@dataclass
class SuperMapResult:
    """SuperMap结果数据"""
    success: bool
    processed_at: datetime
    data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    service_response: Optional[Dict[str, Any]] = None
    
    def __post_init__(self):
        if not self.processed_at:
            self.processed_at = datetime.utcnow()
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            "success": self.success,
            "data": self.data,
            "error_message": self.error_message,
            "service_response": self.service_response,
            "processed_at": self.processed_at.isoformat()
        }


@dataclass
class AnalysisTask:
    """分析任务实体"""
    id: UUID
    name: str
    description: Optional[str]
    analysis_type: AnalysisType
    parameters: Dict[str, Any]
    status: AnalysisStatus
    created_by: str
    created_at: datetime
    updated_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    progress: float = 0.0
    supermap_request: Optional[SuperMapRequest] = None
    supermap_result: Optional[SuperMapResult] = None
    error_message: Optional[str] = None
    
    def __post_init__(self):
        if not self.created_at:
            self.created_at = datetime.utcnow()
        if not self.updated_at:
            self.updated_at = datetime.utcnow()
    
    @classmethod
    def create_new(
        cls,
        name: str,
        analysis_type: AnalysisType,
        parameters: Dict[str, Any],
        created_by: str,
        description: Optional[str] = None
    ) -> "AnalysisTask":
        """创建新的分析任务"""
        now = datetime.utcnow()
        return cls(
            id=uuid4(),
            name=name,
            description=description,
            analysis_type=analysis_type,
            parameters=parameters,
            status=AnalysisStatus.PENDING,
            created_by=created_by,
            created_at=now,
            updated_at=now
        )
    
    def start_processing(self) -> None:
        """开始处理"""
        self.status = AnalysisStatus.PROCESSING
        self.started_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
    
    def complete(self, supermap_result: SuperMapResult) -> None:
        """完成任务"""
        self.status = AnalysisStatus.COMPLETED
        self.completed_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
        self.supermap_result = supermap_result
        self.progress = 100.0
    
    def fail(self, error_message: str, supermap_result: Optional[SuperMapResult] = None) -> None:
        """任务失败"""
        self.status = AnalysisStatus.FAILED
        self.completed_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
        self.error_message = error_message
        if supermap_result:
            self.supermap_result = supermap_result
    
    def cancel(self) -> None:
        """取消任务"""
        self.status = AnalysisStatus.CANCELLED
        self.updated_at = datetime.utcnow()
    
    def update_progress(self, progress: float) -> None:
        """更新进度"""
        self.progress = min(100.0, max(0.0, progress))
        self.updated_at = datetime.utcnow()
    
    def set_supermap_request(self, supermap_request: SuperMapRequest) -> None:
        """设置SuperMap请求"""
        self.supermap_request = supermap_request
        self.updated_at = datetime.utcnow()
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            "task_id": str(self.id),
            "name": self.name,
            "description": self.description,
            "analysis_type": self.analysis_type.value,
            "status": self.status.value,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "progress": self.progress,
            "supermap_request": self.supermap_request.to_dict() if self.supermap_request else None,
            "supermap_result": self.supermap_result.to_dict() if self.supermap_result else None,
            "error_message": self.error_message
        }
    
    def to_list_dict(self) -> Dict[str, Any]:
        """转换为列表格式字典"""
        return {
            "task_id": str(self.id),
            "name": self.name,
            "analysis_type": self.analysis_type.value,
            "status": self.status.value,
            "created_at": self.created_at.isoformat(),
            "supermap_service": self.supermap_request.service_type if self.supermap_request else None
        }


@dataclass
class AnalysisResult:
    """分析结果实体"""
    id: UUID
    task_id: UUID
    result_type: str
    data: Dict[str, Any]
    metadata: Dict[str, Any]
    created_at: datetime
    
    def __post_init__(self):
        if not self.created_at:
            self.created_at = datetime.utcnow()
    
    @classmethod
    def create_new(
        cls,
        task_id: UUID,
        result_type: str,
        data: Dict[str, Any],
        metadata: Optional[Dict[str, Any]] = None
    ) -> "AnalysisResult":
        """创建新的分析结果"""
        now = datetime.utcnow()
        return cls(
            id=uuid4(),
            task_id=task_id,
            result_type=result_type,
            data=data,
            metadata=metadata or {},
            created_at=now
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            "id": str(self.id),
            "task_id": str(self.task_id),
            "result_type": self.result_type,
            "data": self.data,
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat()
        }


@dataclass
class SpatialData:
    """空间数据实体"""
    id: UUID
    name: str
    data_type: str  # point, line, polygon, raster
    geometry: Dict[str, Any]
    attributes: Dict[str, Any]
    crs: str
    created_at: datetime
    updated_at: datetime
    
    def __post_init__(self):
        if not self.created_at:
            self.created_at = datetime.utcnow()
        if not self.updated_at:
            self.updated_at = datetime.utcnow()
    
    @classmethod
    def create_new(
        cls,
        name: str,
        data_type: str,
        geometry: Dict[str, Any],
        attributes: Dict[str, Any],
        crs: str = "EPSG:4326"
    ) -> "SpatialData":
        """创建新的空间数据"""
        now = datetime.utcnow()
        return cls(
            id=uuid4(),
            name=name,
            data_type=data_type,
            geometry=geometry,
            attributes=attributes,
            crs=crs,
            created_at=now,
            updated_at=now
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            "id": str(self.id),
            "name": self.name,
            "data_type": self.data_type,
            "geometry": self.geometry,
            "attributes": self.attributes,
            "crs": self.crs,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }
