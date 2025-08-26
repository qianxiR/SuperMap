"""
PostgreSQL数据库模型模块
"""
from sqlalchemy import Column, String, Boolean, DateTime, Text, Integer, Float, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.core.database import Base
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy import BigInteger
from sqlalchemy.dialects.postgresql import JSONB
from typing import Any
try:
    from geoalchemy2 import Geometry  # type: ignore
except Exception:  # 允许在无 geoalchemy2 环境下导入通过
    def Geometry(*args: Any, **kwargs: Any) -> Any:  # type: ignore
        return None


class UserModel(Base):
    """用户数据库模型"""
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(20), unique=True, nullable=True, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    is_superuser = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    def __repr__(self):
        return f"<UserModel(id={self.id}, username='{self.username}', email='{self.email}')>"
    
    def to_dict(self):
        """转换为字典格式"""
        return {
            "id": str(self.id),
            "username": self.username,
            "email": self.email,
            "phone": self.phone,
            "is_active": self.is_active,
            "is_superuser": self.is_superuser,
            "created_at": self.created_at.isoformat() if self.created_at is not None else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at is not None else None,
            "last_login": self.last_login.isoformat() if self.last_login is not None else None
        }



class BufferResult(Base):
    __tablename__ = "analysis_buffer_results"
    id = Column(BigInteger, primary_key=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    user_id = Column(BigInteger, nullable=True)
    source_tag = Column(String(16), nullable=True)
    input_json = Column(JSONB, nullable=True)
    result_fc_json = Column(JSONB, nullable=False)
    buffer_m = Column(Float, nullable=False)
    cap_style = Column(String(8), nullable=False)
    dissolved = Column(Boolean, nullable=False)
    geom = Column(Geometry(geometry_type="MULTIPOLYGON", srid=4326), nullable=True)
    area_km2 = Column(Float, nullable=True)


class RouteResult(Base):
    __tablename__ = "analysis_route_results"
    id = Column(BigInteger, primary_key=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    user_id = Column(BigInteger, nullable=True)
    source_tag = Column(String(16), nullable=True)
    input_json = Column(JSONB, nullable=True)
    result_feature_json = Column(JSONB, nullable=False)
    profile = Column(String(16), nullable=False)
    weight = Column(String(16), nullable=False)
    length_km = Column(Float, nullable=True)
    duration_min = Column(Float, nullable=True)
    geom = Column(Geometry(geometry_type="LINESTRING", srid=4326), nullable=True)


class AccessibilityResult(Base):
    __tablename__ = "analysis_accessibility_results"
    id = Column(BigInteger, primary_key=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    user_id = Column(BigInteger, nullable=True)
    source_tag = Column(String(16), nullable=True)
    input_json = Column(JSONB, nullable=True)
    result_fc_json = Column(JSONB, nullable=False)
    mode = Column(String(16), nullable=False)
    cutoff_min = Column(Integer, nullable=False)
    bands = Column(ARRAY(Integer), nullable=True)
    total_area_km2 = Column(Float, nullable=True)
    geoms = Column(Geometry(geometry_type="MULTIPOLYGON", srid=4326), nullable=True)

