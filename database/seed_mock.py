"""
功能: 为 init_db.py 定义的全部表批量插入模拟数据（每表 200 条）

输入数据格式:
- 环境变量同 init_db.py: POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB, POSTGRES_SCHEMA

数据处理方法:
- 复用 init_db.build_dsn() 与 init_db.get_schema()
- 使用固定数量 N=200 生成数据
- 插入顺序遵循外键依赖: users -> roles -> user_roles -> user_credentials -> prefs -> logs -> analysis -> agent*
- 所有唯一键遵循去重策略（通过序号拼接确保唯一）

输出数据格式:
- 终端打印每张表插入数量
"""
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from dotenv import load_dotenv
import os
import random
import json
import psycopg

# 仅加载本目录下的 database/.env（不读取 Backend/.env）
database_env = Path(__file__).parent / ".env"
if database_env.exists():
    load_dotenv(dotenv_path=database_env, override=False)

from init_db import build_dsn, get_schema  # noqa: E402


def generate_users(n: int):
    now = datetime.utcnow()
    for i in range(n):
        yield (
            uuid.uuid4(),
            f"user{i:04d}",
            f"user{i:04d}@example.com",
            f"139{(10000000+i)%99999999:08d}",
            f"hashed_pw_{i:04d}",
            True,
            False,
            now,
            now,
            None,
        )


def generate_roles(n: int):
    for i in range(n):
        yield (uuid.uuid4(), f"role_{i:04d}", f"role-desc-{i:04d}")


