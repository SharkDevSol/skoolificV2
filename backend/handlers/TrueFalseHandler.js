/**
 * True/False Question Handler
 * 
 * This handler provides validation and grading functionality for true/false questions
 * in the AI Test Generator system. It integrates with the auto-grading engine to provide
 * immediate feedback to students.
 * 
 * Features:
 * - Validates true/false question structure against schema
 * - Grades student answers with case-insensitive comparison
 * - Handles whitespace trimming
 * - Handles common variations: "T"/"F", "true"/"false", "TRUE"/"FALSE"
 * - Generates feedback for correct/incorrect answers
 * - Returns grading results with earned marks
 */

const { trueFalseSchema, validateQuestion } = require('../schemas/questionTypes');

class TrueFalseHandler {
  /**
   * Validate a true/false question structure
   * @param {Object} question - The question object to validate
   * @returns {Object} - { valid: boolean, errors: Array<string> }
   */
  validate(question) {
    // First check if the question type is correct
    if (!question || question.type !== 'true_false') {
      return {
        valid: false,
        errors: ['Question must be of type "true_false"']
      };
    }

    // Use the schema validation function
    const validation = validateQuestion(question);
    
    return validation;
  }

  /**
   * Normalize true/false answer to standard format
   * Handles variations: T/F, true/false, TRUE/FALSE, True/False
   * @param {string} answer - The answer to normalize
   * @returns {string|null} - Normalized answer ("True" or "False") or null if invalid
   */
  normalizeAnswer(answer) {
    if (answer === undefined || answer === null || answer === '') {
      return null;
    }

    // Convert to string and normalize (trim and lowercase)
    const normalized = String(answer).trim().toLowerCase();

    // Handle common variations
    const trueVariations = ['true', 't', '1', 'yes'];
    const falseVariations = ['false', 'f', '0', 'no'];

    if (trueVariations.includes(normalized)) {
      return 'True';
    } else if (falseVariations.includes(normalized)) {
      return 'False';
    }

    return null; // Invalid answer
  }

  /**
   * Grade a student's answer to a true/false question
   * @param {Object} question - The question object containing correct answer
   * @param {string} studentAnswer - The student's submitted answer
   * @returns {Object} - Grading result with earned marks and feedback
   */
  grade(question, studentAnswer) {
    // Validate the question structure first
    const validation = this.validate(question);
    if (!validation.valid) {
      return {
        success: false,
        error: 'Invalid question structure',
        validationErrors: validation.errors,
        earnedMarks: 0,
        totalMarks: question.marks || 0,
        isCorrect: false,
        feedback: 'Question validation failed'
      };
    }

    // Handle missing or invalid student answer
    if (studentAnswer === undefined || studentAnswer === null || studentAnswer === '') {
      return {
        success: true,
        earnedMarks: 0,
        totalMarks: question.marks,
        isCorrect: false,
        feedback: 'No answer provided',
        correctAnswer: question.correctAnswer,
        explanation: question.explanation
      };
    }

    // Normalize both answers
    const normalizedStudentAnswer = this.normalizeAnswer(studentAnswer);
    const normalizedCorrectAnswer = this.normalizeAnswer(question.correctAnswer);

    // Check if student answer is valid
    if (normalizedStudentAnswer === null) {
      return {
        success: true,
        earnedMarks: 0,
        totalMarks: question.marks,
        isCorrect: false,
        feedback: 'Invalid answer format. Please answer with True or False.',
        studentAnswer: studentAnswer,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation
      };
    }

    // Compare answers
    const isCorrect = normalizedStudentAnswer === normalizedCorrectAnswer;

    // Calculate earned marks
    const earnedMarks = isCorrect ? question.marks : 0;

    // Generate feedback
    let feedback = '';
    if (isCorrect) {
      feedback = 'Correct! ' + (question.explanation || '');
    } else {
      feedback = `Incorrect. ${question.explanation || ''}`;
    }

    // Return grading result
    return {
      success: true,
      earnedMarks,
      totalMarks: question.marks,
      isCorrect,
      feedback: feedback.trim(),
      studentAnswer: studentAnswer,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation
    };
  }

