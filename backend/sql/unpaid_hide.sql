CREATE TABLE IF NOT EXISTS unpaid_hide_settings (
  id SERIAL PRIMARY KEY,
  branch_code VARCHAR(20) UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT false,
  months_threshold INTEGER DEFAULT 2,
  updated_by VARCHAR(120),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS unpaid_hide_reasons (
  id SERIAL PRIMARY KEY,
  branch_code VARCHAR(20) NOT NULL,
  class_name VARCHAR(80) NOT NULL,
  school_id VARCHAR(50),
  student_name VARCHAR(200) NOT NULL,
  reason TEXT,
  created_by VARCHAR(120),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'active'
);
CREATE INDEX IF NOT EXISTS idx_uhr_lookup ON unpaid_hide_reasons (branch_code, LOWER(student_name), status);
CREATE TABLE IF NOT EXISTS unpaid_hide_audit (
  id SERIAL PRIMARY KEY,
  branch_code VARCHAR(20),
  action VARCHAR(40),
  detail TEXT,
  actor VARCHAR(120),
  created_at TIMESTAMPTZ DEFAULT NOW()
);