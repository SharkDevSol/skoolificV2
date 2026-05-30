-- Create Master Database for Skoolific
-- This database stores the registry of all schools and branches
-- Run this ONCE on your PostgreSQL server

-- Create master database
CREATE DATABASE skoolific_master;

-- Connect to master database
\c skoolific_master

-- Create schools table
CREATE TABLE schools (
  id SERIAL PRIMARY KEY,
  school_name VARCHAR(100) NOT NULL UNIQUE,
  school_code VARCHAR(20) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create branches table
CREATE TABLE branches (
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
CREATE INDEX idx_schools_code ON schools(school_code);
CREATE INDEX idx_schools_active ON schools(is_active);
CREATE INDEX idx_branches_school ON branches(school_id);
CREATE INDEX idx_branches_code ON branches(branch_code);
CREATE INDEX idx_branches_active ON branches(is_active);

-- Create trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_update_schools_updated_at
  BEFORE UPDATE ON schools
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_update_branches_updated_at
  BEFORE UPDATE ON branches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Insert initial schools
INSERT INTO schools (school_name, school_code, description) VALUES
  ('Iqra School', 'IQRA', 'Iqra Islamic School'),
  ('Al-Markaz School', 'ALMARKAZ', 'Al-Markaz Islamic School'),
  ('Al-Khwarizmi School', 'ALKHWARIZMI', 'Al-Khwarizmi School');

-- Insert initial branches
INSERT INTO branches (school_id, branch_name, branch_code, database_name, api_port) VALUES
  -- Iqra branches
  ((SELECT id FROM schools WHERE school_code = 'IQRA'), 'Branch 1', 'B1', 'iqrab1', 5050),
  ((SELECT id FROM schools WHERE school_code = 'IQRA'), 'Branch 2', 'B2', 'iqrab2', 5051),
  ((SELECT id FROM schools WHERE school_code = 'IQRA'), 'Branch 3', 'B3', 'iqrab3', 5052),
  
  -- Al-Markaz branches
  ((SELECT id FROM schools WHERE school_code = 'ALMARKAZ'), 'Main Campus', 'MAIN', 'almarkaz_main', 5053),
  ((SELECT id FROM schools WHERE school_code = 'ALMARKAZ'), 'Secondary Campus', 'SEC', 'almarkaz_secondary', 5054),
  
  -- Al-Khwarizmi branches
  ((SELECT id FROM schools WHERE school_code = 'ALKHWARIZMI'), 'Main Campus', 'MAIN', 'alkhwarizmi_main', 5055);

-- Grant permissions (adjust as needed)
-- GRANT SELECT ON schools, branches TO your_app_user;

COMMENT ON DATABASE skoolific_master IS 'Master registry database for all Skoolific schools and branches';
COMMENT ON TABLE schools IS 'Registry of all schools in the system';
COMMENT ON TABLE branches IS 'Registry of all branches and their database connections';
