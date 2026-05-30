-- Add shift support to student attendance system
-- This allows configuring 2 shifts with different times and assigning classes to shifts

-- Add shift columns to attendance settings table
ALTER TABLE academic_student_attendance_settings 
ADD COLUMN IF NOT EXISTS shift1_check_in_start TIME DEFAULT '07:00:00',
ADD COLUMN IF NOT EXISTS shift1_check_in_end TIME DEFAULT '08:30:00',
ADD COLUMN IF NOT EXISTS shift1_late_threshold TIME DEFAULT '08:00:00',
ADD COLUMN IF NOT EXISTS shift1_absent_marking TIME DEFAULT '09:00:00',
ADD COLUMN IF NOT EXISTS shift2_check_in_start TIME DEFAULT '13:00:00',
ADD COLUMN IF NOT EXISTS shift2_check_in_end TIME DEFAULT '14:30:00',
ADD COLUMN IF NOT EXISTS shift2_late_threshold TIME DEFAULT '14:00:00',
ADD COLUMN IF NOT EXISTS shift2_absent_marking TIME DEFAULT '15:00:00';

-- Create class shift assignment table
CREATE TABLE IF NOT EXISTS academic_class_shift_assignment (
    id SERIAL PRIMARY KEY,
    class_name VARCHAR(255) NOT NULL UNIQUE,
    shift_number INTEGER NOT NULL CHECK (shift_number IN (1, 2)),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add shift_number column to attendance records
ALTER TABLE academic_student_attendance 
ADD COLUMN IF NOT EXISTS shift_number INTEGER CHECK (shift_number IN (1, 2));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_class_shift_assignment 
ON academic_class_shift_assignment(class_name);

CREATE INDEX IF NOT EXISTS idx_student_attendance_shift 
ON academic_student_attendance(shift_number);

COMMENT ON TABLE academic_class_shift_assignment IS 'Maps each class to either Shift 1 or Shift 2';
COMMENT ON COLUMN academic_student_attendance.shift_number IS 'Which shift this attendance record belongs to (1 or 2)';
