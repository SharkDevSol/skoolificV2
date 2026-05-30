-- Migration 008: Create subjects table and teacher-subject assignments
-- Stores Task4 data: subjects and Task6 data: teacher-subject-class mappings

-- UP

-- Create subjects table
CREATE TABLE IF NOT EXISTS subjects (
  id SERIAL PRIMARY KEY,
  subject_code VARCHAR(20) UNIQUE NOT NULL,
  subject_name VARCHAR(100) NOT NULL,
  grade_level INTEGER, -- NULL means all grades
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create subject-class mapping table (which subjects are taught in which classes)
CREATE TABLE IF NOT EXISTS subject_class_mapping (
  id SERIAL PRIMARY KEY,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
  class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  academic_year VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(subject_id, class_id, academic_year)
);

-- Create teacher-subject-class assignment table (Task6 data)
CREATE TABLE IF NOT EXISTS teacher_subject_assignments (
  id SERIAL PRIMARY KEY,
  teacher_id INTEGER REFERENCES staff(id) ON DELETE CASCADE,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
  class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  academic_year VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(teacher_id, subject_id, class_id, academic_year)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subjects_grade ON subjects(grade_level);
CREATE INDEX IF NOT EXISTS idx_subjects_active ON subjects(is_active);
CREATE INDEX IF NOT EXISTS idx_subject_class_mapping_subject ON subject_class_mapping(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_class_mapping_class ON subject_class_mapping(class_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher ON teacher_subject_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_subject ON teacher_subject_assignments(subject_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_class ON teacher_subject_assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_year ON teacher_subject_assignments(academic_year);

-- Add triggers to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_subjects_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_subjects_timestamp
BEFORE UPDATE ON subjects
FOR EACH ROW
EXECUTE FUNCTION update_subjects_timestamp();

CREATE OR REPLACE FUNCTION update_teacher_assignments_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_teacher_assignments_timestamp
BEFORE UPDATE ON teacher_subject_assignments
FOR EACH ROW
EXECUTE FUNCTION update_teacher_assignments_timestamp();

COMMENT ON TABLE subjects IS 'Stores subject information from Task4';
COMMENT ON COLUMN subjects.subject_code IS 'Unique subject code (e.g., MATH101, ENG201)';
COMMENT ON COLUMN subjects.grade_level IS 'Grade level for subject, NULL means all grades';

COMMENT ON TABLE subject_class_mapping IS 'Maps which subjects are taught in which classes';

COMMENT ON TABLE teacher_subject_assignments IS 'Stores Task6 data - teacher assignments to subjects and classes';
COMMENT ON COLUMN teacher_subject_assignments.teacher_id IS 'Foreign key to staff table (must be staff_type = Teacher)';
COMMENT ON COLUMN teacher_subject_assignments.academic_year IS 'Academic year for this assignment (e.g., "2018/2019")';

-- DOWN
DROP TRIGGER IF EXISTS trigger_update_teacher_assignments_timestamp ON teacher_subject_assignments;
DROP FUNCTION IF EXISTS update_teacher_assignments_timestamp();
DROP TRIGGER IF EXISTS trigger_update_subjects_timestamp ON subjects;
DROP FUNCTION IF EXISTS update_subjects_timestamp();

DROP INDEX IF EXISTS idx_teacher_assignments_year;
DROP INDEX IF EXISTS idx_teacher_assignments_class;
DROP INDEX IF EXISTS idx_teacher_assignments_subject;
DROP INDEX IF EXISTS idx_teacher_assignments_teacher;
DROP INDEX IF EXISTS idx_subject_class_mapping_class;
DROP INDEX IF EXISTS idx_subject_class_mapping_subject;
DROP INDEX IF EXISTS idx_subjects_active;
DROP INDEX IF EXISTS idx_subjects_grade;

DROP TABLE IF EXISTS teacher_subject_assignments;
DROP TABLE IF EXISTS subject_class_mapping;
DROP TABLE IF EXISTS subjects;
