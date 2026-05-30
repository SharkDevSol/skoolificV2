/**
 * Multiple True/False Question Handler
 * 
 * This handler provides validation and grading functionality for multiple true/false questions
 * in the AI Test Generator system. It integrates with the auto-grading engine to provide
 * immediate feedback to students.
 * 
 * Features:
 * - Validates multiple true/false question structure against schema
 * - Grades student answers (array of boolean values) with case-insensitive comparison
 * - Handles whitespace trimming
 * - Handles common variations: "T"/"F", "true"/"false", "TRUE"/"FALSE", "1"/"0", "yes"/"no"
 * - Supports partial credit: awards marks proportionally based on correct answers
 * - Generates feedback for correct/incorrect answers
 * - Returns grading results with earned marks
 */

const { multipleTrueFalseSchema, validateQuestion } = require('../schemas/questionTypes');

class MultipleTrueFalseHandler {
  /**
   * Validate a multiple true/false question structure
   * @param {Object} question - The question object to validate
   * @returns {Object} - { valid: boolean, errors: Array<string> }
   */
  validate(question) {
    // First check if the question type is correct
    if (!question || question.type !== 'multiple_true_false') {
      return {
        valid: false,
        errors: ['Question must be of type "multiple_true_false"']
      };
    }

    // Use the schema validation function
    const validation = validateQuestion(question);
    
    return validation;
  }

  /**
   * Normalize true/false answer to standard format
   * Handles variations: T/F, true/false, TRUE/FALSE, True/False, 1/0, yes/no
   * @param {any} answer - The answer to normalize
   * @returns {boolean|null} - Normalized answer (true or false) or null if invalid
   */
  normalizeAnswer(answer) {
    if (answer === undefined || answer === null || answer === '') {
      return null;
    }

    // If already a boolean, return it
    if (typeof answer === 'boolean') {
      return answer;
    }

    // Convert to string and normalize (trim and lowercase)
    const normalized = String(answer).trim().toLowerCase();

    // Handle common variations
    const trueVariations = ['true', 't', '1', 'yes'];
    const falseVariations = ['false', 'f', '0', 'no'];

    if (trueVariations.includes(normalized)) {
      return true;
    } else if (falseVariations.includes(normalized)) {
      return false;
    }

    return null; // Invalid answer
  }

  /**
   * Grade a student's answers to a multiple true/false question
   * @param {Object} question - The question object containing correct answers
   * @param {Array} studentAnswers - The student's submitted answers (array of boolean values or variations)
   * @returns {Object} - Grading result with earned marks and feedback
   */
  grade(question, studentAnswers) {
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

    // Handle missing or invalid student answers
    if (!studentAnswers || !Array.isArray(studentAnswers) || studentAnswers.length === 0) {
      return {
        success: true,
        earnedMarks: 0,
        totalMarks: question.marks,
        isCorrect: false,
        feedback: 'No answers provided',
        correctAnswers: question.correctAnswers,
        explanation: question.explanation,
        statementResults: []
      };
    }

    // Check if the number of answers matches the number of statements
    if (studentAnswers.length !== question.statements.length) {
      return {
        success: true,
        earnedMarks: 0,
        totalMarks: question.marks,
        isCorrect: false,
        feedback: `Expected ${question.statements.length} answers, but received ${studentAnswers.length}`,
        correctAnswers: question.correctAnswers,
        explanation: question.explanation,
        statementResults: []
      };
    }

    // Normalize all student answers
    const normalizedStudentAnswers = studentAnswers.map(answer => this.normalizeAnswer(answer));

    // Check for invalid answers
    const hasInvalidAnswers = normalizedStudentAnswers.some(answer => answer === null);
    if (hasInvalidAnswers) {
      return {
        success: true,
        earnedMarks: 0,
        totalMarks: question.marks,
        isCorrect: false,
        feedback: 'Invalid answer format detected. All answers must be True or False (or variations).',
        correctAnswers: question.correctAnswers,
        explanation: question.explanation,
        statementResults: []
      };
    }

    // Grade each statement
    let correctCount = 0;
    const statementResults = [];

    for (let i = 0; i < question.statements.length; i++) {
      const isCorrect = normalizedStudentAnswers[i] === question.correctAnswers[i];
      if (isCorrect) {
        correctCount++;
      }

      statementResults.push({
        statement: question.statements[i],
        studentAnswer: normalizedStudentAnswers[i],
        correctAnswer: question.correctAnswers[i],
        isCorrect
      });
    }

    // Calculate partial credit
    const totalStatements = question.statements.length;
    const earnedMarks = (correctCount / totalStatements) * question.marks;
    const isAllCorrect = correctCount === totalStatements;

    // Generate feedback
    let feedback = '';
    if (isAllCorrect) {
      feedback = `Correct! All ${totalStatements} statements answered correctly. ${question.explanation || ''}`;
    } else {
      feedback = `Partially correct: ${correctCount} out of ${totalStatements} statements correct. ${question.explanation || ''}`;
    }

    // Return grading result
    return {
      success: true,
      earnedMarks: parseFloat(earnedMarks.toFixed(2)),
      totalMarks: question.marks,
      isCorrect: isAllCorrect,
      feedback: feedback.trim(),
      correctCount,
      totalStatements,
      studentAnswers: normalizedStudentAnswers,
      correctAnswers: question.correctAnswers,
      explanation: question.explanation,
      statementResults
    };
  }

