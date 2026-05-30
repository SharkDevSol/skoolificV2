-- Add missing columns to academic_student_attendance_settings table

-- Add school_days column (array of text)
ALTER TABLE academic_student_attendance_settings 
ADD COLUMN IF NOT EXISTS school_days TEXT[] DEFAULT ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

-- Add auto_absent_enabled column
ALTER TABLE academic_student_attendance_settings 
ADD COLUMN IF NOT EXISTS auto_absent_enabled BOOLEAN DEFAULT TRUE;

-- Update existing rows to have default values
UPDATE academic_student_attendance_settings 
SET 
  school_days = ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  auto_absent_enabled = TRUE
WHERE school_days IS NULL OR auto_absent_enabled IS NULL;

-- Add comment
COMMENT ON COLUMN academic_student_attendance_settings.school_days IS 'Days of the week when attendance is tracked';
COMMENT ON COLUMN academic_student_attendance_settings.auto_absent_enabled IS 'Whether to automatically mark students absent';