  /**
   * Grade multiple questions at once
   * @param {Array<Object>} questions - Array of question objects
   * @param {Object} studentAnswers - Object mapping question IDs to student answers
   * @returns {Object} - Overall grading results
   */
  gradeMultiple(questions, studentAnswers) {
    const results = {
      totalQuestions: 0,
      totalMarks: 0,
      earnedMarks: 0,
      correctCount: 0,
      incorrectCount: 0,
      unansweredCount: 0,
      questionResults: []
    };

    // Filter only true/false questions
    const tfQuestions = questions.filter(q => q.type === 'true_false');
    results.totalQuestions = tfQuestions.length;

    // Grade each question
    tfQuestions.forEach(question => {
      const studentAnswer = studentAnswers[question.id];
      const gradeResult = this.grade(question, studentAnswer);

      results.totalMarks += gradeResult.totalMarks;
      results.earnedMarks += gradeResult.earnedMarks;

      if (gradeResult.isCorrect) {
        results.correctCount++;
      } else if (!studentAnswer || studentAnswer === '') {
        results.unansweredCount++;
      } else {
        results.incorrectCount++;
      }

      results.questionResults.push({
        questionId: question.id,
        ...gradeResult
      });
    });

    // Calculate percentage
    results.percentage = results.totalMarks > 0 
      ? ((results.earnedMarks / results.totalMarks) * 100).toFixed(2)
      : 0;

    return results;
  }

  /**
   * Check if a student answer is valid (True or False or variations)
   * @param {string} studentAnswer - The student's answer
   * @returns {Object} - { valid: boolean, message: string }
   */
  isAnswerValid(studentAnswer) {
    if (!studentAnswer || studentAnswer === '') {
      return {
        valid: false,
        message: 'Answer cannot be empty'
      };
    }

    const normalized = this.normalizeAnswer(studentAnswer);

    return {
      valid: normalized !== null,
      message: normalized !== null
        ? 'Answer is valid'
        : 'Answer must be True or False (or variations like T/F, true/false)'
    };
  }

  /**
   * Get question statistics for analytics
   * @param {Object} question - The question object
   * @param {Array<string>} allStudentAnswers - Array of all student answers for this question
   * @returns {Object} - Statistics about the question performance
   */
  getQuestionStatistics(question, allStudentAnswers) {
    const stats = {
      questionId: question.id,
      totalResponses: allStudentAnswers.length,
      correctCount: 0,
      incorrectCount: 0,
      unansweredCount: 0,
      trueCount: 0,
      falseCount: 0,
      invalidCount: 0,
      averageScore: 0
    };

    let totalMarks = 0;

    // Analyze each answer
    allStudentAnswers.forEach(answer => {
      // Check for empty/null/undefined answers
      if (answer === null || answer === undefined || answer === '') {
        stats.unansweredCount++;
        return;
      }

      const gradeResult = this.grade(question, answer);
      
      // Only count marks if grading was successful
      if (gradeResult.success) {
        totalMarks += gradeResult.earnedMarks;

        if (gradeResult.isCorrect) {
          stats.correctCount++;
        } else {
          stats.incorrectCount++;
        }
      }

      // Track answer distribution
      const normalizedAnswer = this.normalizeAnswer(answer);
      if (normalizedAnswer === 'True') {
        stats.trueCount++;
      } else if (normalizedAnswer === 'False') {
        stats.falseCount++;
      } else {
        stats.invalidCount++;
      }
    });

    // Calculate average score
    stats.averageScore = allStudentAnswers.length > 0
      ? (totalMarks / allStudentAnswers.length).toFixed(2)
      : 0;

    // Calculate percentages
    stats.correctPercentage = allStudentAnswers.length > 0
      ? ((stats.correctCount / allStudentAnswers.length) * 100).toFixed(2)
      : 0;

    return stats;
  }
}

module.exports = TrueFalseHandler;
