/**
 * Test Suite for NumericHandler
 * 
 * Comprehensive tests for numeric question validation, grading, and statistics
 */

const NumericHandler = require('./NumericHandler');

describe('NumericHandler', () => {
  let handler;

  beforeEach(() => {
    handler = new NumericHandler();
  });

  // ==================== VALIDATION TESTS ====================

  describe('validate()', () => {
    test('should validate a correct numeric question', () => {
      const question = {
        id: 1,
        type: 'numeric',
        question: 'Calculate the area of a rectangle with length 12 cm and width 8 cm.',
        correctAnswer: '96',
        unit: 'cm²',
        marks: 2,
        explanation: 'Area = length × width = 12 × 8 = 96 cm²'
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should validate numeric question without unit', () => {
      const question = {
        id: 1,
        type: 'numeric',
        question: 'What is the sum of 5 and 3?',
        correctAnswer: '8',
        marks: 1,
        explanation: 'The sum of 5 and 3 is 8.'
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(true);
    });

    test('should validate numeric question with acceptable range', () => {
      const question = {
        id: 1,
        type: 'numeric',
        question: 'Calculate the value of pi to 2 decimal places.',
        correctAnswer: '3.14',
        acceptableRange: { min: 3.13, max: 3.15 },
        marks: 2,
        explanation: 'The value of pi is approximately 3.14.'
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(true);
    });

    test('should reject question with wrong type', () => {
      const question = {
        id: 1,
        type: 'multiple_choice',
        question: 'Test question',
        marks: 2
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Question must be of type "numeric"');
    });

    test('should reject question without required fields', () => {
      const question = {
        id: 1,
        type: 'numeric',
        question: 'Test'
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(false);
    });
  });

  // ==================== NUMERIC EXTRACTION TESTS ====================

  describe('extractNumericValue()', () => {
    test('should extract number from pure number', () => {
      expect(handler.extractNumericValue(96)).toBe(96);
      expect(handler.extractNumericValue(3.14)).toBe(3.14);
      expect(handler.extractNumericValue(-5)).toBe(-5);
    });

    test('should extract number from string', () => {
      expect(handler.extractNumericValue('96')).toBe(96);
      expect(handler.extractNumericValue('3.14')).toBe(3.14);
      expect(handler.extractNumericValue('-5')).toBe(-5);
    });

    test('should extract number from string with unit', () => {
      expect(handler.extractNumericValue('96 cm²')).toBe(96);
      expect(handler.extractNumericValue('96cm²')).toBe(96);
      expect(handler.extractNumericValue('3.14 m')).toBe(3.14);
    });

    test('should handle whitespace', () => {
      expect(handler.extractNumericValue('  96  ')).toBe(96);
      expect(handler.extractNumericValue('  3.14 cm  ')).toBe(3.14);
    });

    test('should return null for invalid values', () => {
      expect(handler.extractNumericValue('')).toBeNull();
      expect(handler.extractNumericValue(null)).toBeNull();
      expect(handler.extractNumericValue(undefined)).toBeNull();
      expect(handler.extractNumericValue('abc')).toBeNull();
      expect(handler.extractNumericValue(NaN)).toBeNull();
    });

    test('should handle decimal numbers', () => {
      expect(handler.extractNumericValue('0.5')).toBe(0.5);
      expect(handler.extractNumericValue('.5')).toBe(0.5);
      expect(handler.extractNumericValue('10.99')).toBe(10.99);
    });

    test('should handle zero', () => {
      expect(handler.extractNumericValue(0)).toBe(0);
      expect(handler.extractNumericValue('0')).toBe(0);
      expect(handler.extractNumericValue('0.0')).toBe(0);
    });
  });

  // ==================== UNIT EXTRACTION TESTS ====================

  describe('extractUnit()', () => {
    test('should extract unit from answer', () => {
      expect(handler.extractUnit('96 cm²')).toBe('cm²');
      expect(handler.extractUnit('96cm²')).toBe('cm²');
      expect(handler.extractUnit('3.14 m')).toBe('m');
      expect(handler.extractUnit('100 kg')).toBe('kg');
    });

    test('should handle no unit', () => {
      expect(handler.extractUnit('96')).toBeNull();
      expect(handler.extractUnit('3.14')).toBeNull();
    });

    test('should handle whitespace', () => {
      expect(handler.extractUnit('96  cm²')).toBe('cm²');
      expect(handler.extractUnit('  96 cm²  ')).toBe('cm²');
    });

    test('should return null for invalid input', () => {
      expect(handler.extractUnit(null)).toBeNull();
      expect(handler.extractUnit(undefined)).toBeNull();
      expect(handler.extractUnit(96)).toBeNull();
    });
  });

  // ==================== RANGE TESTS ====================

  describe('isWithinRange()', () => {
    test('should check if value is within range', () => {
      expect(handler.isWithinRange(3.14, { min: 3.13, max: 3.15 })).toBe(true);
      expect(handler.isWithinRange(3.13, { min: 3.13, max: 3.15 })).toBe(true);
      expect(handler.isWithinRange(3.15, { min: 3.13, max: 3.15 })).toBe(true);
    });

    test('should check if value is outside range', () => {
      expect(handler.isWithinRange(3.12, { min: 3.13, max: 3.15 })).toBe(false);
      expect(handler.isWithinRange(3.16, { min: 3.13, max: 3.15 })).toBe(false);
    });

    test('should handle min-only range', () => {
      expect(handler.isWithinRange(10, { min: 5 })).toBe(true);
      expect(handler.isWithinRange(3, { min: 5 })).toBe(false);
    });

    test('should handle max-only range', () => {
      expect(handler.isWithinRange(5, { max: 10 })).toBe(true);
      expect(handler.isWithinRange(15, { max: 10 })).toBe(false);
    });

    test('should return false for invalid range', () => {
      expect(handler.isWithinRange(5, null)).toBe(false);
      expect(handler.isWithinRange(5, undefined)).toBe(false);
      expect(handler.isWithinRange(5, 'not an object')).toBe(false);
    });
  });

  // ==================== GRADING TESTS ====================

  describe('grade()', () => {
    const validQuestion = {
      id: 1,
      type: 'numeric',
      question: 'Calculate the area of a rectangle with length 12 cm and width 8 cm.',
      correctAnswer: '96',
      unit: 'cm²',
      marks: 2,
      explanation: 'Area = length × width = 12 × 8 = 96 cm²'
    };

    test('should grade correct answer with unit', () => {
      const result = handler.grade(validQuestion, '96 cm²');
      
      expect(result.success).toBe(true);
      expect(result.earnedMarks).toBe(2);
      expect(result.totalMarks).toBe(2);
      expect(result.isCorrect).toBe(true);
      expect(result.numericValue).toBe(96);
      expect(result.unitCorrect).toBe(true);
      expect(result.feedback).toContain('Correct');
    });

    test('should grade correct answer without space before unit', () => {
      const result = handler.grade(validQuestion, '96cm²');
      
      expect(result.success).toBe(true);
      expect(result.earnedMarks).toBe(2);
      expect(result.isCorrect).toBe(true);
    });

    test('should reject correct number with wrong unit', () => {
      const result = handler.grade(validQuestion, '96 m²');
      
      expect(result.success).toBe(true);
      expect(result.earnedMarks).toBe(0);
      expect(result.isCorrect).toBe(false);
      expect(result.numericValue).toBe(96);
      expect(result.unitCorrect).toBe(false);
      expect(result.feedback).toContain('Incorrect unit');
    });

    test('should reject correct number without unit', () => {
      const result = handler.grade(validQuestion, '96');
      
      expect(result.success).toBe(true);
      expect(result.earnedMarks).toBe(0);
      expect(result.isCorrect).toBe(false);
      expect(result.unitCorrect).toBe(false);
      expect(result.feedback).toContain('Missing unit');
    });

    test('should grade question without unit requirement', () => {
      const questionNoUnit = {
        id: 1,
        type: 'numeric',
        question: 'What is the sum of 5 and 3?',
        correctAnswer: '8',
        marks: 1,
        explanation: 'The sum of 5 and 3 is 8.'
      };

      const result = handler.grade(questionNoUnit, '8');
      
      expect(result.success).toBe(true);
      expect(result.earnedMarks).toBe(1);
      expect(result.isCorrect).toBe(true);
    });

    test('should handle decimal answers', () => {
      const questionDecimal = {
        id: 1,
        type: 'numeric',
        question: 'What is 10 divided by 4?',
        correctAnswer: '2.5',
        marks: 2,
        explanation: '10 ÷ 4 = 2.5'
      };

      const result = handler.grade(questionDecimal, '2.5');
      
      expect(result.success).toBe(true);
      expect(result.earnedMarks).toBe(2);
      expect(result.isCorrect).toBe(true);
    });

    test('should handle acceptable range', () => {
      const questionRange = {
        id: 1,
        type: 'numeric',
        question: 'Calculate the value of pi to 2 decimal places.',
        correctAnswer: '3.14',
        acceptableRange: { min: 3.13, max: 3.15 },
        marks: 2,
        explanation: 'The value of pi is approximately 3.14.'
      };

      expect(handler.grade(questionRange, '3.14').isCorrect).toBe(true);
      expect(handler.grade(questionRange, '3.13').isCorrect).toBe(true);
      expect(handler.grade(questionRange, '3.15').isCorrect).toBe(true);
      expect(handler.grade(questionRange, '3.12').isCorrect).toBe(false);
      expect(handler.grade(questionRange, '3.16').isCorrect).toBe(false);
    });

    test('should handle negative numbers', () => {
      const questionNegative = {
        id: 1,
        type: 'numeric',
        question: 'What is -5 + 3?',
        correctAnswer: '-2',
        marks: 1,
        explanation: '-5 + 3 = -2'
      };

      const result = handler.grade(questionNegative, '-2');
      
      expect(result.success).toBe(true);
      expect(result.earnedMarks).toBe(1);
      expect(result.isCorrect).toBe(true);
    });

    test('should handle zero', () => {
      const questionZero = {
        id: 1,
        type: 'numeric',
        question: 'What is the result of 5 minus 5?',
        correctAnswer: '0',
        marks: 1,
        explanation: 'The result of 5 minus 5 is 0.'
      };

      const result = handler.grade(questionZero, '0');
      
      expect(result.success).toBe(true);
      expect(result.earnedMarks).toBe(1);
      expect(result.isCorrect).toBe(true);
    });

    test('should handle incorrect answer', () => {
      const result = handler.grade(validQuestion, '100 cm²');
      
      expect(result.success).toBe(true);
      expect(result.earnedMarks).toBe(0);
      expect(result.isCorrect).toBe(false);
      expect(result.feedback).toContain('Incorrect');
    });

    test('should handle empty answer', () => {
      const result = handler.grade(validQuestion, '');
      
      expect(result.success).toBe(true);
      expect(result.earnedMarks).toBe(0);
      expect(result.isCorrect).toBe(false);
      expect(result.feedback).toContain('No answer provided');
    });

    test('should handle null answer', () => {
      const result = handler.grade(validQuestion, null);
      
      expect(result.success).toBe(true);
      expect(result.earnedMarks).toBe(0);
      expect(result.feedback).toContain('No answer provided');
    });

    test('should handle undefined answer', () => {
      const result = handler.grade(validQuestion, undefined);
      
      expect(result.success).toBe(true);
      expect(result.earnedMarks).toBe(0);
      expect(result.feedback).toContain('No answer provided');
    });

    test('should handle invalid numeric format', () => {
      const result = handler.grade(validQuestion, 'abc');
      
      expect(result.success).toBe(true);
      expect(result.earnedMarks).toBe(0);
      expect(result.isCorrect).toBe(false);
      expect(result.feedback).toContain('Invalid numeric answer format');
    });

    test('should handle invalid question structure', () => {
      const invalidQuestion = {
        id: 1,
        type: 'numeric',
        question: 'Test'
      };

      const result = handler.grade(invalidQuestion, '96');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid question structure');
    });

    test('should handle floating point precision', () => {
      const questionFloat = {
        id: 1,
        type: 'numeric',
        question: 'What is 0.1 + 0.2?',
        correctAnswer: '0.3',
        marks: 1,
        explanation: '0.1 + 0.2 = 0.3'
      };

      // JavaScript: 0.1 + 0.2 = 0.30000000000000004
      const result = handler.grade(questionFloat, '0.3');
      
      expect(result.success).toBe(true);
      expect(result.isCorrect).toBe(true);
    });
  });

  // ==================== BATCH GRADING TESTS ====================

  describe('gradeMultiple()', () => {
    const questions = [
      {
        id: 1,
        type: 'numeric',
        question: 'What is the sum of 5 and 3?',
        correctAnswer: '8',
        marks: 1,
        explanation: 'The sum of 5 and 3 is 8.'
      },
      {
        id: 2,
        type: 'numeric',
        question: 'What is the result of 10 minus 4?',
        correctAnswer: '6',
        marks: 1,
        explanation: 'The result of 10 minus 4 is 6.'
      },
      {
        id: 3,
        type: 'multiple_choice',
        question: 'Not a numeric question',
        options: ['A', 'B'],
        correctAnswer: 'A',
        marks: 1,
        explanation: 'Test question'
      }
    ];

    test('should grade multiple numeric questions', () => {
      const studentAnswers = {
        1: '8',
        2: '6'
      };

      const result = handler.gradeMultiple(questions, studentAnswers);
      
      expect(result.totalQuestions).toBe(2);
      expect(result.totalMarks).toBe(2);
      expect(result.earnedMarks).toBe(2);
      expect(result.correctCount).toBe(2);
      expect(result.percentage).toBe('100.00');
    });

    test('should handle partially correct answers', () => {
      const studentAnswers = {
        1: '8',
        2: '5'
      };

      const result = handler.gradeMultiple(questions, studentAnswers);
      
      expect(result.totalQuestions).toBe(2);
      expect(result.earnedMarks).toBe(1);
      expect(result.correctCount).toBe(1);
      expect(result.incorrectCount).toBe(1);
    });

    test('should handle unanswered questions', () => {
      const studentAnswers = {
        1: '8'
      };

      const result = handler.gradeMultiple(questions, studentAnswers);
      
      expect(result.totalQuestions).toBe(2);
      expect(result.correctCount).toBe(1);
      expect(result.unansweredCount).toBe(1);
    });

    test('should filter only numeric questions', () => {
      const studentAnswers = {
        1: '8',
        2: '6',
        3: 'A'
      };

      const result = handler.gradeMultiple(questions, studentAnswers);
      
      expect(result.totalQuestions).toBe(2);
    });

    test('should handle empty questions array', () => {
      const result = handler.gradeMultiple([], {});
      
      expect(result.totalQuestions).toBe(0);
      expect(result.totalMarks).toBe(0);
      expect(result.earnedMarks).toBe(0);
    });
  });

  // ==================== ANSWER VALIDATION TESTS ====================

  describe('isAnswerValid()', () => {
    test('should validate numeric answers', () => {
      expect(handler.isAnswerValid('96').valid).toBe(true);
      expect(handler.isAnswerValid('3.14').valid).toBe(true);
      expect(handler.isAnswerValid('-5').valid).toBe(true);
      expect(handler.isAnswerValid('96 cm²').valid).toBe(true);
    });

    test('should reject non-numeric answers', () => {
      expect(handler.isAnswerValid('abc').valid).toBe(false);
      expect(handler.isAnswerValid('').valid).toBe(false);
      expect(handler.isAnswerValid(null).valid).toBe(false);
    });

    test('should provide appropriate messages', () => {
      expect(handler.isAnswerValid('96').message).toBe('Answer is valid');
      expect(handler.isAnswerValid('abc').message).toBe('Answer must be a valid number');
      expect(handler.isAnswerValid('').message).toBe('Answer cannot be empty');
    });
  });

  // ==================== STATISTICS TESTS ====================

  describe('getQuestionStatistics()', () => {
    const question = {
      id: 1,
      type: 'numeric',
      question: 'What is the sum of 5 and 3?',
      correctAnswer: '8',
      marks: 1,
      explanation: 'The sum of 5 and 3 is 8.'
    };

    test('should calculate statistics for all correct answers', () => {
      const allAnswers = ['8', '8', '8'];

      const stats = handler.getQuestionStatistics(question, allAnswers);
      
      expect(stats.totalResponses).toBe(3);
      expect(stats.correctCount).toBe(3);
      expect(stats.incorrectCount).toBe(0);
      expect(stats.averageScore).toBe('1.00');
      expect(stats.correctPercentage).toBe('100.00');
    });

    test('should calculate statistics for mixed answers', () => {
      const allAnswers = ['8', '7', '9', '8'];

      const stats = handler.getQuestionStatistics(question, allAnswers);
      
      expect(stats.totalResponses).toBe(4);
      expect(stats.correctCount).toBe(2);
      expect(stats.incorrectCount).toBe(2);
      expect(stats.correctPercentage).toBe('50.00');
    });

    test('should handle unanswered questions', () => {
      const allAnswers = ['8', '', null];

      const stats = handler.getQuestionStatistics(question, allAnswers);
      
      expect(stats.totalResponses).toBe(3);
      expect(stats.correctCount).toBe(1);
      expect(stats.unansweredCount).toBe(2);
    });

    test('should calculate answer distribution', () => {
      const allAnswers = ['5', '8', '10', '8', '7'];

      const stats = handler.getQuestionStatistics(question, allAnswers);
      
      expect(stats.answerDistribution.min).toBe(5);
      expect(stats.answerDistribution.max).toBe(10);
      expect(parseFloat(stats.answerDistribution.mean)).toBeCloseTo(7.6, 1);
      expect(parseFloat(stats.answerDistribution.median)).toBe(8);
    });

    test('should handle empty responses', () => {
      const stats = handler.getQuestionStatistics(question, []);
      
      expect(stats.totalResponses).toBe(0);
      expect(stats.averageScore).toBe('0');
      expect(stats.correctPercentage).toBe('0');
    });

    test('should handle invalid answers', () => {
      const allAnswers = ['8', 'abc', 'xyz'];

      const stats = handler.getQuestionStatistics(question, allAnswers);
      
      expect(stats.totalResponses).toBe(3);
      expect(stats.correctCount).toBe(1);
      expect(stats.invalidCount).toBe(2);
    });

    test('should calculate median for even number of answers', () => {
      const allAnswers = ['5', '7', '9', '11'];

      const stats = handler.getQuestionStatistics(question, allAnswers);
      
      expect(parseFloat(stats.answerDistribution.median)).toBe(8);
    });

    test('should calculate median for odd number of answers', () => {
      const allAnswers = ['5', '7', '9'];

      const stats = handler.getQuestionStatistics(question, allAnswers);
      
      expect(parseFloat(stats.answerDistribution.median)).toBe(7);
    });
  });
});
