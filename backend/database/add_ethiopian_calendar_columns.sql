-- Add Ethiopian calendar columns to academic_student_attendance table

-- Add ethiopian_year column
ALTER TABLE academic_student_attendance 
ADD COLUMN IF NOT EXISTS ethiopian_year INTEGER;

-- Add ethiopian_month column
ALTER TABLE academic_student_attendance 
ADD COLUMN IF NOT EXISTS ethiopian_month INTEGER;

-- Add ethiopian_day column
ALTER TABLE academic_student_attendance 
ADD COLUMN IF NOT EXISTS ethiopian_day INTEGER;

-- Add week_number column
ALTER TABLE academic_student_attendance 
ADD COLUMN IF NOT EXISTS week_number INTEGER;

-- Add student_name column (if missing)
ALTER TABLE academic_student_attendance 
ADD COLUMN IF NOT EXISTS student_name VARCHAR(255);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_attendance_ethiopian_date 
ON academic_student_attendance(ethiopian_year, ethiopian_month, ethiopian_day);

CREATE INDEX IF NOT EXISTS idx_attendance_week 
ON academic_student_attendance(ethiopian_year, ethiopian_month, week_number);

-- Add comments
COMMENT ON COLUMN academic_student_attendance.ethiopian_year IS 'Ethiopian calendar year';
COMMENT ON COLUMN academic_student_attendance.ethiopian_month IS 'Ethiopian calendar month (1-13)';
COMMENT ON COLUMN academic_student_attendance.ethiopian_day IS 'Ethiopian calendar day';
COMMENT ON COLUMN academic_student_attendance.week_number IS 'Week number within the month';
