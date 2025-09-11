"""
提示词管理路由
"""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, status, Query
from agent.models.schemas import (
    PromptTemplateCreate, PromptTemplateUpdate, PromptTemplateResponse,
    SuccessResponse
)
from agent.services.prompt_service import PromptService

router = APIRouter(prefix="/prompts", tags=["提示词管理"])


def get_prompt_service() -> PromptService:
    """获取提示词服务实例"""
    return PromptService()


def get_current_user_id() -> str:
    """获取当前用户ID（模拟实现）"""
    return "test-user-id"


@router.post("", response_model=PromptTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_prompt_template(
    data: PromptTemplateCreate,
    user_id: str = Depends(get_current_user_id),
    service: PromptService = Depends(get_prompt_service)
):
    """创建提示词模板"""
    try:
        result = await service.create_template(user_id, data)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建提示词模板失败：{str(e)}"
        )


@router.get("", response_model=List[PromptTemplateResponse])
async def get_prompt_templates(
    category: Optional[str] = Query(None, description="模板分类"),
    user_id: str = Depends(get_current_user_id),
    service: PromptService = Depends(get_prompt_service)
):
    """获取提示词模板列表"""
    try:
        return await service.get_templates(user_id, category)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取提示词模板列表失败：{str(e)}"
        )


@router.get("/{template_id}", response_model=PromptTemplateResponse)
async def get_prompt_template(
    template_id: str,
    user_id: str = Depends(get_current_user_id),
    service: PromptService = Depends(get_prompt_service)
):
    """获取指定提示词模板"""
    try:
        result = await service.get_template(user_id, template_id)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="提示词模板不存在"
            )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取提示词模板失败：{str(e)}"
        )


@router.put("/{template_id}", response_model=PromptTemplateResponse)
async def update_prompt_template(
    template_id: str,
    data: PromptTemplateUpdate,
    user_id: str = Depends(get_current_user_id),
    service: PromptService = Depends(get_prompt_service)
):
    """更新提示词模板"""
    try:
        result = await service.update_template(user_id, template_id, data)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="提示词模板不存在"
            )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"更新提示词模板失败：{str(e)}"
        )


@router.delete("/{template_id}", response_model=SuccessResponse)
async def delete_prompt_template(
    template_id: str,
    user_id: str = Depends(get_current_user_id),
    service: PromptService = Depends(get_prompt_service)
):
    """删除提示词模板"""
    try:
        success = await service.delete_template(user_id, template_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="提示词模板不存在"
            )
        return SuccessResponse(message="提示词模板删除成功")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"删除提示词模板失败：{str(e)}"
        )


@router.post("/{template_id}/render")
async def render_prompt_template(
    template_id: str,
    variables: dict = None,
    user_id: str = Depends(get_current_user_id),
    service: PromptService = Depends(get_prompt_service)
):
    """渲染提示词模板"""
    try:
        result = await service.render_template(template_id, variables or {})
        if result is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="提示词模板不存在"
            )
        return {"rendered_content": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"渲染提示词模板失败：{str(e)}"
        )
