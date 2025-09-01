"""
PostgreSQL数据库模型模块
"""
from sqlalchemy import Column, String, Boolean, DateTime, Text, Integer, Float, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from analysis.core.database import Base


class AnalysisTaskModel(Base):
    """分析任务数据库模型"""
    __tablename__ = "analysis_tasks"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=True)
    analysis_type = Column(String(50), nullable=False, index=True)
    parameters = Column(JSONB, nullable=False)
    status = Column(String(20), nullable=False, index=True)
    created_by = Column(String(100), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    progress = Column(Float, default=0.0, nullable=False)
    
    # SuperMap相关字段
    supermap_request = Column(JSONB, nullable=True)
    supermap_result = Column(JSONB, nullable=True)
    error_message = Column(Text, nullable=True)
    
    def __repr__(self):
        return f"<AnalysisTaskModel(id={self.id}, name='{self.name}', status='{self.status}')>"
    
    def to_dict(self):
        """转换为字典格式"""
        return {
            "task_id": str(self.id),
            "name": self.name,
            "description": self.description,
            "analysis_type": self.analysis_type,
            "status": self.status,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at is not None else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at is not None else None,
            "started_at": self.started_at.isoformat() if self.started_at is not None else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at is not None else None,
            "progress": self.progress,
            "supermap_request": self.supermap_request,
            "supermap_result": self.supermap_result,
            "error_message": self.error_message
        }
    
    def to_list_dict(self):
        """转换为列表格式字典"""
        return {
            "task_id": str(self.id),
            "name": self.name,
            "analysis_type": self.analysis_type,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at is not None else None,
            "supermap_service": self.supermap_request.get("service_type") if self.supermap_request else None
        }


class AnalysisResultModel(Base):
    """分析结果数据库模型"""
    __tablename__ = "analysis_results"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), ForeignKey("analysis_tasks.id"), nullable=False, index=True)
    result_type = Column(String(50), nullable=False)
    data = Column(JSONB, nullable=False)
    result_metadata = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # 关联关系
    task = relationship("AnalysisTaskModel", backref="results")
    
    def __repr__(self):
        return f"<AnalysisResultModel(id={self.id}, task_id={self.task_id}, result_type='{self.result_type}')>"
    
    def to_dict(self):
        """转换为字典格式"""
        return {
            "id": str(self.id),
            "task_id": str(self.task_id),
            "result_type": self.result_type,
            "data": self.data,
            "metadata": self.result_metadata,
            "created_at": self.created_at.isoformat() if self.created_at is not None else None
        }


class SpatialDataModel(Base):
    """空间数据数据库模型"""
    __tablename__ = "spatial_data"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False, index=True)
    data_type = Column(String(20), nullable=False, index=True)  # point, line, polygon, raster
    geometry = Column(JSONB, nullable=False)
    attributes = Column(JSONB, nullable=True)
    crs = Column(String(20), default="EPSG:4326", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    def __repr__(self):
        return f"<SpatialDataModel(id={self.id}, name='{self.name}', data_type='{self.data_type}')>"
    
    def to_dict(self):
        """转换为字典格式"""
        return {
            "id": str(self.id),
            "name": self.name,
            "data_type": self.data_type,
            "geometry": self.geometry,
            "attributes": self.attributes,
            "crs": self.crs,
            "created_at": self.created_at.isoformat() if self.created_at is not None else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at is not None else None
        }
