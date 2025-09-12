"""
Database Service - FastAPI entry providing database connection functionality

Run:
  python -m uvicorn rag.app:app --reload --host 0.0.0.0 --port 8086
"""
from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any
import os
from pathlib import Path
from dotenv import load_dotenv

from .db import get_engine, get_session


# Load environment variables from Backend/.env 
_ROOT = Path(__file__).resolve().parents[1]
_ENV_COPY_PATH = _ROOT / ".env"
load_dotenv(dotenv_path=str(_ENV_COPY_PATH))


class ServiceSettings:
    app_name: str = os.getenv("APP_NAME", "SuperMap Database Service")
    cors_origins: str = os.getenv("CORS_ORIGINS", "*")

    def cors_list(self):
        raw = self.cors_origins
        return [o.strip() for o in raw.split(",")] if raw != "*" else ["*"]


settings = ServiceSettings()

router = APIRouter(prefix="/db", tags=["Database"])


app = FastAPI(
    title="Database Service",
    version="1.0.0",
    description="数据库服务 - 提供数据库连接功能"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list(),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_origin_regex=".*",
)

app.include_router(router)


@router.get("/test")
async def test_connection() -> Dict[str, Any]:
    try:
        engine = get_engine()
        with engine.connect() as conn:
            result = conn.execute("SELECT 1 as test")
            test_value = result.scalar()
            return {
                "success": True,
                "message": "数据库连接成功",
                "test_query_result": test_value
            }
    except Exception as e:
        return {
            "success": False,
            "message": f"数据库连接失败: {str(e)}"
        }


@app.get("/health")
async def health() -> Dict[str, Any]:
    return {
        "status": "ok",
        "service": "Database Service",
        "version": "1.0.0"
    }


@app.get("/")
async def root() -> Dict[str, Any]:
    return {
        "app": settings.app_name,
        "apis": ["GET /health", "GET /db/test"],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("rag.app:app", host="0.0.0.0", port=8086, reload=True)


