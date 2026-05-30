/**
 * Essay/Open-Ended Question Handler
 * 
 * This handler provides validation and manual grading workflow for essay questions
 * in the AI Test Generator system. Unlike auto-gradable question types, essay questions
 * CANNOT be auto-graded and require manual review by teachers using a rubric.
 * 
 * Features:
 * - Validates essay question structure against schema
 * - Marks questions for manual grading (does NOT auto-grade)
 * - Validates student answer format (non-empty string with minimum length)
 * - Provides model answer and rubric to teachers for grading reference
 * - Supports batch processing for multiple questions
 * - Generates analytics for question performance (after manual grading)
 * 
 * IMPORTANT: This handler does NOT assign marks automatically. All essay
 * questions must be manually graded by teachers using the provided rubric.
 */

const { essaySchema, validateQuestion } = require('../schemas/questionTypes');

class EssayHandler {
  /**
   * Validate an essay question structure
   * @param {Object} question - The question object to validate
   * @returns {Object} - { valid: boolean, errors: Array<string> }
   */
  validate(question) {
    // First check if the question type is correct
    if (!question || question.type !== 'essay') {
      return {
        valid: false,
        errors: ['Question must be of type "essay"']
      };
    }

    // Use the schema validation function
    const validation = validateQuestion(question);
    
    return validation;
  }

  /**
   * Check if a student answer is valid (non-empty string with minimum length)
   * Essays typically require more substantial answers than short answers
   * @param {any} studentAnswer - The student's answer to validate
   * @param {number} minLength - Minimum required length (default: 50 characters)
   * @returns {Object} - { valid: boolean, message: string }
   */
  isAnswerValid(studentAnswer, minLength = 50) {
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

    const trimmedAnswer = studentAnswer.trim();

    if (trimmedAnswer.length === 0) {
      return {
        valid: false,
        message: 'Answer cannot be empty'
      };
    }

    if (trimmedAnswer.length < minLength) {
      return {
        valid: false,
        message: `Answer must be at least ${minLength} characters (current: ${trimmedAnswer.length})`
      };
    }

    return {
      valid: true,
      message: 'Answer is valid'
    };
  }

