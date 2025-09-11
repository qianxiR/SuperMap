"""
Agent服务数据模型定义
"""
from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field
from uuid import UUID


# API密钥管理相关模型
class APIKeyCreate(BaseModel):
    """创建API密钥请求"""
    name: str = Field(..., description="密钥名称")
    provider: str = Field(..., description="服务商：openai, qwen, baidu, claude等")
    api_key: str = Field(..., description="API密钥")
    base_url: Optional[str] = Field(None, description="API基础URL")
    model_config: Optional[Dict[str, Any]] = Field(None, description="模型配置参数")


class APIKeyUpdate(BaseModel):
    """更新API密钥请求"""
    name: Optional[str] = None
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    model_config: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class APIKeyResponse(BaseModel):
    """API密钥响应"""
    id: str
    name: str
    provider: str
    base_url: Optional[str] = None
    model_config: Optional[Dict[str, Any]] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# 提示词管理相关模型
class PromptTemplateCreate(BaseModel):
    """创建提示词模板请求"""
    name: str = Field(..., description="模板名称")
    description: Optional[str] = Field(None, description="模板描述")
    content: str = Field(..., description="提示词内容")
    variables: Optional[Dict[str, Any]] = Field(None, description="模板变量定义")
    category: Optional[str] = Field("user", description="分类：system, user, assistant")
    is_public: Optional[bool] = Field(False, description="是否公开")


class PromptTemplateUpdate(BaseModel):
    """更新提示词模板请求"""
    name: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    variables: Optional[Dict[str, Any]] = None
    category: Optional[str] = None
    is_public: Optional[bool] = None


class PromptTemplateResponse(BaseModel):
    """提示词模板响应"""
    id: str
    name: str
    description: Optional[str] = None
    content: str
    variables: Optional[Dict[str, Any]] = None
    category: str
    is_public: bool
    usage_count: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# 知识库管理相关模型
class KnowledgeBaseCreate(BaseModel):
    """创建知识库请求"""
    name: str = Field(..., description="知识库名称")
    description: Optional[str] = Field(None, description="知识库描述")
    embedding_model: Optional[str] = Field("text-embedding-ada-002", description="向量化模型")
    chunk_size: Optional[int] = Field(1000, description="文档分块大小")
    chunk_overlap: Optional[int] = Field(200, description="分块重叠大小")


class KnowledgeBaseUpdate(BaseModel):
    """更新知识库请求"""
    name: Optional[str] = None
    description: Optional[str] = None
    embedding_model: Optional[str] = None
    chunk_size: Optional[int] = None
    chunk_overlap: Optional[int] = None
    is_active: Optional[bool] = None


class KnowledgeBaseResponse(BaseModel):
    """知识库响应"""
    id: str
    name: str
    description: Optional[str] = None
    embedding_model: str
    vector_dimension: Optional[int] = None
    chunk_size: int
    chunk_overlap: int
    document_count: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class DocumentUpload(BaseModel):
    """文档上传请求"""
    filename: str = Field(..., description="文件名")
    content: str = Field(..., description="文档内容")
    file_type: str = Field(..., description="文件类型")
    metadata: Optional[Dict[str, Any]] = Field(None, description="文档元数据")


class DocumentResponse(BaseModel):
    """文档响应"""
    id: str
    filename: str
    file_type: str
    file_size: int
    chunk_count: int
    processed: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class KnowledgeQuery(BaseModel):
    """知识库查询请求"""
    query: str = Field(..., description="查询内容")
    top_k: Optional[int] = Field(5, description="返回结果数量")
    score_threshold: Optional[float] = Field(0.7, description="相似度阈值")


class KnowledgeResult(BaseModel):
    """知识库查询结果"""
    content: str
    score: float
    metadata: Dict[str, Any]
    document_id: str
    chunk_index: int


# Agent管理相关模型
class AgentCreate(BaseModel):
    """创建Agent请求"""
    name: str = Field(..., description="Agent名称")
    description: Optional[str] = Field(None, description="Agent描述")
    api_key_id: str = Field(..., description="API密钥ID")
    prompt_template_id: Optional[str] = Field(None, description="提示词模板ID")
    knowledge_base_id: Optional[str] = Field(None, description="知识库ID")
    tools_config: Optional[Dict[str, Any]] = Field(None, description="工具配置")
    model_config: Optional[Dict[str, Any]] = Field(None, description="模型配置")


class AgentUpdate(BaseModel):
    """更新Agent请求"""
    name: Optional[str] = None
    description: Optional[str] = None
    api_key_id: Optional[str] = None
    prompt_template_id: Optional[str] = None
    knowledge_base_id: Optional[str] = None
    tools_config: Optional[Dict[str, Any]] = None
    model_config: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class AgentResponse(BaseModel):
    """Agent响应"""
    id: str
    name: str
    description: Optional[str] = None
    api_key_id: str
    prompt_template_id: Optional[str] = None
    knowledge_base_id: Optional[str] = None
    tools_config: Optional[Dict[str, Any]] = None
    model_config: Optional[Dict[str, Any]] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# 对话相关模型
class ConversationCreate(BaseModel):
    """创建对话请求"""
    agent_id: str = Field(..., description="Agent ID")
    title: Optional[str] = Field(None, description="对话标题")


class ConversationResponse(BaseModel):
    """对话响应"""
    id: str
    agent_id: str
    title: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ChatMessage(BaseModel):
    """聊天消息"""
    role: str = Field(..., description="消息角色：user, assistant, system, tool")
    content: str = Field(..., description="消息内容")
    metadata: Optional[Dict[str, Any]] = Field(None, description="消息元数据")


class ChatRequest(BaseModel):
    """聊天请求"""
    conversation_id: Optional[str] = Field(None, description="对话ID，为空时创建新对话")
    agent_id: str = Field(..., description="Agent ID")
    message: str = Field(..., description="用户消息")
    use_knowledge_base: Optional[bool] = Field(True, description="是否使用知识库")
    use_tools: Optional[bool] = Field(True, description="是否使用工具")


class ChatResponse(BaseModel):
    """聊天响应"""
    success: bool
    conversation_id: str
    message: str
    metadata: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# 通用响应模型
class SuccessResponse(BaseModel):
    """成功响应"""
    success: bool = True
    message: str
    data: Optional[Dict[str, Any]] = None


class ErrorResponse(BaseModel):
    """错误响应"""
    success: bool = False
    error: str
    detail: Optional[str] = None
