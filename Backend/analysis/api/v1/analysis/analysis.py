"""
分析API接口
"""
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from analysis.application.dto.analysis_dto import (
    AnalysisTaskCreateDTO, AnalysisTaskUpdateDTO,
    SpatialDataCreateDTO, SpatialDataUpdateDTO
)
from analysis.application.use_cases.analysis.analysis_use_case import AnalysisUseCase
from analysis.core.database import get_db
from analysis.core.container import build_analysis_use_case

router = APIRouter()
security = HTTPBearer()





@router.post("/tasks", response_model=Dict[str, Any])
async def create_analysis_task(
    task_data: AnalysisTaskCreateDTO,
    session = Depends(get_db)
) -> Dict[str, Any]:
    """创建分析任务"""
    try:
        analysis_use_case = build_analysis_use_case(session)
        
        # TODO: 从JWT token中获取用户ID
        created_by = "test_user"  # 临时使用测试用户
        
        result = await analysis_use_case.create_analysis_task(task_data, created_by)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="创建分析任务失败，请稍后重试"
        )


@router.get("/tasks/{task_id}", response_model=Dict[str, Any])
async def get_analysis_task(
    task_id: str,
    session = Depends(get_db)
) -> Dict[str, Any]:
    """获取分析任务"""
    try:
        analysis_use_case = build_analysis_use_case(session)
        result = await analysis_use_case.get_analysis_task(task_id)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取分析任务失败"
        )


@router.get("/tasks", response_model=Dict[str, Any])
async def list_analysis_tasks(
    skip: int = Query(0, ge=0, description="跳过记录数"),
    limit: int = Query(100, ge=1, le=1000, description="返回记录数"),
    status: Optional[str] = Query(None, description="任务状态"),
    analysis_type: Optional[str] = Query(None, description="分析类型"),
    session = Depends(get_db)
) -> Dict[str, Any]:
    """列出分析任务"""
    try:
        analysis_use_case = build_analysis_use_case(session)
        result = await analysis_use_case.list_analysis_tasks(
            skip=skip,
            limit=limit,
            status=status,
            analysis_type=analysis_type
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取任务列表失败"
        )


@router.put("/tasks/{task_id}/status", response_model=Dict[str, Any])
async def update_task_status(
    task_id: str,
    status: str,
    supermap_result: Optional[Dict[str, Any]] = None,
    error_message: Optional[str] = None,
    session = Depends(get_db)
) -> Dict[str, Any]:
    """更新任务状态"""
    try:
        analysis_use_case = build_analysis_use_case(session)
        result = await analysis_use_case.update_task_status(
            task_id, status, supermap_result, error_message
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="更新任务状态失败"
        )


@router.delete("/tasks/{task_id}", response_model=Dict[str, Any])
async def delete_analysis_task(
    task_id: str,
    session = Depends(get_db)
) -> Dict[str, Any]:
    """删除分析任务"""
    try:
        analysis_use_case = build_analysis_use_case(session)
        result = await analysis_use_case.delete_analysis_task(task_id)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="删除分析任务失败"
        )


@router.post("/spatial-data", response_model=Dict[str, Any])
async def create_spatial_data(
    spatial_data: SpatialDataCreateDTO,
    session = Depends(get_db)
) -> Dict[str, Any]:
    """创建空间数据"""
    try:
        analysis_use_case = build_analysis_use_case(session)
        result = await analysis_use_case.create_spatial_data(spatial_data)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="创建空间数据失败，请稍后重试"
        )


@router.get("/spatial-data/{data_id}", response_model=Dict[str, Any])
async def get_spatial_data(
    data_id: str,
    session = Depends(get_db)
) -> Dict[str, Any]:
    """获取空间数据"""
    try:
        analysis_use_case = build_analysis_use_case(session)
        result = await analysis_use_case.get_spatial_data(data_id)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取空间数据失败"
        )


@router.get("/spatial-data", response_model=Dict[str, Any])
async def list_spatial_data(
    skip: int = Query(0, ge=0, description="跳过记录数"),
    limit: int = Query(100, ge=1, le=1000, description="返回记录数"),
    data_type: Optional[str] = Query(None, description="数据类型"),
    session = Depends(get_db)
) -> Dict[str, Any]:
    """列出空间数据"""
    try:
        analysis_use_case = build_analysis_use_case(session)
        result = await analysis_use_case.list_spatial_data(
            skip=skip,
            limit=limit,
            data_type=data_type
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取空间数据列表失败"
        )
