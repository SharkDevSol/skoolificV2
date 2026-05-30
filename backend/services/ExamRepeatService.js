/**
 * Exam Repeat Service
 * 
 * This service handles exam repeat functionality, allowing teachers to
 * republish exams to students who need to retake them.
 * 
 * @module ExamRepeatService
 */

class ExamRepeatService {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Repeat exam for selected students
   * 
   * @param {number} examId - The exam ID
   * @param {Array<number>} studentIds - Array of student IDs to repeat exam for
   * @param {Object} options - Repeat options
   * @param {string} options.reason - Reason for repeat
   * @param {number} options.teacherId - Teacher ID requesting repeat
   * @param {string} options.teacherName - Teacher name
   * @param {boolean} options.generateNew - Whether to generate new exam or reuse
   * @param {boolean} options.randomizeQuestions - Whether to randomize questions
   * @param {boolean} options.groupByType - Whether to group questions by type
   * @returns {Promise<Object>} - Repeat result
   */
  async repeatExam(examId, studentIds, options = {}) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Validate exam exists
      const examQuery = `
        SELECT * FROM ai_exams WHERE id = $1
      `;
      const examResult = await client.query(examQuery, [examId]);

      if (examResult.rows.length === 0) {
        throw new Error('Exam not found');
      }

      const exam = examResult.rows[0];

      // Validate students exist and are in the exam's class
      const studentsQuery = `
        SELECT id, first_name, last_name, student_id as student_code
        FROM students
        WHERE id = ANY($1) AND class_id = $2 AND status = 'active'
      `;
      const studentsResult = await client.query(studentsQuery, [studentIds, exam.class_id]);

      if (studentsResult.rows.length === 0) {
        throw new Error('No valid students found for repeat');
      }

      const validStudents = studentsResult.rows;

      // Reset marks for selected students
      const resetResults = await this.resetStudentMarks(
        client,
        examId,
        validStudents.map(s => s.id)
      );

      // Republish exam to selected students
      const republishResults = await this.republishExam(
        client,
        exam,
        validStudents,
        {
          randomizeQuestions: options.randomizeQuestions || false,
          groupByType: options.groupByType || false
        }
      );

      // Send notification to admin
      await this.sendAdminNotification(
        client,
        {
          examId,
          examTitle: exam.title,
          teacherId: options.teacherId,
          teacherName: options.teacherName,
          reason: options.reason,
          studentCount: validStudents.length,
          studentNames: validStudents.map(s => `${s.first_name} ${s.last_name}`).join(', ')
        }
      );

      // Log repeat action
      await this.logRepeatAction(
        client,
        {
          examId,
          teacherId: options.teacherId,
          studentIds: validStudents.map(s => s.id),
          reason: options.reason,
          generateNew: options.generateNew || false
        }
      );

      await client.query('COMMIT');

