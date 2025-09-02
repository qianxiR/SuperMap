"""
功能: 读取环境变量连接 PostgreSQL(database 主机, 数据库 postgres)，按 readme 定义的结构创建表并插入基础数据

输入数据格式:
- 环境变量:
  - POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB

数据处理方法:
- 使用 psycopg 直连数据库
- 顺序创建 user → analysis → agent 全部表
- 插入最小可用样例数据（满足外键关联）

输出数据格式:
- 无返回值; 执行成功后数据库持久化了表与样例数据
"""
import os
import uuid
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
import psycopg
from passlib.context import CryptContext

# 仅加载本目录下的 database/.env（不读取 Backend/.env）
database_env = Path(__file__).parent / ".env"
if database_env.exists():
    load_dotenv(dotenv_path=database_env, override=False)


def build_dsn() -> str:
    user = os.environ["POSTGRES_USER"].split("#", 1)[0].strip()
    password = os.environ["POSTGRES_PASSWORD"].split("#", 1)[0].strip()
    host = os.environ["POSTGRES_HOST"].split("#", 1)[0].strip()
    port = os.environ["POSTGRES_PORT"].split("#", 1)[0].strip()
    db = os.environ["POSTGRES_DB"].split("#", 1)[0].strip()
    dsn = f"host={host} port={port} dbname={db} user={user} password={password}"
    print(f"Using DSN: {dsn!r}")
    return dsn


def get_schema() -> str:
    schema = os.environ.get("POSTGRES_SCHEMA", "public").split("#", 1)[0].strip()
    print(f"Using schema: {schema!r}")
    return schema


def create_user_tables(cur) -> None:
    cur.execute(
        """
    CREATE TABLE IF NOT EXISTS public.users (
      id UUID PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      phone VARCHAR(20) UNIQUE,
      hashed_password VARCHAR(255) NOT NULL,
      is_active BOOLEAN DEFAULT true,
      is_superuser BOOLEAN DEFAULT false NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      last_login TIMESTAMP
    );
    """
    )
    cur.execute(
        """
    CREATE TABLE IF NOT EXISTS public.user_credentials (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      provider VARCHAR(50) NOT NULL,
      provider_account_id VARCHAR(255) NOT NULL,
      hashed_password TEXT,
      access_token TEXT,
      refresh_token TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, provider)
    );
    """
    )
    cur.execute(
        """
    CREATE TABLE IF NOT EXISTS public.roles (
      id UUID PRIMARY KEY,
      name VARCHAR(50) UNIQUE NOT NULL,
      description TEXT
    );
    """
    )
    cur.execute(
        """
    CREATE TABLE IF NOT EXISTS public.user_roles (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
      assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, role_id)
    );
    """
    )
    cur.execute(
        """
    CREATE TABLE IF NOT EXISTS public.user_preferences (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      key VARCHAR(100) NOT NULL,
      value TEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, key)
    );
    """
    )
    cur.execute(
        """
    CREATE TABLE IF NOT EXISTS public.user_activity_logs (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      action VARCHAR(100) NOT NULL,
      ip_address INET,
      user_agent TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    """
    )


def create_analysis_tables(cur) -> None:
    cur.execute(
        """
    CREATE TABLE IF NOT EXISTS public.analysis_tasks (
      id UUID PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      analysis_type VARCHAR(100),
      parameters JSONB,
      status VARCHAR(50),
      created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      started_at TIMESTAMP,
      completed_at TIMESTAMP,
      progress NUMERIC,
      supermap_request JSONB,
      supermap_result JSONB,
      error_message TEXT
    );
    """
    )
    cur.execute(
        """
    CREATE TABLE IF NOT EXISTS public.analysis_results (
      id UUID PRIMARY KEY,
      task_id UUID NOT NULL REFERENCES public.analysis_tasks(id) ON DELETE CASCADE,
      result_type VARCHAR(100),
      data JSONB,
      result_metadata JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    """
    )
    cur.execute(
        """
    CREATE TABLE IF NOT EXISTS public.spatial_data (
      id UUID PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      data_type VARCHAR(50),
      geometry JSONB,
      attributes JSONB,
      crs VARCHAR(50),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    """
    )


