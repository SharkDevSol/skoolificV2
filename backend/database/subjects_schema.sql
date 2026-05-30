-- Subjects Schema Setup
-- Creates subjects_of_school_schema and required tables for subject management

-- Create schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS subjects_of_school_schema;

-- Create subjects table
CREATE TABLE IF NOT EXISTS subjects_of_school_schema.subjects (
    id SERIAL PRIMARY KEY,
    subject_name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create subject_class_mappings table for selective subject-class mappings
-- Note: No foreign key constraint to allow flexible subject management
CREATE TABLE IF NOT EXISTS subjects_of_school_schema.subject_class_mappings (
    id SERIAL PRIMARY KEY,
    subject_name VARCHAR(100) NOT NULL,
    class_name VARCHAR(50) NOT NULL,
    subject_class VARCHAR(150) GENERATED ALWAYS AS (subject_name || ' Class ' || class_name) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(subject_name, class_name)
);

-- Create teachers_subjects table for mapping teachers to subject-class combinations
CREATE TABLE IF NOT EXISTS subjects_of_school_schema.teachers_subjects (
    id SERIAL PRIMARY KEY,
    teacher_name VARCHAR(100) NOT NULL,
    subject_class VARCHAR(150) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(teacher_name, subject_class)
);

-- Create school_config table for storing term count
CREATE TABLE IF NOT EXISTS subjects_of_school_schema.school_config (
    id SERIAL PRIMARY KEY,
    term_count INTEGER NOT NULL DEFAULT 2,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default term count if not exists
INSERT INTO subjects_of_school_schema.school_config (id, term_count) 
VALUES (1, 2)
ON CONFLICT (id) DO NOTHING;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_subject_class_mappings_subject 
ON subjects_of_school_schema.subject_class_mappings(subject_name);

CREATE INDEX IF NOT EXISTS idx_subject_class_mappings_class 
ON subjects_of_school_schema.subject_class_mappings(class_name);

CREATE INDEX IF NOT EXISTS idx_teachers_subjects_teacher 
ON subjects_of_school_schema.teachers_subjects(teacher_name);

CREATE INDEX IF NOT EXISTS idx_teachers_subjects_subject_class 
ON subjects_of_school_schema.teachers_subjects(subject_class);

-- Add comments
COMMENT ON TABLE subjects_of_school_schema.subjects 
IS 'Stores all subjects available in the school';

COMMENT ON TABLE subjects_of_school_schema.subject_class_mappings 
IS 'Maps subjects to classes - no foreign key to allow flexible subject management';

COMMENT ON TABLE subjects_of_school_schema.teachers_subjects 
IS 'Maps teachers to subject-class combinations';

COMMENT ON TABLE subjects_of_school_schema.school_config 
IS 'Stores school configuration like term count';
