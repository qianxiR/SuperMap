"""
API密钥管理路由
"""
from typing import List
from fastapi import APIRouter, HTTPException, Depends, status
from agent.models.schemas import (
    APIKeyCreate, APIKeyUpdate, APIKeyResponse, 
    SuccessResponse, ErrorResponse
)
from agent.services.api_key_service import APIKeyService

router = APIRouter(prefix="/api-keys", tags=["API密钥管理"])


def get_api_key_service() -> APIKeyService:
    """获取API密钥服务实例"""
    return APIKeyService()


def get_current_user_id() -> str:
    """获取当前用户ID（模拟实现）"""
    # 实际项目中应从JWT token中解析用户ID
    return "test-user-id"


@router.post("", response_model=APIKeyResponse, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    data: APIKeyCreate,
    user_id: str = Depends(get_current_user_id),
    service: APIKeyService = Depends(get_api_key_service)
):
    """创建API密钥"""
    try:
        result = await service.create_api_key(user_id, data)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建API密钥失败：{str(e)}"
        )


@router.get("", response_model=List[APIKeyResponse])
async def get_api_keys(
    user_id: str = Depends(get_current_user_id),
    service: APIKeyService = Depends(get_api_key_service)
):
    """获取API密钥列表"""
    try:
        return await service.get_api_keys(user_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取API密钥列表失败：{str(e)}"
        )


@router.get("/{api_key_id}", response_model=APIKeyResponse)
async def get_api_key(
    api_key_id: str,
    user_id: str = Depends(get_current_user_id),
    service: APIKeyService = Depends(get_api_key_service)
):
    """获取指定API密钥"""
    try:
        result = await service.get_api_key(user_id, api_key_id)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API密钥不存在"
            )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取API密钥失败：{str(e)}"
        )


@router.put("/{api_key_id}", response_model=APIKeyResponse)
async def update_api_key(
    api_key_id: str,
    data: APIKeyUpdate,
    user_id: str = Depends(get_current_user_id),
    service: APIKeyService = Depends(get_api_key_service)
):
    """更新API密钥"""
    try:
        result = await service.update_api_key(user_id, api_key_id, data)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API密钥不存在"
            )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"更新API密钥失败：{str(e)}"
        )


@router.delete("/{api_key_id}", response_model=SuccessResponse)
async def delete_api_key(
    api_key_id: str,
    user_id: str = Depends(get_current_user_id),
    service: APIKeyService = Depends(get_api_key_service)
):
    """删除API密钥"""
    try:
        success = await service.delete_api_key(user_id, api_key_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API密钥不存在"
            )
        return SuccessResponse(message="API密钥删除成功")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"删除API密钥失败：{str(e)}"
        )