  /**
   * Grade a student's answer to an essay question
   * 
   * IMPORTANT: This method does NOT auto-grade. It marks the question for manual grading.
   * Teachers must review the student answer against the model answer and rubric criteria.
   * 
   * @param {Object} question - The question object containing model answer and rubric
   * @param {string} studentAnswer - The student's submitted answer
   * @param {number} minLength - Minimum required answer length (default: 50)
   * @returns {Object} - Grading result marked for manual review
   */
  grade(question, studentAnswer, minLength = 50) {
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
    const answerValidation = this.isAnswerValid(studentAnswer, minLength);
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
        rubric: question.rubric,
        explanation: question.explanation
      };
    }

    // Return result marked for manual grading with rubric
    return {
      success: true,
      earnedMarks: null, // Cannot auto-grade
      totalMarks: question.marks,
      requiresManualGrading: true,
      isAnswered: true,
      feedback: 'Pending manual grading by teacher using rubric',
      studentAnswer: studentAnswer,
      modelAnswer: question.modelAnswer,
      rubric: question.rubric,
      explanation: question.explanation,
      wordCount: studentAnswer.trim().split(/\s+/).length
    };
  }

  /**
   * Grade multiple essay questions at once
   * 
   * IMPORTANT: This method marks all questions for manual grading.
   * No automatic marks are assigned.
   * 
   * @param {Array<Object>} questions - Array of question objects
   * @param {Object} studentAnswers - Object mapping question IDs to student answers
   * @param {number} minLength - Minimum required answer length (default: 50)
   * @returns {Object} - Overall results with all questions marked for manual grading
   */
  gradeMultiple(questions, studentAnswers, minLength = 50) {
    const results = {
      totalQuestions: 0,
      totalMarks: 0,
      earnedMarks: null, // Cannot auto-grade
      answeredCount: 0,
      unansweredCount: 0,
      requiresManualGrading: true,
      questionResults: []
    };

    // Filter only essay questions
    const essayQuestions = questions.filter(q => q.type === 'essay');
    results.totalQuestions = essayQuestions.length;

    // Process each question
    essayQuestions.forEach(question => {
      const studentAnswer = studentAnswers[question.id];
      const gradeResult = this.grade(question, studentAnswer, minLength);

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
   * teachers have already assigned marks to student answers using the rubric.
   * 
   * @param {Object} question - The question object
   * @param {Array<Object>} gradedResponses - Array of manually graded responses
   *   Each response should have: { studentAnswer: string, earnedMarks: number, rubricScores: Object }
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
      averageWordCount: '0',
      scoreDistribution: {
        fullMarks: 0,
        threeQuarters: 0,
        half: 0,
        quarter: 0,
        zero: 0
      },
      rubricStats: {},
      modelAnswer: question.modelAnswer,
      rubric: question.rubric
    };

    if (gradedResponses.length === 0) {
      return stats;
    }

    // Initialize rubric statistics
    if (question.rubric && Array.isArray(question.rubric)) {
      question.rubric.forEach(criterion => {
        stats.rubricStats[criterion.criterion] = {
          maxPoints: criterion.points,
          averageScore: '0',
          averagePercentage: '0'
        };
      });
    }

    let totalMarks = 0;
    let totalWordCount = 0;
    let gradedCount = 0;
    const rubricTotals = {};

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

      // Calculate word count if available
      if (response.studentAnswer && typeof response.studentAnswer === 'string') {
        const wordCount = response.studentAnswer.trim().split(/\s+/).length;
        totalWordCount += wordCount;
      }

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

      // Aggregate rubric scores if available
      if (response.rubricScores && typeof response.rubricScores === 'object') {
        Object.entries(response.rubricScores).forEach(([criterion, score]) => {
          if (!rubricTotals[criterion]) {
            rubricTotals[criterion] = 0;
          }
          rubricTotals[criterion] += score;
        });
      }
    });

    stats.gradedCount = gradedCount;

    // Calculate averages (only for graded responses)
    if (gradedCount > 0) {
      stats.averageScore = (totalMarks / gradedCount).toFixed(2);
      stats.averagePercentage = ((totalMarks / (question.marks * gradedCount)) * 100).toFixed(2);
      stats.averageWordCount = Math.round(totalWordCount / gradedCount).toString();

      // Calculate rubric averages
      Object.entries(rubricTotals).forEach(([criterion, total]) => {
        if (stats.rubricStats[criterion]) {
          const avgScore = total / gradedCount;
          stats.rubricStats[criterion].averageScore = avgScore.toFixed(2);
          stats.rubricStats[criterion].averagePercentage = 
            ((avgScore / stats.rubricStats[criterion].maxPoints) * 100).toFixed(2);
        }
      });
    }

    return stats;
  }

  /**
   * Validate rubric structure
   * Ensures rubric points sum to question marks
   * @param {Object} question - The question object with rubric
   * @returns {Object} - { valid: boolean, message: string, totalPoints: number }
   */
  validateRubric(question) {
    if (!question.rubric || !Array.isArray(question.rubric)) {
      return {
        valid: false,
        message: 'Rubric must be an array',
        totalPoints: 0
      };
    }

    if (question.rubric.length === 0) {
      return {
        valid: false,
        message: 'Rubric must contain at least one criterion',
        totalPoints: 0
      };
    }

    let totalPoints = 0;
    const errors = [];

    question.rubric.forEach((criterion, index) => {
      if (!criterion.criterion || typeof criterion.criterion !== 'string') {
        errors.push(`Rubric item ${index + 1}: criterion must be a non-empty string`);
      }
      if (typeof criterion.points !== 'number' || criterion.points <= 0) {
        errors.push(`Rubric item ${index + 1}: points must be a positive number`);
      } else {
        totalPoints += criterion.points;
      }
    });

    if (errors.length > 0) {
      return {
        valid: false,
        message: errors.join('; '),
        totalPoints
      };
    }

    // Check if rubric points sum to question marks (with small tolerance for floating point)
    const difference = Math.abs(totalPoints - question.marks);
    if (difference > 0.1) {
      return {
        valid: false,
        message: `Rubric points (${totalPoints}) must sum to question marks (${question.marks})`,
        totalPoints
      };
    }

    return {
      valid: true,
      message: 'Rubric is valid',
      totalPoints
    };
  }
}

module.exports = EssayHandler;
