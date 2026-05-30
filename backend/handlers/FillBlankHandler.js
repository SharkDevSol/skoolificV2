/**
 * Fill-in-the-Blank Question Handler
 * 
 * This handler provides validation and grading functionality for fill-in-the-blank questions
 * in the AI Test Generator system. It integrates with the auto-grading engine to provide
 * immediate feedback to students.
 * 
 * Features:
 * - Validates fill-in-the-blank question structure against schema
 * - Grades student answers (array of strings for multiple blanks)
 * - Supports partial credit: awards marks proportionally based on correct blanks
 * - Case-insensitive comparison with whitespace trimming
 * - Generates feedback for correct/incorrect answers
 * - Returns grading results with earned marks
 * - Provides per-blank result tracking
 */

const { fillBlankSchema, validateQuestion } = require('../schemas/questionTypes');

class FillBlankHandler {
  /**
   * Validate a fill-in-the-blank question structure
   * @param {Object} question - The question object to validate
   * @returns {Object} - { valid: boolean, errors: Array<string> }
   */
  validate(question) {
    // First check if the question type is correct
    if (!question || question.type !== 'fill_blank') {
      return {
        valid: false,
        errors: ['Question must be of type "fill_blank"']
      };
    }

    // Use the schema validation function
    const validation = validateQuestion(question);
    
    return validation;
  }

  /**
   * Normalize a blank answer for comparison
   * Handles case-insensitive comparison and whitespace trimming
   * @param {string} answer - The answer to normalize
   * @returns {string|null} - Normalized answer or null if invalid
   */
  normalizeAnswer(answer) {
    if (answer === undefined || answer === null) {
      return null;
    }

    if (typeof answer !== 'string' && typeof answer !== 'number') {
      return null;
    }

    return String(answer).trim().toLowerCase();
  }

  /**
   * Check if two answers are equal (case-insensitive)
   * @param {string} answer1 - First answer
   * @param {string} answer2 - Second answer
   * @returns {boolean} - True if answers are equal
   */
  answersAreEqual(answer1, answer2) {
    const normalized1 = this.normalizeAnswer(answer1);
    const normalized2 = this.normalizeAnswer(answer2);

    if (normalized1 === null || normalized2 === null) {
      return false;
    }

    return normalized1 === normalized2;
  }

