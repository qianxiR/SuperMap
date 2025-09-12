import os
from sqlalchemy import create_engine, text
from pathlib import Path
from dotenv import load_dotenv

# Load env from Backend/.env and Backend/.env copy
_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(dotenv_path=str(_ROOT / ".env"))

HOST = os.getenv("RAG_POSTGRES_HOST", "localhost")
PORT = os.getenv("RAG_POSTGRES_PORT", "5432")
USER = os.getenv("RAG_POSTGRES_USER", "postgres")
PASSWORD = os.getenv("RAG_POSTGRES_PASSWORD", "")
DB = os.getenv("RAG_POSTGRES_DB", "ragdatabase")
SCHEMA = os.getenv("RAG_POSTGRES_SCHEMA", "public")

URL = f"postgresql+psycopg2://{USER}:{PASSWORD}@{HOST}:{PORT}/{DB}"
engine = create_engine(URL, future=True)

SQL_CREATE = text(
    f"""
    CREATE SCHEMA IF NOT EXISTS {SCHEMA};
    SET search_path TO {SCHEMA};
    CREATE TABLE IF NOT EXISTS rag_demo_abc (
      a text,
      b text,
      c text
    );
    """
)

SQL_INSERT = text(
    f"""
    SET search_path TO {SCHEMA};
    INSERT INTO rag_demo_abc(a,b,c) VALUES (:a,:b,:c);
    """
)

with engine.begin() as conn:
    conn.execute(SQL_CREATE)
    conn.execute(SQL_INSERT, {"a": "值A", "b": "值B", "c": "值C"})

print("Seed complete: public.rag_demo_abc inserted one row.")
