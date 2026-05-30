/**
 * Database Index Creation Script
 * 
 * Creates indexes for improved query performance.
 * 
 * Phase 9.2: Database Query Optimization
 */

-- ============================================
-- STUDENTS TABLE INDEXES
-- ============================================

-- Index on class_id for filtering by class
CREATE INDEX IF NOT EXISTS idx_students_class_id ON classes_schema."GRADE10" (class_id);
CREATE INDEX IF NOT EXISTS idx_students_academic_year ON classes_schema."GRADE10" (academic_year);
CREATE INDEX IF NOT EXISTS idx_students_status ON classes_schema."GRADE10" (is_active);
CREATE INDEX IF NOT EXISTS idx_students_guardian_id ON classes_schema."GRADE10" (guardian_id);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_students_class_year ON classes_schema."GRADE10" (class_id, academic_year);
CREATE INDEX IF NOT EXISTS idx_students_active_class ON classes_schema."GRADE10" (is_active, class_id);

-- ============================================
-- ATTENDANCE TABLE INDEXES
-- ============================================

-- Index on student_id and date for attendance queries
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance_schema."week_2024_01_01" (student_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON attendance_schema."week_2024_01_01" (class_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_schema."week_2024_01_01" (date);

-- ============================================
-- MARKS TABLE INDEXES
-- ============================================

-- Index on student_id and subject_id for marks queries
CREATE INDEX IF NOT EXISTS idx_marks_student_subject ON marks_schema."GRADE10_TERM1" (student_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_marks_class_term ON marks_schema."GRADE10_TERM1" (class_id, term);
CREATE INDEX IF NOT EXISTS idx_marks_subject ON marks_schema."GRADE10_TERM1" (subject_id);

-- ============================================
-- EXAMS TABLE INDEXES
-- ============================================

-- Index on student_id, exam_id, and status
CREATE INDEX IF NOT EXISTS idx_student_exams_student ON student_exams (student_id);
CREATE INDEX IF NOT EXISTS idx_student_exams_exam ON student_exams (exam_id);
CREATE INDEX IF NOT EXISTS idx_student_exams_status ON student_exams (status);
CREATE INDEX IF NOT EXISTS idx_student_exams_student_status ON student_exams (student_id, status);

-- ============================================
-- PAYMENTS TABLE INDEXES
-- ============================================

-- Index on student_id, payment_date, and status
CREATE INDEX IF NOT EXISTS idx_payments_student ON monthly_payments (student_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON monthly_payments (payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON monthly_payments (payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_student_date ON monthly_payments (student_id, payment_date);

-- ============================================
-- STAFF TABLE INDEXES
-- ============================================

-- Index on role and status
CREATE INDEX IF NOT EXISTS idx_staff_role ON staff_users (role);
CREATE INDEX IF NOT EXISTS idx_staff_status ON staff_users (is_active);
CREATE INDEX IF NOT EXISTS idx_staff_role_status ON staff_users (role, is_active);

-- ============================================
-- GUARDIANS TABLE INDEXES
-- ============================================

-- Index on phone and username for lookups
CREATE INDEX IF NOT EXISTS idx_guardians_phone ON guardians (guardian_phone);
CREATE INDEX IF NOT EXISTS idx_guardians_username ON guardians (guardian_username);

-- ============================================
-- POSTS TABLE INDEXES
-- ============================================

-- Index on created_at for chronological queries
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts (author_id);

-- ============================================
-- NOTIFICATIONS TABLE INDEXES
-- ============================================

-- Index on user_id and created_at
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications_log (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications_log (sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications_log (user_id, sent_at DESC);

-- ============================================
-- CONVERSATIONS TABLE INDEXES
-- ============================================

-- Index on participants for chat queries
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations USING GIN (participants);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations (updated_at DESC);

-- ============================================
-- MESSAGES TABLE INDEXES
-- ============================================

-- Index on conversation_id and created_at
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages (conversation_id, created_at DESC);

-- ============================================
-- ANALYZE TABLES
-- ============================================

-- Update table statistics for query planner
ANALYZE classes_schema."GRADE10";
ANALYZE attendance_schema."week_2024_01_01";
ANALYZE marks_schema."GRADE10_TERM1";
ANALYZE student_exams;
ANALYZE monthly_payments;
ANALYZE staff_users;
ANALYZE guardians;
ANALYZE posts;
ANALYZE notifications_log;
ANALYZE conversations;
ANALYZE messages;

-- ============================================
-- VACUUM TABLES
-- ============================================

-- Reclaim storage and update statistics
VACUUM ANALYZE classes_schema."GRADE10";
VACUUM ANALYZE student_exams;
VACUUM ANALYZE monthly_payments;
VACUUM ANALYZE staff_users;
