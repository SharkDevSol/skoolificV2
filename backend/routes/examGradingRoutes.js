/**
 * Exam Grading Routes
 * 
 * API endpoints for grading student exam submissions
 */

const express = require('express');
const router = express.Router();
const AutoGradingService = require('../services/AutoGradingService');
const ExamGradingRepository = require('../services/ExamGradingRepository');

/**
 * POST /api/exams/:examId/grade
 * Grade a student's exam submission
 * 
 * Body:
 * {
 *   studentId: number,
 *   answers: object,
 *   startedAt: string (ISO timestamp),
 *   attemptNumber: number (optional, default: 1)
 * }
 */
router.post('/:examId/grade', async (req, res) => {
  try {
    const { examId } = req.params;
    const { studentId, answers, startedAt, attemptNumber } = req.body;

    // Validate required fields
    if (!studentId || !answers) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: studentId and answers are required'
      });
    }

    // Get the exam from database
    const examQuery = `
      SELECT * FROM ai_exams WHERE id = $1 AND status = 'published'
    `;
    const examResult = await req.pool.query(examQuery, [examId]);

    if (examResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Exam not found or not published'
      });
    }

    const examData = examResult.rows[0];
    const exam = {
      id: examData.id,
      title: examData.title,
      questions: examData.questions
    };

    // Grade the exam using AutoGradingService
    const gradingService = new AutoGradingService();
    const gradingResults = gradingService.gradeExam(exam, answers, studentId, examId);

    if (!gradingResults.success) {
      return res.status(400).json({
        success: false,
        error: gradingResults.error || 'Grading failed'
      });
    }

    // Save grading results to database
    const repository = new ExamGradingRepository(req.pool);
    const saveResult = await repository.saveGradingResults(
      examId,
      studentId,
      gradingResults,
      answers,
      {
        started_at: startedAt,
        attempt_number: attemptNumber || 1
      }
    );

    // Send notifications to student and guardian apps
    try {
      // Send to student
      await repository.sendResultsToStudent(
        saveResult.studentExam.id,
        gradingResults
      );

      // Send to guardian
      await repository.sendResultsToGuardian(
        saveResult.studentExam.id,
        gradingResults
      );
    } catch (notificationError) {
      // Log notification error but don't fail the grading
      console.error('Error sending notifications:', notificationError);
    }

    res.json({
      success: true,
      message: 'Exam graded successfully',
      results: {
        studentExamId: saveResult.studentExam.id,
        totalMarks: gradingResults.totalMarks,
        earnedMarks: gradingResults.earnedMarks,
        percentage: gradingResults.percentage,
        grade: saveResult.studentExam.grade,
        requiresManualGrading: gradingResults.requiresManualGrading,
        manualGradingCount: gradingResults.manualGradingRequired,
        questionResults: gradingResults.questionResults
      }
    });

  } catch (error) {
    console.error('Error grading exam:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while grading exam'
    });
  }
});

/**
 * GET /api/exams/:examId/results/:studentId
 * Get grading results for a specific student
 */
router.get('/:examId/results/:studentId', async (req, res) => {
  try {
    const { examId, studentId } = req.params;
    const { attemptNumber } = req.query;

    const repository = new ExamGradingRepository(req.pool);
    const results = await repository.getGradingResults(
      examId,
      studentId,
      attemptNumber ? parseInt(attemptNumber) : 1
    );

    if (!results) {
      return res.status(404).json({
        success: false,
        error: 'Grading results not found'
      });
    }

    res.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Error fetching grading results:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching results'
    });
  }
});

/**
 * GET /api/exams/:examId/results
 * Get all grading results for an exam
 */
router.get('/:examId/results', async (req, res) => {
  try {
    const { examId } = req.params;

    const repository = new ExamGradingRepository(req.pool);
    const results = await repository.getAllGradingResults(examId);

    res.json({
      success: true,
      count: results.length,
      results
    });

  } catch (error) {
    console.error('Error fetching all grading results:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching results'
    });
  }
});

/**
 * GET /api/exams/:examId/statistics
 * Get exam statistics
 */
