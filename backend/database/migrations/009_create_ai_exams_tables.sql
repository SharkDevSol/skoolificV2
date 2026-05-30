-- Migration 009: AI Exams and Student Exams Tables
-- This migration creates tables for AI-generated exams and student exam submissions

-- ============================================================================
-- AI Exams Table
-- Stores AI-generated exams created by teachers
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_exams (
    id SERIAL PRIMARY KEY,
    exam_code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Exam Configuration
    class_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    teacher_id INTEGER NOT NULL,
    term VARCHAR(50) NOT NULL,
    component VARCHAR(100),
    academic_year VARCHAR(20) NOT NULL,
    
    -- Exam Settings
    total_marks DECIMAL(10, 2) NOT NULL DEFAULT 0,
    time_limit_minutes INTEGER,
    difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('Easy', 'Medium', 'Hard')),
    language VARCHAR(20) DEFAULT 'English',
    
    -- Questions (stored as JSONB for flexibility)
    questions JSONB NOT NULL,
    question_count INTEGER NOT NULL DEFAULT 0,
    
    -- Question Type Distribution
    question_types JSONB,
    
    -- Status and Publishing
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    published_at TIMESTAMP,
    published_by INTEGER,
    
    -- AI Generation Metadata
    generated_by_ai BOOLEAN DEFAULT true,
    ai_model VARCHAR(50),
    generation_prompt TEXT,
    generation_metadata JSONB,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (teacher_id) REFERENCES staff(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

-- Indexes for ai_exams
CREATE INDEX idx_ai_exams_class ON ai_exams(class_id);
CREATE INDEX idx_ai_exams_subject ON ai_exams(subject_id);
CREATE INDEX idx_ai_exams_teacher ON ai_exams(teacher_id);
CREATE INDEX idx_ai_exams_status ON ai_exams(status);
CREATE INDEX idx_ai_exams_academic_year ON ai_exams(academic_year);
CREATE INDEX idx_ai_exams_term ON ai_exams(term);
CREATE INDEX idx_ai_exams_exam_code ON ai_exams(exam_code);

-- ============================================================================
-- Student Exams Table
-- Stores individual student exam submissions and results
-- ============================================================================
CREATE TABLE IF NOT EXISTS student_exams (
    id SERIAL PRIMARY KEY,
    exam_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    
    -- Exam Attempt
    attempt_number INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'submitted', 'graded', 'archived')),
    
    -- Student Answers (stored as JSONB)
    answers JSONB,
    
    -- Timing
    started_at TIMESTAMP,
    submitted_at TIMESTAMP,
    time_taken_minutes INTEGER,
    
    -- Grading Results
    total_marks DECIMAL(10, 2),
    earned_marks DECIMAL(10, 2),
    percentage DECIMAL(5, 2),
    grade VARCHAR(5),
    
    -- Auto-Grading Status
    auto_graded BOOLEAN DEFAULT false,
    auto_graded_at TIMESTAMP,
    requires_manual_grading BOOLEAN DEFAULT false,
    manual_grading_completed BOOLEAN DEFAULT false,
    manually_graded_at TIMESTAMP,
    manually_graded_by INTEGER,
    
    -- Question Results (detailed per-question results)
    question_results JSONB,
    
    -- Feedback
    teacher_feedback TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (exam_id) REFERENCES ai_exams(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (manually_graded_by) REFERENCES staff(id) ON DELETE SET NULL,
    
    -- Unique constraint: one active attempt per student per exam
    UNIQUE(exam_id, student_id, attempt_number)
);

-- Indexes for student_exams
CREATE INDEX idx_student_exams_exam ON student_exams(exam_id);
CREATE INDEX idx_student_exams_student ON student_exams(student_id);
CREATE INDEX idx_student_exams_status ON student_exams(status);
CREATE INDEX idx_student_exams_requires_manual_grading ON student_exams(requires_manual_grading);
CREATE INDEX idx_student_exams_submitted_at ON student_exams(submitted_at);

