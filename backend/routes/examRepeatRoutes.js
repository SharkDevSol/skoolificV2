/**
 * Exam Repeat Routes
 * 
 * API endpoints for exam repeat functionality
 */

const express = require('express');
const router = express.Router();
const ExamRepeatService = require('../services/ExamRepeatService');

/**
 * POST /api/exams/:examId/repeat
 * Repeat exam for selected students
 * 
 * Body:
 * {
 *   studentIds: number[], // Array of student IDs or 'all' for entire class
 *   reason: string,
 *   teacherId: number,
 *   teacherName: string,
 *   generateNew: boolean, // Whether to generate new exam (future feature)
 *   randomizeQuestions: boolean,
 *   groupByType: boolean
 * }
 */
router.post('/:examId/repeat', async (req, res) => {
  try {
    const { examId } = req.params;
    const {
      studentIds,
      reason,
      teacherId,
      teacherName,
      generateNew,
      randomizeQuestions,
      groupByType
    } = req.body;

    // Validate required fields
    if (!studentIds || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Student IDs are required'
      });
    }

    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Reason for repeat is required'
      });
    }

    if (!teacherId || !teacherName) {
      return res.status(400).json({
        success: false,
        error: 'Teacher information is required'
      });
    }

    // Handle 'all' students case
    let finalStudentIds = studentIds;
    if (studentIds === 'all' || (Array.isArray(studentIds) && studentIds[0] === 'all')) {
      // Get all students for this exam
      const service = new ExamRepeatService(req.pool);
      const examStudents = await service.getExamStudents(examId);
      finalStudentIds = examStudents.map(s => s.id);
    }

    // Repeat exam
    const service = new ExamRepeatService(req.pool);
    const result = await service.repeatExam(
      parseInt(examId),
      finalStudentIds,
      {
        reason,
        teacherId,
        teacherName,
        generateNew: generateNew || false,
        randomizeQuestions: randomizeQuestions || false,
        groupByType: groupByType || false
      }
    );

    res.json({
      success: true,
      message: result.message,
      data: {
        examId: result.examId,
        studentsAffected: result.studentsAffected,
        students: result.students,
        resetResults: result.resetResults,
        republishResults: result.republishResults
      }
    });

  } catch (error) {
    console.error('Error repeating exam:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error while repeating exam'
    });
  }
});

/**
 * GET /api/exams/:examId/students
 * Get all students who have taken an exam
 */
router.get('/:examId/students', async (req, res) => {
  try {
    const { examId } = req.params;

    const service = new ExamRepeatService(req.pool);
    const students = await service.getExamStudents(examId);

    res.json({
      success: true,
      count: students.length,
      students
    });

  } catch (error) {
    console.error('Error fetching exam students:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching students'
    });
  }
});

/**
 * GET /api/exams/:examId/repeat-history
 * Get repeat history for an exam
 */
router.get('/:examId/repeat-history', async (req, res) => {
  try {
    const { examId } = req.params;

    const service = new ExamRepeatService(req.pool);
    const history = await service.getRepeatHistory(examId);

    res.json({
      success: true,
      count: history.length,
      history
    });

  } catch (error) {
    console.error('Error fetching repeat history:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching history'
    });
  }
});

module.exports = router;
