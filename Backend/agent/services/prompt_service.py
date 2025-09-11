"""
提示词管理服务
"""
import json
import os
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import uuid4

from agent.models.schemas import (
    PromptTemplateCreate, PromptTemplateUpdate, PromptTemplateResponse
)


class PromptService:
    """提示词管理服务"""
    
    def __init__(self):
        # 模拟数据存储（实际项目中应使用数据库）
        self.templates = {}
        self._load_default_templates()
    
    def _load_default_templates(self):
        """加载默认提示词模板"""
        default_templates = [
            {
                "id": "default-spatial-analysis",
                "user_id": "system",
                "name": "空间分析助手",
                "description": "专门用于GIS空间分析的系统提示词",
                "content": self._load_system_prompt(),
                "variables": {},
                "category": "system",
                "is_public": True,
                "usage_count": 0,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "id": "default-general-assistant",
                "user_id": "system", 
                "name": "通用AI助手",
                "description": "通用对话助手提示词模板",
                "content": "你是一个有用的AI助手，请根据用户的问题提供准确、有帮助的回答。",
                "variables": {},
                "category": "system",
                "is_public": True,
                "usage_count": 0,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "id": "default-code-assistant",
                "user_id": "system",
                "name": "代码助手",
                "description": "专门用于代码编写和调试的助手",
                "content": "你是一个专业的编程助手，擅长多种编程语言。请帮助用户解决编程问题，提供清晰的代码示例和解释。",
                "variables": {
                    "language": "编程语言",
                    "framework": "框架或库"
                },
                "category": "system",
                "is_public": True,
                "usage_count": 0,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        ]
        
        for template in default_templates:
            self.templates[template["id"]] = template
    
    def _load_system_prompt(self) -> str:
        """加载系统提示词"""
        try:
            with open("agent/prompt/prompt.md", "r", encoding="utf-8") as f:
                return f.read()
        except Exception:
            return "You are a helpful spatial analysis assistant."
    
    async def create_template(self, user_id: str, data: PromptTemplateCreate) -> PromptTemplateResponse:
        """创建提示词模板"""
        template_id = str(uuid4())
        
        template_data = {
            "id": template_id,
            "user_id": user_id,
            "name": data.name,
            "description": data.description,
            "content": data.content,
            "variables": data.variables or {},
            "category": data.category,
            "is_public": data.is_public,
            "usage_count": 0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        self.templates[template_id] = template_data
        return PromptTemplateResponse(**template_data)
    
    async def get_templates(self, user_id: str, category: Optional[str] = None) -> List[PromptTemplateResponse]:
        """获取用户的提示词模板"""
        user_templates = []
        for template_data in self.templates.values():
            # 返回用户自己的模板和公开模板
            if template_data["user_id"] == user_id or template_data["is_public"]:
                if category is None or template_data["category"] == category:
                    user_templates.append(PromptTemplateResponse(**template_data))
        return user_templates
    
    async def get_template(self, user_id: str, template_id: str) -> Optional[PromptTemplateResponse]:
        """获取指定提示词模板"""
        template_data = self.templates.get(template_id)
        if template_data and (template_data["user_id"] == user_id or template_data["is_public"]):
            return PromptTemplateResponse(**template_data)
        return None
    
    async def update_template(self, user_id: str, template_id: str, data: PromptTemplateUpdate) -> Optional[PromptTemplateResponse]:
        """更新提示词模板"""
        template_data = self.templates.get(template_id)
        if not template_data or template_data["user_id"] != user_id:
            return None
        
        if data.name is not None:
            template_data["name"] = data.name
        if data.description is not None:
            template_data["description"] = data.description
        if data.content is not None:
            template_data["content"] = data.content
        if data.variables is not None:
            template_data["variables"] = data.variables
        if data.category is not None:
            template_data["category"] = data.category
        if data.is_public is not None:
            template_data["is_public"] = data.is_public
        
        template_data["updated_at"] = datetime.utcnow()
        
        return PromptTemplateResponse(**template_data)
    
    async def delete_template(self, user_id: str, template_id: str) -> bool:
        """删除提示词模板"""
        template_data = self.templates.get(template_id)
        if template_data and template_data["user_id"] == user_id:
            del self.templates[template_id]
            return True
        return False
    
    async def increment_usage(self, template_id: str) -> None:
        """增加模板使用次数"""
        if template_id in self.templates:
            self.templates[template_id]["usage_count"] += 1
    
    async def render_template(self, template_id: str, variables: Dict[str, str] = None) -> Optional[str]:
        """渲染提示词模板"""
        template_data = self.templates.get(template_id)
        if not template_data:
            return None
        
        content = template_data["content"]
        if variables:
            # 简单的变量替换
            for key, value in variables.items():
                content = content.replace(f"{{{key}}}", value)
        
        await self.increment_usage(template_id)
        return content
