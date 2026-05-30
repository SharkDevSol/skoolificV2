/**
 * Numeric/Computational Response Question Handler
 * 
 * This handler provides validation and grading functionality for numeric questions
 * in the AI Test Generator system. It integrates with the auto-grading engine to provide
 * immediate feedback to students.
 * 
 * Features:
 * - Validates numeric question structure against schema
 * - Grades student answers with exact numeric comparison
 * - Supports acceptable range for rounding tolerance
 * - Handles unit validation (optional)
 * - Extracts numeric values from strings
 * - Generates feedback for correct/incorrect answers
 * - Returns grading results with earned marks
 */

const { numericSchema, validateQuestion } = require('../schemas/questionTypes');

class NumericHandler {
  /**
   * Validate a numeric question structure
   * @param {Object} question - The question object to validate
   * @returns {Object} - { valid: boolean, errors: Array<string> }
   */
  validate(question) {
    // First check if the question type is correct
    if (!question || question.type !== 'numeric') {
      return {
        valid: false,
        errors: ['Question must be of type "numeric"']
      };
    }

    // Use the schema validation function
    const validation = validateQuestion(question);
    
    return validation;
  }

  /**
   * Extract numeric value from a string or number
   * Handles various formats: "96", "96 cm²", "96cm²", 96, ".5", "0.5"
   * @param {any} value - The value to extract number from
   * @returns {number|null} - Extracted number or null if invalid
   */
  extractNumericValue(value) {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    // If already a number, return it
    if (typeof value === 'number') {
      return isNaN(value) ? null : value;
    }

    // Convert to string and extract numeric part
    const str = String(value).trim();
    
    // Try to parse as float (handles both "3.14" and ".5")
    const match = str.match(/^-?\d*\.?\d+/);
    if (match) {
      const num = parseFloat(match[0]);
      return isNaN(num) ? null : num;
    }

    return null;
  }

  /**
   * Extract unit from a string answer
   * @param {string} answer - The answer string
   * @returns {string|null} - Extracted unit or null
   */
  extractUnit(answer) {
    if (!answer || typeof answer !== 'string') {
      return null;
    }

    const str = answer.trim();
    
    // Remove numeric part and get remaining text
    const withoutNumber = str.replace(/^-?\d+\.?\d*\s*/, '').trim();
    
    return withoutNumber || null;
  }

  /**
   * Check if a value is within an acceptable range
   * @param {number} value - The value to check
   * @param {Object} range - The acceptable range {min, max}
   * @returns {boolean} - True if within range
   */
  isWithinRange(value, range) {
    if (!range || typeof range !== 'object') {
      return false;
    }

    if (range.min !== undefined && value < range.min) {
      return false;
    }

    if (range.max !== undefined && value > range.max) {
      return false;
    }

    return true;
  }

