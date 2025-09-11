"""
Agent Service - FastAPI entry for LLM chat proxy with full LLM management features

Usage (dev):
  python -m uvicorn agent.app:app --reload --host 0.0.0.0 --port 8089
"""
from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uvicorn
import os
from pathlib import Path
from dotenv import load_dotenv
from langchain_community.chat_models.tongyi import ChatTongyi
from langchain_core.tools import tool
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, ToolMessage
import urllib3
from langchain.chat_models import init_chat_model
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import create_react_agent
from langchain_tavily import TavilySearch

# 关闭全局SSL验证以规避企业网络或中间代理引起的握手问题
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
os.environ["PYTHONHTTPSVERIFY"] = "0"


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
os.environ.setdefault("OPENAI_API_KEY", settings.api_key)
os.environ.setdefault("OPENAI_BASE_URL", settings.base_url)
class ChatResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


@tool
def toggle_layer_visibility(layer_id: str, action: str) -> str:
    """
    切换前端图层可见性（前端执行）。
    输入参数：
      - layer_id: string 图层唯一标识
      - action: string 'show'|'hide'|'toggle'
    业务处理：
      - 后端不直接操作地图，仅返回动作与图层ID供前端执行
    输出数据格式：
      - string: 格式 "action:layer_id"
    """
    return f"{action}:{layer_id}"


 

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

# 会话图层操作历史：conversation_id -> ["action:layer_id", ...]
_conversation_layer_history: Dict[str, List[str]] = {}


class ToolChatRequest(BaseModel):
    model: str
    temperature: float
    prompt: str
    stream: bool = False
    conversation_id: str = "default"


@router.post("/tool-chat", response_model=ChatResponse)
async def tool_chat(req: ToolChatRequest):
    """
    LangChain 工具调用接口（仅保留图层可见性工具）：
    输入数据格式：
      - model: LLM 模型名称
      - temperature: 采样温度
      - prompt: 用户问题（例如 What's 5 times forty two）
      - stream: 是否流式
    数据处理方法：
      - 创建 OpenAI 兼容模型，并通过 bind_tools 仅绑定 toggle_layer_visibility 工具
      - 第一步调用：发送 HumanMessage(prompt)，获取包含 tool_calls 的 AIMessage
      - 执行工具：根据 AIMessage 中的工具与参数，执行 toggle_layer_visibility 并得到结果
      - 第二步调用：将工具结果以 ToolMessage 形式回传给模型，生成最终回答
    输出数据格式：
      - { success: true, data: { first_call: AIMessage(JSON), tool_result: string, final_answer: string } }
    """
    model = init_chat_model(f"openai:{req.model}")
    llm_with_tools = model.bind_tools([toggle_layer_visibility])
    history_list = _conversation_layer_history.get(req.conversation_id, [])
    parsed_lines: List[str] = []
    last_action_text = ""
    for entry in history_list:
        if ":" in entry:
            action, layer = entry.split(":", 1)
            parsed_line = f"action={action}; layer={layer}"
            parsed_lines.append(parsed_line)
            last_action_text = f"action={action}; layer={layer}"
        else:
            parsed_lines.append(entry)
            last_action_text = entry
    history_text = "\n".join(parsed_lines)
    first_ai: AIMessage = llm_with_tools.invoke([
        SystemMessage(content=(
            "你有一个工具:\n"
            "toggle_layer_visibility(layer_id:str, action:'show'|'hide'|'toggle')\n"
            "- 当用户说‘打开@图层名称’或‘隐藏@图层名称’或‘切换@图层名称’时调用。\n"
            "- 若用户使用@图层名称，请将@后的文本作为 layer_name 传递；如未知 layer_id，可仅传 layer_name。\n"
            "严禁自行执行这些操作，必须通过工具完成。\n"
            f"历史图层操作(顺序, 最新在下):\n{history_text}\n"
            f"最近一次操作: {last_action_text}。若用户问‘刚才做了什么/刚才关闭了什么图层’，请直接依据最近一次操作回答。"
        )),
        HumanMessage(content=req.prompt)
    ])
    if not first_ai.tool_calls:
        return ChatResponse(success=True, data={"first_call": {"tool_calls": []}, "tool_result": None, "final_answer": first_ai.content})
    tool_call = first_ai.tool_calls[0]
    tool_args = tool_call.get("args", {})
    tool_result = toggle_layer_visibility.invoke(tool_args)
    history_entry = str(tool_result)
    if req.conversation_id in _conversation_layer_history:
        _conversation_layer_history[req.conversation_id].append(history_entry)
    else:
        _conversation_layer_history[req.conversation_id] = [history_entry]
    tool_message = ToolMessage(content=str(tool_result), tool_call_id=tool_call["id"])
    final_ai: AIMessage = llm_with_tools.invoke([
        SystemMessage(content=(
            "你有一个工具:\n"
            "toggle_layer_visibility(layer_id:str, action:'show'|'hide'|'toggle')\n"
            "遇到‘打开/隐藏/切换@图层名称’的请求，必须调用该工具。"
        )),
        HumanMessage(content=req.prompt),
        first_ai,
        tool_message,
    ])
    return ChatResponse(success=True, data={"first_call": {"tool_calls": first_ai.tool_calls}, "tool_result": tool_result, "final_answer": final_ai.content})

app = FastAPI(
    title="Agent Service", 
    version="2.0.0",
    description="LLM Agent服务 - 提供完整的AI助手管理功能"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list(),
    allow_credentials=False,
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
            "tool_chat": "/agent/tool-chat",
            "api_keys": "/api/v1/api-keys",
            "prompts": "/api/v1/prompts", 
            "knowledge": "/api/v1/knowledge"
        }
    }



if __name__ == "__main__":
    uvicorn.run("agent.app:app", host="0.0.0.0", port=8089, reload=True)