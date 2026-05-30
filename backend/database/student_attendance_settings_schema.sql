-- Student Attendance Time Settings Schema
-- Creates tables for managing student attendance time settings and class shift assignments

-- ============================================
-- 1. Student Attendance Settings Table
-- ============================================
CREATE TABLE IF NOT EXISTS academic_student_attendance_settings (
  id SERIAL PRIMARY KEY,
  check_in_start_time TIME NOT NULL DEFAULT '07:00:00',
  check_in_end_time TIME NOT NULL DEFAULT '08:30:00',
  late_threshold_time TIME NOT NULL DEFAULT '08:00:00',
  absent_marking_time TIME NOT NULL DEFAULT '09:00:00',
  
  -- Shift 1 settings
  shift1_check_in_start TIME DEFAULT '07:00:00',
  shift1_check_in_end TIME DEFAULT '08:30:00',
  shift1_late_threshold TIME DEFAULT '08:00:00',
  shift1_absent_marking TIME DEFAULT '09:00:00',
  
  -- Shift 2 settings
  shift2_check_in_start TIME DEFAULT '12:00:00',
  shift2_check_in_end TIME DEFAULT '13:30:00',
  shift2_late_threshold TIME DEFAULT '13:00:00',
  shift2_absent_marking TIME DEFAULT '14:00:00',
  
  -- Additional settings
  school_days TEXT[] DEFAULT ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  auto_absent_enabled BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add columns if they don't exist (for existing tables)
ALTER TABLE academic_student_attendance_settings 
ADD COLUMN IF NOT EXISTS school_days TEXT[] DEFAULT ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

ALTER TABLE academic_student_attendance_settings 
ADD COLUMN IF NOT EXISTS auto_absent_enabled BOOLEAN DEFAULT TRUE;

-- Insert default settings if table is empty
INSERT INTO academic_student_attendance_settings (
  check_in_start_time,
  check_in_end_time,
  late_threshold_time,
  absent_marking_time,
  shift1_check_in_start,
  shift1_check_in_end,
  shift1_late_threshold,
  shift1_absent_marking,
  shift2_check_in_start,
  shift2_check_in_end,
  shift2_late_threshold,
  shift2_absent_marking
)
SELECT 
  '07:00:00'::TIME,
  '08:30:00'::TIME,
  '08:00:00'::TIME,
  '09:00:00'::TIME,
  '07:00:00'::TIME,
  '08:30:00'::TIME,
  '08:00:00'::TIME,
  '09:00:00'::TIME,
  '12:00:00'::TIME,
  '13:30:00'::TIME,
  '13:00:00'::TIME,
  '14:00:00'::TIME
WHERE NOT EXISTS (SELECT 1 FROM academic_student_attendance_settings);

-- ============================================
-- 2. Class Shift Assignment Table
-- ============================================
CREATE TABLE IF NOT EXISTS academic_class_shift_assignment (
  id SERIAL PRIMARY KEY,
  class_name VARCHAR(255) NOT NULL UNIQUE,
  shift_number INTEGER NOT NULL CHECK (shift_number IN (1, 2)),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_class_shift_assignment 
ON academic_class_shift_assignment(class_name);

-- ============================================
-- 3. Student Attendance Table (if not exists)
-- ============================================
CREATE TABLE IF NOT EXISTS academic_student_attendance (
  id SERIAL PRIMARY KEY,
  student_id VARCHAR(50) NOT NULL,
  student_name VARCHAR(255),
  class_name VARCHAR(255) NOT NULL,
  smachine_id VARCHAR(50),
  date DATE,  -- Nullable, Ethiopian calendar is primary
  status VARCHAR(20) NOT NULL DEFAULT 'ABSENT',
  check_in_time TIME,
  shift_number INTEGER DEFAULT 1 CHECK (shift_number IN (1, 2)),
  
  -- Ethiopian calendar fields (primary date system)
  ethiopian_year INTEGER NOT NULL,
  ethiopian_month INTEGER NOT NULL,
  ethiopian_day INTEGER NOT NULL,
  day_of_week VARCHAR(20),
  week_number INTEGER,
  
  marked_by VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Unique constraint for Ethiopian calendar dates
  CONSTRAINT unique_student_ethiopian_date UNIQUE (student_id, class_name, ethiopian_year, ethiopian_month, ethiopian_day)
);

-- Drop old constraint if it exists
ALTER TABLE academic_student_attendance 
DROP CONSTRAINT IF EXISTS unique_student_date;

-- Make date column nullable
ALTER TABLE academic_student_attendance 
ALTER COLUMN date DROP NOT NULL;

-- Add columns if they don't exist (for existing tables)
ALTER TABLE academic_student_attendance 
ADD COLUMN IF NOT EXISTS smachine_id VARCHAR(50);

ALTER TABLE academic_student_attendance 
ADD COLUMN IF NOT EXISTS day_of_week VARCHAR(20);

ALTER TABLE academic_student_attendance 
ADD COLUMN IF NOT EXISTS student_name VARCHAR(255);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_student_attendance_date 
ON academic_student_attendance(date);

CREATE INDEX IF NOT EXISTS idx_student_attendance_class 
ON academic_student_attendance(class_name);

CREATE INDEX IF NOT EXISTS idx_student_attendance_shift 
ON academic_student_attendance(shift_number);

CREATE INDEX IF NOT EXISTS idx_student_attendance_student 
ON academic_student_attendance(student_id);

CREATE INDEX IF NOT EXISTS idx_student_attendance_ethiopian 
ON academic_student_attendance(ethiopian_year, ethiopian_month, ethiopian_day);

-- ============================================
-- 4. Comments
-- ============================================
COMMENT ON TABLE academic_student_attendance_settings IS 'Time settings for student attendance check-in, late marking, and absent marking';
COMMENT ON TABLE academic_class_shift_assignment IS 'Maps each class to either Shift 1 or Shift 2';
COMMENT ON TABLE academic_student_attendance IS 'Student attendance records with shift support';
COMMENT ON COLUMN academic_student_attendance.shift_number IS 'Which shift this attendance record belongs to (1 or 2)';
