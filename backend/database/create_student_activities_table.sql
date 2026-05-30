-- Create student_activities table for report card
CREATE TABLE IF NOT EXISTS student_activities (
  id SERIAL PRIMARY KEY,
  class_name VARCHAR(50) NOT NULL,
  student_name VARCHAR(255) NOT NULL,
  term_number INTEGER NOT NULL CHECK (term_number IN (1, 2)),
  personal_hygiene VARCHAR(10),
  learning_materials_care VARCHAR(10),
  time_management VARCHAR(10),
  work_independently VARCHAR(10),
  obeys_rules VARCHAR(10),
  overall_responsibility VARCHAR(10),
  social_relation VARCHAR(10),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(class_name, student_name, term_number)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_student_activities_class ON student_activities(class_name);
CREATE INDEX IF NOT EXISTS idx_student_activities_student ON student_activities(student_name);
CREATE INDEX IF NOT EXISTS idx_student_activities_term ON student_activities(term_number);

-- Add comment to table
COMMENT ON TABLE student_activities IS 'Stores student character and activity assessments for report cards';
COMMENT ON COLUMN student_activities.personal_hygiene IS 'Values: XC (Excellent), G (Good), SI (Improved), NI (Needs Improvement)';
COMMENT ON COLUMN student_activities.learning_materials_care IS 'Values: XC (Excellent), G (Good), SI (Improved), NI (Needs Improvement)';
COMMENT ON COLUMN student_activities.time_management IS 'Values: XC (Excellent), G (Good), SI (Improved), NI (Needs Improvement)';
COMMENT ON COLUMN student_activities.work_independently IS 'Values: XC (Excellent), G (Good), SI (Improved), NI (Needs Improvement)';
COMMENT ON COLUMN student_activities.obeys_rules IS 'Values: XC (Excellent), G (Good), SI (Improved), NI (Needs Improvement)';
COMMENT ON COLUMN student_activities.overall_responsibility IS 'Values: XC (Excellent), G (Good), SI (Improved), NI (Needs Improvement)';
COMMENT ON COLUMN student_activities.social_relation IS 'Values: XC (Excellent), G (Good), SI (Improved), NI (Needs Improvement)';