  /**
   * Grade a student's answers to a fill-in-the-blank question
   * @param {Object} question - The question object containing correct answers
   * @param {Array} studentAnswers - The student's submitted answers (array of strings)
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
        blankResults: []
      };
    }

    // Check if the number of answers matches the number of blanks
    if (studentAnswers.length !== question.correctAnswers.length) {
      return {
        success: true,
        earnedMarks: 0,
        totalMarks: question.marks,
        isCorrect: false,
        feedback: `Expected ${question.correctAnswers.length} answers, but received ${studentAnswers.length}`,
        correctAnswers: question.correctAnswers,
        explanation: question.explanation,
        blankResults: []
      };
    }

    // Grade each blank
    let correctCount = 0;
    const blankResults = [];

    for (let i = 0; i < studentAnswers.length; i++) {
      const studentAnswer = studentAnswers[i];
      const correctAnswer = question.correctAnswers[i];
      
      const isCorrect = this.answersAreEqual(studentAnswer, correctAnswer);

      if (isCorrect) {
        correctCount++;
      }

      blankResults.push({
        blankNumber: i + 1,
        studentAnswer: studentAnswer,
        correctAnswer: correctAnswer,
        isCorrect
      });
    }

    // Calculate partial credit
    const totalBlanks = question.correctAnswers.length;
    const earnedMarks = (correctCount / totalBlanks) * question.marks;
    const isAllCorrect = correctCount === totalBlanks;

    // Generate feedback
    let feedback = '';
    if (isAllCorrect) {
      feedback = `Correct! All ${totalBlanks} blanks are correct. ${question.explanation || ''}`;
    } else if (correctCount > 0) {
      feedback = `Partially correct: ${correctCount} out of ${totalBlanks} blanks correct. ${question.explanation || ''}`;
    } else {
      feedback = `Incorrect. None of the blanks are correct. ${question.explanation || ''}`;
    }

    // Return grading result
    return {
      success: true,
      earnedMarks: parseFloat(earnedMarks.toFixed(2)),
      totalMarks: question.marks,
      isCorrect: isAllCorrect,
      feedback: feedback.trim(),
      correctCount,
      totalBlanks,
      studentAnswers: studentAnswers,
      correctAnswers: question.correctAnswers,
      explanation: question.explanation,
      blankResults
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

    // Filter only fill-in-the-blank questions
    const fillBlankQuestions = questions.filter(q => q.type === 'fill_blank');
    results.totalQuestions = fillBlankQuestions.length;

    // Grade each question
    fillBlankQuestions.forEach(question => {
      const studentAnswer = studentAnswers[question.id];
      const gradeResult = this.grade(question, studentAnswer);

      // Only count if grading was successful
      if (gradeResult.success) {
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
   * Check if student answers are valid (all are strings or numbers)
   * @param {Array} studentAnswers - The student's answers
   * @param {number} expectedCount - Expected number of blanks
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

    // Check if all answers are valid types (string or number)
    const hasInvalidAnswers = studentAnswers.some(answer => {
      const type = typeof answer;
      return type !== 'string' && type !== 'number';
    });

    if (hasInvalidAnswers) {
      return {
        valid: false,
        message: 'All answers must be strings or numbers'
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
      averageScore: '0',
      averageCorrectBlanks: '0',
      blankStats: []
    };

    // Initialize blank statistics
    question.correctAnswers.forEach((correctAnswer, index) => {
      stats.blankStats.push({
        blankNumber: index + 1,
        correctAnswer: correctAnswer,
        correctCount: 0,
        incorrectCount: 0,
        correctPercentage: '0',
        commonIncorrectAnswers: {}
      });
    });

    let totalMarks = 0;
    let totalCorrectBlanks = 0;

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
        totalCorrectBlanks += gradeResult.correctCount || 0;

        if (gradeResult.isCorrect) {
          stats.allCorrectCount++;
        } else if (gradeResult.earnedMarks > 0) {
          stats.partiallyCorrectCount++;
        } else {
          stats.allIncorrectCount++;
        }

        // Track per-blank statistics
        if (gradeResult.blankResults && gradeResult.blankResults.length > 0) {
          gradeResult.blankResults.forEach((result, index) => {
            if (index < stats.blankStats.length) {
              if (result.isCorrect) {
                stats.blankStats[index].correctCount++;
              } else {
                stats.blankStats[index].incorrectCount++;
                
                // Track common incorrect answers
                const normalizedAnswer = this.normalizeAnswer(result.studentAnswer);
                if (normalizedAnswer) {
                  if (!stats.blankStats[index].commonIncorrectAnswers[normalizedAnswer]) {
                    stats.blankStats[index].commonIncorrectAnswers[normalizedAnswer] = 0;
                  }
                  stats.blankStats[index].commonIncorrectAnswers[normalizedAnswer]++;
                }
              }
            }
          });
        }
      }
    });

    // Calculate average score
    stats.averageScore = allStudentAnswers.length > 0
      ? (totalMarks / allStudentAnswers.length).toFixed(2)
      : '0';

    // Calculate average correct blanks
    const answeredCount = allStudentAnswers.length - stats.unansweredCount;
    stats.averageCorrectBlanks = answeredCount > 0
      ? (totalCorrectBlanks / answeredCount).toFixed(2)
      : '0';

    // Calculate percentages
    stats.allCorrectPercentage = allStudentAnswers.length > 0
      ? ((stats.allCorrectCount / allStudentAnswers.length) * 100).toFixed(2)
      : '0';

    // Calculate per-blank percentages
    stats.blankStats.forEach(blankStat => {
      const totalAnswered = blankStat.correctCount + blankStat.incorrectCount;
      blankStat.correctPercentage = totalAnswered > 0
        ? ((blankStat.correctCount / totalAnswered) * 100).toFixed(2)
        : '0';
    });

    return stats;
  }
}

module.exports = FillBlankHandler;
