-- Migration 017: Create notifications log table
-- This table tracks all notifications sent through the system

-- UP

-- Create notifications log table
CREATE TABLE IF NOT EXISTS notifications_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('student', 'staff', 'guardian')),
  notification_type VARCHAR(50) NOT NULL,
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('push', 'telegram', 'sms', 'email')),
  title VARCHAR(255),
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered', 'read')),
  error_message TEXT,
  metadata JSONB,
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('student', 'staff', 'guardian')),
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('push', 'telegram', 'sms', 'email')),
  notification_type VARCHAR(50) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, user_type, channel, notification_type)
);

-- Create indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_notifications_log_user ON notifications_log(user_id, user_type);
CREATE INDEX IF NOT EXISTS idx_notifications_log_type ON notifications_log(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_log_channel ON notifications_log(channel);
CREATE INDEX IF NOT EXISTS idx_notifications_log_status ON notifications_log(status);
CREATE INDEX IF NOT EXISTS idx_notifications_log_created ON notifications_log(created_at);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id, user_type);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_notifications_log_updated_at
  BEFORE UPDATE ON notifications_log
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();

CREATE TRIGGER trigger_update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();

-- Add comments
COMMENT ON TABLE notifications_log IS 'Log of all notifications sent through the system';
COMMENT ON TABLE notification_preferences IS 'User preferences for notification channels';
COMMENT ON COLUMN notifications_log.user_type IS 'Type of user: student, staff, or guardian';
COMMENT ON COLUMN notifications_log.notification_type IS 'Type of notification: payment_reminder, absence_alert, exam_published, etc.';
COMMENT ON COLUMN notifications_log.channel IS 'Channel used: push, telegram, sms, email';
COMMENT ON COLUMN notifications_log.status IS 'Delivery status: pending, sent, failed, delivered, read';
COMMENT ON COLUMN notifications_log.metadata IS 'Additional data in JSON format';

-- DOWN
DROP TRIGGER IF EXISTS trigger_update_notification_preferences_updated_at ON notification_preferences;
DROP TRIGGER IF EXISTS trigger_update_notifications_log_updated_at ON notifications_log;
DROP FUNCTION IF EXISTS update_notifications_updated_at();
DROP INDEX IF EXISTS idx_notification_preferences_user;
DROP INDEX IF EXISTS idx_notifications_log_created;
DROP INDEX IF EXISTS idx_notifications_log_status;
DROP INDEX IF EXISTS idx_notifications_log_channel;
DROP INDEX IF EXISTS idx_notifications_log_type;
DROP INDEX IF EXISTS idx_notifications_log_user;
DROP TABLE IF EXISTS notification_preferences;
DROP TABLE IF EXISTS notifications_log;
