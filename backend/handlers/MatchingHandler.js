/**
 * Matching Question Handler
 * 
 * This handler provides validation and grading functionality for matching questions
 * in the AI Test Generator system. It integrates with the auto-grading engine to provide
 * immediate feedback to students.
 * 
 * Features:
 * - Validates matching question structure against schema
 * - Grades student answers (array of left-right pairs) with case-insensitive comparison
 * - Handles whitespace trimming
 * - Supports partial credit: awards marks proportionally based on correct matches
 * - Generates feedback for correct/incorrect answers
 * - Returns grading results with earned marks
 * - Provides per-match result tracking
 */

const { matchingSchema, validateQuestion } = require('../schemas/questionTypes');

class MatchingHandler {
  /**
   * Validate a matching question structure
   * @param {Object} question - The question object to validate
   * @returns {Object} - { valid: boolean, errors: Array<string> }
   */
  validate(question) {
    // First check if the question type is correct
    if (!question || question.type !== 'matching') {
      return {
        valid: false,
        errors: ['Question must be of type "matching"']
      };
    }

    // Use the schema validation function
    const validation = validateQuestion(question);
    
    return validation;
  }

  /**
   * Normalize a match pair for comparison
   * Handles case-insensitive comparison and whitespace trimming
   * @param {Object} match - The match object {left, right}
   * @returns {Object} - Normalized match {left, right}
   */
  normalizeMatch(match) {
    if (!match || typeof match !== 'object') {
      return null;
    }

    if (!match.left || !match.right) {
      return null;
    }

    return {
      left: String(match.left).trim().toLowerCase(),
      right: String(match.right).trim().toLowerCase()
    };
  }

  /**
   * Check if two matches are equal (case-insensitive)
   * @param {Object} match1 - First match {left, right}
   * @param {Object} match2 - Second match {left, right}
   * @returns {boolean} - True if matches are equal
   */
  matchesAreEqual(match1, match2) {
    const normalized1 = this.normalizeMatch(match1);
    const normalized2 = this.normalizeMatch(match2);

    if (!normalized1 || !normalized2) {
      return false;
    }

    return normalized1.left === normalized2.left && 
           normalized1.right === normalized2.right;
  }

