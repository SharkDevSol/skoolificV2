-- Staff Attendance System Database Schema
-- Supports two-step verification for teachers and single-step for general staff

-- Main attendance table
CREATE TABLE IF NOT EXISTS staff_attendance (
    id SERIAL PRIMARY KEY,
    staff_id VARCHAR(50) NOT NULL,
    staff_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Teacher', 'General Staff', 'Administrator', 'Support Staff')),
    date DATE NOT NULL,
    time_in TIMESTAMP NOT NULL,
    time_out TIMESTAMP,
    step1_timestamp TIMESTAMP,  -- For teachers: first confirmation timestamp
    step2_timestamp TIMESTAMP,  -- For teachers: second confirmation timestamp
    verification_status VARCHAR(20) DEFAULT 'single_step' CHECK (verification_status IN ('single_step', 'verified', 'pending')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(staff_id, date)
);

-- Staff attendance profiles (created automatically when staff is added)
CREATE TABLE IF NOT EXISTS staff_attendance_profiles (
    id SERIAL PRIMARY KEY,
    staff_id VARCHAR(50) NOT NULL UNIQUE,
    staff_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pending verification table (for teachers awaiting step 2)
CREATE TABLE IF NOT EXISTS staff_attendance_pending (
    id SERIAL PRIMARY KEY,
    staff_id VARCHAR(50) NOT NULL,
    staff_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    step1_timestamp TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'pending_step2' CHECK (status IN ('pending_step2', 'completed', 'cancelled', 'expired')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '10 minutes')
);

-- Attendance logs for audit trail
CREATE TABLE IF NOT EXISTS staff_attendance_logs (
    id SERIAL PRIMARY KEY,
    attendance_id INTEGER REFERENCES staff_attendance(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    performed_by VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    details JSONB
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_staff_attendance_staff_id ON staff_attendance(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_date ON staff_attendance(date);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_role ON staff_attendance(role);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_verification ON staff_attendance(verification_status);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_profiles_staff_id ON staff_attendance_profiles(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_profiles_active ON staff_attendance_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_pending_staff_id ON staff_attendance_pending(staff_id);
CREATE INDEX IF NOT EXISTS idx_pending_status ON staff_attendance_pending(status);

-- Function to automatically expire pending verifications
CREATE OR REPLACE FUNCTION expire_pending_verifications()
RETURNS void AS $$
BEGIN
    UPDATE staff_attendance_pending
    SET status = 'expired'
    WHERE status = 'pending_step2' 
    AND expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Trigger to log attendance changes
CREATE OR REPLACE FUNCTION log_attendance_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO staff_attendance_logs (attendance_id, action, details)
        VALUES (NEW.id, 'CLOCK_IN', row_to_json(NEW));
    ELSIF TG_OP = 'UPDATE' AND OLD.time_out IS NULL AND NEW.time_out IS NOT NULL THEN
        INSERT INTO staff_attendance_logs (attendance_id, action, details)
        VALUES (NEW.id, 'CLOCK_OUT', row_to_json(NEW));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER attendance_change_trigger
AFTER INSERT OR UPDATE ON staff_attendance
FOR EACH ROW
EXECUTE FUNCTION log_attendance_change();

-- Sample data for testing
INSERT INTO staff_attendance (staff_id, staff_name, role, date, time_in, time_out, verification_status)
VALUES 
    ('GS001', 'John Doe', 'General Staff', CURRENT_DATE, CURRENT_TIMESTAMP - INTERVAL '8 hours', CURRENT_TIMESTAMP - INTERVAL '30 minutes', 'single_step'),
    ('T001', 'Jane Smith', 'Teacher', CURRENT_DATE, CURRENT_TIMESTAMP - INTERVAL '7 hours', NULL, 'verified')
ON CONFLICT (staff_id, date) DO NOTHING;

-- View for daily attendance summary
CREATE OR REPLACE VIEW daily_attendance_summary AS
SELECT 
    date,
    role,
    COUNT(*) as total_staff,
    COUNT(CASE WHEN time_out IS NOT NULL THEN 1 END) as clocked_out,
    COUNT(CASE WHEN time_out IS NULL THEN 1 END) as still_present,
    AVG(EXTRACT(EPOCH FROM (time_out - time_in))/3600) as avg_hours_worked
FROM staff_attendance
GROUP BY date, role
ORDER BY date DESC, role;

-- View for staff attendance history
CREATE OR REPLACE VIEW staff_attendance_history AS
SELECT 
    sa.staff_id,
    sa.staff_name,
    sa.role,
    sa.date,
    sa.time_in,
    sa.time_out,
    CASE 
        WHEN sa.time_out IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (sa.time_out - sa.time_in))/3600
        ELSE NULL
    END as hours_worked,
    sa.verification_status,
    CASE 
        WHEN sa.role = 'Teacher' AND sa.verification_status = 'verified' THEN
            EXTRACT(EPOCH FROM (sa.step2_timestamp - sa.step1_timestamp))
        ELSE NULL
    END as verification_time_seconds
FROM staff_attendance sa
ORDER BY sa.date DESC, sa.time_in DESC;

COMMENT ON TABLE staff_attendance IS 'Main table storing staff attendance records with support for two-step verification for teachers';
COMMENT ON TABLE staff_attendance_profiles IS 'Staff profiles for attendance system - automatically created when staff is added';
COMMENT ON TABLE staff_attendance_pending IS 'Temporary storage for teacher attendance awaiting second confirmation';
COMMENT ON COLUMN staff_attendance.step1_timestamp IS 'First timestamp capture for teacher verification';
COMMENT ON COLUMN staff_attendance.step2_timestamp IS 'Second timestamp capture for teacher verification';
COMMENT ON COLUMN staff_attendance.verification_status IS 'Indicates if attendance used single-step or two-step verification';
