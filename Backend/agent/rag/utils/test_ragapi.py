#!/usr/bin/env python3
import os
import sys
import asyncio
import json
from pathlib import Path
from dotenv import load_dotenv
import httpx

# Load env for BASE URL and keys
_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(dotenv_path=str(_ROOT / ".env"))
load_dotenv(dotenv_path=str(_ROOT / ".env copy"))

BASE_URL = os.getenv("RAG_BASE_URL", "http://localhost:8086")


async def test_health():
    print("🔍 测试 RAG 服务健康检查...")
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{BASE_URL}/health")
        print(f"状态码: {r.status_code}")
        print(f"响应: {r.text}")
        return r.status_code == 200


async def test_query():
    print("\n🔍 测试 RAG 检索接口...")
    payload = {
        "query": "测试问题：请根据知识库返回一段说明",
        "top_k": 4,
        "max_tokens": 512
    }
    async with httpx.AsyncClient() as client:
        r = await client.post(f"{BASE_URL}/rag/query", json=payload)
        print(f"状态码: {r.status_code}")
        try:
            data = r.json()
        except Exception:
            print(f"响应: {r.text}")
            return False
        print(json.dumps(data, ensure_ascii=False, indent=2))
        return r.status_code == 200 and data.get("success") is True


async def main():
    ok1 = await test_health()
    ok2 = await test_query()
    print("\n结果:", "通过" if (ok1 and ok2) else "失败")


if __name__ == "__main__":
    asyncio.run(main())
