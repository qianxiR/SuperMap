"""
Agent管理服务
"""
import json
import httpx
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import uuid4

from agent.models.schemas import (
    AgentCreate, AgentUpdate, AgentResponse,
    ConversationCreate, ConversationResponse,
    ChatRequest, ChatResponse, ChatMessage
)
from agent.services.api_key_service import APIKeyService
from agent.services.prompt_service import PromptService
from agent.services.knowledge_service import KnowledgeService


class AgentService:
    """Agent管理服务"""
    
    def __init__(self, api_key_service: APIKeyService, prompt_service: PromptService, knowledge_service: KnowledgeService):
        self.api_key_service = api_key_service
        self.prompt_service = prompt_service
        self.knowledge_service = knowledge_service
        # 模拟数据存储
        self.agents = {}
        self.conversations = {}
        self.messages = {}
        self._load_default_agents()
    
    def _load_default_agents(self):
        """加载默认Agent"""
        default_agent = {
            "id": "default-spatial-agent",
            "user_id": "system",
            "name": "空间分析助手",
            "description": "专门用于GIS空间分析的智能助手",
            "api_key_id": None,  # 需要用户配置
            "prompt_template_id": "default-spatial-analysis",
            "knowledge_base_id": None,
            "tools_config": {
                "enabled_tools": [
                    "ToggleLayerVisibility",
                    "ExecuteBufferAnalysis", 
                    "ExecuteIntersectionAnalysis",
                    "ExecuteEraseAnalysis",
                    "ExecuteShortestPathAnalysis",
                    "QueryByAttribute"
                ]
            },
            "model_config": {
                "temperature": 0.7,
                "max_tokens": 3000,
                "stream": False
            },
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        self.agents[default_agent["id"]] = default_agent
    
    async def create_agent(self, user_id: str, data: AgentCreate) -> Optional[AgentResponse]:
        """创建Agent"""
        # 验证API密钥是否存在
        api_key_config = await self.api_key_service.get_api_key_config(user_id, data.api_key_id)
        if not api_key_config:
            return None
        
        agent_id = str(uuid4())
        
        agent_data = {
            "id": agent_id,
            "user_id": user_id,
            "name": data.name,
            "description": data.description,
            "api_key_id": data.api_key_id,
            "prompt_template_id": data.prompt_template_id,
            "knowledge_base_id": data.knowledge_base_id,
            "tools_config": data.tools_config or {},
            "model_config": data.model_config or {
                "temperature": 0.7,
                "max_tokens": 3000,
                "stream": False
            },
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        self.agents[agent_id] = agent_data
        return AgentResponse(**agent_data)
    
    async def get_agents(self, user_id: str) -> List[AgentResponse]:
        """获取用户的Agent列表"""
        user_agents = []
        for agent_data in self.agents.values():
            if agent_data["user_id"] == user_id or agent_data["user_id"] == "system":
                user_agents.append(AgentResponse(**agent_data))
        return user_agents
    
    async def get_agent(self, user_id: str, agent_id: str) -> Optional[AgentResponse]:
        """获取指定Agent"""
        agent_data = self.agents.get(agent_id)
        if agent_data and (agent_data["user_id"] == user_id or agent_data["user_id"] == "system"):
            return AgentResponse(**agent_data)
        return None
    
    async def update_agent(self, user_id: str, agent_id: str, data: AgentUpdate) -> Optional[AgentResponse]:
        """更新Agent"""
        agent_data = self.agents.get(agent_id)
        if not agent_data or agent_data["user_id"] != user_id:
            return None
        
        if data.name is not None:
            agent_data["name"] = data.name
        if data.description is not None:
            agent_data["description"] = data.description
        if data.api_key_id is not None:
            # 验证新的API密钥
            api_key_config = await self.api_key_service.get_api_key_config(user_id, data.api_key_id)
            if api_key_config:
                agent_data["api_key_id"] = data.api_key_id
        if data.prompt_template_id is not None:
            agent_data["prompt_template_id"] = data.prompt_template_id
        if data.knowledge_base_id is not None:
            agent_data["knowledge_base_id"] = data.knowledge_base_id
        if data.tools_config is not None:
            agent_data["tools_config"] = data.tools_config
        if data.model_config is not None:
            agent_data["model_config"] = data.model_config
        if data.is_active is not None:
            agent_data["is_active"] = data.is_active
        
        agent_data["updated_at"] = datetime.utcnow()
        return AgentResponse(**agent_data)
    
    async def delete_agent(self, user_id: str, agent_id: str) -> bool:
        """删除Agent"""
        agent_data = self.agents.get(agent_id)
        if agent_data and agent_data["user_id"] == user_id:
            # 删除相关对话
            convs_to_delete = [conv_id for conv_id, conv_data in self.conversations.items() 
                              if conv_data["agent_id"] == agent_id]
            for conv_id in convs_to_delete:
                await self.delete_conversation(user_id, conv_id)
            
            del self.agents[agent_id]
            return True
        return False
    
    async def create_conversation(self, user_id: str, data: ConversationCreate) -> Optional[ConversationResponse]:
        """创建对话"""
        agent_data = self.agents.get(data.agent_id)
        if not agent_data or (agent_data["user_id"] != user_id and agent_data["user_id"] != "system"):
            return None
        
        conv_id = str(uuid4())
        
        conv_data = {
            "id": conv_id,
            "agent_id": data.agent_id,
            "user_id": user_id,
            "title": data.title,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        self.conversations[conv_id] = conv_data
        return ConversationResponse(**conv_data)
    
    async def get_conversations(self, user_id: str, agent_id: str) -> List[ConversationResponse]:
        """获取Agent的对话列表"""
        convs = []
        for conv_data in self.conversations.values():
            if conv_data["agent_id"] == agent_id and conv_data["user_id"] == user_id:
                convs.append(ConversationResponse(**conv_data))
        return sorted(convs, key=lambda x: x.updated_at, reverse=True)
    
    async def delete_conversation(self, user_id: str, conv_id: str) -> bool:
        """删除对话"""
        conv_data = self.conversations.get(conv_id)
        if conv_data and conv_data["user_id"] == user_id:
            # 删除相关消息
            msgs_to_delete = [msg_id for msg_id, msg_data in self.messages.items() 
                             if msg_data["conversation_id"] == conv_id]
            for msg_id in msgs_to_delete:
                del self.messages[msg_id]
            
            del self.conversations[conv_id]
            return True
        return False
    
    async def chat(self, user_id: str, request: ChatRequest) -> ChatResponse:
        """处理聊天请求"""
        try:
            # 获取或创建对话
            conv_id = request.conversation_id
            if not conv_id:
                conv_create = ConversationCreate(
                    agent_id=request.agent_id,
                    title=request.message[:50] + "..." if len(request.message) > 50 else request.message
                )
                conv_response = await self.create_conversation(user_id, conv_create)
                if not conv_response:
                    return ChatResponse(
                        success=False,
                        conversation_id="",
                        message="",
                        error="Failed to create conversation"
                    )
                conv_id = conv_response.id
            
            # 获取Agent配置
            agent_data = self.agents.get(request.agent_id)
            if not agent_data:
                return ChatResponse(
                    success=False,
                    conversation_id=conv_id,
                    message="",
                    error="Agent not found"
                )
            
            # 保存用户消息
            user_msg_id = str(uuid4())
            user_msg_data = {
                "id": user_msg_id,
                "conversation_id": conv_id,
                "role": "user",
                "content": request.message,
                "metadata": {},
                "created_at": datetime.utcnow()
            }
            self.messages[user_msg_id] = user_msg_data
            
            # 准备消息历史
            messages = []
            
            # 添加系统提示词
            if agent_data["prompt_template_id"]:
                system_prompt = await self.prompt_service.render_template(
                    agent_data["prompt_template_id"]
                )
                if system_prompt:
                    messages.append({"role": "system", "content": system_prompt})
            
            # 添加知识库上下文
            if request.use_knowledge_base and agent_data["knowledge_base_id"]:
                knowledge_context = await self._get_knowledge_context(
                    user_id, agent_data["knowledge_base_id"], request.message
                )
                if knowledge_context:
                    messages.append({
                        "role": "system", 
                        "content": f"相关知识库内容：\n{knowledge_context}"
                    })
            
            # 添加历史消息（最近10条）
            conv_messages = [msg for msg in self.messages.values() 
                           if msg["conversation_id"] == conv_id]
            conv_messages.sort(key=lambda x: x["created_at"])
            for msg in conv_messages[-10:]:
                messages.append({
                    "role": msg["role"],
                    "content": msg["content"]
                })
            
            # 调用LLM
            response_content = await self._call_llm(user_id, agent_data, messages)
            
            # 保存助手响应
            assistant_msg_id = str(uuid4())
            assistant_msg_data = {
                "id": assistant_msg_id,
                "conversation_id": conv_id,
                "role": "assistant",
                "content": response_content,
                "metadata": {},
                "created_at": datetime.utcnow()
            }
            self.messages[assistant_msg_id] = assistant_msg_data
            
            # 更新对话时间
            self.conversations[conv_id]["updated_at"] = datetime.utcnow()
            
            return ChatResponse(
                success=True,
                conversation_id=conv_id,
                message=response_content
            )
        
        except Exception as e:
            return ChatResponse(
                success=False,
                conversation_id=conv_id or "",
                message="",
                error=str(e)
            )
    
    async def _get_knowledge_context(self, user_id: str, kb_id: str, query: str) -> Optional[str]:
        """获取知识库上下文"""
        try:
            from agent.models.schemas import KnowledgeQuery
            
            knowledge_query = KnowledgeQuery(query=query, top_k=3, score_threshold=0.5)
            results = await self.knowledge_service.query_knowledge_base(user_id, kb_id, knowledge_query)
            
            if results:
                context_parts = []
                for result in results:
                    context_parts.append(f"[相似度: {result.score:.2f}] {result.content}")
                return "\n\n".join(context_parts)
        except Exception:
            pass
        return None
    
    async def _call_llm(self, user_id: str, agent_data: Dict[str, Any], messages: List[Dict[str, str]]) -> str:
        """调用LLM API"""
        # 获取API密钥配置
        api_key_config = await self.api_key_service.get_api_key_config(user_id, agent_data["api_key_id"])
        if not api_key_config:
            return "错误：无法获取API密钥配置"
        
        # 准备请求
        model_config = agent_data["model_config"]
        
        if api_key_config["provider"] == "qwen":
            # 通义千问API
            url = api_key_config["base_url"].rstrip("/") + "/chat/completions"
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key_config['api_key']}"
            }
            
            body = {
                "model": api_key_config["model_config"].get("model", "qwen-plus"),
                "messages": messages,
                "temperature": model_config.get("temperature", 0.7),
                "max_tokens": model_config.get("max_tokens", 3000),
                "stream": False
            }
            
            try:
                async with httpx.AsyncClient(timeout=60.0, verify=False) as client:
                    response = await client.post(url, headers=headers, json=body)
                    if response.status_code == 200:
                        data = response.json()
                        return data["choices"][0]["message"]["content"]
                    else:
                        return f"API调用失败：{response.status_code} {response.text}"
            except Exception as e:
                return f"API调用异常：{str(e)}"
        
        elif api_key_config["provider"] == "openai":
            # OpenAI API (类似实现)
            return "OpenAI API调用功能待实现"
        
        else:
            return f"不支持的服务商：{api_key_config['provider']}"
