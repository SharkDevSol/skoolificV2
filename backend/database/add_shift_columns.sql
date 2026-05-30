-- Add shift assignment columns to staff tables
-- This allows staff to be assigned to Shift 1, Shift 2, or Both

-- Add shift_assignment column to all staff schemas
DO $$
DECLARE
    staff_schema TEXT;
    tbl_name TEXT;
    staff_schemas TEXT[] := ARRAY['staff_teachers', 'staff_administrative_staff', 'staff_supportive_staff'];
BEGIN
    FOREACH staff_schema IN ARRAY staff_schemas
    LOOP
        -- Check if schema exists
        IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schemata.schema_name = staff_schema) THEN
            -- Get all tables in this schema
            FOR tbl_name IN 
                SELECT t.table_name 
                FROM information_schema.tables t
                WHERE t.table_schema = staff_schema 
                AND t.table_name != 'staff_counter'
            LOOP
                -- Check if column exists before adding
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_schema = staff_schema
                    AND table_name = tbl_name 
                    AND column_name = 'shift_assignment'
                ) THEN
                    EXECUTE format('ALTER TABLE %I.%I ADD COLUMN shift_assignment VARCHAR(20) DEFAULT ''shift1'' CHECK (shift_assignment IN (''shift1'', ''shift2'', ''both''))', staff_schema, tbl_name);
                    RAISE NOTICE 'Added shift_assignment column to %.%', staff_schema, tbl_name;
                ELSE
                    RAISE NOTICE 'Column shift_assignment already exists in %.%', staff_schema, tbl_name;
                END IF;
            END LOOP;
        ELSE
            RAISE NOTICE 'Schema % does not exist, skipping', staff_schema;
        END IF;
    END LOOP;
END $$;

-- Create shift time settings table
CREATE TABLE IF NOT EXISTS shift_time_settings (
    id SERIAL PRIMARY KEY,
    shift_name VARCHAR(20) NOT NULL UNIQUE CHECK (shift_name IN ('shift1', 'shift2')),
    check_in_time TIME NOT NULL DEFAULT '08:00',
    check_out_time TIME NOT NULL DEFAULT '17:00',
    late_threshold TIME NOT NULL DEFAULT '08:15',
    minimum_work_hours DECIMAL(4,2) NOT NULL DEFAULT 8.0,
    half_day_threshold DECIMAL(4,2) NOT NULL DEFAULT 4.0,
    grace_period_minutes INTEGER NOT NULL DEFAULT 15,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default shift times
INSERT INTO shift_time_settings (shift_name, check_in_time, check_out_time, late_threshold)
VALUES 
    ('shift1', '08:00', '17:00', '08:15'),
    ('shift2', '14:00', '22:00', '14:15')
ON CONFLICT (shift_name) DO NOTHING;

-- Add shift_type column to staff_attendance table to track which shift the attendance is for
ALTER TABLE staff_attendance 
ADD COLUMN IF NOT EXISTS shift_type VARCHAR(20) CHECK (shift_type IN ('shift1', 'shift2'));

-- Add shift_type column to dual_mode_attendance table
ALTER TABLE dual_mode_attendance 
ADD COLUMN IF NOT EXISTS shift_type VARCHAR(20) CHECK (shift_type IN ('shift1', 'shift2'));

COMMENT ON COLUMN staff_attendance.shift_type IS 'For staff with both shifts, indicates which shift this attendance record is for';
COMMENT ON TABLE shift_time_settings IS 'Time settings for each shift (Shift 1 and Shift 2)';
