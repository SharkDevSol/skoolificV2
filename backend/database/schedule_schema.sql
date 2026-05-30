-- Schedule Schema Setup
-- Creates schedule_schema and school_config table for schedule configuration

-- Create schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS schedule_schema;

-- Create school_config table
CREATE TABLE IF NOT EXISTS schedule_schema.school_config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    periods_per_shift INTEGER NOT NULL DEFAULT 7,
    period_duration INTEGER NOT NULL DEFAULT 45,
    short_break_duration INTEGER NOT NULL DEFAULT 10,
    total_shifts INTEGER NOT NULL DEFAULT 2,
    teaching_days_per_week INTEGER NOT NULL DEFAULT 5,
    school_days INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_id CHECK (id = 1)
);

-- Insert default configuration if not exists
INSERT INTO schedule_schema.school_config 
    (id, periods_per_shift, period_duration, short_break_duration, total_shifts, teaching_days_per_week, school_days)
VALUES 
    (1, 7, 45, 10, 2, 5, '{1,2,3,4,5}')
ON CONFLICT (id) DO NOTHING;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_school_config_id ON schedule_schema.school_config(id);

COMMENT ON TABLE schedule_schema.school_config 
IS 'Stores school schedule configuration including periods, shifts, and school days';

COMMENT ON COLUMN schedule_schema.school_config.school_days 
IS 'Array of weekday numbers (1=Monday, 2=Tuesday, etc.)';