def create_agent_tables(cur) -> None:
    cur.execute(
        """
    CREATE TABLE IF NOT EXISTS public.agent_prompt_templates (
      id UUID PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      role VARCHAR(50),
      language VARCHAR(20),
      content TEXT,
      variables JSONB,
      is_active BOOLEAN DEFAULT true,
      version VARCHAR(50),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    """
    )
    cur.execute(
        """
    CREATE TABLE IF NOT EXISTS public.agent_sessions (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      title VARCHAR(255),
      mode VARCHAR(50),
      status VARCHAR(50),
      last_message_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    """
    )
    cur.execute(
        """
    CREATE TABLE IF NOT EXISTS public.agent_memories (
      id UUID PRIMARY KEY,
      user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
      session_id UUID REFERENCES public.agent_sessions(id) ON DELETE CASCADE,
      type VARCHAR(50),
      scope VARCHAR(50),
      tags TEXT[],
      content JSONB,
      ttl_seconds INT,
      expires_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      last_access TIMESTAMP
    );
    """
    )
    cur.execute(
        """
    CREATE TABLE IF NOT EXISTS public.agent_memory_embeddings (
      id UUID PRIMARY KEY,
      memory_id UUID NOT NULL REFERENCES public.agent_memories(id) ON DELETE CASCADE,
      model VARCHAR(100),
      dim INT,
      embedding BYTEA,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    """
    )
    cur.execute(
        """
    CREATE TABLE IF NOT EXISTS public.agent_tools (
      id UUID PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      title VARCHAR(255),
      description TEXT,
      input_schema JSONB,
      output_schema JSONB,
      permissions JSONB,
      is_active BOOLEAN DEFAULT true,
      rate_limit_qps INT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    """
    )
    cur.execute(
        """
    CREATE TABLE IF NOT EXISTS public.agent_tool_invocations (
      id UUID PRIMARY KEY,
      session_id UUID NOT NULL REFERENCES public.agent_sessions(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      tool_id UUID NOT NULL REFERENCES public.agent_tools(id) ON DELETE CASCADE,
      args JSONB,
      status VARCHAR(50),
      result JSONB,
      error JSONB,
      latency_ms INT,
      wrote_memory BOOLEAN,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      finished_at TIMESTAMP
    );
    """
    )
    cur.execute(
        """
    CREATE TABLE IF NOT EXISTS public.agent_workflows (
      id UUID PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      description TEXT,
      graph JSONB,
      is_active BOOLEAN DEFAULT true,
      created_by UUID NOT NULL REFERENCES public.users(id),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    """
    )
    cur.execute(
        """
    CREATE TABLE IF NOT EXISTS public.agent_workflow_runs (
      id UUID PRIMARY KEY,
      workflow_id UUID NOT NULL REFERENCES public.agent_workflows(id) ON DELETE CASCADE,
      session_id UUID NOT NULL REFERENCES public.agent_sessions(id) ON DELETE CASCADE,
      status VARCHAR(50),
      context JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      finished_at TIMESTAMP
    );
    """
    )
    cur.execute(
        """
    CREATE TABLE IF NOT EXISTS public.agent_workflow_steps (
      id UUID PRIMARY KEY,
      run_id UUID NOT NULL REFERENCES public.agent_workflow_runs(id) ON DELETE CASCADE,
      step_key VARCHAR(100),
      tool_id UUID REFERENCES public.agent_tools(id),
      args JSONB,
      status VARCHAR(50),
      result JSONB,
      error JSONB,
      started_at TIMESTAMP,
      finished_at TIMESTAMP,
      seq INT
    );
    """
    )
    cur.execute(
        """
    CREATE TABLE IF NOT EXISTS public.agent_events (
      id UUID PRIMARY KEY,
      session_id UUID NOT NULL REFERENCES public.agent_sessions(id) ON DELETE CASCADE,
      user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
      kind VARCHAR(100),
      payload JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    """
    )


