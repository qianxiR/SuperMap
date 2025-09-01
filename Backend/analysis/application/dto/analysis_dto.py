"""
分析数据传输对象
"""
from typing import Optional, Dict, Any, List, Union
from pydantic import BaseModel, Field, validator
from analysis.domains.analysis.entities import AnalysisType, AnalysisStatus


class GeometryDTO(BaseModel):
    """几何数据DTO"""
    type: str = Field(..., description="几何类型：Point/LineString/Polygon")
    coordinates: List[Any] = Field(..., description="坐标数组")





class AnalysisTaskCreateDTO(BaseModel):
    """创建分析任务DTO"""
    name: str = Field(..., min_length=1, max_length=100, description="任务名称")
    description: Optional[str] = Field(None, max_length=500, description="任务描述")
    analysis_type: AnalysisType = Field(..., description="分析类型")
    parameters: Dict[str, Any] = Field(..., description="分析参数")


class AnalysisTaskUpdateDTO(BaseModel):
    """更新分析任务DTO"""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="任务名称")
    description: Optional[str] = Field(None, max_length=500, description="任务描述")
    parameters: Optional[Dict[str, Any]] = Field(None, description="分析参数")


class AnalysisTaskResponseDTO(BaseModel):
    """分析任务响应DTO"""
    task_id: str
    name: str
    description: Optional[str]
    analysis_type: str
    status: str
    progress: float
    created_at: str
    started_at: Optional[str]
    completed_at: Optional[str]
    supermap_request: Optional[Dict[str, Any]]
    supermap_result: Optional[Dict[str, Any]]
    error_message: Optional[str]





class AnalysisTaskDetailResponseDTO(BaseModel):
    """分析任务详情响应DTO"""
    task_id: str
    name: str
    analysis_type: str
    status: str
    progress: float
    created_at: str
    started_at: Optional[str]
    completed_at: Optional[str]
    supermap_result: Optional[Dict[str, Any]]


class AnalysisTaskListResponseDTO(BaseModel):
    """分析任务列表响应DTO"""
    task_id: str
    name: str
    analysis_type: str
    status: str
    created_at: str
    supermap_service: str


class AnalysisListResponseDTO(BaseModel):
    """分析任务列表响应DTO"""
    tasks: List[AnalysisTaskListResponseDTO]
    total: int
    limit: int
    offset: int


class AnalysisResponseDTO(BaseModel):
    """通用分析响应DTO"""
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
    error_code: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


class SpatialDataCreateDTO(BaseModel):
    """创建空间数据DTO"""
    name: str = Field(..., min_length=1, max_length=100, description="数据名称")
    data_type: str = Field(..., description="数据类型")
    geometry: GeometryDTO = Field(..., description="几何数据")
    attributes: Dict[str, Any] = Field(default_factory=dict, description="属性数据")
    crs: str = Field(default="EPSG:4326", description="坐标系")


class SpatialDataUpdateDTO(BaseModel):
    """更新空间数据DTO"""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="数据名称")
    geometry: Optional[GeometryDTO] = Field(None, description="几何数据")
    attributes: Optional[Dict[str, Any]] = Field(None, description="属性数据")


class SpatialDataResponseDTO(BaseModel):
    """空间数据响应DTO"""
    id: str
    name: str
    data_type: str
    geometry: Dict[str, Any]
    attributes: Dict[str, Any]
    crs: str
    created_at: str
    updated_at: str


class SpatialDataListResponseDTO(BaseModel):
    """空间数据列表响应DTO"""
    data: List[SpatialDataResponseDTO]
    total: int
    skip: int
    limit: int
