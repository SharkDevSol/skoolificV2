-- Fix Student Attendance Table Constraint
-- This script updates the unique constraint to match the auto-marker's insert logic

-- Drop old constraint if it exists
ALTER TABLE academic_student_attendance 
DROP CONSTRAINT IF EXISTS unique_student_date;

-- Add new constraint for Ethiopian calendar dates
ALTER TABLE academic_student_attendance 
DROP CONSTRAINT IF EXISTS unique_student_ethiopian_date;

ALTER TABLE academic_student_attendance 
ADD CONSTRAINT unique_student_ethiopian_date 
UNIQUE (student_id, class_name, ethiopian_year, ethiopian_month, ethiopian_day);

-- Make date column nullable (Ethiopian calendar is primary)
ALTER TABLE academic_student_attendance 
ALTER COLUMN date DROP NOT NULL;

-- Add missing columns if they don't exist
ALTER TABLE academic_student_attendance 
ADD COLUMN IF NOT EXISTS smachine_id VARCHAR(50);

ALTER TABLE academic_student_attendance 
ADD COLUMN IF NOT EXISTS day_of_week VARCHAR(20);

ALTER TABLE academic_student_attendance 
ADD COLUMN IF NOT EXISTS student_name VARCHAR(255);

-- Make Ethiopian calendar columns NOT NULL (with default for existing rows)
UPDATE academic_student_attendance 
SET ethiopian_year = 2018 
WHERE ethiopian_year IS NULL;

UPDATE academic_student_attendance 
SET ethiopian_month = 1 
WHERE ethiopian_month IS NULL;

UPDATE academic_student_attendance 
SET ethiopian_day = 1 
WHERE ethiopian_day IS NULL;

ALTER TABLE academic_student_attendance 
ALTER COLUMN ethiopian_year SET NOT NULL;

ALTER TABLE academic_student_attendance 
ALTER COLUMN ethiopian_month SET NOT NULL;

ALTER TABLE academic_student_attendance 
ALTER COLUMN ethiopian_day SET NOT NULL;

-- Create index for Ethiopian calendar queries
CREATE INDEX IF NOT EXISTS idx_student_attendance_ethiopian 
ON academic_student_attendance(ethiopian_year, ethiopian_month, ethiopian_day);

-- Update status column to allow uppercase values
ALTER TABLE academic_student_attendance 
DROP CONSTRAINT IF EXISTS academic_student_attendance_status_check;

ALTER TABLE academic_student_attendance 
ADD CONSTRAINT academic_student_attendance_status_check 
CHECK (status IN ('PRESENT', 'ABSENT', 'LATE', 'LEAVE', 'present', 'absent', 'late', 'excused', 'leave'));

COMMENT ON CONSTRAINT unique_student_ethiopian_date ON academic_student_attendance 
IS 'Ensures one attendance record per student per Ethiopian calendar day';

COMMENT ON COLUMN academic_student_attendance.date 
IS 'Gregorian date (nullable, Ethiopian calendar is primary)';
