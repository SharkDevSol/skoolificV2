/**
 * Exam Publishing Service
 * 
 * This service handles the publishing of AI-generated exams to students.
 * It manages exam distribution, question randomization, and student exam record creation.
 * 
 * Features:
 * - Publish exams to all students in a class
 * - Randomize question order per student
 * - Group questions by type
 * - Create student_exams records
 * - Send notifications to students
 * 
 * @module ExamPublishingService
 */

class ExamPublishingService {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Publish an exam to all students in a class
   * 
   * @param {number} examId - The exam ID to publish
   * @param {Object} options - Publishing options
   * @param {boolean} options.randomizeQuestions - Whether to randomize question order
   * @param {boolean} options.groupByType - Whether to group questions by type
   * @param {boolean} options.sendNotifications - Whether to send notifications
   * @returns {Promise<Object>} - Publishing result
   */
  async publishExam(examId, options = {}) {
    const {
      randomizeQuestions = true,
      groupByType = true,
      sendNotifications = true
    } = options;

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get exam details
      const examQuery = `
        SELECT * FROM ai_exams 
        WHERE id = $1 AND status = 'draft'
      `;
      const examResult = await client.query(examQuery, [examId]);

      if (examResult.rows.length === 0) {
        throw new Error('Exam not found or already published');
      }

      const exam = examResult.rows[0];

      // Get all students in the class
      const studentsQuery = `
        SELECT id, first_name, last_name, phone_number
        FROM students
        WHERE class_id = $1 AND status = 'active'
        ORDER BY last_name, first_name
      `;
      const studentsResult = await client.query(studentsQuery, [exam.class_id]);

      if (studentsResult.rows.length === 0) {
        throw new Error('No active students found in the class');
      }

      const students = studentsResult.rows;

      // Process questions for each student
      const studentExamRecords = [];
      for (const student of students) {
        // Get questions for this student
        let studentQuestions = JSON.parse(JSON.stringify(exam.questions)); // Deep copy

        // Group by type if requested
        if (groupByType) {
          studentQuestions = this.groupByType(studentQuestions);
        }

        // Randomize questions if requested
        if (randomizeQuestions) {
          studentQuestions = this.randomizeQuestions(studentQuestions, groupByType);
        }

        // Create student_exams record
        const insertQuery = `
          INSERT INTO student_exams (
            exam_id,
            student_id,
            attempt_number,
            status,
            answers,
            started_at,
            submitted_at,
            time_taken_minutes,
            total_marks,
            earned_marks,
            percentage,
            grade,
            auto_graded,
            auto_graded_at,
            requires_manual_grading,
            manual_grading_completed,
            question_results,
            teacher_feedback
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
          ON CONFLICT (exam_id, student_id, attempt_number) DO NOTHING
          RETURNING id
        `;

        const insertValues = [
          examId,
          student.id,
          1, // attempt_number
          'not_started', // status
          null, // answers (empty initially)
          null, // started_at
          null, // submitted_at
          null, // time_taken_minutes
          exam.total_marks,
          null, // earned_marks
          null, // percentage
          null, // grade
          false, // auto_graded
          null, // auto_graded_at
          false, // requires_manual_grading
          false, // manual_grading_completed
          null, // question_results
          null // teacher_feedback
        ];

        const insertResult = await client.query(insertQuery, insertValues);

        if (insertResult.rows.length > 0) {
          studentExamRecords.push({
            studentExamId: insertResult.rows[0].id,
            studentId: student.id,
            studentName: `${student.first_name} ${student.last_name}`,
            phoneNumber: student.phone_number,
            questions: studentQuestions
          });
        }
      }

      // Update exam status to published
      const updateExamQuery = `
        UPDATE ai_exams
        SET 
          status = 'published',
          published_at = CURRENT_TIMESTAMP,
          published_by = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;

      const updateResult = await client.query(updateExamQuery, [
        exam.teacher_id,
        examId
      ]);

      const publishedExam = updateResult.rows[0];

      await client.query('COMMIT');

      // Send notifications if requested
      if (sendNotifications && studentExamRecords.length > 0) {
        try {
          await this.sendPublishNotifications(
            publishedExam,
            studentExamRecords,
            client
          );
        } catch (notificationError) {
          console.error('Error sending notifications:', notificationError);
          // Don't fail the publishing if notifications fail
        }
      }

      return {
        success: true,
        message: 'Exam published successfully',
        examId: publishedExam.id,
        examTitle: publishedExam.title,
        studentsCount: studentExamRecords.length,
        publishedAt: publishedExam.published_at,
        studentExamRecords: studentExamRecords.map(r => ({
          studentExamId: r.studentExamId,
          studentId: r.studentId,
          studentName: r.studentName
        }))
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error publishing exam:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Randomize questions while optionally maintaining type groups
   * 
   * @param {Array} questions - Array of questions
   * @param {boolean} maintainGroups - Whether to maintain type groups
   * @returns {Array} - Randomized questions
   */
  randomizeQuestions(questions, maintainGroups = true) {
    if (!maintainGroups) {
      // Simple shuffle of all questions
      return this.shuffleArray([...questions]);
    }

    // Group questions by type
    const grouped = this.groupByType(questions);

    // Shuffle questions within each group
    const shuffledGroups = grouped.map(group => ({
      ...group,
      questions: this.shuffleArray([...group.questions])
    }));

    // Flatten back to array
    return shuffledGroups.flatMap(group => group.questions);
  }

  /**
   * Group questions by type
   * 
   * @param {Array} questions - Array of questions
   * @returns {Array} - Grouped questions
   */
  groupByType(questions) {
    // Create a map of question types
    const typeMap = new Map();

    questions.forEach(question => {
      const type = question.type;
      if (!typeMap.has(type)) {
        typeMap.set(type, []);
      }
      typeMap.get(type).push(question);
    });

    // Convert map to array of groups
    const groups = [];
    typeMap.forEach((questions, type) => {
      groups.push({
        type,
        questions
      });
    });

    // Sort groups by type name for consistency
    groups.sort((a, b) => a.type.localeCompare(b.type));

    // Return flattened array
    return groups.flatMap(group => group.questions);
  }

  /**
   * Shuffle an array using Fisher-Yates algorithm
   * 
   * @param {Array} array - Array to shuffle
   * @returns {Array} - Shuffled array
   */
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Send publish notifications to students
   * 
   * @param {Object} exam - The published exam
   * @param {Array} studentExamRecords - Array of student exam records
   * @param {Object} client - Database client
   * @returns {Promise<void>}
   */
  async sendPublishNotifications(exam, studentExamRecords, client) {
    // Create notifications table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS exam_publish_notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('student', 'guardian', 'teacher')),
        notification_type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        data JSONB,
        read BOOLEAN DEFAULT false,
        read_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index if it doesn't exist
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_exam_publish_notifications_user 
      ON exam_publish_notifications(user_id, user_type, read)
    `);

