/**
 * Multiple Choice Question Handler
 * 
 * This handler provides validation and grading functionality for multiple choice questions
 * in the AI Test Generator system. It integrates with the auto-grading engine to provide
 * immediate feedback to students.
 * 
 * Features:
 * - Validates multiple choice question structure against schema
 * - Grades student answers with case-insensitive comparison
 * - Handles whitespace trimming
 * - Generates feedback for correct/incorrect answers
 * - Returns grading results with earned marks
 */

const { multipleChoiceSchema, validateQuestion } = require('../schemas/questionTypes');

class MultipleChoiceHandler {
  /**
   * Validate a multiple choice question structure
   * @param {Object} question - The question object to validate
   * @returns {Object} - { valid: boolean, errors: Array<string> }
   */
  validate(question) {
    // First check if the question type is correct
    if (!question || question.type !== 'multiple_choice') {
      return {
        valid: false,
        errors: ['Question must be of type "multiple_choice"']
      };
    }

    // Use the schema validation function
    const validation = validateQuestion(question);
    
    return validation;
  }

  /**
   * Grade a student's answer to a multiple choice question
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

    // Normalize both answers for comparison (case-insensitive, trim whitespace)
    const normalizedStudentAnswer = String(studentAnswer).trim().toLowerCase();
    const normalizedCorrectAnswer = String(question.correctAnswer).trim().toLowerCase();

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

    // Filter only multiple choice questions
    const mcQuestions = questions.filter(q => q.type === 'multiple_choice');
    results.totalQuestions = mcQuestions.length;

    // Grade each question
    mcQuestions.forEach(question => {
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
   * Check if a student answer is valid (exists in options)
   * @param {Object} question - The question object
   * @param {string} studentAnswer - The student's answer
   * @returns {Object} - { valid: boolean, message: string }
   */
  isAnswerValid(question, studentAnswer) {
    if (!question.options || !Array.isArray(question.options)) {
      return {
        valid: false,
        message: 'Question options are not properly defined'
      };
    }

    if (!studentAnswer || studentAnswer === '') {
      return {
        valid: false,
        message: 'Answer cannot be empty'
      };
    }

    // Normalize for comparison
    const normalizedAnswer = String(studentAnswer).trim().toLowerCase();
    const normalizedOptions = question.options.map(opt => 
      String(opt).trim().toLowerCase()
    );

    const isValid = normalizedOptions.includes(normalizedAnswer);

    return {
      valid: isValid,
      message: isValid 
        ? 'Answer is valid' 
        : 'Answer must be one of the provided options'
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
      optionDistribution: {},
      averageScore: 0
    };

    // Initialize option distribution
    if (question.options && Array.isArray(question.options)) {
      question.options.forEach(option => {
        stats.optionDistribution[option] = 0;
      });
    }

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

      // Track option distribution (case-insensitive)
      const normalizedAnswer = String(answer).trim();
      if (question.options && Array.isArray(question.options)) {
        const matchingOption = question.options.find(opt => 
          String(opt).trim().toLowerCase() === normalizedAnswer.toLowerCase()
        );

        if (matchingOption) {
          stats.optionDistribution[matchingOption]++;
        }
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

module.exports = MultipleChoiceHandler;
