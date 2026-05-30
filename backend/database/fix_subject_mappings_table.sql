-- Fix Subject Class Mappings Table
-- Removes foreign key constraint that may cause issues

-- Drop the foreign key constraint if it exists
DO $$ 
BEGIN
    -- Check if the constraint exists and drop it
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name LIKE '%subject_class_mappings%subject_name%fkey%'
          AND table_schema = 'subjects_of_school_schema'
          AND table_name = 'subject_class_mappings'
    ) THEN
        ALTER TABLE subjects_of_school_schema.subject_class_mappings 
        DROP CONSTRAINT IF EXISTS subject_class_mappings_subject_name_fkey;
    END IF;
END $$;

-- Recreate the table without foreign key constraint if needed
CREATE TABLE IF NOT EXISTS subjects_of_school_schema.subject_class_mappings (
    id SERIAL PRIMARY KEY,
    subject_name VARCHAR(100) NOT NULL,
    class_name VARCHAR(50) NOT NULL,
    subject_class VARCHAR(150) GENERATED ALWAYS AS (subject_name || ' Class ' || class_name) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(subject_name, class_name)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_subject_class_mappings_subject 
ON subjects_of_school_schema.subject_class_mappings(subject_name);

CREATE INDEX IF NOT EXISTS idx_subject_class_mappings_class 
ON subjects_of_school_schema.subject_class_mappings(class_name);

COMMENT ON TABLE subjects_of_school_schema.subject_class_mappings 
IS 'Maps subjects to classes - no foreign key to allow flexible subject management';
