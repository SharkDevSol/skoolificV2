-- Migration 010: Create marks tables for student assessments
-- Supports mark lists, student marks, and lock functionality

-- UP

-- Create mark lists table (templates for assessments)
CREATE TABLE IF NOT EXISTS mark_lists (
  id SERIAL PRIMARY KEY,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
  class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  term INTEGER NOT NULL,
  academic_year VARCHAR(20) NOT NULL,
  component_type VARCHAR(50) NOT NULL, -- 'test1', 'test2', 'final', 'assignment', 'project'
  total_marks INTEGER NOT NULL,
  is_locked BOOLEAN DEFAULT FALSE,
  locked_at TIMESTAMP,
  locked_by INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(subject_id, class_id, term, academic_year, component_type)
);

-- Create student marks table (actual marks for each student)
CREATE TABLE IF NOT EXISTS student_marks (
  id SERIAL PRIMARY KEY,
  mark_list_id INTEGER REFERENCES mark_lists(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  marks_obtained DECIMAL(5, 2),
  percentage DECIMAL(5, 2),
  grade VARCHAR(5), -- 'A', 'B', 'C', 'D', 'F'
  remarks TEXT,
  marked_by INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  marked_at TIMESTAMP,
  sync_status VARCHAR(20) DEFAULT 'synced',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_marks_sync_status CHECK (sync_status IN ('pending', 'syncing', 'synced', 'failed')),
  UNIQUE(mark_list_id, student_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mark_lists_subject ON mark_lists(subject_id);
CREATE INDEX IF NOT EXISTS idx_mark_lists_class ON mark_lists(class_id);
CREATE INDEX IF NOT EXISTS idx_mark_lists_teacher ON mark_lists(teacher_id);
CREATE INDEX IF NOT EXISTS idx_mark_lists_term ON mark_lists(term);
CREATE INDEX IF NOT EXISTS idx_mark_lists_year ON mark_lists(academic_year);
CREATE INDEX IF NOT EXISTS idx_mark_lists_locked ON mark_lists(is_locked);

CREATE INDEX IF NOT EXISTS idx_student_marks_list ON student_marks(mark_list_id);
CREATE INDEX IF NOT EXISTS idx_student_marks_student ON student_marks(student_id);
CREATE INDEX IF NOT EXISTS idx_student_marks_sync ON student_marks(sync_status);

-- Add triggers to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_mark_lists_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_mark_lists_timestamp
BEFORE UPDATE ON mark_lists
FOR EACH ROW
EXECUTE FUNCTION update_mark_lists_timestamp();

CREATE OR REPLACE FUNCTION update_student_marks_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_student_marks_timestamp
BEFORE UPDATE ON student_marks
FOR EACH ROW
EXECUTE FUNCTION update_student_marks_timestamp();

-- Add trigger to prevent editing locked mark lists
CREATE OR REPLACE FUNCTION prevent_locked_mark_list_edit()
RETURNS TRIGGER AS $$
DECLARE
  list_locked BOOLEAN;
BEGIN
  SELECT is_locked INTO list_locked
  FROM mark_lists
  WHERE id = NEW.mark_list_id;
  
  IF list_locked = TRUE THEN
    RAISE EXCEPTION 'Cannot modify marks for a locked mark list';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_locked_mark_list_edit
BEFORE INSERT OR UPDATE ON student_marks
FOR EACH ROW
EXECUTE FUNCTION prevent_locked_mark_list_edit();

COMMENT ON TABLE mark_lists IS 'Stores mark list templates for assessments (test1, test2, final, etc.)';
COMMENT ON COLUMN mark_lists.component_type IS 'Type of assessment: test1, test2, final, assignment, project';
COMMENT ON COLUMN mark_lists.is_locked IS 'TRUE if marks are locked and cannot be edited';
COMMENT ON COLUMN mark_lists.locked_at IS 'Timestamp when marks were locked';
COMMENT ON COLUMN mark_lists.locked_by IS 'Staff member who locked the marks';

COMMENT ON TABLE student_marks IS 'Stores actual marks obtained by students for each assessment';
COMMENT ON COLUMN student_marks.marks_obtained IS 'Marks obtained by student (out of total_marks in mark_list)';
COMMENT ON COLUMN student_marks.percentage IS 'Percentage calculated from marks_obtained';
COMMENT ON COLUMN student_marks.grade IS 'Letter grade (A, B, C, D, F)';
COMMENT ON COLUMN student_marks.sync_status IS 'Offline sync status: pending, syncing, synced, failed';

-- DOWN
DROP TRIGGER IF EXISTS trigger_prevent_locked_mark_list_edit ON student_marks;
DROP FUNCTION IF EXISTS prevent_locked_mark_list_edit();
DROP TRIGGER IF EXISTS trigger_update_student_marks_timestamp ON student_marks;
DROP FUNCTION IF EXISTS update_student_marks_timestamp();
DROP TRIGGER IF EXISTS trigger_update_mark_lists_timestamp ON mark_lists;
DROP FUNCTION IF EXISTS update_mark_lists_timestamp();

DROP INDEX IF EXISTS idx_student_marks_sync;
DROP INDEX IF EXISTS idx_student_marks_student;
DROP INDEX IF EXISTS idx_student_marks_list;
DROP INDEX IF EXISTS idx_mark_lists_locked;
DROP INDEX IF EXISTS idx_mark_lists_year;
DROP INDEX IF EXISTS idx_mark_lists_term;
DROP INDEX IF EXISTS idx_mark_lists_teacher;
DROP INDEX IF EXISTS idx_mark_lists_class;
DROP INDEX IF EXISTS idx_mark_lists_subject;

DROP TABLE IF EXISTS student_marks;
DROP TABLE IF EXISTS mark_lists;