def main() -> None:
    N = 200
    dsn = build_dsn()
    schema = get_schema()
    with psycopg.connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(f"SET search_path TO {schema}")

            # users
            users = list(generate_users(N))
            cur.executemany(
                """
                INSERT INTO public.users
                (id, username, email, phone, hashed_password, is_active, is_superuser, created_at, updated_at, last_login)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (email) DO NOTHING
                """,
                users,
            )
            print(f"users inserted: ~{len(users)}")

            # roles
            roles = list(generate_roles(N))
            cur.executemany(
                """
                INSERT INTO public.roles (id, name, description)
                VALUES (%s,%s,%s)
                ON CONFLICT (name) DO NOTHING
                """,
                roles,
            )
            print(f"roles inserted: ~{len(roles)}")

            # user_roles (一一绑定)
            cur.execute("SELECT id FROM public.users ORDER BY created_at LIMIT %s", (N,))
            user_ids = [r[0] for r in cur.fetchall()]
            cur.execute("SELECT id FROM public.roles ORDER BY name LIMIT %s", (N,))
            role_ids = [r[0] for r in cur.fetchall()]
            ur_rows = [(uuid.uuid4(), user_ids[i], role_ids[i], datetime.utcnow()) for i in range(min(len(user_ids), len(role_ids)))]
            cur.executemany(
                """
                INSERT INTO public.user_roles (id, user_id, role_id, assigned_at)
                VALUES (%s,%s,%s,%s)
                ON CONFLICT (user_id, role_id) DO NOTHING
                """,
                ur_rows,
            )
            print(f"user_roles inserted: ~{len(ur_rows)}")

            # user_credentials
            now = datetime.utcnow()
            cred_rows = [
                (uuid.uuid4(), uid, "local", f"user{i:04d}", f"hashed_pw_{i:04d}", now, now)
                for i, uid in enumerate(user_ids[:N])
            ]
            cur.executemany(
                """
                INSERT INTO public.user_credentials
                (id, user_id, provider, provider_account_id, hashed_password, created_at, updated_at)
                VALUES (%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (user_id, provider) DO NOTHING
                """,
                cred_rows,
            )
            print(f"user_credentials inserted: ~{len(cred_rows)}")

            # user_preferences
            pref_rows = [
                (uuid.uuid4(), uid, "language", "zh-CN", now)
                for uid in user_ids[:N]
            ]
            cur.executemany(
                """
                INSERT INTO public.user_preferences (id, user_id, key, value, updated_at)
                VALUES (%s,%s,%s,%s,%s)
                ON CONFLICT (user_id, key) DO NOTHING
                """,
                pref_rows,
            )
            print(f"user_preferences inserted: ~{len(pref_rows)}")

            # user_activity_logs
            log_rows = [
                (uuid.uuid4(), uid, f"login-{i:04d}", None, None, now - timedelta(minutes=i))
                for i, uid in enumerate(user_ids[:N])
            ]
            cur.executemany(
                """
                INSERT INTO public.user_activity_logs (id, user_id, action, ip_address, user_agent, created_at)
                VALUES (%s,%s,%s,%s,%s,%s)
                ON CONFLICT (id) DO NOTHING
                """,
                log_rows,
            )
            print(f"user_activity_logs inserted: ~{len(log_rows)}")

            # analysis_tasks
            task_rows = []
            for i in range(N):
                task_rows.append(
                    (
                        uuid.uuid4(),
                        f"task-{i:04d}",
                        f"desc-{i:04d}",
                        random.choice(["buffer", "overlay", "distance"]),
                        json.dumps({"radius": 100 + i}),
                        random.choice(["pending", "running", "completed"]),
                        user_ids[i % len(user_ids)],
                        now,
                        now,
                        random.randint(0, 100),
                        json.dumps({"request": i}),
                        json.dumps({"result": i}),
                        None,
                    )
                )
            cur.executemany(
                """
                INSERT INTO public.analysis_tasks
                (id, name, description, analysis_type, parameters, status, created_by, created_at, updated_at, progress, supermap_request, supermap_result, error_message)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (id) DO NOTHING
                """,
                task_rows,
            )
            print(f"analysis_tasks inserted: ~{len(task_rows)}")

            # analysis_results
            cur.execute("SELECT id FROM public.analysis_tasks ORDER BY created_at LIMIT %s", (N,))
            task_ids = [r[0] for r in cur.fetchall()]
            result_rows = [
                (
                    uuid.uuid4(),
                    tid,
                    "geojson",
                    json.dumps({"type": "FeatureCollection", "features": []}),
                    json.dumps({"unit": "meter"}),
                    now,
                )
                for tid in task_ids
            ]
            cur.executemany(
                """
                INSERT INTO public.analysis_results (id, task_id, result_type, data, result_metadata, created_at)
                VALUES (%s,%s,%s,%s,%s,%s)
                ON CONFLICT (id) DO NOTHING
                """,
                result_rows,
            )
            print(f"analysis_results inserted: ~{len(result_rows)}")

            # spatial_data
            sd_rows = [
                (
                    uuid.uuid4(),
                    f"sd-{i:04d}",
                    "FeatureCollection",
                    json.dumps({"type": "FeatureCollection", "features": []}),
                    json.dumps({}),
                    "EPSG:4326",
                    now,
                    now,
                )
                for i in range(N)
            ]
            cur.executemany(
                """
                INSERT INTO public.spatial_data (id, name, data_type, geometry, attributes, crs, created_at, updated_at)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (id) DO NOTHING
                """,
                sd_rows,
            )
            print(f"spatial_data inserted: ~{len(sd_rows)}")

            # agent_prompt_templates
            apt_rows = [
                (
                    uuid.uuid4(),
                    f"tpl-{i:04d}",
                    "assistant",
                    "zh-CN",
                    f"template-{i:04d}",
                    json.dumps([]),
                    True,
                    "v1",
                    now,
                    now,
                )
                for i in range(N)
            ]
            cur.executemany(
                """
                INSERT INTO public.agent_prompt_templates (id, name, role, language, content, variables, is_active, version, created_at, updated_at)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (name) DO NOTHING
                """,
                apt_rows,
            )
            print(f"agent_prompt_templates inserted: ~{len(apt_rows)}")

            # agent_sessions
            ses_rows = [
                (
                    uuid.uuid4(),
                    user_ids[i % len(user_ids)],
                    f"session-{i:04d}",
                    random.choice(["LLM", "Traditional"]),
                    random.choice(["open", "closed"]),
                    now,
                    now,
                )
                for i in range(N)
            ]
            cur.executemany(
                """
                INSERT INTO public.agent_sessions (id, user_id, title, mode, status, created_at, updated_at)
                VALUES (%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (id) DO NOTHING
                """,
                ses_rows,
            )
            print(f"agent_sessions inserted: ~{len(ses_rows)}")

            # agent_tools
            tool_rows = [
                (
                    uuid.uuid4(),
                    f"tool-{i:04d}",
                    f"Tool {i:04d}",
                    f"desc-{i:04d}",
                    json.dumps({}),
                    json.dumps({}),
                    json.dumps({}),
                    True,
                    now,
                    now,
                )
                for i in range(N)
            ]
            cur.executemany(
                """
                INSERT INTO public.agent_tools (id, name, title, description, input_schema, output_schema, permissions, is_active, created_at, updated_at)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (name) DO NOTHING
                """,
                tool_rows,
            )
            print(f"agent_tools inserted: ~{len(tool_rows)}")

            # agent_tool_invocations
            cur.execute("SELECT id FROM public.agent_tools ORDER BY name LIMIT %s", (N,))
            tool_ids = [r[0] for r in cur.fetchall()]
            cur.execute("SELECT id FROM public.agent_sessions ORDER BY created_at LIMIT %s", (N,))
            session_ids = [r[0] for r in cur.fetchall()]
            inv_rows = [
                (
                    uuid.uuid4(),
                    session_ids[i % len(session_ids)],
                    user_ids[i % len(user_ids)],
                    tool_ids[i % len(tool_ids)],
                    json.dumps({"i": i}),
                    random.choice(["success", "error"]),
                    json.dumps({"ok": True}),
                    None,
                    random.randint(1, 500),
                    False,
                    now,
                    now,
                )
                for i in range(N)
            ]
            cur.executemany(
                """
                INSERT INTO public.agent_tool_invocations (id, session_id, user_id, tool_id, args, status, result, error, latency_ms, wrote_memory, created_at, finished_at)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (id) DO NOTHING
                """,
                inv_rows,
            )
            print(f"agent_tool_invocations inserted: ~{len(inv_rows)}")

            # agent_workflows
            wf_rows = [
                (
                    uuid.uuid4(),
                    f"wf-{i:04d}",
                    f"wf-desc-{i:04d}",
                    json.dumps({"nodes": []}),
                    True,
                    user_ids[i % len(user_ids)],
                    now,
                    now,
                )
                for i in range(N)
            ]
            cur.executemany(
                """
                INSERT INTO public.agent_workflows (id, name, description, graph, is_active, created_by, created_at, updated_at)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (name) DO NOTHING
                """,
                wf_rows,
            )
            print(f"agent_workflows inserted: ~{len(wf_rows)}")

            # agent_workflow_runs
            cur.execute("SELECT id FROM public.agent_workflows ORDER BY name LIMIT %s", (N,))
            wf_ids = [r[0] for r in cur.fetchall()]
            run_rows = [
                (
                    uuid.uuid4(),
                    wf_ids[i % len(wf_ids)],
                    session_ids[i % len(session_ids)],
                    random.choice(["running", "succeeded", "failed"]),
                    json.dumps({"ctx": i}),
                    now,
                    now,
                    now,
                )
                for i in range(N)
            ]
            cur.executemany(
                """
                INSERT INTO public.agent_workflow_runs (id, workflow_id, session_id, status, context, created_at, updated_at, finished_at)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (id) DO NOTHING
                """,
                run_rows,
            )
            print(f"agent_workflow_runs inserted: ~{len(run_rows)}")

            # agent_workflow_steps
            cur.execute("SELECT id FROM public.agent_workflow_runs ORDER BY created_at LIMIT %s", (N,))
            run_ids = [r[0] for r in cur.fetchall()]
            step_rows = [
                (
                    uuid.uuid4(),
                    run_ids[i % len(run_ids)],
                    f"step-{i:04d}",
                    tool_ids[i % len(tool_ids)],
                    json.dumps({"arg": i}),
                    random.choice(["ok", "error"]),
                    json.dumps({"res": i}),
                    None,
                    now,
                    now,
                    i,
                )
                for i in range(N)
            ]
            cur.executemany(
                """
                INSERT INTO public.agent_workflow_steps (id, run_id, step_key, tool_id, args, status, result, error, started_at, finished_at, seq)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (id) DO NOTHING
                """,
                step_rows,
            )
            print(f"agent_workflow_steps inserted: ~{len(step_rows)}")

            # agent_events
            evt_rows = [
                (
                    uuid.uuid4(),
                    session_ids[i % len(session_ids)],
                    user_ids[i % len(user_ids)],
                    "info",
                    json.dumps({"i": i}),
                    now,
                )
                for i in range(N)
            ]
            cur.executemany(
                """
                INSERT INTO public.agent_events (id, session_id, user_id, kind, payload, created_at)
                VALUES (%s,%s,%s,%s,%s,%s)
                ON CONFLICT (id) DO NOTHING
                """,
                evt_rows,
            )
            print(f"agent_events inserted: ~{len(evt_rows)}")

        conn.commit()
    print("Mock seeding finished.")


if __name__ == "__main__":
    main()


