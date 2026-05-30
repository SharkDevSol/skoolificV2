-- Migration 002: Create migrations tracking table
-- This table tracks which migrations have been executed
-- The MigrationRunner will create this automatically, but we include it for completeness

-- UP
CREATE TABLE IF NOT EXISTS migrations (
  id SERIAL PRIMARY KEY,
  migration_name VARCHAR(255) UNIQUE NOT NULL,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  execution_time_ms INTEGER,
  status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'failed', 'rolled_back'))
);

CREATE INDEX IF NOT EXISTS idx_migrations_name ON migrations(migration_name);
CREATE INDEX IF NOT EXISTS idx_migrations_executed_at ON migrations(executed_at);

COMMENT ON TABLE migrations IS 'Tracks executed database migrations';
COMMENT ON COLUMN migrations.migration_name IS 'Filename of the migration (e.g., 001_create_branch_config.sql)';
COMMENT ON COLUMN migrations.status IS 'Status of migration execution: success, failed, or rolled_back';

-- DOWN
DROP INDEX IF EXISTS idx_migrations_executed_at;
DROP INDEX IF EXISTS idx_migrations_name;
DROP TABLE IF EXISTS migrations;