      return {
        success: true,
        message: 'Exam repeat successful',
        examId,
        studentsAffected: validStudents.length,
        students: validStudents,
        resetResults,
        republishResults
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error repeating exam:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Reset marks for students
   * 
   * @param {Object} client - Database client
   * @param {number} examId - The exam ID
   * @param {Array<number>} studentIds - Array of student IDs
   * @returns {Promise<Object>} - Reset results
   */
  async resetStudentMarks(client, examId, studentIds) {
    // Update student_exams to reset marks
    const resetQuery = `
      UPDATE student_exams
      SET
        status = 'not_started',
        answers = NULL,
        started_at = NULL,
        submitted_at = NULL,
        time_taken_minutes = NULL,
        earned_marks = 0,
        percentage = 0,
        grade = NULL,
        auto_graded = false,
        auto_graded_at = NULL,
        requires_manual_grading = false,
        manual_grading_completed = false,
        manually_graded_at = NULL,
        manually_graded_by = NULL,
        question_results = NULL,
        teacher_feedback = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE exam_id = $1 AND student_id = ANY($2)
      RETURNING id, student_id
    `;

    const resetResult = await client.query(resetQuery, [examId, studentIds]);

    // Remove from manual grading queue if present
    const removeQueueQuery = `
      DELETE FROM manual_grading_queue
      WHERE student_exam_id IN (
        SELECT id FROM student_exams
        WHERE exam_id = $1 AND student_id = ANY($2)
      )
    `;

    await client.query(removeQueueQuery, [examId, studentIds]);

    return {
      studentsReset: resetResult.rows.length,
      studentExamIds: resetResult.rows.map(r => r.id)
    };
  }

  /**
   * Republish exam to selected students
   * 
   * @param {Object} client - Database client
   * @param {Object} exam - Exam data
   * @param {Array} students - Array of student objects
   * @param {Object} options - Republish options
   * @returns {Promise<Object>} - Republish results
   */
  async republishExam(client, exam, students, options = {}) {
    const results = {
      studentsRepublished: 0,
      notifications: []
    };

    for (const student of students) {
      // Randomize questions if requested
      let questions = exam.questions;
      if (options.randomizeQuestions) {
        questions = this.randomizeQuestions(questions, options.groupByType);
      }

      // Update student_exam with new question order
      const updateQuery = `
        UPDATE student_exams
        SET
          status = 'not_started',
          updated_at = CURRENT_TIMESTAMP
        WHERE exam_id = $1 AND student_id = $2
      `;

      await client.query(updateQuery, [exam.id, student.id]);

      // Send notification to student
      await this.sendStudentNotification(
        client,
        {
          studentId: student.id,
          examId: exam.id,
          examTitle: exam.title,
          subjectId: exam.subject_id
        }
      );

      results.studentsRepublished++;
      results.notifications.push({
        studentId: student.id,
        studentName: `${student.first_name} ${student.last_name}`,
        notificationSent: true
      });
    }

    return results;
  }

  /**
   * Randomize questions
   * 
   * @param {Array} questions - Array of questions
   * @param {boolean} groupByType - Whether to group by type
   * @returns {Array} - Randomized questions
   */
  randomizeQuestions(questions, groupByType = false) {
    if (!questions || questions.length === 0) {
      return questions;
    }

    if (groupByType) {
      // Group questions by type
      const grouped = {};
      questions.forEach(q => {
        const type = q.questionType || 'other';
        if (!grouped[type]) {
          grouped[type] = [];
        }
        grouped[type].push(q);
      });

      // Shuffle within each group
      const shuffled = [];
      Object.keys(grouped).sort().forEach(type => {
        const group = this.shuffleArray(grouped[type]);
        shuffled.push(...group);
      });

      return shuffled;
    } else {
      // Shuffle all questions
      return this.shuffleArray([...questions]);
    }
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
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
   * Send notification to student
   * 
   * @param {Object} client - Database client
   * @param {Object} data - Notification data
   * @returns {Promise<void>}
   */
  async sendStudentNotification(client, data) {
    // Get subject name
    const subjectQuery = `
      SELECT subject_name FROM subjects WHERE id = $1
    `;
    const subjectResult = await client.query(subjectQuery, [data.subjectId]);
    const subjectName = subjectResult.rows[0]?.subject_name || 'Unknown Subject';

    const notification = {
      type: 'exam_repeat',
      title: 'Exam Repeat Available',
      message: `You have been assigned to retake the ${data.examTitle} exam`,
      data: {
        examId: data.examId,
        examTitle: data.examTitle,
        subjectName: subjectName
      },
      timestamp: new Date().toISOString()
    };

    // Store notification in database
    const insertQuery = `
      INSERT INTO exam_result_notifications (
        user_id,
        user_type,
        notification_type,
        title,
        message,
        data
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `;

    await client.query(insertQuery, [
      data.studentId,
      'student',
      notification.type,
      notification.title,
      notification.message,
      JSON.stringify(notification.data)
    ]);
  }

  /**
   * Send notification to admin
   * 
   * @param {Object} client - Database client
   * @param {Object} data - Notification data
   * @returns {Promise<void>}
   */
  async sendAdminNotification(client, data) {
    const notification = {
      type: 'exam_repeat_request',
      title: 'Exam Repeat Request',
      message: `${data.teacherName} has requested exam repeat for ${data.studentCount} student(s)`,
      data: {
        examId: data.examId,
        examTitle: data.examTitle,
        teacherId: data.teacherId,
        teacherName: data.teacherName,
        reason: data.reason,
        studentCount: data.studentCount,
        studentNames: data.studentNames
      },
      timestamp: new Date().toISOString()
    };

    // Get all admin users
    const adminQuery = `
      SELECT id FROM users WHERE role = 'admin' OR role = 'super_admin'
    `;
    const adminResult = await client.query(adminQuery);

    // Send notification to each admin
    for (const admin of adminResult.rows) {
      const insertQuery = `
        INSERT INTO exam_result_notifications (
          user_id,
          user_type,
          notification_type,
          title,
          message,
          data
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `;

      await client.query(insertQuery, [
        admin.id,
        'admin',
        notification.type,
        notification.title,
        notification.message,
        JSON.stringify(notification.data)
      ]);
    }
  }

  /**
   * Log repeat action
   * 
   * @param {Object} client - Database client
   * @param {Object} data - Log data
   * @returns {Promise<void>}
   */
  async logRepeatAction(client, data) {
    // Create exam_repeat_log table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS exam_repeat_log (
        id SERIAL PRIMARY KEY,
        exam_id INTEGER NOT NULL,
        teacher_id INTEGER NOT NULL,
        student_ids INTEGER[] NOT NULL,
        reason TEXT,
        generate_new BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (exam_id) REFERENCES ai_exams(id) ON DELETE CASCADE
      )
    `);

    // Insert log entry
    const insertQuery = `
      INSERT INTO exam_repeat_log (
        exam_id,
        teacher_id,
        student_ids,
        reason,
        generate_new
      ) VALUES ($1, $2, $3, $4, $5)
    `;

    await client.query(insertQuery, [
      data.examId,
      data.teacherId,
      data.studentIds,
      data.reason,
      data.generateNew
    ]);
  }

  /**
   * Get repeat history for an exam
   * 
   * @param {number} examId - The exam ID
   * @returns {Promise<Array>} - Array of repeat log entries
   */
  async getRepeatHistory(examId) {
    const query = `
      SELECT 
        erl.*,
        u.username as teacher_name,
        ae.title as exam_title
      FROM exam_repeat_log erl
      LEFT JOIN users u ON erl.teacher_id = u.id
      LEFT JOIN ai_exams ae ON erl.exam_id = ae.id
      WHERE erl.exam_id = $1
      ORDER BY erl.created_at DESC
    `;

    const result = await this.pool.query(query, [examId]);
    return result.rows;
  }

  /**
   * Get students who have taken an exam
   * 
   * @param {number} examId - The exam ID
   * @returns {Promise<Array>} - Array of students with exam status
   */
  async getExamStudents(examId) {
    const query = `
      SELECT 
        s.id,
        s.first_name,
        s.last_name,
        s.student_id as student_code,
        se.status,
        se.percentage,
        se.grade,
        se.submitted_at
      FROM student_exams se
      JOIN students s ON se.student_id = s.id
      WHERE se.exam_id = $1
      ORDER BY s.last_name, s.first_name
    `;

    const result = await this.pool.query(query, [examId]);
    return result.rows;
  }
}

module.exports = ExamRepeatService;
