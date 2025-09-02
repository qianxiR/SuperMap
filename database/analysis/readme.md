analysis_tasks (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  analysis_type VARCHAR(100),
  parameters JSONB,
  status VARCHAR(50),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  progress NUMERIC,
  supermap_request JSONB,
  supermap_result JSONB,
  error_message TEXT
);

analysis_results (
  id UUID PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES analysis_tasks(id) ON DELETE CASCADE,
  result_type VARCHAR(100),
  data JSONB,
  result_metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

spatial_data (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  data_type VARCHAR(50),
  geometry JSONB,
  attributes JSONB,
  crs VARCHAR(50),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