-- ============================================================================
-- Exam Statistics Table
-- Stores aggregated statistics for each exam
-- ============================================================================
CREATE TABLE IF NOT EXISTS exam_statistics (
    id SERIAL PRIMARY KEY,
    exam_id INTEGER NOT NULL UNIQUE,
    
    -- Participation Statistics
    total_students INTEGER DEFAULT 0,
    submitted_count INTEGER DEFAULT 0,
    in_progress_count INTEGER DEFAULT 0,
    not_started_count INTEGER DEFAULT 0,
    
    -- Score Statistics
    average_score DECIMAL(5, 2),
    highest_score DECIMAL(5, 2),
    lowest_score DECIMAL(5, 2),
    median_score DECIMAL(5, 2),
    pass_rate DECIMAL(5, 2),
    
    -- Question Statistics (per-question performance)
    question_statistics JSONB,
    
    -- Grading Status
    auto_graded_count INTEGER DEFAULT 0,
    manual_grading_pending INTEGER DEFAULT 0,
    fully_graded_count INTEGER DEFAULT 0,
    
    -- Timestamps
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Key
    FOREIGN KEY (exam_id) REFERENCES ai_exams(id) ON DELETE CASCADE
);

-- Index for exam_statistics
CREATE INDEX idx_exam_statistics_exam ON exam_statistics(exam_id);

-- ============================================================================
-- Manual Grading Queue Table
-- Tracks questions that require manual grading
-- ============================================================================
CREATE TABLE IF NOT EXISTS manual_grading_queue (
    id SERIAL PRIMARY KEY,
    student_exam_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    question_type VARCHAR(50) NOT NULL,
    
    -- Question and Answer
    question_data JSONB NOT NULL,
    student_answer JSONB NOT NULL,
    
    -- Grading Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    assigned_to INTEGER,
    
    -- Grading Results
    awarded_marks DECIMAL(10, 2),
    teacher_feedback TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    graded_at TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (student_exam_id) REFERENCES student_exams(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES staff(id) ON DELETE SET NULL
);

-- Indexes for manual_grading_queue
CREATE INDEX idx_manual_grading_queue_student_exam ON manual_grading_queue(student_exam_id);
CREATE INDEX idx_manual_grading_queue_status ON manual_grading_queue(status);
CREATE INDEX idx_manual_grading_queue_assigned_to ON manual_grading_queue(assigned_to);

-- ============================================================================
-- Triggers for automatic timestamp updates
-- ============================================================================

-- Update ai_exams updated_at
CREATE OR REPLACE FUNCTION update_ai_exams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ai_exams_updated_at
    BEFORE UPDATE ON ai_exams
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_exams_updated_at();

-- Update student_exams updated_at
CREATE OR REPLACE FUNCTION update_student_exams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_student_exams_updated_at
    BEFORE UPDATE ON student_exams
    FOR EACH ROW
    EXECUTE FUNCTION update_student_exams_updated_at();

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE ai_exams IS 'Stores AI-generated exams created by teachers using the Gemini API';
COMMENT ON TABLE student_exams IS 'Stores individual student exam submissions and grading results';
COMMENT ON TABLE exam_statistics IS 'Stores aggregated statistics for each exam';
COMMENT ON TABLE manual_grading_queue IS 'Tracks essay and short answer questions requiring manual grading';

COMMENT ON COLUMN ai_exams.questions IS 'JSONB array of question objects with all question data';
COMMENT ON COLUMN ai_exams.question_types IS 'JSONB object with count of each question type';
COMMENT ON COLUMN student_exams.answers IS 'JSONB object mapping question IDs to student answers';
COMMENT ON COLUMN student_exams.question_results IS 'JSONB array of per-question grading results';
COMMENT ON COLUMN exam_statistics.question_statistics IS 'JSONB array of statistics for each question';
