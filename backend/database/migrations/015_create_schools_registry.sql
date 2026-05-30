-- Migration 015: Create schools and branches registry
-- Master database for Telegram bot to know all schools and their databases

-- UP

-- Create schools table (master list of all schools)
CREATE TABLE IF NOT EXISTS schools (
  id SERIAL PRIMARY KEY,
  school_name VARCHAR(100) NOT NULL UNIQUE,
  school_code VARCHAR(20) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create branches table (each school can have multiple branches/databases)
CREATE TABLE IF NOT EXISTS branches (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  branch_name VARCHAR(100) NOT NULL,
  branch_code VARCHAR(20) NOT NULL,
  database_name VARCHAR(100) NOT NULL,
  database_host VARCHAR(100) DEFAULT 'localhost',
  database_port INTEGER DEFAULT 5432,
  database_user VARCHAR(100),
  database_password VARCHAR(255),
  api_url VARCHAR(255),
  api_port INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(school_id, branch_code)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_schools_code ON schools(school_code);
CREATE INDEX IF NOT EXISTS idx_schools_active ON schools(is_active);
CREATE INDEX IF NOT EXISTS idx_branches_school ON branches(school_id);
CREATE INDEX IF NOT EXISTS idx_branches_code ON branches(branch_code);
CREATE INDEX IF NOT EXISTS idx_branches_active ON branches(is_active);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_schools_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_schools_updated_at
  BEFORE UPDATE ON schools
  FOR EACH ROW
  EXECUTE FUNCTION update_schools_updated_at();

CREATE TRIGGER trigger_update_branches_updated_at
  BEFORE UPDATE ON branches
  FOR EACH ROW
  EXECUTE FUNCTION update_schools_updated_at();

-- Add comments
COMMENT ON TABLE schools IS 'Master registry of all schools in the system';
COMMENT ON TABLE branches IS 'Branches/databases for each school';
COMMENT ON COLUMN branches.database_name IS 'PostgreSQL database name for this branch';
COMMENT ON COLUMN branches.api_url IS 'API URL for this branch (optional)';

-- Insert sample data (you can modify this)
INSERT INTO schools (school_name, school_code, description) VALUES
  ('Iqra School', 'IQRA', 'Iqra Islamic School'),
  ('Al-Markaz School', 'ALMARKAZ', 'Al-Markaz Islamic School'),
  ('Al-Khwarizmi School', 'ALKHWARIZMI', 'Al-Khwarizmi School'),
  ('Test School', 'TEST', 'Test School for Development')
ON CONFLICT (school_code) DO NOTHING;

-- Insert sample branches (modify with your actual database names)
INSERT INTO branches (school_id, branch_name, branch_code, database_name, api_port) VALUES
  -- Iqra branches
  ((SELECT id FROM schools WHERE school_code = 'IQRA'), 'Branch 1', 'B1', 'iqrab1', 5050),
  ((SELECT id FROM schools WHERE school_code = 'IQRA'), 'Branch 2', 'B2', 'iqrab2', 5051),
  ((SELECT id FROM schools WHERE school_code = 'IQRA'), 'Branch 3', 'B3', 'iqrab3', 5052),
  
  -- Al-Markaz branches
  ((SELECT id FROM schools WHERE school_code = 'ALMARKAZ'), 'Main Campus', 'MAIN', 'almarkaz_main', 5053),
  ((SELECT id FROM schools WHERE school_code = 'ALMARKAZ'), 'Secondary Campus', 'SEC', 'almarkaz_secondary', 5054),
  
  -- Al-Khwarizmi branches
  ((SELECT id FROM schools WHERE school_code = 'ALKHWARIZMI'), 'Main Campus', 'MAIN', 'alkhwarizmi_main', 5055),
  
  -- Test school
  ((SELECT id FROM schools WHERE school_code = 'TEST'), 'Test Branch', 'TEST', 'skoolific', 5052)
ON CONFLICT (school_id, branch_code) DO NOTHING;

-- DOWN
DROP TRIGGER IF EXISTS trigger_update_branches_updated_at ON branches;
DROP TRIGGER IF EXISTS trigger_update_schools_updated_at ON schools;
DROP FUNCTION IF EXISTS update_schools_updated_at();
DROP INDEX IF EXISTS idx_branches_active;
DROP INDEX IF EXISTS idx_branches_code;
DROP INDEX IF EXISTS idx_branches_school;
DROP INDEX IF EXISTS idx_schools_active;
DROP INDEX IF EXISTS idx_schools_code;
DROP TABLE IF EXISTS branches;
DROP TABLE IF EXISTS schools;