  /**
   * Grade a student's answer to a numeric question
   * @param {Object} question - The question object containing correct answer
   * @param {any} studentAnswer - The student's submitted answer
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

    // Extract numeric values
    const studentNumeric = this.extractNumericValue(studentAnswer);
    const correctNumeric = this.extractNumericValue(question.correctAnswer);

    // Check if student answer is a valid number
    if (studentNumeric === null) {
      return {
        success: true,
        earnedMarks: 0,
        totalMarks: question.marks,
        isCorrect: false,
        feedback: 'Invalid numeric answer format.',
        studentAnswer: studentAnswer,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation
      };
    }

    // Check if correct answer is a valid number
    if (correctNumeric === null) {
      return {
        success: false,
        error: 'Invalid correct answer format',
        earnedMarks: 0,
        totalMarks: question.marks,
        isCorrect: false,
        feedback: 'Question has invalid correct answer'
      };
    }

    // Check if answer is within acceptable range (if specified)
    let isCorrect = false;
    if (question.acceptableRange) {
      isCorrect = this.isWithinRange(studentNumeric, question.acceptableRange);
    } else {
      // Exact comparison with small tolerance for floating point errors
      const tolerance = 0.0001;
      isCorrect = Math.abs(studentNumeric - correctNumeric) < tolerance;
    }

    // Check unit if specified
    let unitCorrect = true;
    let unitFeedback = '';
    
    if (question.unit) {
      const studentUnit = this.extractUnit(String(studentAnswer));
      const expectedUnit = question.unit.trim().toLowerCase();
      
      if (studentUnit) {
        const normalizedStudentUnit = studentUnit.toLowerCase();
        unitCorrect = normalizedStudentUnit === expectedUnit;
        
        if (!unitCorrect) {
          unitFeedback = ` Incorrect unit: expected "${question.unit}", got "${studentUnit}".`;
        }
      } else {
        unitCorrect = false;
        unitFeedback = ` Missing unit: expected "${question.unit}".`;
      }
    }

    // Final correctness check (both value and unit must be correct)
    const finallyCorrect = isCorrect && unitCorrect;

    // Calculate earned marks
    const earnedMarks = finallyCorrect ? question.marks : 0;

    // Generate feedback
    let feedback = '';
    if (finallyCorrect) {
      feedback = 'Correct! ' + (question.explanation || '');
    } else if (isCorrect && !unitCorrect) {
      feedback = `Numeric value is correct, but ${unitFeedback.trim()} ${question.explanation || ''}`;
    } else {
      feedback = `Incorrect.${unitFeedback} ${question.explanation || ''}`;
    }

    // Return grading result
    return {
      success: true,
      earnedMarks,
      totalMarks: question.marks,
      isCorrect: finallyCorrect,
      numericValue: studentNumeric,
      correctNumericValue: correctNumeric,
      unitCorrect,
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

    // Filter only numeric questions
    const numericQuestions = questions.filter(q => q.type === 'numeric');
    results.totalQuestions = numericQuestions.length;

    // Grade each question
    numericQuestions.forEach(question => {
      const studentAnswer = studentAnswers[question.id];
      const gradeResult = this.grade(question, studentAnswer);

      // Only count if grading was successful
      if (gradeResult.success) {
        results.totalMarks += gradeResult.totalMarks;
        results.earnedMarks += gradeResult.earnedMarks;

        if (gradeResult.isCorrect) {
          results.correctCount++;
        } else if (!studentAnswer || studentAnswer === '') {
          results.unansweredCount++;
        } else {
          results.incorrectCount++;
        }
      }

      results.questionResults.push({
        questionId: question.id,
        ...gradeResult
      });
    });

    // Calculate percentage
    results.percentage = results.totalMarks > 0 
      ? ((results.earnedMarks / results.totalMarks) * 100).toFixed(2)
      : '0';

    return results;
  }

  /**
   * Check if a student answer is valid (can be parsed as number)
   * @param {any} studentAnswer - The student's answer
   * @returns {Object} - { valid: boolean, message: string }
   */
  isAnswerValid(studentAnswer) {
    if (!studentAnswer || studentAnswer === '') {
      return {
        valid: false,
        message: 'Answer cannot be empty'
      };
    }

    const numericValue = this.extractNumericValue(studentAnswer);

    return {
      valid: numericValue !== null,
      message: numericValue !== null
        ? 'Answer is valid'
        : 'Answer must be a valid number'
    };
  }

  /**
   * Get question statistics for analytics
   * @param {Object} question - The question object
   * @param {Array<any>} allStudentAnswers - Array of all student answers for this question
   * @returns {Object} - Statistics about the question performance
   */
  getQuestionStatistics(question, allStudentAnswers) {
    const stats = {
      questionId: question.id,
      totalResponses: allStudentAnswers.length,
      correctCount: 0,
      incorrectCount: 0,
      unansweredCount: 0,
      invalidCount: 0,
      averageScore: '0',
      averageStudentAnswer: null,
      correctAnswer: this.extractNumericValue(question.correctAnswer),
      answerDistribution: {
        min: null,
        max: null,
        mean: null,
        median: null
      }
    };

    let totalMarks = 0;
    const validNumericAnswers = [];

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

        // Track numeric values for distribution
        if (gradeResult.numericValue !== null && gradeResult.numericValue !== undefined) {
          validNumericAnswers.push(gradeResult.numericValue);
        } else {
          stats.invalidCount++;
        }
      }
    });

    // Calculate average score
    stats.averageScore = allStudentAnswers.length > 0
      ? (totalMarks / allStudentAnswers.length).toFixed(2)
      : '0';

    // Calculate percentages
    stats.correctPercentage = allStudentAnswers.length > 0
      ? ((stats.correctCount / allStudentAnswers.length) * 100).toFixed(2)
      : '0';

    // Calculate answer distribution statistics
    if (validNumericAnswers.length > 0) {
      validNumericAnswers.sort((a, b) => a - b);
      
      stats.answerDistribution.min = validNumericAnswers[0];
      stats.answerDistribution.max = validNumericAnswers[validNumericAnswers.length - 1];
      
      // Calculate mean
      const sum = validNumericAnswers.reduce((acc, val) => acc + val, 0);
      stats.answerDistribution.mean = (sum / validNumericAnswers.length).toFixed(2);
      
      // Calculate median
      const mid = Math.floor(validNumericAnswers.length / 2);
      if (validNumericAnswers.length % 2 === 0) {
        stats.answerDistribution.median = ((validNumericAnswers[mid - 1] + validNumericAnswers[mid]) / 2).toFixed(2);
      } else {
        stats.answerDistribution.median = validNumericAnswers[mid].toFixed(2);
      }

      // Calculate average student answer
      stats.averageStudentAnswer = stats.answerDistribution.mean;
    }

    return stats;
  }
}

module.exports = NumericHandler;
