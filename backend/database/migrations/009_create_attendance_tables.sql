-- Migration 009: Create attendance tables for students and staff
-- Supports Ethiopian calendar dates and offline sync

-- UP

-- Create student attendance table
CREATE TABLE IF NOT EXISTS student_attendance (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  attendance_date DATE NOT NULL,
  attendance_date_ethiopian JSONB, -- {year: 2018, month: 5, day: 15}
  status VARCHAR(20) NOT NULL,
  marked_by INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  sync_status VARCHAR(20) DEFAULT 'synced',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_student_attendance_status CHECK (status IN ('present', 'absent', 'late', 'excused', 'sick')),
  CONSTRAINT check_sync_status CHECK (sync_status IN ('pending', 'syncing', 'synced', 'failed')),
  UNIQUE(student_id, attendance_date)
);

-- Create staff attendance table
CREATE TABLE IF NOT EXISTS staff_attendance (
  id SERIAL PRIMARY KEY,
  staff_id INTEGER REFERENCES staff(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  attendance_date_ethiopian JSONB, -- {year: 2018, month: 5, day: 15}
  status VARCHAR(20) NOT NULL,
  check_in_time TIME,
  check_out_time TIME,
  total_hours DECIMAL(5, 2),
  marked_by INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  sync_status VARCHAR(20) DEFAULT 'synced',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_staff_attendance_status CHECK (status IN ('present', 'absent', 'late', 'on_leave', 'sick', 'half_day')),
  CONSTRAINT check_staff_sync_status CHECK (sync_status IN ('pending', 'syncing', 'synced', 'failed')),
  UNIQUE(staff_id, attendance_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_attendance_student ON student_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_student_attendance_date ON student_attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_student_attendance_class ON student_attendance(class_id);
CREATE INDEX IF NOT EXISTS idx_student_attendance_status ON student_attendance(status);
CREATE INDEX IF NOT EXISTS idx_student_attendance_sync ON student_attendance(sync_status);

CREATE INDEX IF NOT EXISTS idx_staff_attendance_staff ON staff_attendance(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_date ON staff_attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_status ON staff_attendance(status);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_sync ON staff_attendance(sync_status);

-- Add triggers to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_student_attendance_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_student_attendance_timestamp
BEFORE UPDATE ON student_attendance
FOR EACH ROW
EXECUTE FUNCTION update_student_attendance_timestamp();

CREATE OR REPLACE FUNCTION update_staff_attendance_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_staff_attendance_timestamp
BEFORE UPDATE ON staff_attendance
FOR EACH ROW
EXECUTE FUNCTION update_staff_attendance_timestamp();

COMMENT ON TABLE student_attendance IS 'Stores daily student attendance records with Ethiopian calendar support';
COMMENT ON COLUMN student_attendance.attendance_date_ethiopian IS 'Attendance date in Ethiopian calendar as JSON';
COMMENT ON COLUMN student_attendance.status IS 'Attendance status: present, absent, late, excused, sick';
COMMENT ON COLUMN student_attendance.sync_status IS 'Offline sync status: pending, syncing, synced, failed';

COMMENT ON TABLE staff_attendance IS 'Stores daily staff attendance records with check-in/check-out times';
COMMENT ON COLUMN staff_attendance.attendance_date_ethiopian IS 'Attendance date in Ethiopian calendar as JSON';
COMMENT ON COLUMN staff_attendance.status IS 'Attendance status: present, absent, late, on_leave, sick, half_day';
COMMENT ON COLUMN staff_attendance.total_hours IS 'Total hours worked (calculated from check-in/check-out)';
COMMENT ON COLUMN staff_attendance.sync_status IS 'Offline sync status: pending, syncing, synced, failed';

-- DOWN
DROP TRIGGER IF EXISTS trigger_update_staff_attendance_timestamp ON staff_attendance;
DROP FUNCTION IF EXISTS update_staff_attendance_timestamp();
DROP TRIGGER IF EXISTS trigger_update_student_attendance_timestamp ON student_attendance;
DROP FUNCTION IF EXISTS update_student_attendance_timestamp();

DROP INDEX IF EXISTS idx_staff_attendance_sync;
DROP INDEX IF EXISTS idx_staff_attendance_status;
DROP INDEX IF EXISTS idx_staff_attendance_date;
DROP INDEX IF EXISTS idx_staff_attendance_staff;
DROP INDEX IF EXISTS idx_student_attendance_sync;
DROP INDEX IF EXISTS idx_student_attendance_status;
DROP INDEX IF EXISTS idx_student_attendance_class;
DROP INDEX IF EXISTS idx_student_attendance_date;
DROP INDEX IF EXISTS idx_student_attendance_student;

DROP TABLE IF EXISTS staff_attendance;
DROP TABLE IF EXISTS student_attendance;
