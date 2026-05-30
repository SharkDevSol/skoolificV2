/**
 * Exam Grading Repository
 * 
 * This repository handles database operations for exam grading results.
 * It provides methods to save, retrieve, and update grading data for student exams.
 * 
 * @module ExamGradingRepository
 */

class ExamGradingRepository {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Save grading results to database
   * 
   * @param {number} examId - The exam ID
   * @param {number} studentId - The student ID
   * @param {Object} gradingResults - Results from AutoGradingService.gradeExam()
   * @param {Object} studentAnswers - The student's submitted answers
   * @param {Object} options - Additional options (attempt_number, started_at, etc.)
   * @returns {Promise<Object>} - Saved student exam record
   */
  async saveGradingResults(examId, studentId, gradingResults, studentAnswers, options = {}) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Calculate time taken if started_at is provided
      let timeTakenMinutes = null;
      if (options.started_at) {
        const startTime = new Date(options.started_at);
        const endTime = new Date();
        timeTakenMinutes = Math.round((endTime - startTime) / 1000 / 60);
      }

      // Determine grade based on percentage
      const grade = this.calculateGrade(gradingResults.percentage);

      // Insert or update student_exams record
      const studentExamQuery = `
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
          question_results
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (exam_id, student_id, attempt_number)
        DO UPDATE SET
          status = EXCLUDED.status,
          answers = EXCLUDED.answers,
          submitted_at = EXCLUDED.submitted_at,
          time_taken_minutes = EXCLUDED.time_taken_minutes,
          total_marks = EXCLUDED.total_marks,
          earned_marks = EXCLUDED.earned_marks,
          percentage = EXCLUDED.percentage,
          grade = EXCLUDED.grade,
          auto_graded = EXCLUDED.auto_graded,
          auto_graded_at = EXCLUDED.auto_graded_at,
          requires_manual_grading = EXCLUDED.requires_manual_grading,
          question_results = EXCLUDED.question_results,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;

      const studentExamValues = [
        examId,
        studentId,
        options.attempt_number || 1,
        gradingResults.requiresManualGrading ? 'submitted' : 'graded',
        JSON.stringify(studentAnswers),
        options.started_at || null,
        new Date(),
        timeTakenMinutes,
        gradingResults.totalMarks,
        gradingResults.earnedMarks,
        gradingResults.percentage,
        grade,
        true,
        new Date(),
        gradingResults.requiresManualGrading,
        JSON.stringify(gradingResults.questionResults)
      ];

      const studentExamResult = await client.query(studentExamQuery, studentExamValues);
      const studentExam = studentExamResult.rows[0];

      // If manual grading is required, add questions to manual grading queue
      if (gradingResults.requiresManualGrading) {
        await this.addToManualGradingQueue(
          client,
          studentExam.id,
          gradingResults.questionResults,
          studentAnswers
        );
      }

      // Update exam statistics
      await this.updateExamStatistics(client, examId);

      await client.query('COMMIT');

      return {
        success: true,
        studentExam,
        requiresManualGrading: gradingResults.requiresManualGrading,
        manualGradingCount: gradingResults.manualGradingRequired
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error saving grading results:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Add questions requiring manual grading to the queue
   * 
   * @param {Object} client - Database client
   * @param {number} studentExamId - The student exam ID
   * @param {Array} questionResults - Array of question results
   * @param {Object} studentAnswers - Student's answers
   * @returns {Promise<void>}
   */
  async addToManualGradingQueue(client, studentExamId, questionResults, studentAnswers) {
    const manualGradingQuestions = questionResults.filter(
      q => q.requiresManualGrading
    );

    for (const questionResult of manualGradingQuestions) {
      const query = `
        INSERT INTO manual_grading_queue (
          student_exam_id,
          question_id,
          question_type,
          question_data,
          student_answer,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT DO NOTHING
      `;

      const values = [
        studentExamId,
        questionResult.questionId,
        questionResult.questionType,
        JSON.stringify(questionResult),
        JSON.stringify(studentAnswers[questionResult.questionId]),
        'pending'
      ];

      await client.query(query, values);
    }
  }

  /**
   * Update exam statistics after grading
   * 
   * @param {Object} client - Database client
   * @param {number} examId - The exam ID
   * @returns {Promise<void>}
   */
  async updateExamStatistics(client, examId) {
    // Get all student exams for this exam
    const statsQuery = `
      SELECT
        COUNT(*) as total_students,
        COUNT(*) FILTER (WHERE status = 'submitted' OR status = 'graded') as submitted_count,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
        COUNT(*) FILTER (WHERE status = 'not_started') as not_started_count,
        AVG(percentage) FILTER (WHERE percentage IS NOT NULL) as average_score,
        MAX(percentage) as highest_score,
        MIN(percentage) FILTER (WHERE percentage IS NOT NULL) as lowest_score,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY percentage) as median_score,
        COUNT(*) FILTER (WHERE percentage >= 50) * 100.0 / NULLIF(COUNT(*) FILTER (WHERE percentage IS NOT NULL), 0) as pass_rate,
        COUNT(*) FILTER (WHERE auto_graded = true) as auto_graded_count,
        COUNT(*) FILTER (WHERE requires_manual_grading = true AND manual_grading_completed = false) as manual_grading_pending,
        COUNT(*) FILTER (WHERE status = 'graded') as fully_graded_count
      FROM student_exams
      WHERE exam_id = $1
    `;

    const statsResult = await client.query(statsQuery, [examId]);
    const stats = statsResult.rows[0];

    // Upsert exam statistics
    const upsertQuery = `
      INSERT INTO exam_statistics (
        exam_id,
        total_students,
        submitted_count,
        in_progress_count,
        not_started_count,
        average_score,
        highest_score,
        lowest_score,
        median_score,
        pass_rate,
        auto_graded_count,
        manual_grading_pending,
        fully_graded_count,
        last_updated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP)
      ON CONFLICT (exam_id)
      DO UPDATE SET
        total_students = EXCLUDED.total_students,
        submitted_count = EXCLUDED.submitted_count,
        in_progress_count = EXCLUDED.in_progress_count,
        not_started_count = EXCLUDED.not_started_count,
        average_score = EXCLUDED.average_score,
        highest_score = EXCLUDED.highest_score,
        lowest_score = EXCLUDED.lowest_score,
        median_score = EXCLUDED.median_score,
        pass_rate = EXCLUDED.pass_rate,
        auto_graded_count = EXCLUDED.auto_graded_count,
        manual_grading_pending = EXCLUDED.manual_grading_pending,
        fully_graded_count = EXCLUDED.fully_graded_count,
        last_updated = CURRENT_TIMESTAMP
    `;

    const upsertValues = [
      examId,
      parseInt(stats.total_students) || 0,
      parseInt(stats.submitted_count) || 0,
      parseInt(stats.in_progress_count) || 0,
      parseInt(stats.not_started_count) || 0,
      parseFloat(stats.average_score) || null,
      parseFloat(stats.highest_score) || null,
      parseFloat(stats.lowest_score) || null,
      parseFloat(stats.median_score) || null,
      parseFloat(stats.pass_rate) || null,
      parseInt(stats.auto_graded_count) || 0,
      parseInt(stats.manual_grading_pending) || 0,
      parseInt(stats.fully_graded_count) || 0
    ];

    await client.query(upsertQuery, upsertValues);
  }

  /**
   * Calculate letter grade from percentage
   * 
   * @param {number} percentage - The percentage score
   * @returns {string} - Letter grade (A, B, C, D, F)
   */
  calculateGrade(percentage) {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  }

  /**
   * Get grading results for a student exam
   * 
   * @param {number} examId - The exam ID
   * @param {number} studentId - The student ID
   * @param {number} attemptNumber - The attempt number (default: 1)
   * @returns {Promise<Object|null>} - Student exam record or null
   */
  async getGradingResults(examId, studentId, attemptNumber = 1) {
    const query = `
      SELECT * FROM student_exams
      WHERE exam_id = $1 AND student_id = $2 AND attempt_number = $3
    `;

    const result = await this.pool.query(query, [examId, studentId, attemptNumber]);
    return result.rows[0] || null;
  }

  /**
   * Get all grading results for an exam
   * 
   * @param {number} examId - The exam ID
   * @returns {Promise<Array>} - Array of student exam records
   */
  async getAllGradingResults(examId) {
    const query = `
      SELECT 
        se.*,
        s.first_name,
        s.last_name,
        s.student_id as student_code
      FROM student_exams se
      JOIN students s ON se.student_id = s.id
      WHERE se.exam_id = $1
      ORDER BY s.last_name, s.first_name
    `;

    const result = await this.pool.query(query, [examId]);
    return result.rows;
  }

  /**
   * Get exam statistics
   * 
   * @param {number} examId - The exam ID
   * @returns {Promise<Object|null>} - Exam statistics or null
   */
  async getExamStatistics(examId) {
    const query = `
      SELECT * FROM exam_statistics
      WHERE exam_id = $1
    `;

    const result = await this.pool.query(query, [examId]);
    return result.rows[0] || null;
  }

  /**
   * Get manual grading queue for a teacher
   * 
   * @param {number} teacherId - The teacher ID (optional)
   * @param {string} status - Filter by status (optional)
   * @returns {Promise<Array>} - Array of manual grading queue items
   */
  async getManualGradingQueue(teacherId = null, status = null) {
    let query = `
      SELECT 
        mgq.*,
        se.exam_id,
        se.student_id,
        s.first_name,
        s.last_name,
        s.student_id as student_code,
        ae.title as exam_title
      FROM manual_grading_queue mgq
      JOIN student_exams se ON mgq.student_exam_id = se.id
      JOIN students s ON se.student_id = s.id
      JOIN ai_exams ae ON se.exam_id = ae.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (teacherId) {
      query += ` AND ae.teacher_id = $${paramCount}`;
      params.push(teacherId);
      paramCount++;
    }

