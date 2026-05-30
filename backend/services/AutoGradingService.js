/**
 * Auto-Grading Service for AI Test Generator
 * 
 * This service handles automatic grading of student exam submissions using
 * the question type handlers. It supports:
 * - Automatic grading for 7 question types
 * - Manual grading flagging for 2 question types (short answer, essay)
 * - Partial credit calculation
 * - Detailed feedback generation
 * - Statistics and analytics
 * 
 * @module AutoGradingService
 */

const MultipleChoiceHandler = require('../handlers/MultipleChoiceHandler');
const TrueFalseHandler = require('../handlers/TrueFalseHandler');
const MultipleTrueFalseHandler = require('../handlers/MultipleTrueFalseHandler');
const MatchingHandler = require('../handlers/MatchingHandler');
const NumericHandler = require('../handlers/NumericHandler');
const FillBlankHandler = require('../handlers/FillBlankHandler');
const ShortAnswerHandler = require('../handlers/ShortAnswerHandler');
const EssayHandler = require('../handlers/EssayHandler');
const TransformationHandler = require('../handlers/TransformationHandler');

class AutoGradingService {
  constructor() {
    // Initialize all question type handlers
    this.handlers = {
      multiple_choice: new MultipleChoiceHandler(),
      true_false: new TrueFalseHandler(),
      multiple_true_false: new MultipleTrueFalseHandler(),
      matching: new MatchingHandler(),
      numeric: new NumericHandler(),
      fill_blank: new FillBlankHandler(),
      short_answer: new ShortAnswerHandler(),
      essay: new EssayHandler(),
      transformation: new TransformationHandler()
    };
  }

  /**
   * Grade a complete exam submission
   * 
   * @param {Object} exam - The exam object with questions array
   * @param {Object} studentAnswers - Object mapping question IDs to student answers
   * @param {string} studentId - The student's ID
   * @param {string} examId - The exam's ID
   * @param {Object} options - Additional options (sendNotifications, repository)
   * @returns {Object} Grading results with marks, feedback, and statistics
   */
  gradeExam(exam, studentAnswers, studentId = null, examId = null, options = {}) {
    // Validate inputs
    if (!exam || !exam.questions || !Array.isArray(exam.questions)) {
      return {
        success: false,
        error: 'Invalid exam structure: exam must have a questions array'
      };
    }

    if (!studentAnswers || typeof studentAnswers !== 'object') {
      return {
        success: false,
        error: 'Invalid student answers: must be an object'
      };
    }

    // Initialize results
    const results = {
      success: true,
      studentId,
      examId,
      totalQuestions: exam.questions.length,
      totalMarks: 0,
      earnedMarks: 0,
      percentage: 0,
      autoGradedQuestions: 0,
      manualGradingRequired: 0,
      questionResults: [],
      requiresManualGrading: false,
      gradedAt: new Date().toISOString()
    };

    // Grade each question
    exam.questions.forEach((question) => {
      const studentAnswer = studentAnswers[question.id];
      const questionResult = this.gradeQuestion(question, studentAnswer);

      // Add question result to results
      results.questionResults.push({
        questionId: question.id,
        questionType: question.type,
        ...questionResult
      });

      // Update totals
      results.totalMarks += questionResult.totalMarks;
      
      if (questionResult.requiresManualGrading) {
        results.manualGradingRequired++;
        results.requiresManualGrading = true;
      } else {
        results.autoGradedQuestions++;
        results.earnedMarks += questionResult.earnedMarks || 0;
      }
    });

    // Calculate percentage (only for auto-graded questions)
    const autoGradedTotalMarks = results.questionResults
      .filter(q => !q.requiresManualGrading)
      .reduce((sum, q) => sum + q.totalMarks, 0);

    if (autoGradedTotalMarks > 0) {
      results.percentage = (results.earnedMarks / autoGradedTotalMarks) * 100;
    }

    // Round percentage to 2 decimal places
    results.percentage = Math.round(results.percentage * 100) / 100;

    return results;
  }

  /**
   * Grade a single question
   * 
   * @param {Object} question - The question object
   * @param {*} studentAnswer - The student's answer
   * @returns {Object} Grading result for the question
   */
  gradeQuestion(question, studentAnswer) {
    // Validate question
    if (!question || !question.type) {
      return {
        success: false,
        error: 'Invalid question: must have a type',
        totalMarks: question?.marks || 0,
        earnedMarks: 0
      };
    }

    // Get handler for question type
    const handler = this.handlers[question.type];
    
    if (!handler) {
      return {
        success: false,
        error: `Unsupported question type: ${question.type}`,
        totalMarks: question.marks || 0,
        earnedMarks: 0
      };
    }

    // Validate question structure
    const validation = handler.validate(question);
    if (!validation.valid) {
      return {
        success: false,
        error: `Question validation failed: ${validation.errors.join(', ')}`,
        totalMarks: question.marks || 0,
        earnedMarks: 0
      };
    }

    // Grade the question using the appropriate handler
    const result = handler.grade(question, studentAnswer);

    return result;
  }

  /**
   * Compare exact answers (for MCQ, True/False, Numeric)
   * This is a helper method that delegates to the appropriate handler
   * 
   * @param {*} correctAnswer - The correct answer
   * @param {*} studentAnswer - The student's answer
   * @param {string} questionType - The question type
   * @returns {boolean} True if answers match
   */
  compareExact(correctAnswer, studentAnswer, questionType = 'multiple_choice') {
    const handler = this.handlers[questionType];
    
    if (!handler) {
      return false;
    }

    // Create a minimal question object for comparison
    const question = {
      type: questionType,
      correctAnswer: correctAnswer,
      marks: 1,
      question: 'Test question for comparison purposes only',
      explanation: 'Test explanation for comparison purposes only'
    };

    // Add type-specific fields
    if (questionType === 'multiple_choice') {
      question.options = [correctAnswer, 'Other Option 1', 'Other Option 2'];
    } else if (questionType === 'true_false') {
      question.options = ['True', 'False'];
    }

    const result = handler.grade(question, studentAnswer);
    return result.isCorrect === true;
  }

