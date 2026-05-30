-- HR Attendance Time Settings Schema
-- Creates table for managing staff attendance time settings

CREATE TABLE IF NOT EXISTS hr_attendance_time_settings (
  id SERIAL PRIMARY KEY,
  late_threshold TIME NOT NULL DEFAULT '08:15:00',
  half_day_threshold DECIMAL(4,2) NOT NULL DEFAULT 4.0,
  max_checkout_hours DECIMAL(4,2) NOT NULL DEFAULT 3.0,
  absent_threshold_time TIME NOT NULL DEFAULT '15:00:00',
  weekend_days INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings if table is empty
INSERT INTO hr_attendance_time_settings (
  late_threshold,
  half_day_threshold,
  max_checkout_hours,
  absent_threshold_time,
  weekend_days
)
SELECT 
  '08:15:00'::TIME,
  4.0,
  3.0,
  '15:00:00'::TIME,
  ARRAY[]::INTEGER[]
WHERE NOT EXISTS (SELECT 1 FROM hr_attendance_time_settings);

-- Add comment
COMMENT ON TABLE hr_attendance_time_settings IS 'Time settings for staff attendance auto-marking';
COMMENT ON COLUMN hr_attendance_time_settings.late_threshold IS 'Time after which staff are marked as late';
COMMENT ON COLUMN hr_attendance_time_settings.half_day_threshold IS 'Minimum hours for half-day attendance';
COMMENT ON COLUMN hr_attendance_time_settings.max_checkout_hours IS 'Maximum hours before auto-checkout';
COMMENT ON COLUMN hr_attendance_time_settings.absent_threshold_time IS 'Time after which staff are marked absent';
COMMENT ON COLUMN hr_attendance_time_settings.weekend_days IS 'Days of week that are weekends (0=Sunday, 6=Saturday)';