    if (status) {
      query += ` AND mgq.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ` ORDER BY mgq.created_at ASC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  /**
   * Update manual grading for a question
   * 
   * @param {number} queueId - The manual grading queue ID
   * @param {number} awardedMarks - The marks awarded by teacher
   * @param {string} feedback - Teacher feedback
   * @param {number} gradedBy - The teacher ID
   * @returns {Promise<Object>} - Updated queue item
   */
  async updateManualGrading(queueId, awardedMarks, feedback, gradedBy) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Update manual grading queue
      const updateQueueQuery = `
        UPDATE manual_grading_queue
        SET 
          status = 'completed',
          awarded_marks = $1,
          teacher_feedback = $2,
          graded_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `;

      const queueResult = await client.query(updateQueueQuery, [awardedMarks, feedback, queueId]);
      const queueItem = queueResult.rows[0];

      // Get student exam
      const studentExamQuery = `
        SELECT * FROM student_exams WHERE id = $1
      `;
      const studentExamResult = await client.query(studentExamQuery, [queueItem.student_exam_id]);
      const studentExam = studentExamResult.rows[0];

      // Update question result in student_exams
      const questionResults = studentExam.question_results;
      const questionIndex = questionResults.findIndex(q => q.questionId === queueItem.question_id);
      
      if (questionIndex !== -1) {
        questionResults[questionIndex].earnedMarks = awardedMarks;
        questionResults[questionIndex].manuallyGraded = true;
        questionResults[questionIndex].teacherFeedback = feedback;
      }

      // Recalculate total earned marks
      const totalEarnedMarks = questionResults.reduce((sum, q) => {
        return sum + (q.earnedMarks || 0);
      }, 0);

      const percentage = (totalEarnedMarks / studentExam.total_marks) * 100;
      const grade = this.calculateGrade(percentage);

      // Check if all manual grading is complete
      const pendingQuery = `
        SELECT COUNT(*) as pending_count
        FROM manual_grading_queue
        WHERE student_exam_id = $1 AND status != 'completed'
      `;
      const pendingResult = await client.query(pendingQuery, [queueItem.student_exam_id]);
      const allComplete = parseInt(pendingResult.rows[0].pending_count) === 0;

      // Update student exam
      const updateExamQuery = `
        UPDATE student_exams
        SET
          question_results = $1,
          earned_marks = $2,
          percentage = $3,
          grade = $4,
          manual_grading_completed = $5,
          manually_graded_at = CASE WHEN $5 = true THEN CURRENT_TIMESTAMP ELSE manually_graded_at END,
          manually_graded_by = $6,
          status = CASE WHEN $5 = true THEN 'graded' ELSE status END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
        RETURNING *
      `;

      const updateExamValues = [
        JSON.stringify(questionResults),
        totalEarnedMarks,
        percentage,
        grade,
        allComplete,
        gradedBy,
        queueItem.student_exam_id
      ];

      const updatedExamResult = await client.query(updateExamQuery, updateExamValues);

      // Update exam statistics
      await this.updateExamStatistics(client, studentExam.exam_id);

      await client.query('COMMIT');

      // If all manual grading is complete, send notifications to student and guardian
      if (allComplete) {
        try {
          const updatedExam = updatedExamResult.rows[0];
          const results = {
            totalMarks: updatedExam.total_marks,
            earnedMarks: updatedExam.earned_marks,
            percentage: updatedExam.percentage,
            requiresManualGrading: false
          };

          // Send to student
          await this.sendResultsToStudent(queueItem.student_exam_id, results);

          // Send to guardian
          await this.sendResultsToGuardian(queueItem.student_exam_id, results);
        } catch (notificationError) {
          // Log notification error but don't fail the grading
          console.error('Error sending notifications after manual grading:', notificationError);
        }
      }

      return {
        success: true,
        queueItem,
        studentExam: updatedExamResult.rows[0],
        allManualGradingComplete: allComplete
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating manual grading:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Send exam results to student app
   * 
   * @param {number} studentExamId - The student exam ID
   * @param {Object} results - Grading results
   * @returns {Promise<Object>} - Notification result
   */
  async sendResultsToStudent(studentExamId, results) {
    try {
      // Get student exam details
      const query = `
        SELECT 
          se.*,
          ae.title as exam_title,
          ae.subject_id,
          ae.class_id,
          s.id as student_id,
          s.first_name,
          s.last_name,
          s.phone_number,
          sub.subject_name
        FROM student_exams se
        JOIN ai_exams ae ON se.exam_id = ae.id
        JOIN students s ON se.student_id = s.id
        JOIN subjects sub ON ae.subject_id = sub.id
        WHERE se.id = $1
      `;

      const result = await this.pool.query(query, [studentExamId]);

      if (result.rows.length === 0) {
        throw new Error('Student exam not found');
      }

      const examData = result.rows[0];

      // Create notification payload
      const notification = {
        type: 'exam_result',
        title: 'Exam Results Available',
        message: `Your ${examData.exam_title} results are ready`,
        data: {
          studentExamId: studentExamId,
          examId: examData.exam_id,
          examTitle: examData.exam_title,
          subjectName: examData.subject_name,
          totalMarks: results.totalMarks,
          earnedMarks: results.earnedMarks,
          percentage: results.percentage,
          grade: examData.grade,
          requiresManualGrading: results.requiresManualGrading
        },
        timestamp: new Date().toISOString()
      };

      // Store notification in database for student app to fetch
      await this.storeNotification(
        examData.student_id,
        'student',
        notification
      );

      // TODO: Send push notification when Phase 5 (Notification System) is implemented
      // await this.sendPushNotification(examData.phone_number, notification);

      return {
        success: true,
        message: 'Results sent to student app',
        studentId: examData.student_id,
        notification
      };

    } catch (error) {
      console.error('Error sending results to student:', error);
      throw error;
    }
  }

  /**
   * Send exam results to guardian app
   * 
   * @param {number} studentExamId - The student exam ID
   * @param {Object} results - Grading results
   * @returns {Promise<Object>} - Notification result
   */
  async sendResultsToGuardian(studentExamId, results) {
    try {
      // Get student exam details and guardians
      const query = `
        SELECT 
          se.*,
          ae.title as exam_title,
          ae.subject_id,
          ae.class_id,
          s.id as student_id,
          s.first_name as student_first_name,
          s.last_name as student_last_name,
          sub.subject_name,
          g.id as guardian_id,
          g.first_name as guardian_first_name,
          g.last_name as guardian_last_name,
          g.phone_number as guardian_phone
        FROM student_exams se
        JOIN ai_exams ae ON se.exam_id = ae.id
        JOIN students s ON se.student_id = s.id
        JOIN subjects sub ON ae.subject_id = sub.id
        LEFT JOIN guardians g ON s.guardian_id = g.id
        WHERE se.id = $1
      `;

      const result = await this.pool.query(query, [studentExamId]);

      if (result.rows.length === 0) {
        throw new Error('Student exam not found');
      }

      const examData = result.rows[0];

      if (!examData.guardian_id) {
        return {
          success: false,
          message: 'No guardian found for student',
          studentId: examData.student_id
        };
      }

      // Create notification payload for guardian
      const notification = {
        type: 'ward_exam_result',
        title: 'Ward Exam Results Available',
        message: `${examData.student_first_name} ${examData.student_last_name}'s ${examData.exam_title} results are ready`,
        data: {
          studentExamId: studentExamId,
          examId: examData.exam_id,
          examTitle: examData.exam_title,
          subjectName: examData.subject_name,
          studentId: examData.student_id,
          studentName: `${examData.student_first_name} ${examData.student_last_name}`,
          totalMarks: results.totalMarks,
          earnedMarks: results.earnedMarks,
          percentage: results.percentage,
          grade: examData.grade,
          requiresManualGrading: results.requiresManualGrading
        },
        timestamp: new Date().toISOString()
      };

      // Store notification in database for guardian app to fetch
      await this.storeNotification(
        examData.guardian_id,
        'guardian',
        notification
      );

      // TODO: Send push notification when Phase 5 (Notification System) is implemented
      // await this.sendPushNotification(examData.guardian_phone, notification);

      return {
        success: true,
        message: 'Results sent to guardian app',
        guardianId: examData.guardian_id,
        studentId: examData.student_id,
        notification
      };

    } catch (error) {
      console.error('Error sending results to guardian:', error);
      throw error;
    }
  }

  /**
   * Get all guardians for a student
   * 
   * @param {number} studentId - The student ID
   * @returns {Promise<Array>} - Array of guardian records
   */
  async getStudentGuardians(studentId) {
    const query = `
      SELECT 
        g.id,
        g.first_name,
        g.last_name,
        g.phone_number,
        g.email,
        g.relationship
      FROM guardians g
      JOIN students s ON s.guardian_id = g.id
      WHERE s.id = $1
    `;

    const result = await this.pool.query(query, [studentId]);
    return result.rows;
  }

  /**
   * Store notification in database
   * 
   * @param {number} userId - User ID (student or guardian)
   * @param {string} userType - User type ('student' or 'guardian')
   * @param {Object} notification - Notification payload
   * @returns {Promise<void>}
   */
  async storeNotification(userId, userType, notification) {
    // Create notifications table if it doesn't exist
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS exam_result_notifications (
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
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_exam_result_notifications_user 
      ON exam_result_notifications(user_id, user_type, read)
    `);

    // Insert notification
    const query = `
      INSERT INTO exam_result_notifications (
        user_id,
        user_type,
        notification_type,
        title,
        message,
        data
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    await this.pool.query(query, [
      userId,
      userType,
      notification.type,
      notification.title,
      notification.message,
      JSON.stringify(notification.data)
    ]);
  }

  /**
   * Get unread notifications for a user
   * 
   * @param {number} userId - User ID
   * @param {string} userType - User type ('student' or 'guardian')
   * @returns {Promise<Array>} - Array of notifications
   */
  async getUnreadNotifications(userId, userType) {
    const query = `
      SELECT * FROM exam_result_notifications
      WHERE user_id = $1 AND user_type = $2 AND read = false
      ORDER BY created_at DESC
    `;

    const result = await this.pool.query(query, [userId, userType]);
    return result.rows;
  }

  /**
   * Mark notification as read
   * 
   * @param {number} notificationId - Notification ID
   * @returns {Promise<void>}
   */
  async markNotificationAsRead(notificationId) {
    const query = `
      UPDATE exam_result_notifications
      SET read = true, read_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    await this.pool.query(query, [notificationId]);
  }
}

module.exports = ExamGradingRepository;
