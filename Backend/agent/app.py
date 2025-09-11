"""
Agent Service - FastAPI entry for LLM chat proxy with full LLM management features

Usage (dev):
  python -m uvicorn agent.app:app --reload --host 0.0.0.0 --port 8090
"""
from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Literal, Optional, Dict, Any
import httpx
import os
from pathlib import Path
from dotenv import load_dotenv


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
    messages: List[ChatMessage]
    model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    stream: Optional[bool] = False


class ChatResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


def load_system_prompt() -> str:
    """加载系统提示词，优先从prompt/prompt.md读取"""
    base = Path(__file__).resolve().parent
    prompt_path = base / "prompt" / "prompt.md"
    if not prompt_path.exists():
        prompt_path = base / "prompt.md"
    try:
        content = prompt_path.read_text(encoding="utf-8")
        print(f"✅ 成功加载系统提示词: {prompt_path}")
        return content
    except Exception as e:
        print(f"⚠️ 加载系统提示词失败: {e}")
        return "You are a helpful spatial analysis assistant."


router = APIRouter(prefix="/agent", tags=["agent"])


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """
    聊天接口 - 自动注入prompt.md中的系统提示词
    """
    if not settings.api_key:
        raise HTTPException(status_code=401, detail="DASHSCOPE_API_KEY missing in environment.")

    # 加载并注入系统提示词
    sys_prompt = load_system_prompt()
    messages = req.messages or []
    
    # 确保系统提示词在最前面
    payload_messages = [{"role": "system", "content": sys_prompt}]
    
    # 添加用户消息历史（过滤掉已有的system消息，避免重复）
    for msg in messages:
        if msg.role != "system":
            payload_messages.append(msg.model_dump())

    body = {
        "model": req.model or settings.model,
        "temperature": settings.temperature if req.temperature is None else req.temperature,
        "max_tokens": settings.max_tokens if req.max_tokens is None else req.max_tokens,
        "messages": payload_messages,
        "stream": False
    }

    url = settings.base_url.rstrip("/") + "/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {settings.api_key}"
    }

    print(f"🤖 发送聊天请求到: {url}")
    print(f"📝 系统提示词已注入，消息数量: {len(payload_messages)}")

    async with httpx.AsyncClient(timeout=60.0, verify=False) as client:
        resp = await client.post(url, headers=headers, json=body)
        if resp.status_code != 200:
            print(f"❌ API调用失败: {resp.status_code} - {resp.text}")
            raise HTTPException(status_code=resp.status_code, detail=resp.text)
        data = resp.json()
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


