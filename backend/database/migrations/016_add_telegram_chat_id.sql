-- Migration 016: Add telegram_chat_id columns for Telegram bot notifications
-- This allows the system to send proactive notifications to users via Telegram

-- UP

-- Add telegram_chat_id to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT;

-- Add telegram_chat_id to staff table
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT;

-- Add telegram_chat_id to guardians table
ALTER TABLE guardians 
ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT;

-- Create indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_students_telegram_chat_id ON students(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_staff_telegram_chat_id ON staff(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_guardians_telegram_chat_id ON guardians(telegram_chat_id);

-- Add comments
COMMENT ON COLUMN students.telegram_chat_id IS 'Telegram chat ID for sending notifications';
COMMENT ON COLUMN staff.telegram_chat_id IS 'Telegram chat ID for sending notifications';
COMMENT ON COLUMN guardians.telegram_chat_id IS 'Telegram chat ID for sending notifications';

-- DOWN
DROP INDEX IF EXISTS idx_guardians_telegram_chat_id;
DROP INDEX IF EXISTS idx_staff_telegram_chat_id;
DROP INDEX IF EXISTS idx_students_telegram_chat_id;

ALTER TABLE guardians DROP COLUMN IF EXISTS telegram_chat_id;
ALTER TABLE staff DROP COLUMN IF EXISTS telegram_chat_id;
ALTER TABLE students DROP COLUMN IF EXISTS telegram_chat_id;
