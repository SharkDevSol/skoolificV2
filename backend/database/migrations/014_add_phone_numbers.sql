-- Migration 014: Add phone_number columns to all user tables
-- Required for SMS notifications and Telegram bot integration

-- UP

-- Add phone_number to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);

-- Add phone_number to staff table
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);

-- Add phone_number to guardians table
ALTER TABLE guardians 
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);

-- Create indexes for phone number lookups
CREATE INDEX IF NOT EXISTS idx_students_phone ON students(phone_number);
CREATE INDEX IF NOT EXISTS idx_staff_phone ON staff(phone_number);
CREATE INDEX IF NOT EXISTS idx_guardians_phone ON guardians(phone_number);

-- Add comments
COMMENT ON COLUMN students.phone_number IS 'Student phone number for SMS and Telegram notifications';
COMMENT ON COLUMN staff.phone_number IS 'Staff phone number for SMS and Telegram notifications';
COMMENT ON COLUMN guardians.phone_number IS 'Guardian phone number for SMS and Telegram notifications';

-- DOWN
DROP INDEX IF EXISTS idx_guardians_phone;
DROP INDEX IF EXISTS idx_staff_phone;
DROP INDEX IF EXISTS idx_students_phone;

ALTER TABLE guardians DROP COLUMN IF EXISTS phone_number;
ALTER TABLE staff DROP COLUMN IF EXISTS phone_number;
ALTER TABLE students DROP COLUMN IF EXISTS phone_number;