  /**
   * Grade multiple questions at once
   * @param {Array<Object>} questions - Array of question objects
   * @param {Object} studentAnswers - Object mapping question IDs to student answer arrays
   * @returns {Object} - Overall grading results
   */
  gradeMultiple(questions, studentAnswers) {
    const results = {
      totalQuestions: 0,
      totalMarks: 0,
      earnedMarks: 0,
      correctCount: 0,
      partiallyCorrectCount: 0,
      incorrectCount: 0,
      unansweredCount: 0,
      questionResults: []
    };

    // Filter only multiple true/false questions
    const mtfQuestions = questions.filter(q => q.type === 'multiple_true_false');
    results.totalQuestions = mtfQuestions.length;

    // Grade each question
    mtfQuestions.forEach(question => {
      const studentAnswer = studentAnswers[question.id];
      const gradeResult = this.grade(question, studentAnswer);

      results.totalMarks += gradeResult.totalMarks;
      results.earnedMarks += gradeResult.earnedMarks;

      if (gradeResult.isCorrect) {
        results.correctCount++;
      } else if (!studentAnswer || !Array.isArray(studentAnswer) || studentAnswer.length === 0) {
        results.unansweredCount++;
      } else if (gradeResult.earnedMarks > 0) {
        results.partiallyCorrectCount++;
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
   * Check if student answers are valid (all are True/False or variations)
   * @param {Array} studentAnswers - The student's answers
   * @param {number} expectedCount - Expected number of answers
   * @returns {Object} - { valid: boolean, message: string }
   */
  areAnswersValid(studentAnswers, expectedCount) {
    if (!studentAnswers || !Array.isArray(studentAnswers)) {
      return {
        valid: false,
        message: 'Answers must be provided as an array'
      };
    }

    if (studentAnswers.length === 0) {
      return {
        valid: false,
        message: 'Answers array cannot be empty'
      };
    }

    if (studentAnswers.length !== expectedCount) {
      return {
        valid: false,
        message: `Expected ${expectedCount} answers, but received ${studentAnswers.length}`
      };
    }

    // Check if all answers can be normalized
    const normalizedAnswers = studentAnswers.map(answer => this.normalizeAnswer(answer));
    const hasInvalidAnswers = normalizedAnswers.some(answer => answer === null);

    if (hasInvalidAnswers) {
      return {
        valid: false,
        message: 'All answers must be True or False (or variations like T/F, true/false, 1/0, yes/no)'
      };
    }

    return {
      valid: true,
      message: 'All answers are valid'
    };
  }

  /**
   * Get question statistics for analytics
   * @param {Object} question - The question object
   * @param {Array<Array>} allStudentAnswers - Array of all student answer arrays for this question
   * @returns {Object} - Statistics about the question performance
   */
  getQuestionStatistics(question, allStudentAnswers) {
    const stats = {
      questionId: question.id,
      totalResponses: allStudentAnswers.length,
      allCorrectCount: 0,
      partiallyCorrectCount: 0,
      allIncorrectCount: 0,
      unansweredCount: 0,
      averageScore: 0,
      statementStats: []
    };

    // Initialize statement statistics
    question.statements.forEach((statement, index) => {
      stats.statementStats.push({
        statement,
        correctAnswer: question.correctAnswers[index],
        trueCount: 0,
        falseCount: 0,
        correctCount: 0,
        incorrectCount: 0
      });
    });

    let totalMarks = 0;

    // Analyze each student's answers
    allStudentAnswers.forEach(answers => {
      // Check for empty/null/undefined answers
      if (!answers || !Array.isArray(answers) || answers.length === 0) {
        stats.unansweredCount++;
        return;
      }

      const gradeResult = this.grade(question, answers);
      
      // Only count marks if grading was successful
      if (gradeResult.success) {
        totalMarks += gradeResult.earnedMarks;

        if (gradeResult.isCorrect) {
          stats.allCorrectCount++;
        } else if (gradeResult.earnedMarks > 0) {
          stats.partiallyCorrectCount++;
        } else {
          stats.allIncorrectCount++;
        }

        // Track per-statement statistics
        if (gradeResult.statementResults && gradeResult.statementResults.length > 0) {
          gradeResult.statementResults.forEach((result, index) => {
            if (index < stats.statementStats.length) {
              // Count true/false distribution
              if (result.studentAnswer === true) {
                stats.statementStats[index].trueCount++;
              } else if (result.studentAnswer === false) {
                stats.statementStats[index].falseCount++;
              }

              // Count correct/incorrect
              if (result.isCorrect) {
                stats.statementStats[index].correctCount++;
              } else {
                stats.statementStats[index].incorrectCount++;
              }
            }
          });
        }
      }
    });

    // Calculate average score
    stats.averageScore = allStudentAnswers.length > 0
      ? (totalMarks / allStudentAnswers.length).toFixed(2)
      : 0;

    // Calculate percentages
    stats.allCorrectPercentage = allStudentAnswers.length > 0
      ? ((stats.allCorrectCount / allStudentAnswers.length) * 100).toFixed(2)
      : 0;

    // Calculate per-statement percentages
    stats.statementStats.forEach(statementStat => {
      const totalAnswered = statementStat.correctCount + statementStat.incorrectCount;
      statementStat.correctPercentage = totalAnswered > 0
        ? ((statementStat.correctCount / totalAnswered) * 100).toFixed(2)
        : 0;
    });

    return stats;
  }
}

module.exports = MultipleTrueFalseHandler;