  /**
   * Compare fill-in-the-blank answers
   * This is a helper method that delegates to the FillBlankHandler
   * 
   * @param {Array<string>} correctAnswers - Array of correct answers
   * @param {Array<string>} studentAnswers - Array of student answers
   * @returns {Object} Comparison result with per-blank details
   */
  compareFillBlank(correctAnswers, studentAnswers) {
    const handler = this.handlers.fill_blank;
    
    // Create blanks in the question text
    const blanks = correctAnswers.map(() => '_____').join(' and ');
    
    const question = {
      type: 'fill_blank',
      question: `Test question with ${blanks} blanks for comparison purposes only`,
      correctAnswers: correctAnswers,
      marks: correctAnswers.length,
      explanation: 'Test explanation for comparison purposes only'
    };

    const result = handler.grade(question, studentAnswers);
    
    return {
      isCorrect: result.isCorrect,
      correctCount: result.correctBlanks || 0,
      totalBlanks: correctAnswers.length,
      blankResults: result.blankResults || [],
      earnedMarks: result.earnedMarks
    };
  }

  /**
   * Grade matching questions
   * This is a helper method that delegates to the MatchingHandler
   * 
   * @param {Array<Object>} correctMatches - Array of correct matches
   * @param {Array<Object>} studentMatches - Array of student matches
   * @returns {Object} Grading result with per-match details
   */
  gradeMatching(correctMatches, studentMatches) {
    const handler = this.handlers.matching;
    
    // Extract left and right columns from correct matches
    const leftColumn = correctMatches.map(m => m.left);
    const rightColumn = correctMatches.map(m => m.right);
    
    const question = {
      type: 'matching',
      question: 'Test matching question for comparison purposes only',
      leftColumn: leftColumn,
      rightColumn: rightColumn,
      correctMatches: correctMatches,
      marks: correctMatches.length,
      explanation: 'Test explanation for comparison purposes only'
    };

    const result = handler.grade(question, studentMatches);
    
    return {
      isCorrect: result.isCorrect,
      correctCount: result.correctMatches || 0,
      totalMatches: correctMatches.length,
      matchResults: result.matchResults || [],
      earnedMarks: result.earnedMarks
    };
  }

  /**
   * Get statistics for a question across multiple student submissions
   * 
   * @param {Object} question - The question object
   * @param {Array<*>} allAnswers - Array of all student answers for this question
   * @returns {Object} Statistics for the question
   */
  getQuestionStatistics(question, allAnswers) {
    const handler = this.handlers[question.type];
    
    if (!handler) {
      return {
        error: `Unsupported question type: ${question.type}`
      };
    }

    return handler.getQuestionStatistics(question, allAnswers);
  }

  /**
   * Get exam-wide statistics across multiple student submissions
   * 
   * @param {Object} exam - The exam object
   * @param {Array<Object>} allSubmissions - Array of all student submissions
   * @returns {Object} Exam-wide statistics
   */
  getExamStatistics(exam, allSubmissions) {
    if (!exam || !exam.questions || !Array.isArray(allSubmissions)) {
      return {
        error: 'Invalid inputs: exam must have questions and allSubmissions must be an array'
      };
    }

    const stats = {
      totalSubmissions: allSubmissions.length,
      totalQuestions: exam.questions.length,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 100,
      passRate: 0,
      questionStatistics: []
    };

    // Calculate per-question statistics
    exam.questions.forEach((question) => {
      const allAnswersForQuestion = allSubmissions.map(
        submission => submission.answers[question.id]
      );

      const questionStats = this.getQuestionStatistics(question, allAnswersForQuestion);
      
      stats.questionStatistics.push({
        questionId: question.id,
        questionType: question.type,
        ...questionStats
      });
    });

    // Calculate overall statistics
    if (allSubmissions.length > 0) {
      const scores = allSubmissions.map(submission => {
        const result = this.gradeExam(exam, submission.answers);
        return result.percentage;
      });

      stats.averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      stats.highestScore = Math.max(...scores);
      stats.lowestScore = Math.min(...scores);
      stats.passRate = (scores.filter(score => score >= 50).length / scores.length) * 100;

      // Round to 2 decimal places
      stats.averageScore = Math.round(stats.averageScore * 100) / 100;
      stats.passRate = Math.round(stats.passRate * 100) / 100;
    }

    return stats;
  }

  /**
   * Validate exam structure before grading
   * 
   * @param {Object} exam - The exam object to validate
   * @returns {Object} Validation result
   */
  validateExam(exam) {
    const errors = [];

    if (!exam) {
      return { valid: false, errors: ['Exam object is required'] };
    }

    if (!exam.questions || !Array.isArray(exam.questions)) {
      return { valid: false, errors: ['Exam must have a questions array'] };
    }

    if (exam.questions.length === 0) {
      return { valid: false, errors: ['Exam must have at least one question'] };
    }

    // Validate each question
    exam.questions.forEach((question, index) => {
      const handler = this.handlers[question.type];
      
      if (!handler) {
        errors.push(`Question ${index + 1}: Unsupported question type '${question.type}'`);
        return;
      }

      const validation = handler.validate(question);
      if (!validation.valid) {
        errors.push(`Question ${index + 1}: ${validation.errors.join(', ')}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = AutoGradingService;
