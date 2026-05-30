/**
 * Exam Publishing Routes
 * 
 * API endpoints for publishing and managing exams for students
 */

const express = require('express');
const router = express.Router();
const ExamPublishingService = require('../services/ExamPublishingService');

/**
 * POST /api/exams/:examId/publish
 * Publish an exam to all students in the class
 * 
 * Body:
 * {
 *   randomizeQuestions: boolean (optional, default: true),
 *   groupByType: boolean (optional, default: true),
 *   sendNotifications: boolean (optional, default: true)
 * }
 */
router.post('/:examId/publish', async (req, res) => {
  try {
    const { examId } = req.params;
    const options = req.body || {};

    const publishingService = new ExamPublishingService(req.pool);
    const result = await publishingService.publishExam(parseInt(examId), options);

    res.json(result);

  } catch (error) {
    console.error('Error publishing exam:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error while publishing exam'
    });
  }
});

/**
 * POST /api/exams/:examId/unpublish
 * Unpublish an exam (only if no students have started)
 * 
 * Body:
 * {
 *   reason: string (optional)
 * }
 */
router.post('/:examId/unpublish', async (req, res) => {
  try {
    const { examId } = req.params;
    const { reason } = req.body;

    const publishingService = new ExamPublishingService(req.pool);
    const result = await publishingService.unpublishExam(parseInt(examId), reason);

    res.json(result);

  } catch (error) {
    console.error('Error unpublishing exam:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error while unpublishing exam'
    });
  }
});

/**
 * GET /api/exams/student/:studentId
 * Get all published exams for a student
 * 
 * Query params:
 * - status: filter by status (optional)
 * - term: filter by term (optional)
 * - subjectId: filter by subject (optional)
 */
router.get('/student/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { status, term, subjectId } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (term) filters.term = term;
    if (subjectId) filters.subjectId = parseInt(subjectId);

    const publishingService = new ExamPublishingService(req.pool);
    const exams = await publishingService.getPublishedExamsForStudent(
      parseInt(studentId),
      filters
    );

    res.json({
      success: true,
      count: exams.length,
      exams
    });

  } catch (error) {
    console.error('Error fetching student exams:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching exams'
    });
  }
});

/**
 * GET /api/exams/student-exam/:studentExamId
 * Get exam details for a student
 */
router.get('/student-exam/:studentExamId', async (req, res) => {
  try {
    const { studentExamId } = req.params;

    const publishingService = new ExamPublishingService(req.pool);
    const exam = await publishingService.getExamForStudent(parseInt(studentExamId));

    res.json({
      success: true,
      exam
    });

  } catch (error) {
    console.error('Error fetching exam details:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error while fetching exam'
    });
  }
});

/**
 * POST /api/exams/student-exam/:studentExamId/start
 * Start an exam for a student
 */
router.post('/student-exam/:studentExamId/start', async (req, res) => {
  try {
    const { studentExamId } = req.params;

    const publishingService = new ExamPublishingService(req.pool);
    const studentExam = await publishingService.startExam(parseInt(studentExamId));

    res.json({
      success: true,
      message: 'Exam started successfully',
      studentExam
    });

  } catch (error) {
    console.error('Error starting exam:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error while starting exam'
    });
  }
});

/**
 * POST /api/exams/student-exam/:studentExamId/submit
 * Submit exam answers
 * 
 * Body:
 * {
 *   answers: object (question ID -> answer mapping)
 * }
 */
router.post('/student-exam/:studentExamId/submit', async (req, res) => {
  try {
    const { studentExamId } = req.params;
    const { answers } = req.body;

    if (!answers) {
      return res.status(400).json({
        success: false,
        error: 'Answers are required'
      });
    }

    const publishingService = new ExamPublishingService(req.pool);
    const result = await publishingService.submitExam(
      parseInt(studentExamId),
      answers
    );

    res.json(result);

  } catch (error) {
    console.error('Error submitting exam:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error while submitting exam'
    });
  }
});

/**
 * POST /api/exams/student-exam/:studentExamId/auto-submit
 * Auto-submit exam when time expires
 * 
 * Body:
 * {
 *   answers: object (question ID -> answer mapping, may be incomplete)
 * }
 */
router.post('/student-exam/:studentExamId/auto-submit', async (req, res) => {
  try {
    const { studentExamId } = req.params;
    const { answers } = req.body;

    const publishingService = new ExamPublishingService(req.pool);
    const result = await publishingService.autoSubmitExam(
      parseInt(studentExamId),
      answers || {}
    );

    res.json(result);

  } catch (error) {
    console.error('Error auto-submitting exam:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error while auto-submitting exam'
    });
  }
});

module.exports = router;
