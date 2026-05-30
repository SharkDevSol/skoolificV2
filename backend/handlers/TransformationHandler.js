/**
 * Transformation/Error Correction Question Handler
 * 
 * This handler provides validation and grading for transformation/error correction questions
 * in the AI Test Generator system. These questions ask students to transform or correct
 * given text (e.g., grammar correction, sentence transformation, code correction).
 * 
 * Features:
 * - Validates transformation question structure against schema
 * - Grades student transformations with case-insensitive comparison
 * - Whitespace handling (trims and normalizes whitespace)
 * - Provides detailed feedback for correct/incorrect transformations
 * - Supports batch processing for multiple questions
 * - Generates analytics for question performance
 * 
 * Grading is automatic based on exact match (case-insensitive, whitespace-normalized).
 */

const { transformationSchema, validateQuestion } = require('../schemas/questionTypes');

class TransformationHandler {
  /**
   * Validate a transformation question structure
   * @param {Object} question - The question object to validate
   * @returns {Object} - { valid: boolean, errors: Array<string> }
   */
  validate(question) {
    // First check if the question type is correct
    if (!question || question.type !== 'transformation') {
      return {
        valid: false,
        errors: ['Question must be of type "transformation"']
      };
    }

    // Use the schema validation function
    const validation = validateQuestion(question);
    
    return validation;
  }

  /**
   * Normalize text for comparison
   * - Converts to lowercase
   * - Trims leading/trailing whitespace
   * - Normalizes internal whitespace (multiple spaces/tabs/newlines to single space)
   * @param {string} text - The text to normalize
   * @returns {string} - Normalized text
   */
  normalizeText(text) {
    if (typeof text !== 'string') {
      return '';
    }
    
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' '); // Replace multiple whitespace with single space
  }

  /**
   * Check if a student transformation is valid (non-empty string)
   * @param {any} studentTransformation - The student's transformation to validate
   * @returns {Object} - { valid: boolean, message: string }
   */
  isTransformationValid(studentTransformation) {
    if (studentTransformation === undefined || studentTransformation === null) {
      return {
        valid: false,
        message: 'Transformation is required'
      };
    }

    if (typeof studentTransformation !== 'string') {
      return {
        valid: false,
        message: 'Transformation must be a string'
      };
    }

    if (studentTransformation.trim().length === 0) {
      return {
        valid: false,
        message: 'Transformation cannot be empty'
      };
    }

    return {
      valid: true,
      message: 'Transformation is valid'
    };
  }

  /**
   * Grade a student's transformation
   * 
   * Compares the student's transformation with the correct transformation using
   * case-insensitive, whitespace-normalized comparison.
   * 
   * @param {Object} question - The question object containing correct transformation
   * @param {string} studentTransformation - The student's submitted transformation
   * @returns {Object} - Grading result
   */
  grade(question, studentTransformation) {
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

    // Validate student transformation format
    const transformationValidation = this.isTransformationValid(studentTransformation);
    if (!transformationValidation.valid) {
      return {
        success: true,
        earnedMarks: 0,
        totalMarks: question.marks,
        isCorrect: false,
        feedback: transformationValidation.message,
        studentTransformation: studentTransformation,
        correctTransformation: question.correctTransformation,
        originalText: question.originalText,
        explanation: question.explanation
      };
    }

    // Normalize both transformations for comparison
    const normalizedStudent = this.normalizeText(studentTransformation);
    const normalizedCorrect = this.normalizeText(question.correctTransformation);

    // Compare transformations
    const isCorrect = normalizedStudent === normalizedCorrect;
    const earnedMarks = isCorrect ? question.marks : 0;

    // Generate feedback
    let feedback;
    if (isCorrect) {
      feedback = 'Correct! Your transformation matches the expected answer.';
    } else {
      feedback = 'Incorrect. Your transformation does not match the expected answer.';
    }

    return {
      success: true,
      earnedMarks,
      totalMarks: question.marks,
      isCorrect,
      feedback,
      studentTransformation,
      correctTransformation: question.correctTransformation,
      originalText: question.originalText,
      explanation: question.explanation
    };
  }

  /**
   * Grade multiple transformation questions at once
   * 
   * @param {Array<Object>} questions - Array of question objects
   * @param {Object} studentTransformations - Object mapping question IDs to student transformations
   * @returns {Object} - Overall grading results
   */
  gradeMultiple(questions, studentTransformations) {
    const results = {
      totalQuestions: 0,
      totalMarks: 0,
      earnedMarks: 0,
      correctCount: 0,
      incorrectCount: 0,
      unansweredCount: 0,
      percentage: '0',
      questionResults: []
    };

    // Filter only transformation questions
    const transformationQuestions = questions.filter(q => q.type === 'transformation');
    results.totalQuestions = transformationQuestions.length;

    // Process each question
    transformationQuestions.forEach(question => {
      const studentTransformation = studentTransformations[question.id];
      const gradeResult = this.grade(question, studentTransformation);

      // Count total marks
      results.totalMarks += gradeResult.totalMarks;
      results.earnedMarks += gradeResult.earnedMarks;

      // Count correct/incorrect/unanswered
      if (!gradeResult.success || gradeResult.studentTransformation === undefined || 
          gradeResult.studentTransformation === null || gradeResult.studentTransformation === '') {
        results.unansweredCount++;
      } else if (gradeResult.isCorrect) {
        results.correctCount++;
      } else {
        results.incorrectCount++;
      }

      results.questionResults.push({
        questionId: question.id,
        ...gradeResult
      });
    });

    // Calculate percentage
    if (results.totalMarks > 0) {
      results.percentage = ((results.earnedMarks / results.totalMarks) * 100).toFixed(2);
    }

    return results;
  }

  /**
   * Get question statistics for analytics
   * 
   * @param {Object} question - The question object
   * @param {Array<string>} allStudentTransformations - Array of all student transformations for this question
   * @returns {Object} - Statistics about the question performance
   */
  getQuestionStatistics(question, allStudentTransformations) {
    const stats = {
      questionId: question.id,
      totalResponses: allStudentTransformations.length,
      correctCount: 0,
      incorrectCount: 0,
      unansweredCount: 0,
      averageScore: '0',
      correctPercentage: '0',
      originalText: question.originalText,
      correctTransformation: question.correctTransformation,
      commonErrors: {}
    };

    if (allStudentTransformations.length === 0) {
      return stats;
    }

    let totalScore = 0;

    // Analyze each transformation
    allStudentTransformations.forEach(transformation => {
      // Check if answered
      if (transformation === undefined || transformation === null || 
          (typeof transformation === 'string' && transformation.trim().length === 0)) {
        stats.unansweredCount++;
        return;
      }

      // Grade the transformation
      const result = this.grade(question, transformation);
      totalScore += result.earnedMarks;

      if (result.isCorrect) {
        stats.correctCount++;
      } else {
        stats.incorrectCount++;
        
        // Track common errors (normalized transformations)
        const normalized = this.normalizeText(transformation);
        if (normalized) {
          stats.commonErrors[normalized] = (stats.commonErrors[normalized] || 0) + 1;
        }
      }
    });

    // Calculate averages
    const answeredCount = stats.correctCount + stats.incorrectCount;
    if (answeredCount > 0) {
      stats.averageScore = (totalScore / answeredCount).toFixed(2);
      stats.correctPercentage = ((stats.correctCount / answeredCount) * 100).toFixed(2);
    }

    // Sort common errors by frequency
    stats.commonErrors = Object.entries(stats.commonErrors)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5) // Top 5 common errors
      .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {});

    return stats;
  }
}

module.exports = TransformationHandler;