def seed_minimal_data(cur) -> None:
    now = datetime.utcnow()
    user_id = uuid.uuid4()
    role_id = uuid.uuid4()
    cred_id = uuid.uuid4()
    pref_id = uuid.uuid4()
    log_id = uuid.uuid4()
    ur_id = uuid.uuid4()

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    admin_password_hash = pwd_context.hash("admin123")

    cur.execute(
        "INSERT INTO users (id, username, email, phone, hashed_password, is_active, is_superuser, created_at, updated_at) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) "
        "ON CONFLICT (email) DO NOTHING",
        (user_id, "admin", "admin@example.com", "13800000000", admin_password_hash, True, False, now, now),
    )
    cur.execute("SELECT id FROM users WHERE email=%s", ("admin@example.com",))
    row = cur.fetchone()
    user_id = row[0]
    cur.execute(
        "INSERT INTO roles (id, name, description) VALUES (%s,%s,%s) ON CONFLICT (name) DO NOTHING",
        (role_id, "admin", "Administrator"),
    )
    cur.execute("SELECT id FROM roles WHERE name=%s", ("admin",))
    row = cur.fetchone()
    role_id = row[0]
    cur.execute(
        "INSERT INTO user_roles (id, user_id, role_id, assigned_at) VALUES (%s,%s,%s,%s) ON CONFLICT (user_id, role_id) DO NOTHING",
        (ur_id, user_id, role_id, now),
    )
    cur.execute(
        "INSERT INTO user_credentials (id, user_id, provider, provider_account_id, hashed_password, created_at, updated_at) "
        "VALUES (%s,%s,%s,%s,%s,%s,%s) ON CONFLICT (user_id, provider) DO NOTHING",
        (cred_id, user_id, "local", "admin", admin_password_hash, now, now),
    )
    cur.execute(
        "INSERT INTO user_preferences (id, user_id, key, value, updated_at) VALUES (%s,%s,%s,%s,%s) ON CONFLICT (user_id, key) DO NOTHING",
        (pref_id, user_id, "language", "zh-CN", now),
    )
    cur.execute(
        "INSERT INTO user_activity_logs (id, user_id, action, created_at) VALUES (%s,%s,%s,%s) ON CONFLICT (id) DO NOTHING",
        (log_id, user_id, "init", now),
    )

    task_id = uuid.uuid4()
    result_id = uuid.uuid4()
    cur.execute(
        "INSERT INTO analysis_tasks (id, name, description, analysis_type, parameters, status, created_by, created_at, updated_at, progress) "
        "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT (id) DO NOTHING",
        (task_id, "demo-buffer", "buffer demo", "buffer", '{"radius":500}', "completed", user_id, now, now, 100),
    )
    cur.execute(
        "INSERT INTO analysis_results (id, task_id, result_type, data, result_metadata, created_at) "
        "VALUES (%s,%s,%s,%s,%s,%s) ON CONFLICT (id) DO NOTHING",
        (result_id, task_id, "geojson", '{"type":"FeatureCollection","features":[]}', '{"unit":"meter"}', now),
    )
    sd_id = uuid.uuid4()
    cur.execute(
        "INSERT INTO spatial_data (id, name, data_type, geometry, attributes, crs, created_at, updated_at) "
        "VALUES (%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT (id) DO NOTHING",
        (
            sd_id,
            "samples",
            "FeatureCollection",
            '{"type":"FeatureCollection","features":[]}',
            "{}",
            "EPSG:4326",
            now,
            now,
        ),
    )

    tmpl_id = uuid.uuid4()
    cur.execute(
        "INSERT INTO agent_prompt_templates (id, name, role, language, content, variables, is_active, version, created_at, updated_at) "
        "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT (name) DO NOTHING",
        (tmpl_id, "default", "assistant", "zh-CN", "You are GIS agent", "[]", True, "v1", now, now),
    )
    session_id = uuid.uuid4()
    cur.execute(
        "INSERT INTO agent_sessions (id, user_id, title, mode, status, created_at, updated_at) "
        "VALUES (%s,%s,%s,%s,%s,%s,%s) ON CONFLICT (id) DO NOTHING",
        (session_id, user_id, "welcome", "LLM", "open", now, now),
    )
    tool_id = uuid.uuid4()
    cur.execute(
        "INSERT INTO agent_tools (id, name, title, description, input_schema, output_schema, permissions, is_active, created_at, updated_at) "
        "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT (name) DO NOTHING",
        (tool_id, "buffer", "Buffer", "Create buffer", "{}", "{}", "{}", True, now, now),
    )


def print_seed_summary(cur) -> None:
    cur.execute("SELECT COUNT(*) FROM users")
    users_cnt = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM roles")
    roles_cnt = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM user_roles")
    user_roles_cnt = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM user_credentials")
    creds_cnt = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM analysis_tasks")
    tasks_cnt = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM agent_prompt_templates")
    tmpl_cnt = cur.fetchone()[0]
    cur.execute("SELECT id, username, email FROM users WHERE username=%s", ("admin",))
    admin_row = cur.fetchone()
    admin_id = admin_row[0]
    print(f"Seed completed: users={users_cnt}, roles={roles_cnt}, user_roles={user_roles_cnt}, credentials={creds_cnt}, analysis_tasks={tasks_cnt}, prompt_templates={tmpl_cnt}")
    print(f"Admin user: id={admin_id}")


def main() -> None:
    dsn = build_dsn()
    with psycopg.connect(dsn) as conn:
        with conn.cursor() as cur:
            schema = get_schema()
            cur.execute(f"SET search_path TO {schema}")
            create_user_tables(cur)
            create_analysis_tables(cur)
            create_agent_tables(cur)
            seed_minimal_data(cur)
            print_seed_summary(cur)
        conn.commit()


if __name__ == "__main__":
    main()


