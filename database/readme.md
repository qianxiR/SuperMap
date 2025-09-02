erDiagram
  USERS ||--o{ USER_CREDENTIALS : "has"
  USERS ||--o{ USER_ROLES : "assigned"
  ROLES ||--o{ USER_ROLES : "contains"
  USERS ||--o{ USER_PREFERENCES : "has"
  USERS ||--o{ USER_ACTIVITY_LOGS : "writes"

  USERS ||--o{ ANALYSIS_TASKS : "creates"
  ANALYSIS_TASKS ||--o{ ANALYSIS_RESULTS : "produces"

  SPATIAL_DATA {
    UUID id PK
    string name
    string data_type
    jsonb geometry
    jsonb attributes
    string crs
    timestamp created_at
    timestamp updated_at
  }

  USERS {
    UUID id PK
    string username
    string email
    string phone
    string hashed_password
    boolean is_active
    boolean is_superuser
    timestamp created_at
    timestamp updated_at
    timestamp last_login
  }

  USER_CREDENTIALS {
    UUID id PK
    UUID user_id FK
    string provider
    string provider_account_id
    text hashed_password
    text access_token
    text refresh_token
    timestamp created_at
    timestamp updated_at
  }

  ROLES {
    UUID id PK
    string name
    text description
  }

  USER_ROLES {
    UUID id PK
    UUID user_id FK
    UUID role_id FK
    timestamp assigned_at
  }

  USER_PREFERENCES {
    UUID id PK
    UUID user_id FK
    string key
    text value
    timestamp updated_at
  }

  USER_ACTIVITY_LOGS {
    UUID id PK
    UUID user_id FK
    string action
    inet ip_address
    text user_agent
    timestamp created_at
  }

  ANALYSIS_TASKS {
    UUID id PK
    string name
    text description
    string analysis_type
    jsonb parameters
    string status
    UUID created_by FK
    timestamp created_at
    timestamp updated_at
    timestamp started_at
    timestamp completed_at
    numeric progress
    jsonb supermap_request
    jsonb supermap_result
    text error_message
  }

  ANALYSIS_RESULTS {
    UUID id PK
    UUID task_id FK
    string result_type
    jsonb data
    jsonb result_metadata
    timestamp created_at
  }

  AGENT_PROMPT_TEMPLATES {
    UUID id PK
    string name
    string role
    string language
    text content
    jsonb variables
    boolean is_active
    string version
    timestamp created_at
    timestamp updated_at
  }

  USERS ||--o{ AGENT_SESSIONS : "owns"
  AGENT_SESSIONS {
    UUID id PK
    UUID user_id FK
    string title
    string mode
    string status
    timestamp last_message_at
    timestamp created_at
    timestamp updated_at
  }

  AGENT_SESSIONS ||--o{ AGENT_MEMORIES : "stores"
  USERS ||--o{ AGENT_MEMORIES : "owns"
  AGENT_MEMORIES {
    UUID id PK
    UUID user_id FK
    UUID session_id FK
    string type
    string scope
    text[] tags
    jsonb content
    int ttl_seconds
    timestamp expires_at
    timestamp created_at
    timestamp last_access
  }

  AGENT_MEMORIES ||--o{ AGENT_MEMORY_EMBEDDINGS : "embeds"
  AGENT_MEMORY_EMBEDDINGS {
    UUID id PK
    UUID memory_id FK
    string model
    int dim
    bytea embedding
    timestamp created_at
  }

  AGENT_TOOLS {
    UUID id PK
    string name
    string title
    text description
    jsonb input_schema
    jsonb output_schema
    jsonb permissions
    boolean is_active
    int rate_limit_qps
    timestamp created_at
    timestamp updated_at
  }

  AGENT_SESSIONS ||--o{ AGENT_TOOL_INVOCATIONS : "runs"
  USERS ||--o{ AGENT_TOOL_INVOCATIONS : "triggers"
  AGENT_TOOLS ||--o{ AGENT_TOOL_INVOCATIONS : "invoked"
  AGENT_TOOL_INVOCATIONS {
    UUID id PK
    UUID session_id FK
    UUID user_id FK
    UUID tool_id FK
    jsonb args
    string status
    jsonb result
    jsonb error
    int latency_ms
    boolean wrote_memory
    timestamp created_at
    timestamp finished_at
  }

  USERS ||--o{ AGENT_WORKFLOWS : "authors"
  AGENT_WORKFLOWS {
    UUID id PK
    string name
    text description
    jsonb graph
    boolean is_active
    UUID created_by FK
    timestamp created_at
    timestamp updated_at
  }

  AGENT_WORKFLOWS ||--o{ AGENT_WORKFLOW_RUNS : "executes"
  AGENT_SESSIONS ||--o{ AGENT_WORKFLOW_RUNS : "context"
  AGENT_WORKFLOW_RUNS {
    UUID id PK
    UUID workflow_id FK
    UUID session_id FK
    string status
    jsonb context
    timestamp created_at
    timestamp updated_at
    timestamp finished_at
  }

  AGENT_WORKFLOW_RUNS ||--o{ AGENT_WORKFLOW_STEPS : "steps"
  AGENT_TOOLS ||--o{ AGENT_WORKFLOW_STEPS : "uses"
  AGENT_WORKFLOW_STEPS {
    UUID id PK
    UUID run_id FK
    string step_key
    UUID tool_id FK
    jsonb args
    string status
    jsonb result
    jsonb error
    timestamp started_at
    timestamp finished_at
    int seq
  }

  AGENT_SESSIONS ||--o{ AGENT_EVENTS : "emits"
  USERS ||--o{ AGENT_EVENTS : "actor"
  AGENT_EVENTS {
    UUID id PK
    UUID session_id FK
    UUID user_id FK
    string kind
    jsonb payload
    timestamp created_at
  }