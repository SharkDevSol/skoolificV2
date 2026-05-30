-- Migration 012: Create archived academic years tables
-- Supports year rollover functionality - archiving old academic year data

-- UP

-- Create archived academic years tracking table
CREATE TABLE IF NOT EXISTS archived_academic_years (
  id SERIAL PRIMARY KEY,
  academic_year VARCHAR(20) NOT NULL UNIQUE,
  ethiopian_year INTEGER NOT NULL,
  archive_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  archived_by INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  total_students INTEGER,
  total_staff INTEGER,
  notes TEXT
);

-- Create archived students table
CREATE TABLE IF NOT EXISTS archived_students (
  id SERIAL PRIMARY KEY,
  archive_year_id INTEGER REFERENCES archived_academic_years(id) ON DELETE CASCADE,
  student_data JSONB NOT NULL, -- Complete student record as JSON
  student_id VARCHAR(50) NOT NULL,
  class_name VARCHAR(100),
  final_status VARCHAR(20), -- 'graduated', 'transferred', 'withdrawn'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create archived attendance table
CREATE TABLE IF NOT EXISTS archived_attendance (
  id SERIAL PRIMARY KEY,
  archive_year_id INTEGER REFERENCES archived_academic_years(id) ON DELETE CASCADE,
  student_id VARCHAR(50) NOT NULL,
  attendance_data JSONB NOT NULL, -- All attendance records as JSON array
  total_present INTEGER,
  total_absent INTEGER,
  attendance_percentage DECIMAL(5, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create archived marks table
CREATE TABLE IF NOT EXISTS archived_marks (
  id SERIAL PRIMARY KEY,
  archive_year_id INTEGER REFERENCES archived_academic_years(id) ON DELETE CASCADE,
  student_id VARCHAR(50) NOT NULL,
  marks_data JSONB NOT NULL, -- All mark records as JSON array
  overall_percentage DECIMAL(5, 2),
  overall_grade VARCHAR(5),
  rank_in_class INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create archived payments table
CREATE TABLE IF NOT EXISTS archived_payments (
  id SERIAL PRIMARY KEY,
  archive_year_id INTEGER REFERENCES archived_academic_years(id) ON DELETE CASCADE,
  student_id VARCHAR(50) NOT NULL,
  payment_data JSONB NOT NULL, -- All payment records as JSON array
  total_fees DECIMAL(12, 2),
  total_paid DECIMAL(12, 2),
  total_outstanding DECIMAL(12, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create archived staff table
CREATE TABLE IF NOT EXISTS archived_staff (
  id SERIAL PRIMARY KEY,
  archive_year_id INTEGER REFERENCES archived_academic_years(id) ON DELETE CASCADE,
  staff_data JSONB NOT NULL, -- Complete staff record as JSON
  staff_id VARCHAR(50) NOT NULL,
  staff_type VARCHAR(20),
  final_status VARCHAR(20), -- 'active', 'terminated', 'retired'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_archived_years_year ON archived_academic_years(academic_year);
CREATE INDEX IF NOT EXISTS idx_archived_years_ethiopian ON archived_academic_years(ethiopian_year);

CREATE INDEX IF NOT EXISTS idx_archived_students_year ON archived_students(archive_year_id);
CREATE INDEX IF NOT EXISTS idx_archived_students_id ON archived_students(student_id);
CREATE INDEX IF NOT EXISTS idx_archived_students_status ON archived_students(final_status);

CREATE INDEX IF NOT EXISTS idx_archived_attendance_year ON archived_attendance(archive_year_id);
CREATE INDEX IF NOT EXISTS idx_archived_attendance_student ON archived_attendance(student_id);

CREATE INDEX IF NOT EXISTS idx_archived_marks_year ON archived_marks(archive_year_id);
CREATE INDEX IF NOT EXISTS idx_archived_marks_student ON archived_marks(student_id);

CREATE INDEX IF NOT EXISTS idx_archived_payments_year ON archived_payments(archive_year_id);
CREATE INDEX IF NOT EXISTS idx_archived_payments_student ON archived_payments(student_id);

CREATE INDEX IF NOT EXISTS idx_archived_staff_year ON archived_staff(archive_year_id);
CREATE INDEX IF NOT EXISTS idx_archived_staff_id ON archived_staff(staff_id);

COMMENT ON TABLE archived_academic_years IS 'Tracks archived academic years for year rollover functionality';
COMMENT ON COLUMN archived_academic_years.academic_year IS 'Academic year in format "2018/2019" (Ethiopian calendar)';
COMMENT ON COLUMN archived_academic_years.ethiopian_year IS 'Ethiopian year (e.g., 2018)';

COMMENT ON TABLE archived_students IS 'Stores complete student records from archived academic years';
COMMENT ON COLUMN archived_students.student_data IS 'Complete student record as JSON including all fields';
COMMENT ON COLUMN archived_students.final_status IS 'Final status at end of year: graduated, transferred, withdrawn';

COMMENT ON TABLE archived_attendance IS 'Stores aggregated attendance data for archived academic years';
COMMENT ON COLUMN archived_attendance.attendance_data IS 'JSON array of all attendance records for the year';

COMMENT ON TABLE archived_marks IS 'Stores aggregated marks data for archived academic years';
COMMENT ON COLUMN archived_marks.marks_data IS 'JSON array of all mark records for the year';
COMMENT ON COLUMN archived_marks.rank_in_class IS 'Student rank in their class for the year';

COMMENT ON TABLE archived_payments IS 'Stores aggregated payment data for archived academic years';
COMMENT ON COLUMN archived_payments.payment_data IS 'JSON array of all payment records for the year';

COMMENT ON TABLE archived_staff IS 'Stores complete staff records from archived academic years';
COMMENT ON COLUMN archived_staff.staff_data IS 'Complete staff record as JSON including all fields';

-- DOWN
DROP INDEX IF EXISTS idx_archived_staff_id;
DROP INDEX IF EXISTS idx_archived_staff_year;
DROP INDEX IF EXISTS idx_archived_payments_student;
DROP INDEX IF EXISTS idx_archived_payments_year;
DROP INDEX IF EXISTS idx_archived_marks_student;
DROP INDEX IF EXISTS idx_archived_marks_year;
DROP INDEX IF EXISTS idx_archived_attendance_student;
DROP INDEX IF EXISTS idx_archived_attendance_year;
DROP INDEX IF EXISTS idx_archived_students_status;
DROP INDEX IF EXISTS idx_archived_students_id;
DROP INDEX IF EXISTS idx_archived_students_year;
DROP INDEX IF EXISTS idx_archived_years_ethiopian;
DROP INDEX IF EXISTS idx_archived_years_year;

DROP TABLE IF EXISTS archived_staff;
DROP TABLE IF EXISTS archived_payments;
DROP TABLE IF EXISTS archived_marks;
DROP TABLE IF EXISTS archived_attendance;
DROP TABLE IF EXISTS archived_students;
DROP TABLE IF EXISTS archived_academic_years;
