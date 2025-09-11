"""
Agent Service - FastAPI entry for LLM chat proxy with full LLM management features

Usage (dev):
  python -m uvicorn agent.app:app --reload --host 0.0.0.0 --port 8089
"""
from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Literal, Optional, Dict, Any
import httpx
import uvicorn
import os
from pathlib import Path
from dotenv import load_dotenv
from typing import Set


class LLMSettings(BaseModel):
    api_key: str = Field(default_factory=lambda: os.getenv("DASHSCOPE_API_KEY", ""))
    base_url: str = Field(default_factory=lambda: os.getenv("DASHSCOPE_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1"))
    model: str = Field(default_factory=lambda: os.getenv("DASHSCOPE_MODEL", "qwen-plus"))
    temperature: float = Field(default_factory=lambda: float(os.getenv("DASHSCOPE_TEMPERATURE", "0.7")))
    max_tokens: int = Field(default_factory=lambda: int(os.getenv("DASHSCOPE_MAX_TOKENS", "3000")))
    cors_origins: str = Field(default_factory=lambda: os.getenv("CORS_ORIGINS", "*"))

    def cors_list(self) -> List[str]:
        raw = self.cors_origins or "*"
        if raw == "*":
            return ["*"]
        return [o.strip() for o in raw.split(",")]


# 加载后端环境变量文件 Backend/.env
_ROOT = Path(__file__).resolve().parents[1]
_ENV_PATH = _ROOT / ".env"
if _ENV_PATH.exists():
    load_dotenv(dotenv_path=str(_ENV_PATH))

settings = LLMSettings()


class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant", "tool"]
    content: str
    name: Optional[str] = None


class ChatRequest(BaseModel):
    api_key: str | None = None
    base_url: str | None = None
    apiKey: str | None = None
    baseUrl: str | None = None
    model: str
    temperature: float
    max_tokens: int | None = None
    maxTokens: int | None = None
    stream: bool
    conversation_id: str | None = None
    conversationId: str | None = None
    messages: List[ChatMessage]


class ChatResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


def load_system_prompt() -> str:
    """加载系统提示词，优先从prompt/tools.md读取"""
    base = Path(__file__).resolve().parent
    prompt_path = base / "prompt" / "tools.md"
    if not prompt_path.exists():
        prompt_path = base / "tools.md"
    try:
        content = prompt_path.read_text(encoding="utf-8")
        print(f"✅ 成功加载系统提示词: {prompt_path}")
        return content
    except Exception as e:
        print(f"⚠️ 加载系统提示词失败: {e}")
        return "You are a helpful spatial analysis assistant."

def load_tools_prompt() -> str:
    base = Path(__file__).resolve().parent
    # 优先使用独立工具提示词文件 agent/tools/tools.md
    tools_path = base / "tools" / "tools.md"
    if not tools_path.exists():
        # 回退到 prompt/tools.md（如果存在）
        tools_path = base / "prompt" / "tools.md"
    try:
        return tools_path.read_text(encoding="utf-8")
    except Exception:
        return ""


router = APIRouter(prefix="/agent", tags=["agent"])

# 记录已注入过系统提示词的会话
_injected_conversations: Set[str] = set()


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """
    聊天接口 - 自动注入main.md中的系统提示词
    """
    # 处理会话ID，并按需注入系统提示词
    conv_id = req.conversation_id or req.conversationId or ""
    messages = req.messages
    payload_messages: List[Dict[str, Any]] = []
    # 为确保系统提示词稳定生效：每次请求都注入
    should_inject = True
    if should_inject:
        sys_prompt = load_system_prompt()
        tools_prompt = load_tools_prompt()
        payload_messages.append({"role": "system", "content": sys_prompt})
        if tools_prompt:
            payload_messages.append({"role": "system", "content": tools_prompt})
    for msg in messages:
        if msg.role != "system":
            payload_messages.append(msg.model_dump())

    # 支持驼峰/下划线参数名
    api_key = req.api_key or req.apiKey or settings.api_key
    base_url = (req.base_url or req.baseUrl or settings.base_url).rstrip("/")
    max_tokens = req.max_tokens if req.max_tokens is not None else (req.maxTokens if req.maxTokens is not None else settings.max_tokens)
    
    # 验证必要参数
    if not api_key:
        raise HTTPException(status_code=400, detail="API密钥未配置")
    if not base_url:
        raise HTTPException(status_code=400, detail="API地址未配置")
    if not base_url.startswith(('http://', 'https://')):
        raise HTTPException(status_code=400, detail=f"API地址格式错误: {base_url}")


    body = {
        "model": req.model,
        "temperature": req.temperature,
        "max_tokens": max_tokens,
        "messages": payload_messages,
        "stream": req.stream
    }

    url = base_url + "/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }

    print(f"🤖 发送聊天请求到: {url}")
    print(f"📝 系统提示词已注入，消息数量: {len(payload_messages)}")
    print(f"🔑 API密钥: {api_key[:10]}..." if len(api_key) > 10 else f"🔑 API密钥: {api_key}")
    print(f"🌐 API地址: {base_url}")

    try:
        async with httpx.AsyncClient(timeout=60.0, verify=False) as client:
            resp = await client.post(url, headers=headers, json=body)
            if resp.status_code != 200:
                print(f"❌ API调用失败: {resp.status_code} - {resp.text}")
                raise HTTPException(status_code=resp.status_code, detail=resp.text)
            data = resp.json()
    except httpx.ConnectError as e:
        print(f"❌ 连接失败: {str(e)}")
        print(f"❌ 目标URL: {url}")
        raise HTTPException(status_code=500, detail=f"无法连接到LLM服务: {base_url}")
    except Exception as e:
        print(f"❌ 请求异常: {str(e)}")
        raise HTTPException(status_code=500, detail=f"LLM请求异常: {str(e)}")


    print(f"✅ API调用成功")
    return ChatResponse(success=True, data=data)


app = FastAPI(
    title="Agent Service", 
    version="2.0.0",
    description="LLM Agent服务 - 提供完整的AI助手管理功能"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health")
async def health():
    """健康检查接口"""
    return {
        "status": "ok",
        "service": "Agent Service",
        "version": "2.0.0",
        "features": [
            "LLM Chat with System Prompt Injection",
            "API Key Management", 
            "Prompt Template Management",
            "Knowledge Base Management"
        ],
        "prompt_loaded": load_system_prompt() != "You are a helpful spatial analysis assistant."
    }


@app.get("/")
async def root():
    """根路径信息"""
    return {
        "message": "Agent Service API",
        "docs": "/docs",
        "health": "/health",
        "endpoints": {
            "chat": "/agent/chat",
            "api_keys": "/api/v1/api-keys",
            "prompts": "/api/v1/prompts", 
            "knowledge": "/api/v1/knowledge"
        }
    }



if __name__ == "__main__":
    uvicorn.run("agent.app:app", host="0.0.0.0", port=8089, reload=True)