/**
 * Short Answer Question Handler
 * 
 * This handler provides validation and manual grading workflow for short answer questions
 * in the AI Test Generator system. Unlike other question types, short answer questions
 * CANNOT be auto-graded and require manual review by teachers.
 * 
 * Features:
 * - Validates short answer question structure against schema
 * - Marks questions for manual grading (does NOT auto-grade)
 * - Validates student answer format (non-empty string)
 * - Provides model answer and key points to teachers for grading reference
 * - Supports batch processing for multiple questions
 * - Generates analytics for question performance (after manual grading)
 * 
 * IMPORTANT: This handler does NOT assign marks automatically. All short answer
 * questions must be manually graded by teachers.
 */

const { shortAnswerSchema, validateQuestion } = require('../schemas/questionTypes');

class ShortAnswerHandler {
  /**
   * Validate a short answer question structure
   * @param {Object} question - The question object to validate
   * @returns {Object} - { valid: boolean, errors: Array<string> }
   */
  validate(question) {
    // First check if the question type is correct
    if (!question || question.type !== 'short_answer') {
      return {
        valid: false,
        errors: ['Question must be of type "short_answer"']
      };
    }

    // Use the schema validation function
    const validation = validateQuestion(question);
    
    return validation;
  }

  /**
   * Check if a student answer is valid (non-empty string)
   * @param {any} studentAnswer - The student's answer to validate
   * @returns {Object} - { valid: boolean, message: string }
   */
  isAnswerValid(studentAnswer) {
    if (studentAnswer === undefined || studentAnswer === null) {
      return {
        valid: false,
        message: 'Answer is required'
      };
    }

    if (typeof studentAnswer !== 'string') {
      return {
        valid: false,
        message: 'Answer must be a string'
      };
    }

    if (studentAnswer.trim().length === 0) {
      return {
        valid: false,
        message: 'Answer cannot be empty'
      };
    }

    return {
      valid: true,
      message: 'Answer is valid'
    };
  }

  /**
   * Grade a student's answer to a short answer question
   * 
   * IMPORTANT: This method does NOT auto-grade. It marks the question for manual grading.
   * Teachers must review the student answer against the model answer and key points.
   * 
   * @param {Object} question - The question object containing model answer and key points
   * @param {string} studentAnswer - The student's submitted answer
   * @returns {Object} - Grading result marked for manual review
   */
  grade(question, studentAnswer) {
    // Validate the question structure first
    const validation = this.validate(question);
    if (!validation.valid) {
      return {
        success: false,
        error: 'Invalid question structure',
        validationErrors: validation.errors,
        earnedMarks: null,
        totalMarks: question.marks || 0,
        requiresManualGrading: true,
        feedback: 'Question validation failed'
      };
    }

    // Validate student answer format
    const answerValidation = this.isAnswerValid(studentAnswer);
    if (!answerValidation.valid) {
      return {
        success: true,
        earnedMarks: null,
        totalMarks: question.marks,
        requiresManualGrading: true,
        isAnswered: false,
        feedback: answerValidation.message,
        studentAnswer: studentAnswer,
        modelAnswer: question.modelAnswer,
        keyPoints: question.keyPoints,
        explanation: question.explanation
      };
    }

    // Return result marked for manual grading
    return {
      success: true,
      earnedMarks: null, // Cannot auto-grade
      totalMarks: question.marks,
      requiresManualGrading: true,
      isAnswered: true,
      feedback: 'Pending manual grading by teacher',
      studentAnswer: studentAnswer,
      modelAnswer: question.modelAnswer,
      keyPoints: question.keyPoints,
      explanation: question.explanation
    };
  }

  /**
   * Grade multiple short answer questions at once
   * 
   * IMPORTANT: This method marks all questions for manual grading.
   * No automatic marks are assigned.
   * 
   * @param {Array<Object>} questions - Array of question objects
   * @param {Object} studentAnswers - Object mapping question IDs to student answers
   * @returns {Object} - Overall results with all questions marked for manual grading
   */
  gradeMultiple(questions, studentAnswers) {
    const results = {
      totalQuestions: 0,
      totalMarks: 0,
      earnedMarks: null, // Cannot auto-grade
      answeredCount: 0,
      unansweredCount: 0,
      requiresManualGrading: true,
      questionResults: []
    };

    // Filter only short answer questions
    const shortAnswerQuestions = questions.filter(q => q.type === 'short_answer');
    results.totalQuestions = shortAnswerQuestions.length;

    // Process each question
    shortAnswerQuestions.forEach(question => {
      const studentAnswer = studentAnswers[question.id];
      const gradeResult = this.grade(question, studentAnswer);

      // Count total marks
      results.totalMarks += gradeResult.totalMarks;

      // Count answered vs unanswered
      if (gradeResult.isAnswered) {
        results.answeredCount++;
      } else {
        results.unansweredCount++;
      }

      results.questionResults.push({
        questionId: question.id,
        ...gradeResult
      });
    });

    return results;
  }

  /**
   * Get question statistics for analytics
   * 
   * Note: This method analyzes manually graded results. It requires that
   * teachers have already assigned marks to student answers.
   * 
   * @param {Object} question - The question object
   * @param {Array<Object>} gradedResponses - Array of manually graded responses
   *   Each response should have: { studentAnswer: string, earnedMarks: number }
   * @returns {Object} - Statistics about the question performance
   */
  getQuestionStatistics(question, gradedResponses) {
    const stats = {
      questionId: question.id,
      totalResponses: gradedResponses.length,
      gradedCount: 0,
      ungradedCount: 0,
      averageScore: '0',
      averagePercentage: '0',
      scoreDistribution: {
        fullMarks: 0,
        threeQuarters: 0,
        half: 0,
        quarter: 0,
        zero: 0
      },
      modelAnswer: question.modelAnswer,
      keyPoints: question.keyPoints
    };

    if (gradedResponses.length === 0) {
      return stats;
    }

    let totalMarks = 0;
    let gradedCount = 0;

    // Analyze each response
    gradedResponses.forEach(response => {
      // Check if response has been graded
      if (response.earnedMarks === null || response.earnedMarks === undefined) {
        stats.ungradedCount++;
        return;
      }

      gradedCount++;
      const marks = response.earnedMarks;
      totalMarks += marks;

      // Calculate percentage for this response
      const percentage = (marks / question.marks) * 100;

      // Categorize into score distribution
      if (percentage === 100) {
        stats.scoreDistribution.fullMarks++;
      } else if (percentage >= 75) {
        stats.scoreDistribution.threeQuarters++;
      } else if (percentage >= 50) {
        stats.scoreDistribution.half++;
      } else if (percentage >= 25) {
        stats.scoreDistribution.quarter++;
      } else {
        stats.scoreDistribution.zero++;
      }
    });

    stats.gradedCount = gradedCount;

    // Calculate averages (only for graded responses)
    if (gradedCount > 0) {
      stats.averageScore = (totalMarks / gradedCount).toFixed(2);
      stats.averagePercentage = ((totalMarks / (question.marks * gradedCount)) * 100).toFixed(2);
    }

    return stats;
  }
}

module.exports = ShortAnswerHandler;