router.get('/:examId/statistics', async (req, res) => {
  try {
    const { examId } = req.params;

    const repository = new ExamGradingRepository(req.pool);
    const statistics = await repository.getExamStatistics(examId);

    if (!statistics) {
      return res.status(404).json({
        success: false,
        error: 'Statistics not found'
      });
    }

    res.json({
      success: true,
      statistics
    });

  } catch (error) {
    console.error('Error fetching exam statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching statistics'
    });
  }
});

/**
 * GET /api/exams/manual-grading/queue
 * Get manual grading queue for a teacher
 */
router.get('/manual-grading/queue', async (req, res) => {
  try {
    const { teacherId, status } = req.query;

    const repository = new ExamGradingRepository(req.pool);
    const queue = await repository.getManualGradingQueue(
      teacherId ? parseInt(teacherId) : null,
      status || null
    );

    res.json({
      success: true,
      count: queue.length,
      queue
    });

  } catch (error) {
    console.error('Error fetching manual grading queue:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching queue'
    });
  }
});

/**
 * PUT /api/exams/manual-grading/:queueId
 * Update manual grading for a question
 * 
 * Body:
 * {
 *   awardedMarks: number,
 *   feedback: string,
 *   gradedBy: number (teacher ID)
 * }
 */
router.put('/manual-grading/:queueId', async (req, res) => {
  try {
    const { queueId } = req.params;
    const { awardedMarks, feedback, gradedBy } = req.body;

    // Validate required fields
    if (awardedMarks === undefined || !gradedBy) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: awardedMarks and gradedBy are required'
      });
    }

    const repository = new ExamGradingRepository(req.pool);
    const result = await repository.updateManualGrading(
      queueId,
      awardedMarks,
      feedback || '',
      gradedBy
    );

    res.json({
      success: true,
      message: 'Manual grading updated successfully',
      result
    });

  } catch (error) {
    console.error('Error updating manual grading:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while updating manual grading'
    });
  }
});

/**
 * GET /api/exams/notifications/:userId
 * Get unread notifications for a user (student or guardian)
 * 
 * Query params:
 * - userType: 'student' or 'guardian'
 */
router.get('/notifications/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { userType } = req.query;

    if (!userType || !['student', 'guardian'].includes(userType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or missing userType. Must be "student" or "guardian"'
      });
    }

    const repository = new ExamGradingRepository(req.pool);
    const notifications = await repository.getUnreadNotifications(
      parseInt(userId),
      userType
    );

    res.json({
      success: true,
      count: notifications.length,
      notifications
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching notifications'
    });
  }
});

/**
 * PUT /api/exams/notifications/:notificationId/read
 * Mark a notification as read
 */
router.put('/notifications/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;

    const repository = new ExamGradingRepository(req.pool);
    await repository.markNotificationAsRead(parseInt(notificationId));

    res.json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while marking notification as read'
    });
  }
});

/**
 * POST /api/exams/:examId/send-results/:studentExamId
 * Manually trigger sending results to student and guardian
 * (useful for resending notifications)
 */
router.post('/:examId/send-results/:studentExamId', async (req, res) => {
  try {
    const { studentExamId } = req.params;

    const repository = new ExamGradingRepository(req.pool);
    
    // Get the student exam to get results
    const studentExam = await repository.getGradingResults(
      req.params.examId,
      req.body.studentId || null
    );

    if (!studentExam) {
      return res.status(404).json({
        success: false,
        error: 'Student exam not found'
      });
    }

    const results = {
      totalMarks: studentExam.total_marks,
      earnedMarks: studentExam.earned_marks,
      percentage: studentExam.percentage,
      requiresManualGrading: studentExam.requires_manual_grading
    };

    // Send to student
    const studentResult = await repository.sendResultsToStudent(
      parseInt(studentExamId),
      results
    );

    // Send to guardian
    const guardianResult = await repository.sendResultsToGuardian(
      parseInt(studentExamId),
      results
    );

    res.json({
      success: true,
      message: 'Results sent successfully',
      studentNotification: studentResult,
      guardianNotification: guardianResult
    });

  } catch (error) {
    console.error('Error sending results:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while sending results'
    });
  }
});

module.exports = router;
