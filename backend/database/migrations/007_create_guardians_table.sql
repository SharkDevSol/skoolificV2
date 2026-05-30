-- Migration 007: Create guardians table
-- Stores parent/guardian information and adds foreign key constraint to students table

-- UP
CREATE TABLE IF NOT EXISTS guardians (
  id SERIAL PRIMARY KEY,
  guardian_id VARCHAR(50) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  last_name VARCHAR(100) NOT NULL,
  relationship VARCHAR(50), -- 'Father', 'Mother', 'Guardian', 'Other'
  phone_number VARCHAR(20) NOT NULL,
  email VARCHAR(100),
  address TEXT,
  occupation VARCHAR(100),
  workplace VARCHAR(100),
  telegram_chat_id VARCHAR(100), -- For Telegram bot notifications
  fcm_token TEXT, -- For push notifications
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_guardians_guardian_id ON guardians(guardian_id);
CREATE INDEX IF NOT EXISTS idx_guardians_phone ON guardians(phone_number);
CREATE INDEX IF NOT EXISTS idx_guardians_name ON guardians(first_name, last_name);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_guardians_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_guardians_timestamp
BEFORE UPDATE ON guardians
FOR EACH ROW
EXECUTE FUNCTION update_guardians_timestamp();

-- Add foreign key constraint to students table (if not already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_students_guardian' 
    AND table_name = 'students'
  ) THEN
    ALTER TABLE students 
    ADD CONSTRAINT fk_students_guardian 
    FOREIGN KEY (guardian_id) REFERENCES guardians(id) ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON TABLE guardians IS 'Stores parent/guardian information for students';
COMMENT ON COLUMN guardians.guardian_id IS 'Unique guardian identifier (e.g., GRD2018001)';
COMMENT ON COLUMN guardians.relationship IS 'Relationship to student: Father, Mother, Guardian, Other';
COMMENT ON COLUMN guardians.telegram_chat_id IS 'Telegram chat ID for bot notifications';
COMMENT ON COLUMN guardians.fcm_token IS 'Firebase Cloud Messaging token for push notifications';

-- DOWN
-- Remove foreign key constraint from students table
ALTER TABLE IF EXISTS students DROP CONSTRAINT IF EXISTS fk_students_guardian;

DROP TRIGGER IF EXISTS trigger_update_guardians_timestamp ON guardians;
DROP FUNCTION IF EXISTS update_guardians_timestamp();
DROP INDEX IF EXISTS idx_guardians_name;
DROP INDEX IF EXISTS idx_guardians_phone;
DROP INDEX IF EXISTS idx_guardians_guardian_id;
DROP TABLE IF EXISTS guardians;
