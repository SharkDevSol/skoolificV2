/**
 * Test Suite for TransformationHandler
 * 
 * Tests validation, grading, and statistics generation
 * for transformation/error correction questions in the AI Test Generator system.
 */

const TransformationHandler = require('./TransformationHandler');

describe('TransformationHandler', () => {
  let handler;

  beforeEach(() => {
    handler = new TransformationHandler();
  });

  describe('validate()', () => {
    test('should validate a correct transformation question', () => {
      const question = {
        id: 1,
        type: 'transformation',
        question: 'Correct the grammatical errors in the following sentence:',
        originalText: 'The students was going to school when it start raining.',
        correctTransformation: 'The students were going to school when it started raining.',
        marks: 2,
        explanation: 'Subject-verb agreement and past tense consistency.'
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject question with wrong type', () => {
      const question = {
        id: 1,
        type: 'multiple_choice',
        question: 'Test question?',
        marks: 2
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Question must be of type "transformation"');
    });

    test('should reject question without type', () => {
      const question = {
        id: 1,
        question: 'Test question?',
        marks: 2
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Question must be of type "transformation"');
    });

    test('should reject question without required fields', () => {
      const question = {
        id: 1,
        type: 'transformation',
        question: 'Correct the errors:'
        // Missing originalText, correctTransformation, marks, explanation
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should reject question with short original text', () => {
      const question = {
        id: 1,
        type: 'transformation',
        question: 'Correct the errors:',
        originalText: 'Bad', // Too short (< 5 chars)
        correctTransformation: 'Good',
        marks: 2,
        explanation: 'Test'
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(false);
    });

    test('should reject question with short correct transformation', () => {
      const question = {
        id: 1,
        type: 'transformation',
        question: 'Correct the errors:',
        originalText: 'This is wrong',
        correctTransformation: 'OK', // Too short (< 5 chars)
        marks: 2,
        explanation: 'Test'
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(false);
    });
  });

  describe('normalizeText()', () => {
    test('should convert to lowercase', () => {
      const result = handler.normalizeText('HELLO WORLD');
      expect(result).toBe('hello world');
    });

    test('should trim whitespace', () => {
      const result = handler.normalizeText('  hello world  ');
      expect(result).toBe('hello world');
    });

    test('should normalize internal whitespace', () => {
      const result = handler.normalizeText('hello    world\n\tthere');
      expect(result).toBe('hello world there');
    });

    test('should handle empty string', () => {
      const result = handler.normalizeText('');
      expect(result).toBe('');
    });

    test('should handle non-string input', () => {
      const result = handler.normalizeText(123);
      expect(result).toBe('');
    });

    test('should handle null', () => {
      const result = handler.normalizeText(null);
      expect(result).toBe('');
    });
  });

  describe('isTransformationValid()', () => {
    test('should accept valid transformation', () => {
      const result = handler.isTransformationValid('This is a valid transformation');
      
      expect(result.valid).toBe(true);
      expect(result.message).toBe('Transformation is valid');
    });

    test('should reject undefined transformation', () => {
      const result = handler.isTransformationValid(undefined);
      
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Transformation is required');
    });

    test('should reject null transformation', () => {
      const result = handler.isTransformationValid(null);
      
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Transformation is required');
    });

    test('should reject non-string transformation', () => {
      const result = handler.isTransformationValid(12345);
      
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Transformation must be a string');
    });

    test('should reject empty string transformation', () => {
      const result = handler.isTransformationValid('');
      
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Transformation cannot be empty');
    });

    test('should reject whitespace-only transformation', () => {
      const result = handler.isTransformationValid('   \n\t  ');
      
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Transformation cannot be empty');
    });
  });

  describe('grade()', () => {
    const validQuestion = {
      id: 1,
      type: 'transformation',
      question: 'Correct the grammatical errors:',
      originalText: 'The students was going to school when it start raining.',
      correctTransformation: 'The students were going to school when it started raining.',
      marks: 2,
      explanation: 'Subject-verb agreement and past tense consistency.'
    };

    test('should grade correct transformation', () => {
      const studentTransformation = 'The students were going to school when it started raining.';
      
      const result = handler.grade(validQuestion, studentTransformation);
      
      expect(result.success).toBe(true);
      expect(result.earnedMarks).toBe(2);
      expect(result.totalMarks).toBe(2);
      expect(result.isCorrect).toBe(true);
      expect(result.feedback).toContain('Correct');
      expect(result.studentTransformation).toBe(studentTransformation);
      expect(result.correctTransformation).toBe(validQuestion.correctTransformation);
      expect(result.originalText).toBe(validQuestion.originalText);
      expect(result.explanation).toBe(validQuestion.explanation);
    });

    test('should grade correct transformation with different case', () => {
      const studentTransformation = 'THE STUDENTS WERE GOING TO SCHOOL WHEN IT STARTED RAINING.';
      
      const result = handler.grade(validQuestion, studentTransformation);
      
      expect(result.isCorrect).toBe(true);
      expect(result.earnedMarks).toBe(2);
    });

    test('should grade correct transformation with extra whitespace', () => {
      const studentTransformation = '  The   students  were   going to school when it started raining.  ';
      
      const result = handler.grade(validQuestion, studentTransformation);
      
      expect(result.isCorrect).toBe(true);
      expect(result.earnedMarks).toBe(2);
    });

    test('should grade incorrect transformation', () => {
      const studentTransformation = 'The students was going to school when it starts raining.';
      
      const result = handler.grade(validQuestion, studentTransformation);
      
      expect(result.success).toBe(true);
      expect(result.earnedMarks).toBe(0);
      expect(result.totalMarks).toBe(2);
      expect(result.isCorrect).toBe(false);
      expect(result.feedback).toContain('Incorrect');
    });

    test('should reject invalid question structure', () => {
      const invalidQuestion = {
        id: 1,
        type: 'transformation',
        question: 'Test?' // Too short
      };
      const studentTransformation = 'Some transformation';
      
      const result = handler.grade(invalidQuestion, studentTransformation);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid question structure');
      expect(result.earnedMarks).toBe(0);
    });

    test('should reject undefined student transformation', () => {
      const result = handler.grade(validQuestion, undefined);
      
      expect(result.success).toBe(true);
      expect(result.isCorrect).toBe(false);
      expect(result.earnedMarks).toBe(0);
      expect(result.feedback).toBe('Transformation is required');
    });

    test('should reject empty student transformation', () => {
      const result = handler.grade(validQuestion, '');
      
      expect(result.success).toBe(true);
      expect(result.isCorrect).toBe(false);
      expect(result.earnedMarks).toBe(0);
      expect(result.feedback).toBe('Transformation cannot be empty');
    });

    test('should include original text in result', () => {
      const studentTransformation = 'The students were going to school when it started raining.';
      
      const result = handler.grade(validQuestion, studentTransformation);
      
      expect(result.originalText).toBe(validQuestion.originalText);
    });
  });

  describe('gradeMultiple()', () => {
    const questions = [
      {
        id: 1,
        type: 'transformation',
        question: 'Correct the errors:',
        originalText: 'She don\'t like apples.',
        correctTransformation: 'She doesn\'t like apples.',
        marks: 1,
        explanation: 'Subject-verb agreement'
      },
      {
        id: 2,
        type: 'transformation',
        question: 'Correct the errors:',
        originalText: 'They was happy.',
        correctTransformation: 'They were happy.',
        marks: 1,
        explanation: 'Subject-verb agreement'
      },
      {
        id: 3,
        type: 'multiple_choice', // Different type - should be filtered out
        question: 'What is 2+2?',
        options: ['3', '4', '5'],
        correctAnswer: '4',
        marks: 1,
        explanation: 'Basic math'
      }
    ];

    test('should grade multiple transformation questions', () => {
      const studentTransformations = {
        1: 'She doesn\'t like apples.',
        2: 'They were happy.',
        3: '4' // This should be ignored (not a transformation)
      };

      const result = handler.gradeMultiple(questions, studentTransformations);

      expect(result.totalQuestions).toBe(2); // Only transformation questions
      expect(result.totalMarks).toBe(2);
      expect(result.earnedMarks).toBe(2);
      expect(result.correctCount).toBe(2);
      expect(result.incorrectCount).toBe(0);
      expect(result.unansweredCount).toBe(0);
      expect(result.percentage).toBe('100.00');
      expect(result.questionResults).toHaveLength(2);
    });

    test('should handle partially correct answers', () => {
      const studentTransformations = {
        1: 'She doesn\'t like apples.', // Correct
        2: 'They was happy.' // Incorrect
      };

      const result = handler.gradeMultiple(questions, studentTransformations);

      expect(result.earnedMarks).toBe(1);
      expect(result.correctCount).toBe(1);
      expect(result.incorrectCount).toBe(1);
      expect(result.percentage).toBe('50.00');
    });

    test('should handle unanswered questions', () => {
      const studentTransformations = {
        1: 'She doesn\'t like apples.',
        2: '' // Empty answer
      };

      const result = handler.gradeMultiple(questions, studentTransformations);

      expect(result.correctCount).toBe(1);
      expect(result.unansweredCount).toBe(1);
    });

    test('should handle missing answers', () => {
      const studentTransformations = {
        1: 'She doesn\'t like apples.'
        // Question 2 not answered
      };

      const result = handler.gradeMultiple(questions, studentTransformations);

      expect(result.correctCount).toBe(1);
      expect(result.unansweredCount).toBe(1);
    });

    test('should filter out non-transformation questions', () => {
      const studentTransformations = {
        1: 'She doesn\'t like apples.',
        2: 'They were happy.',
        3: '4'
      };

      const result = handler.gradeMultiple(questions, studentTransformations);

      expect(result.totalQuestions).toBe(2); // Only transformations
      expect(result.questionResults).toHaveLength(2);
    });

    test('should include question IDs in results', () => {
      const studentTransformations = {
        1: 'She doesn\'t like apples.',
        2: 'They were happy.'
      };

      const result = handler.gradeMultiple(questions, studentTransformations);

      expect(result.questionResults[0].questionId).toBe(1);
      expect(result.questionResults[1].questionId).toBe(2);
    });

    test('should calculate percentage correctly', () => {
      const studentTransformations = {
        1: 'She doesn\'t like apples.', // Correct (1 mark)
        2: 'They was happy.' // Incorrect (0 marks)
      };

      const result = handler.gradeMultiple(questions, studentTransformations);

      expect(result.percentage).toBe('50.00'); // 1/2 * 100
    });
  });

  describe('getQuestionStatistics()', () => {
    const question = {
      id: 1,
      type: 'transformation',
      question: 'Correct the errors:',
      originalText: 'She don\'t like apples.',
      correctTransformation: 'She doesn\'t like apples.',
      marks: 1,
      explanation: 'Subject-verb agreement'
    };

    test('should generate statistics for transformations', () => {
      const allTransformations = [
        'She doesn\'t like apples.', // Correct
        'She doesn\'t like apples.', // Correct
        'She don\'t like apples.' // Incorrect (same as original)
      ];

      const stats = handler.getQuestionStatistics(question, allTransformations);

      expect(stats.questionId).toBe(1);
      expect(stats.totalResponses).toBe(3);
      expect(stats.correctCount).toBe(2);
      expect(stats.incorrectCount).toBe(1);
      expect(stats.unansweredCount).toBe(0);
      expect(stats.averageScore).toBe('0.67'); // (1+1+0)/3
      expect(stats.correctPercentage).toBe('66.67'); // 2/3 * 100
    });

    test('should handle unanswered transformations', () => {
      const allTransformations = [
        'She doesn\'t like apples.', // Correct
        '', // Unanswered
        null // Unanswered
      ];

      const stats = handler.getQuestionStatistics(question, allTransformations);

      expect(stats.correctCount).toBe(1);
      expect(stats.unansweredCount).toBe(2);
      expect(stats.averageScore).toBe('1.00'); // Only count answered
    });

    test('should track common errors', () => {
      const allTransformations = [
        'She don\'t like apples.', // Error 1
        'She don\'t like apples.', // Error 1 (same)
        'She do not like apples.', // Error 2
        'She doesn\'t like apples.' // Correct
      ];

      const stats = handler.getQuestionStatistics(question, allTransformations);

      expect(stats.commonErrors).toBeDefined();
      expect(Object.keys(stats.commonErrors).length).toBeGreaterThan(0);
      // Most common error should be first
      const errors = Object.entries(stats.commonErrors);
      expect(errors[0][1]).toBe(2); // "she don't like apples." appears twice
    });

    test('should limit common errors to top 5', () => {
      const allTransformations = [
        'Error 1',
        'Error 1',
        'Error 1',
        'Error 2',
        'Error 2',
        'Error 3',
        'Error 4',
        'Error 5',
        'Error 6',
        'Error 7'
      ];

      const stats = handler.getQuestionStatistics(question, allTransformations);

      expect(Object.keys(stats.commonErrors).length).toBeLessThanOrEqual(5);
    });

    test('should handle empty responses array', () => {
      const stats = handler.getQuestionStatistics(question, []);

      expect(stats.totalResponses).toBe(0);
      expect(stats.correctCount).toBe(0);
      expect(stats.averageScore).toBe('0');
    });

    test('should include original text and correct transformation', () => {
      const stats = handler.getQuestionStatistics(question, []);

      expect(stats.originalText).toBe(question.originalText);
      expect(stats.correctTransformation).toBe(question.correctTransformation);
    });

    test('should handle case-insensitive comparison in statistics', () => {
      const allTransformations = [
        'She doesn\'t like apples.', // Correct
        'SHE DOESN\'T LIKE APPLES.', // Correct (different case)
        'She Doesn\'t Like Apples.' // Correct (mixed case)
      ];

      const stats = handler.getQuestionStatistics(question, allTransformations);

      expect(stats.correctCount).toBe(3);
      expect(stats.incorrectCount).toBe(0);
    });
  });
});
