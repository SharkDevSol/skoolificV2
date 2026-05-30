-- Migration 001: Create branch configuration table
-- This table stores configuration for each school branch
-- Each branch will have its own separate PostgreSQL database

CREATE TABLE IF NOT EXISTS branch_config (
    id SERIAL PRIMARY KEY,
    branch_name VARCHAR(255) NOT NULL,
    branch_code VARCHAR(10) UNIQUE NOT NULL, -- e.g., "AMA" for "Al Markaz Academy"
    database_name VARCHAR(100) UNIQUE NOT NULL,
    database_host VARCHAR(255) DEFAULT 'localhost',
    database_port INTEGER DEFAULT 5432,
    database_user VARCHAR(100),
    database_password VARCHAR(255), -- Should be encrypted in production
    is_active BOOLEAN DEFAULT true,
    school_address TEXT,
    school_phone VARCHAR(50),
    school_email VARCHAR(100),
    admin_name VARCHAR(255),
    admin_email VARCHAR(255),
    admin_phone VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on branch_code for fast lookups
CREATE INDEX IF NOT EXISTS idx_branch_config_code ON branch_config(branch_code);
CREATE INDEX IF NOT EXISTS idx_branch_config_active ON branch_config(is_active);

-- Insert default branch (current school becomes first branch)
INSERT INTO branch_config (
    branch_name, 
    branch_code, 
    database_name,
    database_host,
    database_port,
    database_user,
    is_active
) VALUES (
    'Main Branch',
    'MAI',
    'skoolific', -- Current database
    'localhost',
    5432,
    'postgres',
    true
) ON CONFLICT (branch_code) DO NOTHING;

COMMENT ON TABLE branch_config IS 'Stores configuration for each school branch with separate database per branch';
COMMENT ON COLUMN branch_config.branch_code IS 'Unique 3-letter code generated from branch name (first letter + last 2 chars)';
COMMENT ON COLUMN branch_config.database_name IS 'Name of the PostgreSQL database for this branch';
