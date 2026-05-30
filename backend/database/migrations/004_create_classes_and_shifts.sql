-- Migration 004: Create classes and shifts tables
-- Stores Task2 data: class structure and shift assignments

-- UP

-- Create shifts table first (referenced by classes)
CREATE TABLE IF NOT EXISTS shifts (
  id SERIAL PRIMARY KEY,
  shift_name VARCHAR(50) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_morning BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create classes table
CREATE TABLE IF NOT EXISTS classes (
  id SERIAL PRIMARY KEY,
  class_name VARCHAR(100) NOT NULL,
  class_type VARCHAR(20) NOT NULL DEFAULT 'regular', -- 'regular', 'kg', 'evening'
  shift_id INTEGER REFERENCES shifts(id) ON DELETE SET NULL,
  grade_level INTEGER,
  capacity INTEGER DEFAULT 40,
  section VARCHAR(10), -- 'A', 'B', 'C', etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_class_type CHECK (class_type IN ('regular', 'kg', 'evening'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_classes_shift ON classes(shift_id);
CREATE INDEX IF NOT EXISTS idx_classes_type ON classes(class_type);
CREATE INDEX IF NOT EXISTS idx_classes_grade ON classes(grade_level);

-- Add triggers to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_shifts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_shifts_timestamp
BEFORE UPDATE ON shifts
FOR EACH ROW
EXECUTE FUNCTION update_shifts_timestamp();

CREATE OR REPLACE FUNCTION update_classes_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_classes_timestamp
BEFORE UPDATE ON classes
FOR EACH ROW
EXECUTE FUNCTION update_classes_timestamp();

COMMENT ON TABLE shifts IS 'Stores shift information (morning/afternoon) with time ranges';
COMMENT ON COLUMN shifts.shift_name IS 'Name of shift (e.g., "Morning Shift", "Afternoon Shift")';
COMMENT ON COLUMN shifts.is_morning IS 'TRUE for morning shift, FALSE for afternoon shift';

COMMENT ON TABLE classes IS 'Stores class information from Task2 - class name, type, shift assignment, grade level';
COMMENT ON COLUMN classes.class_type IS 'Type of class: regular, kg (kindergarten), or evening';
COMMENT ON COLUMN classes.shift_id IS 'Foreign key to shifts table - which shift this class belongs to';
COMMENT ON COLUMN classes.grade_level IS 'Grade level (1-12, or NULL for KG)';
COMMENT ON COLUMN classes.section IS 'Section identifier (A, B, C, etc.) for multiple sections of same grade';

-- DOWN
DROP TRIGGER IF EXISTS trigger_update_classes_timestamp ON classes;
DROP FUNCTION IF EXISTS update_classes_timestamp();
DROP TRIGGER IF EXISTS trigger_update_shifts_timestamp ON shifts;
DROP FUNCTION IF EXISTS update_shifts_timestamp();
DROP INDEX IF EXISTS idx_classes_grade;
DROP INDEX IF EXISTS idx_classes_type;
DROP INDEX IF EXISTS idx_classes_shift;
DROP TABLE IF EXISTS classes;
DROP TABLE IF EXISTS shifts;
