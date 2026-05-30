-- Migration 003: Create school configuration table
-- Stores Task1 data: academic year, terms, school days, shifts, periods, KG/evening options

-- UP
CREATE TABLE IF NOT EXISTS school_config (
  id SERIAL PRIMARY KEY,
  academic_year VARCHAR(20) NOT NULL, -- "2018/2019" (Ethiopian calendar)
  current_year INTEGER NOT NULL, -- 2018 (Ethiopian year)
  number_of_terms INTEGER NOT NULL DEFAULT 3,
  school_days JSONB NOT NULL, -- ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
  shift_count INTEGER NOT NULL DEFAULT 1, -- 1 or 2
  shift_rotation_enabled BOOLEAN DEFAULT FALSE,
  periods_per_shift INTEGER NOT NULL DEFAULT 8,
  period_duration_minutes INTEGER NOT NULL DEFAULT 45,
  has_kg BOOLEAN DEFAULT FALSE,
  has_evening_class BOOLEAN DEFAULT FALSE,
  additional_languages JSONB, -- ["Arabic", "Oromo", "Somali"]
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for academic year lookups
CREATE INDEX IF NOT EXISTS idx_school_config_academic_year ON school_config(academic_year);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_school_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_school_config_timestamp
BEFORE UPDATE ON school_config
FOR EACH ROW
EXECUTE FUNCTION update_school_config_timestamp();

COMMENT ON TABLE school_config IS 'Stores school configuration from Task1 page - academic year, terms, school days, shifts, periods, KG/evening options';
COMMENT ON COLUMN school_config.academic_year IS 'Ethiopian academic year in format "2018/2019"';
COMMENT ON COLUMN school_config.current_year IS 'Current Ethiopian year (e.g., 2018)';
COMMENT ON COLUMN school_config.school_days IS 'JSON array of school days ["Monday", "Tuesday", ...]';
COMMENT ON COLUMN school_config.shift_count IS 'Number of shifts: 1 or 2';
COMMENT ON COLUMN school_config.additional_languages IS 'JSON array of additional languages offered';

-- DOWN
DROP TRIGGER IF EXISTS trigger_update_school_config_timestamp ON school_config;
DROP FUNCTION IF EXISTS update_school_config_timestamp();
DROP INDEX IF EXISTS idx_school_config_academic_year;
DROP TABLE IF EXISTS school_config;
