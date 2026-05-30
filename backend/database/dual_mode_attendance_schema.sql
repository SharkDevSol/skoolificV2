-- Dual-Mode Attendance System Database Schema
-- This schema supports both manual and machine-based attendance tracking

-- ============================================
-- 1. Machine Configuration Table
-- ============================================
CREATE TABLE IF NOT EXISTS machine_config (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  port INTEGER NOT NULL DEFAULT 4370,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================
-- 2. User Machine Mapping Table
-- ============================================
CREATE TABLE IF NOT EXISTS user_machine_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id VARCHAR(50) NOT NULL,
  person_type VARCHAR(10) NOT NULL CHECK (person_type IN ('student', 'staff')),
  machine_user_id INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_machine_user_id UNIQUE (machine_user_id),
  CONSTRAINT unique_person UNIQUE (person_id, person_type)
);

CREATE INDEX IF NOT EXISTS idx_mapping_machine_user_id ON user_machine_mapping(machine_user_id);
CREATE INDEX IF NOT EXISTS idx_mapping_person ON user_machine_mapping(person_id, person_type);

-- ============================================
-- 3. Sync Log Table
-- ============================================
CREATE TABLE IF NOT EXISTS sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id VARCHAR(50) NOT NULL,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  success BOOLEAN NOT NULL,
  records_retrieved INTEGER DEFAULT 0,
  records_saved INTEGER DEFAULT 0,
  error_message TEXT,
  
  CONSTRAINT fk_machine FOREIGN KEY (machine_id) 
    REFERENCES machine_config(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sync_log_machine ON sync_log(machine_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_started_at ON sync_log(started_at DESC);

-- ============================================
-- 4. Create Dual-Mode Attendance Table
-- ============================================
CREATE TABLE IF NOT EXISTS dual_mode_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id VARCHAR(50) NOT NULL,
  person_type VARCHAR(10) NOT NULL CHECK (person_type IN ('student', 'staff')),
  date DATE NOT NULL,
  status VARCHAR(10) NOT NULL CHECK (status IN ('present', 'absent', 'late')),
  source_type VARCHAR(10) NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual', 'machine')),
  source_user_id VARCHAR(50),
  source_machine_ip VARCHAR(45),
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_dual_attendance_person_date ON dual_mode_attendance(person_id, date);
CREATE INDEX IF NOT EXISTS idx_dual_attendance_date ON dual_mode_attendance(date);
CREATE INDEX IF NOT EXISTS idx_dual_attendance_source_type ON dual_mode_attendance(source_type);
CREATE INDEX IF NOT EXISTS idx_dual_attendance_person_type ON dual_mode_attendance(person_type);

-- ============================================
-- 5. Attendance Conflict Table
-- ============================================
CREATE TABLE IF NOT EXISTS attendance_conflict (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id VARCHAR(50) NOT NULL,
  person_type VARCHAR(10) NOT NULL CHECK (person_type IN ('student', 'staff')),
  date DATE NOT NULL,
  manual_record_id UUID NOT NULL,
  machine_record_id UUID NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  authoritative_record_id UUID,
  resolved_by VARCHAR(50),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT fk_manual_record FOREIGN KEY (manual_record_id) 
    REFERENCES dual_mode_attendance(id) ON DELETE CASCADE,
  CONSTRAINT fk_machine_record FOREIGN KEY (machine_record_id) 
    REFERENCES dual_mode_attendance(id) ON DELETE CASCADE,
  CONSTRAINT unique_conflict UNIQUE (person_id, date)
);

CREATE INDEX IF NOT EXISTS idx_conflict_unresolved ON attendance_conflict(resolved) WHERE resolved = false;

-- ============================================
-- 6. Attendance Audit Log Table
-- ============================================
CREATE TABLE IF NOT EXISTS attendance_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type VARCHAR(20) NOT NULL CHECK (operation_type IN ('manual_entry', 'machine_sync', 'status_update', 'conflict_resolution')),
  performed_by VARCHAR(50),
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  details JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON attendance_audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_operation ON attendance_audit_log(operation_type);

-- ============================================
-- 7. Insert Default Machine Configuration
-- ============================================
INSERT INTO machine_config (id, name, ip_address, port, enabled)
VALUES ('machine-001', 'AI06 Face Recognition - Main', '192.168.43.50', 4370, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 8. Comments
-- ============================================
COMMENT ON TABLE machine_config IS 'Configuration for AI06 Face Recognition Machines';
COMMENT ON TABLE user_machine_mapping IS 'Maps database person IDs to machine user IDs';
COMMENT ON TABLE sync_log IS 'Tracks machine synchronization operations';
COMMENT ON TABLE dual_mode_attendance IS 'Dual-mode attendance records for both students and staff';
COMMENT ON TABLE attendance_conflict IS 'Tracks conflicts between manual and machine attendance';
COMMENT ON TABLE attendance_audit_log IS 'Audit trail for all attendance operations';
