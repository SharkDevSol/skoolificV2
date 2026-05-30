-- Migration 005: Create students table with comprehensive indexes
-- Stores student information with support for regular, KG, and evening class students

-- UP
CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  student_id VARCHAR(50) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  last_name VARCHAR(100) NOT NULL,
  class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  date_of_birth DATE,
  date_of_birth_ethiopian JSONB, -- {year: 2010, month: 1, day: 15}
  gender VARCHAR(10) CHECK (gender IN ('Male', 'Female', 'Other')),
  phone_number VARCHAR(20),
  email VARCHAR(100),
  guardian_id INTEGER, -- Will reference guardians(id) after migration 007
  enrollment_date DATE,
  enrollment_date_ethiopian JSONB, -- {year: 2018, month: 1, day: 1}
  status VARCHAR(20) DEFAULT 'active',
  academic_year VARCHAR(20),
  address TEXT,
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  medical_conditions TEXT,
  photo_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_student_status CHECK (status IN ('active', 'graduated', 'transferred', 'withdrawn', 'suspended'))
);

-- Create comprehensive indexes for performance
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_academic_year ON students(academic_year);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_guardian ON students(guardian_id);
CREATE INDEX IF NOT EXISTS idx_students_name ON students(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_students_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_students_timestamp
BEFORE UPDATE ON students
FOR EACH ROW
EXECUTE FUNCTION update_students_timestamp();

COMMENT ON TABLE students IS 'Stores student information for regular, KG, and evening class students';
COMMENT ON COLUMN students.student_id IS 'Unique student identifier (e.g., STU2018001)';
COMMENT ON COLUMN students.class_id IS 'Foreign key to classes table';
COMMENT ON COLUMN students.date_of_birth_ethiopian IS 'Date of birth in Ethiopian calendar as JSON {year, month, day}';
COMMENT ON COLUMN students.guardian_id IS 'Foreign key to guardians table (will be added in migration 007)';
COMMENT ON COLUMN students.enrollment_date_ethiopian IS 'Enrollment date in Ethiopian calendar as JSON';
COMMENT ON COLUMN students.status IS 'Student status: active, graduated, transferred, withdrawn, suspended';
COMMENT ON COLUMN students.academic_year IS 'Academic year when student enrolled (e.g., "2018/2019")';

-- DOWN
DROP TRIGGER IF EXISTS trigger_update_students_timestamp ON students;
DROP FUNCTION IF EXISTS update_students_timestamp();
DROP INDEX IF EXISTS idx_students_student_id;
DROP INDEX IF EXISTS idx_students_name;
DROP INDEX IF EXISTS idx_students_guardian;
DROP INDEX IF EXISTS idx_students_status;
DROP INDEX IF EXISTS idx_students_academic_year;
DROP INDEX IF EXISTS idx_students_class;
DROP TABLE IF EXISTS students;