  /**
   * Grade a student's answers to a matching question
   * @param {Object} question - The question object containing correct matches
   * @param {Array} studentAnswers - The student's submitted answers (array of {left, right} pairs)
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
        correctMatches: question.correctMatches,
        explanation: question.explanation,
        matchResults: []
      };
    }

    // Check if the number of answers matches the number of correct matches
    if (studentAnswers.length !== question.correctMatches.length) {
      return {
        success: true,
        earnedMarks: 0,
        totalMarks: question.marks,
        isCorrect: false,
        feedback: `Expected ${question.correctMatches.length} matches, but received ${studentAnswers.length}`,
        correctMatches: question.correctMatches,
        explanation: question.explanation,
        matchResults: []
      };
    }

    // Validate that all student answers have left and right properties
    const hasInvalidMatches = studentAnswers.some(answer => 
      !answer || typeof answer !== 'object' || !answer.left || !answer.right
    );

    if (hasInvalidMatches) {
      return {
        success: true,
        earnedMarks: 0,
        totalMarks: question.marks,
        isCorrect: false,
        feedback: 'Invalid match format detected. Each match must have "left" and "right" properties.',
        correctMatches: question.correctMatches,
        explanation: question.explanation,
        matchResults: []
      };
    }

    // Grade each match
    let correctCount = 0;
    const matchResults = [];

    for (let i = 0; i < studentAnswers.length; i++) {
      const studentMatch = studentAnswers[i];
      
      // Find if this match exists in correct matches
      const isCorrect = question.correctMatches.some(correctMatch => 
        this.matchesAreEqual(studentMatch, correctMatch)
      );

      if (isCorrect) {
        correctCount++;
      }

      matchResults.push({
        studentMatch: {
          left: studentMatch.left,
          right: studentMatch.right
        },
        isCorrect
      });
    }

    // Calculate partial credit
    const totalMatches = question.correctMatches.length;
    const earnedMarks = (correctCount / totalMatches) * question.marks;
    const isAllCorrect = correctCount === totalMatches;

    // Generate feedback
    let feedback = '';
    if (isAllCorrect) {
      feedback = `Correct! All ${totalMatches} matches are correct. ${question.explanation || ''}`;
    } else if (correctCount > 0) {
      feedback = `Partially correct: ${correctCount} out of ${totalMatches} matches correct. ${question.explanation || ''}`;
    } else {
      feedback = `Incorrect. None of the matches are correct. ${question.explanation || ''}`;
    }

    // Return grading result
    return {
      success: true,
      earnedMarks: parseFloat(earnedMarks.toFixed(2)),
      totalMarks: question.marks,
      isCorrect: isAllCorrect,
      feedback: feedback.trim(),
      correctCount,
      totalMatches,
      studentAnswers: studentAnswers,
      correctMatches: question.correctMatches,
      explanation: question.explanation,
      matchResults
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

    // Filter only matching questions
    const matchingQuestions = questions.filter(q => q.type === 'matching');
    results.totalQuestions = matchingQuestions.length;

    // Grade each question
    matchingQuestions.forEach(question => {
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
      : 0;

    return results;
  }

  /**
   * Check if student answers are valid (all have left and right properties)
   * @param {Array} studentAnswers - The student's answers
   * @param {number} expectedCount - Expected number of matches
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
        message: `Expected ${expectedCount} matches, but received ${studentAnswers.length}`
      };
    }

    // Check if all answers have left and right properties
    const hasInvalidMatches = studentAnswers.some(answer => 
      !answer || typeof answer !== 'object' || !answer.left || !answer.right
    );

    if (hasInvalidMatches) {
      return {
        valid: false,
        message: 'All matches must have "left" and "right" properties'
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
      averageCorrectMatches: 0,
      matchPairStats: []
    };

    // Initialize match pair statistics
    question.correctMatches.forEach(correctMatch => {
      stats.matchPairStats.push({
        correctMatch: {
          left: correctMatch.left,
          right: correctMatch.right
        },
        correctCount: 0,
        incorrectCount: 0,
        correctPercentage: 0
      });
    });

    let totalMarks = 0;
    let totalCorrectMatches = 0;

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
        totalCorrectMatches += gradeResult.correctCount || 0;

        if (gradeResult.isCorrect) {
          stats.allCorrectCount++;
        } else if (gradeResult.earnedMarks > 0) {
          stats.partiallyCorrectCount++;
        } else {
          stats.allIncorrectCount++;
        }

        // Track per-match-pair statistics
        if (gradeResult.matchResults && gradeResult.matchResults.length > 0) {
          gradeResult.matchResults.forEach(result => {
            // Find which correct match this corresponds to
            const matchIndex = question.correctMatches.findIndex(correctMatch =>
              this.matchesAreEqual(result.studentMatch, correctMatch)
            );

            if (matchIndex !== -1 && matchIndex < stats.matchPairStats.length) {
              if (result.isCorrect) {
                stats.matchPairStats[matchIndex].correctCount++;
              } else {
                stats.matchPairStats[matchIndex].incorrectCount++;
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

    // Calculate average correct matches
    const answeredCount = allStudentAnswers.length - stats.unansweredCount;
    stats.averageCorrectMatches = answeredCount > 0
      ? (totalCorrectMatches / answeredCount).toFixed(2)
      : '0';

    // Calculate percentages
    stats.allCorrectPercentage = allStudentAnswers.length > 0
      ? ((stats.allCorrectCount / allStudentAnswers.length) * 100).toFixed(2)
      : '0';

    // Calculate per-match-pair percentages
    stats.matchPairStats.forEach(pairStat => {
      const totalAnswered = pairStat.correctCount + pairStat.incorrectCount;
      pairStat.correctPercentage = totalAnswered > 0
        ? ((pairStat.correctCount / totalAnswered) * 100).toFixed(2)
        : 0;
    });

    return stats;
  }
}

module.exports = MatchingHandler;