    // Create notifications for each student
    for (const record of studentExamRecords) {
      const notification = {
        type: 'exam_published',
        title: 'New Exam Available',
        message: `${exam.title} is now available`,
        data: {
          examId: exam.id,
          examTitle: exam.title,
          subjectId: exam.subject_id,
          classId: exam.class_id,
          term: exam.term,
          component: exam.component,
          totalMarks: exam.total_marks,
          timeLimitMinutes: exam.time_limit_minutes,
          difficultyLevel: exam.difficulty_level,
          language: exam.language,
          publishedAt: exam.published_at,
          studentExamId: record.studentExamId
        },
        timestamp: new Date().toISOString()
      };

      // Insert notification
      const query = `
        INSERT INTO exam_publish_notifications (
          user_id,
          user_type,
          notification_type,
          title,
          message,
          data
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `;

      await client.query(query, [
        record.studentId,
        'student',
        notification.type,
        notification.title,
        notification.message,
        JSON.stringify(notification.data)
      ]);
    }

    // TODO: Send push notifications when Phase 5 is implemented
    // await this.sendPushNotifications(studentExamRecords, exam);
  }

  /**
   * Get published exams for a student
   * 
   * @param {number} studentId - The student ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} - Array of published exams
   */
  async getPublishedExamsForStudent(studentId, filters = {}) {
    const { status, term, subjectId } = filters;

    let query = `
      SELECT 
        se.id as student_exam_id,
        se.exam_id,
        se.attempt_number,
        se.status,
        se.started_at,
        se.submitted_at,
        se.time_taken_minutes,
        se.total_marks,
        se.earned_marks,
        se.percentage,
        se.grade,
        ae.title as exam_title,
        ae.description,
        ae.subject_id,
        ae.term,
        ae.component,
        ae.time_limit_minutes,
        ae.difficulty_level,
        ae.language,
        ae.question_count,
        ae.published_at,
        sub.subject_name
      FROM student_exams se
      JOIN ai_exams ae ON se.exam_id = ae.id
      JOIN subjects sub ON ae.subject_id = sub.id
      WHERE se.student_id = $1 AND ae.status = 'published'
    `;

    const params = [studentId];
    let paramCount = 2;

    if (status) {
      query += ` AND se.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (term) {
      query += ` AND ae.term = $${paramCount}`;
      params.push(term);
      paramCount++;
    }

    if (subjectId) {
      query += ` AND ae.subject_id = $${paramCount}`;
      params.push(subjectId);
      paramCount++;
    }

    query += ` ORDER BY ae.published_at DESC, ae.title ASC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  /**
   * Get exam details for a student
   * 
   * @param {number} studentExamId - The student exam ID
   * @returns {Promise<Object>} - Exam details with questions
   */
  async getExamForStudent(studentExamId) {
    const query = `
      SELECT 
        se.*,
        ae.title as exam_title,
        ae.description,
        ae.questions,
        ae.time_limit_minutes,
        ae.difficulty_level,
        ae.language,
        ae.subject_id,
        ae.class_id,
        ae.term,
        ae.component,
        sub.subject_name
      FROM student_exams se
      JOIN ai_exams ae ON se.exam_id = ae.id
      JOIN subjects sub ON ae.subject_id = sub.id
      WHERE se.id = $1
    `;

    const result = await this.pool.query(query, [studentExamId]);

    if (result.rows.length === 0) {
      throw new Error('Student exam not found');
    }

    return result.rows[0];
  }

  /**
   * Start an exam for a student
   * 
   * @param {number} studentExamId - The student exam ID
   * @returns {Promise<Object>} - Updated student exam record
   */
  async startExam(studentExamId) {
    const query = `
      UPDATE student_exams
      SET 
        status = 'in_progress',
        started_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND status = 'not_started'
      RETURNING *
    `;

    const result = await this.pool.query(query, [studentExamId]);

    if (result.rows.length === 0) {
      throw new Error('Student exam not found or already started');
    }

    return result.rows[0];
  }

  /**
   * Submit exam answers
   * 
   * @param {number} studentExamId - The student exam ID
   * @param {Object} answers - Student answers
   * @returns {Promise<Object>} - Submission result
   */
  async submitExam(studentExamId, answers) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get student exam
      const getExamQuery = `
        SELECT * FROM student_exams WHERE id = $1
      `;
      const examResult = await client.query(getExamQuery, [studentExamId]);

      if (examResult.rows.length === 0) {
        throw new Error('Student exam not found');
      }

      const studentExam = examResult.rows[0];

      if (studentExam.status !== 'in_progress') {
        throw new Error('Exam is not in progress');
      }

      // Calculate time taken
      const startTime = new Date(studentExam.started_at);
      const endTime = new Date();
      const timeTakenMinutes = Math.round((endTime - startTime) / 1000 / 60);

      // Update student exam with answers
      const updateQuery = `
        UPDATE student_exams
        SET 
          status = 'submitted',
          answers = $1,
          submitted_at = CURRENT_TIMESTAMP,
          time_taken_minutes = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `;

      const updateResult = await client.query(updateQuery, [
        JSON.stringify(answers),
        timeTakenMinutes,
        studentExamId
      ]);

      await client.query('COMMIT');

      return {
        success: true,
        message: 'Exam submitted successfully',
        studentExam: updateResult.rows[0]
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error submitting exam:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Auto-submit exam when time expires
   * 
   * @param {number} studentExamId - The student exam ID
   * @param {Object} answers - Current answers (may be incomplete)
   * @returns {Promise<Object>} - Submission result
   */
  async autoSubmitExam(studentExamId, answers) {
    // Same as submitExam but with auto-submit flag
    const result = await this.submitExam(studentExamId, answers);
    
    // Add auto-submit flag to the result
    result.autoSubmitted = true;
    result.message = 'Exam auto-submitted due to time limit';

    return result;
  }

  /**
   * Unpublish an exam (for corrections or cancellation)
   * 
   * @param {number} examId - The exam ID
   * @param {string} reason - Reason for unpublishing
   * @returns {Promise<Object>} - Unpublish result
   */
  async unpublishExam(examId, reason = '') {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Check if any students have started or submitted
      const checkQuery = `
        SELECT COUNT(*) as count
        FROM student_exams
        WHERE exam_id = $1 AND status IN ('in_progress', 'submitted', 'graded')
      `;
      const checkResult = await client.query(checkQuery, [examId]);
      const activeCount = parseInt(checkResult.rows[0].count);

      if (activeCount > 0) {
        throw new Error(
          `Cannot unpublish exam: ${activeCount} student(s) have already started or submitted`
        );
      }

      // Update exam status
      const updateQuery = `
        UPDATE ai_exams
        SET 
          status = 'draft',
          published_at = NULL,
          published_by = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND status = 'published'
        RETURNING *
      `;

      const updateResult = await client.query(updateQuery, [examId]);

      if (updateResult.rows.length === 0) {
        throw new Error('Exam not found or not published');
      }

      // Delete student_exams records (only not_started)
      const deleteQuery = `
        DELETE FROM student_exams
        WHERE exam_id = $1 AND status = 'not_started'
      `;
      await client.query(deleteQuery, [examId]);

      await client.query('COMMIT');

      return {
        success: true,
        message: 'Exam unpublished successfully',
        exam: updateResult.rows[0],
        reason
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error unpublishing exam:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = ExamPublishingService;
