-- 用户主表（核心身份信息）
users (
  id UUID PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 用户认证信息（支持多种登录方式）
user_credentials (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,              -- e.g. "local", "google", "github"
  provider_account_id VARCHAR(255) NOT NULL,  -- 第三方账户唯一标识
  hashed_password TEXT,                       -- 仅本地认证需要
  access_token TEXT,
  refresh_token TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, provider)                   -- 一个用户在同一 provider 只能有一个账户
);

-- 角色表（RBAC）
roles (
  id UUID PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,           -- "admin", "analyst", "viewer"
  description TEXT
);

-- 用户角色关系表（多对多）
user_roles (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);

-- 用户偏好设置（灵活键值对）
user_preferences (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key VARCHAR(100) NOT NULL,   -- "language", "theme", "timezone"
  value TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, key)
);

-- 用户活动日志（审计）
user_activity_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,      -- e.g., "login", "logout", "create_analysis"
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
