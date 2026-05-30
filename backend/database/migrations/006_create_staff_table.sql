-- Migration 006: Create staff table
-- Stores staff information for teachers, administrative, and supportive staff

-- UP
CREATE TABLE IF NOT EXISTS staff (
  id SERIAL PRIMARY KEY,
  staff_id VARCHAR(50) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  last_name VARCHAR(100) NOT NULL,
  staff_type VARCHAR(20) NOT NULL,
  email VARCHAR(100) UNIQUE,
  phone_number VARCHAR(20) NOT NULL,
  date_of_birth DATE,
  date_of_birth_ethiopian JSONB, -- {year: 1990, month: 5, day: 20}
  gender VARCHAR(10) CHECK (gender IN ('Male', 'Female', 'Other')),
  hire_date DATE,
  hire_date_ethiopian JSONB,
  status VARCHAR(20) DEFAULT 'active',
  address TEXT,
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  qualification VARCHAR(100),
  specialization VARCHAR(100),
  salary DECIMAL(12, 2),
  photo_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_staff_type CHECK (staff_type IN ('Teacher', 'Administrative', 'Supportive')),
  CONSTRAINT check_staff_status CHECK (status IN ('active', 'on_leave', 'suspended', 'terminated', 'retired'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_staff_type ON staff(staff_type);
CREATE INDEX IF NOT EXISTS idx_staff_status ON staff(status);
CREATE INDEX IF NOT EXISTS idx_staff_name ON staff(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_staff_staff_id ON staff(staff_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_staff_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_staff_timestamp
BEFORE UPDATE ON staff
FOR EACH ROW
EXECUTE FUNCTION update_staff_timestamp();

COMMENT ON TABLE staff IS 'Stores staff information for teachers, administrative, and supportive staff';
COMMENT ON COLUMN staff.staff_id IS 'Unique staff identifier (e.g., STF2018001)';
COMMENT ON COLUMN staff.staff_type IS 'Type of staff: Teacher, Administrative, or Supportive';
COMMENT ON COLUMN staff.date_of_birth_ethiopian IS 'Date of birth in Ethiopian calendar as JSON';
COMMENT ON COLUMN staff.hire_date_ethiopian IS 'Hire date in Ethiopian calendar as JSON';
COMMENT ON COLUMN staff.status IS 'Staff status: active, on_leave, suspended, terminated, retired';
COMMENT ON COLUMN staff.qualification IS 'Educational qualification (e.g., "Bachelor of Education")';
COMMENT ON COLUMN staff.specialization IS 'Subject specialization for teachers';

-- DOWN
DROP TRIGGER IF EXISTS trigger_update_staff_timestamp ON staff;
DROP FUNCTION IF EXISTS update_staff_timestamp();
DROP INDEX IF EXISTS idx_staff_staff_id;
DROP INDEX IF EXISTS idx_staff_name;
DROP INDEX IF EXISTS idx_staff_status;
DROP INDEX IF EXISTS idx_staff_type;
DROP TABLE IF EXISTS staff;
