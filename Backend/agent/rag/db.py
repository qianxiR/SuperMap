from __future__ import annotations

from dataclasses import dataclass
from typing import Optional
import os

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker, Session


@dataclass
class RagDBSettings:
    host: str = os.getenv("RAG_POSTGRES_HOST", "localhost")
    port: str = os.getenv("RAG_POSTGRES_PORT", "5432")
    user: str = os.getenv("RAG_POSTGRES_USER", "postgres")
    password: str = os.getenv("RAG_POSTGRES_PASSWORD", "")
    db: str = os.getenv("RAG_POSTGRES_DB", "ragdatabase")
    schema: str = os.getenv("RAG_POSTGRES_SCHEMA", "public")

    def url(self) -> str:
        return f"postgresql+psycopg2://{self.user}:{self.password}@{self.host}:{self.port}/{self.db}"


_settings = RagDBSettings()
_engine: Engine = create_engine(_settings.url(), pool_pre_ping=True, future=True)
_SessionLocal = sessionmaker(bind=_engine, autoflush=False, autocommit=False, future=True)


def get_engine() -> Engine:
    return _engine


def get_session() -> Session:
    return _SessionLocal()


def fetch_text_corpus(table: str, text_columns: str) -> list[str]:
    columns = [c.strip() for c in text_columns.split(",")]
    cols_sql = ", ".join(f'"{c}"' for c in columns)
    sql = text(f"SET search_path TO {_settings.schema}; SELECT {cols_sql} FROM \"{table}\";")
    texts: list[str] = []
    with get_session() as session:
        result = session.execute(sql)
        for row in result:
            parts = [str(row[idx]) for idx in range(len(columns))]
            texts.append("\n".join(parts))
    return texts
