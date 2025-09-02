agent_prompt_templates (
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

agent_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  mode VARCHAR(50),
  status VARCHAR(50),
  last_message_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

agent_memories (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id UUID REFERENCES agent_sessions(id) ON DELETE CASCADE,
  type VARCHAR(50),
  scope VARCHAR(50),
  tags TEXT[],
  content JSONB,
  ttl_seconds INT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_access TIMESTAMP
);

agent_memory_embeddings (
  id UUID PRIMARY KEY,
  memory_id UUID NOT NULL REFERENCES agent_memories(id) ON DELETE CASCADE,
  model VARCHAR(100),
  dim INT,
  embedding BYTEA,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

agent_tools (
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

agent_tool_invocations (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES agent_tools(id) ON DELETE CASCADE,
  args JSONB,
  status VARCHAR(50),
  result JSONB,
  error JSONB,
  latency_ms INT,
  wrote_memory BOOLEAN,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMP
);

agent_workflows (
  id UUID PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  graph JSONB,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

agent_workflow_runs (
  id UUID PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES agent_workflows(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
  status VARCHAR(50),
  context JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMP
);

agent_workflow_steps (
  id UUID PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES agent_workflow_runs(id) ON DELETE CASCADE,
  step_key VARCHAR(100),
  tool_id UUID REFERENCES agent_tools(id),
  args JSONB,
  status VARCHAR(50),
  result JSONB,
  error JSONB,
  started_at TIMESTAMP,
  finished_at TIMESTAMP,
  seq INT
);

agent_events (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  kind VARCHAR(100),
  payload JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
