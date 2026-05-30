-- Migration 013: Create user_devices table for FCM tokens
-- Stores device tokens for push notifications

-- UP

-- Create user_devices table
CREATE TABLE IF NOT EXISTS user_devices (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  user_type VARCHAR(20) NOT NULL, -- 'student', 'staff', 'guardian'
  device_token TEXT NOT NULL UNIQUE,
  device_type VARCHAR(20), -- 'android', 'ios', 'web'
  device_name VARCHAR(100), -- Device model/name
  app_version VARCHAR(20), -- App version
  os_version VARCHAR(50), -- OS version
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_devices_user ON user_devices(user_id, user_type);
CREATE INDEX IF NOT EXISTS idx_user_devices_token ON user_devices(device_token);
CREATE INDEX IF NOT EXISTS idx_user_devices_active ON user_devices(is_active);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_devices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_devices_updated_at
  BEFORE UPDATE ON user_devices
  FOR EACH ROW
  EXECUTE FUNCTION update_user_devices_updated_at();

COMMENT ON TABLE user_devices IS 'Stores FCM device tokens for push notifications';
COMMENT ON COLUMN user_devices.user_id IS 'ID of the user (student, staff, or guardian)';
COMMENT ON COLUMN user_devices.user_type IS 'Type of user: student, staff, or guardian';
COMMENT ON COLUMN user_devices.device_token IS 'FCM device token for push notifications';
COMMENT ON COLUMN user_devices.device_type IS 'Type of device: android, ios, or web';
COMMENT ON COLUMN user_devices.is_active IS 'Whether the device token is still valid';
COMMENT ON COLUMN user_devices.last_used_at IS 'Last time this device was used';

-- DOWN
DROP TRIGGER IF EXISTS trigger_update_user_devices_updated_at ON user_devices;
DROP FUNCTION IF EXISTS update_user_devices_updated_at();
DROP INDEX IF EXISTS idx_user_devices_active;
DROP INDEX IF EXISTS idx_user_devices_token;
DROP INDEX IF EXISTS idx_user_devices_user;
DROP TABLE IF EXISTS user_devices;
