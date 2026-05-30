/**
 * Fill-in-the-Blank Handler Test Suite
 * 
 * Comprehensive tests for FillBlankHandler functionality including:
 * - Question validation
 * - Answer grading (all correct, partially correct, all incorrect, unanswered)
 * - Partial credit calculation
 * - Case-insensitive matching
 * - Batch grading (gradeMultiple)
 * - Answer validation (areAnswersValid)
 * - Statistics generation (getQuestionStatistics)
 */

const FillBlankHandler = require('./FillBlankHandler');

describe('FillBlankHandler', () => {
  let handler;

  beforeEach(() => {
    handler = new FillBlankHandler();
  });

  // ==================== VALIDATION TESTS ====================

  describe('validate()', () => {
    test('should validate a correct fill-in-the-blank question', () => {
      const question = {
        id: 1,
        type: 'fill_blank',
        question: 'The capital of Ethiopia is _____ and it is located at an elevation of approximately _____ meters.',
        correctAnswers: ['Addis Ababa', '2400'],
        marks: 2,
        explanation: 'Addis Ababa is the capital of Ethiopia and sits at about 2,400 meters above sea level.'
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject question with wrong type', () => {
      const question = {
        id: 1,
        type: 'multiple_choice',
        question: 'The capital is _____',
        correctAnswers: ['Addis Ababa'],
        marks: 1,
        explanation: 'Test'
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Question must be of type "fill_blank"');
    });

    test('should reject question without blank markers', () => {
      const question = {
        id: 1,
        type: 'fill_blank',
        question: 'The capital of Ethiopia is Addis Ababa',
        correctAnswers: ['Addis Ababa'],
        marks: 1,
        explanation: 'Test'
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('_____'))).toBe(true);
    });

    test('should reject question without correctAnswers', () => {
      const question = {
        id: 1,
        type: 'fill_blank',
        question: 'The capital is _____',
        marks: 1,
        explanation: 'Test'
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('correctAnswers'))).toBe(true);
    });

    test('should reject question with empty correctAnswers array', () => {
      const question = {
        id: 1,
        type: 'fill_blank',
        question: 'The capital is _____',
        correctAnswers: [],
        marks: 1,
        explanation: 'Test'
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(false);
    });

    test('should validate question with multiple blanks', () => {
      const question = {
        id: 1,
        type: 'fill_blank',
        question: '_____ is the capital of _____ and has a population of about _____ million.',
        correctAnswers: ['Addis Ababa', 'Ethiopia', '3.4'],
        marks: 3,
        explanation: 'Addis Ababa is the capital of Ethiopia with a population of about 3.4 million people.'
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(true);
    });

    test('should reject question without marks', () => {
      const question = {
        id: 1,
        type: 'fill_blank',
        question: 'The capital is _____',
        correctAnswers: ['Addis Ababa'],
        explanation: 'Test'
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(false);
    });

    test('should reject question without explanation', () => {
      const question = {
        id: 1,
        type: 'fill_blank',
        question: 'The capital is _____',
        correctAnswers: ['Addis Ababa'],
        marks: 1
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(false);
    });
  });

  // ==================== NORMALIZATION TESTS ====================

  describe('normalizeAnswer()', () => {
    test('should normalize string answers', () => {
      expect(handler.normalizeAnswer('Addis Ababa')).toBe('addis ababa');
      expect(handler.normalizeAnswer('  ETHIOPIA  ')).toBe('ethiopia');
      expect(handler.normalizeAnswer('2400')).toBe('2400');
    });

    test('should normalize number answers', () => {
      expect(handler.normalizeAnswer(2400)).toBe('2400');
      expect(handler.normalizeAnswer(3.14)).toBe('3.14');
    });

    test('should return null for invalid answers', () => {
      expect(handler.normalizeAnswer(null)).toBe(null);
      expect(handler.normalizeAnswer(undefined)).toBe(null);
      expect(handler.normalizeAnswer({})).toBe(null);
      expect(handler.normalizeAnswer([])).toBe(null);
    });
  });

  describe('answersAreEqual()', () => {
    test('should compare answers case-insensitively', () => {
      expect(handler.answersAreEqual('Addis Ababa', 'addis ababa')).toBe(true);
      expect(handler.answersAreEqual('ETHIOPIA', 'ethiopia')).toBe(true);
      expect(handler.answersAreEqual('Test', 'TEST')).toBe(true);
    });

    test('should trim whitespace before comparison', () => {
      expect(handler.answersAreEqual('  Addis Ababa  ', 'Addis Ababa')).toBe(true);
      expect(handler.answersAreEqual('Ethiopia', '  Ethiopia  ')).toBe(true);
    });

    test('should handle numeric answers', () => {
      expect(handler.answersAreEqual('2400', 2400)).toBe(true);
      expect(handler.answersAreEqual(2400, '2400')).toBe(true);
    });

    test('should return false for different answers', () => {
      expect(handler.answersAreEqual('Addis Ababa', 'Nairobi')).toBe(false);
      expect(handler.answersAreEqual('2400', '2500')).toBe(false);
    });

    test('should return false for null/undefined', () => {
      expect(handler.answersAreEqual(null, 'test')).toBe(false);
      expect(handler.answersAreEqual('test', null)).toBe(false);
      expect(handler.answersAreEqual(undefined, 'test')).toBe(false);
    });
  });

  // ==================== GRADING TESTS ====================

  describe('grade()', () => {
    const validQuestion = {
      id: 1,
      type: 'fill_blank',
      question: 'The capital of Ethiopia is _____ and it is located at an elevation of approximately _____ meters.',
      correctAnswers: ['Addis Ababa', '2400'],
      marks: 4,
      explanation: 'Addis Ababa is the capital of Ethiopia and sits at about 2,400 meters above sea level.'
    };

    test('should grade all correct answers', () => {
      const studentAnswers = ['Addis Ababa', '2400'];
      const result = handler.grade(validQuestion, studentAnswers);

      expect(result.success).toBe(true);
      expect(result.isCorrect).toBe(true);
      expect(result.earnedMarks).toBe(4);
      expect(result.totalMarks).toBe(4);
      expect(result.correctCount).toBe(2);
      expect(result.totalBlanks).toBe(2);
      expect(result.feedback).toContain('Correct');
      expect(result.blankResults).toHaveLength(2);
      expect(result.blankResults[0].isCorrect).toBe(true);
      expect(result.blankResults[1].isCorrect).toBe(true);
    });

    test('should grade with case-insensitive matching', () => {
      const studentAnswers = ['addis ababa', '2400'];
      const result = handler.grade(validQuestion, studentAnswers);

      expect(result.success).toBe(true);
      expect(result.isCorrect).toBe(true);
      expect(result.earnedMarks).toBe(4);
    });

    test('should grade with whitespace trimming', () => {
      const studentAnswers = ['  Addis Ababa  ', '  2400  '];
      const result = handler.grade(validQuestion, studentAnswers);

      expect(result.success).toBe(true);
      expect(result.isCorrect).toBe(true);
      expect(result.earnedMarks).toBe(4);
    });

    test('should award partial credit for partially correct answers', () => {
      const studentAnswers = ['Addis Ababa', '2500'];
      const result = handler.grade(validQuestion, studentAnswers);

      expect(result.success).toBe(true);
      expect(result.isCorrect).toBe(false);
      expect(result.earnedMarks).toBe(2); // 1/2 correct = 50% of 4 marks
      expect(result.correctCount).toBe(1);
      expect(result.feedback).toContain('Partially correct');
      expect(result.feedback).toContain('1 out of 2');
      expect(result.blankResults[0].isCorrect).toBe(true);
      expect(result.blankResults[1].isCorrect).toBe(false);
    });

    test('should give zero marks for all incorrect answers', () => {
      const studentAnswers = ['Nairobi', '1500'];
      const result = handler.grade(validQuestion, studentAnswers);

      expect(result.success).toBe(true);
      expect(result.isCorrect).toBe(false);
      expect(result.earnedMarks).toBe(0);
      expect(result.correctCount).toBe(0);
      expect(result.feedback).toContain('Incorrect');
      expect(result.blankResults[0].isCorrect).toBe(false);
      expect(result.blankResults[1].isCorrect).toBe(false);
    });

    test('should handle empty student answers', () => {
      const result = handler.grade(validQuestion, []);

      expect(result.success).toBe(true);
      expect(result.isCorrect).toBe(false);
      expect(result.earnedMarks).toBe(0);
      expect(result.feedback).toContain('No answers provided');
    });

    test('should handle null student answers', () => {
      const result = handler.grade(validQuestion, null);

      expect(result.success).toBe(true);
      expect(result.isCorrect).toBe(false);
      expect(result.earnedMarks).toBe(0);
      expect(result.feedback).toContain('No answers provided');
    });

    test('should handle undefined student answers', () => {
      const result = handler.grade(validQuestion, undefined);

      expect(result.success).toBe(true);
      expect(result.isCorrect).toBe(false);
      expect(result.earnedMarks).toBe(0);
    });

    test('should reject wrong number of answers', () => {
      const studentAnswers = ['Addis Ababa']; // Only 1 answer, need 2
      const result = handler.grade(validQuestion, studentAnswers);

      expect(result.success).toBe(true);
      expect(result.isCorrect).toBe(false);
      expect(result.earnedMarks).toBe(0);
      expect(result.feedback).toContain('Expected 2 answers, but received 1');
    });

    test('should reject too many answers', () => {
      const studentAnswers = ['Addis Ababa', '2400', 'Extra'];
      const result = handler.grade(validQuestion, studentAnswers);

      expect(result.success).toBe(true);
      expect(result.isCorrect).toBe(false);
      expect(result.earnedMarks).toBe(0);
      expect(result.feedback).toContain('Expected 2 answers, but received 3');
    });

    test('should handle invalid question structure', () => {
      const invalidQuestion = {
        id: 1,
        type: 'multiple_choice',
        question: 'Test',
        marks: 1
      };

      const result = handler.grade(invalidQuestion, ['test']);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid question structure');
      expect(result.earnedMarks).toBe(0);
    });

    test('should include explanation in feedback', () => {
      const studentAnswers = ['Addis Ababa', '2400'];
      const result = handler.grade(validQuestion, studentAnswers);

      expect(result.feedback).toContain(validQuestion.explanation);
      expect(result.explanation).toBe(validQuestion.explanation);
    });

    test('should track blank results correctly', () => {
      const studentAnswers = ['Nairobi', '2400'];
      const result = handler.grade(validQuestion, studentAnswers);

      expect(result.blankResults).toHaveLength(2);
      expect(result.blankResults[0]).toEqual({
        blankNumber: 1,
        studentAnswer: 'Nairobi',
        correctAnswer: 'Addis Ababa',
        isCorrect: false
      });
      expect(result.blankResults[1]).toEqual({
        blankNumber: 2,
        studentAnswer: '2400',
        correctAnswer: '2400',
        isCorrect: true
      });
    });

    test('should handle single blank question', () => {
      const singleBlankQuestion = {
        id: 2,
        type: 'fill_blank',
        question: 'The capital of Ethiopia is _____.',
        correctAnswers: ['Addis Ababa'],
        marks: 2,
        explanation: 'Addis Ababa is the capital city of Ethiopia.'
      };

      const result = handler.grade(singleBlankQuestion, ['Addis Ababa']);

      expect(result.success).toBe(true);
      expect(result.isCorrect).toBe(true);
      expect(result.earnedMarks).toBe(2);
      expect(result.totalBlanks).toBe(1);
    });

    test('should handle multiple blanks (5 blanks)', () => {
      const multiBlankQuestion = {
        id: 3,
        type: 'fill_blank',
        question: '_____ is _____ and _____ with _____ and _____.',
        correctAnswers: ['A', 'B', 'C', 'D', 'E'],
        marks: 10,
        explanation: 'This is a test question with five blanks to fill in correctly.'
      };

      const studentAnswers = ['A', 'B', 'C', 'Wrong', 'E'];
      const result = handler.grade(multiBlankQuestion, studentAnswers);

      expect(result.success).toBe(true);
      expect(result.isCorrect).toBe(false);
      expect(result.earnedMarks).toBe(8); // 4/5 correct = 80% of 10 marks
      expect(result.correctCount).toBe(4);
      expect(result.totalBlanks).toBe(5);
    });

    test('should handle numeric string answers', () => {
      const numericQuestion = {
        id: 4,
        type: 'fill_blank',
        question: 'The answer is _____ and _____.',
        correctAnswers: ['42', '3.14'],
        marks: 2,
        explanation: 'The correct answers are forty-two and pi approximation.'
      };

      const result = handler.grade(numericQuestion, [42, 3.14]);

      expect(result.success).toBe(true);
      expect(result.isCorrect).toBe(true);
      expect(result.earnedMarks).toBe(2);
    });
  });

  // ==================== BATCH GRADING TESTS ====================

  describe('gradeMultiple()', () => {
    const questions = [
      {
        id: 1,
        type: 'fill_blank',
        question: 'The capital is _____.',
        correctAnswers: ['Addis Ababa'],
        marks: 2,
        explanation: 'Addis Ababa is the capital city of Ethiopia.'
      },
      {
        id: 2,
        type: 'fill_blank',
        question: 'The elevation is _____ meters.',
        correctAnswers: ['2400'],
        marks: 2,
        explanation: 'The elevation of Addis Ababa is approximately 2400 meters.'
      },
      {
        id: 3,
        type: 'multiple_choice', // Different type, should be ignored
        question: 'Test?',
        options: ['A', 'B'],
        correctAnswer: 'A',
        marks: 1,
        explanation: 'This is a multiple choice question for testing purposes.'
      },
      {
        id: 4,
        type: 'fill_blank',
        question: '_____ and _____.',
        correctAnswers: ['A', 'B'],
        marks: 4,
        explanation: 'The correct answers are A and B for this test question.'
      }
    ];

    test('should grade multiple questions correctly', () => {
      const studentAnswers = {
        1: ['Addis Ababa'],
        2: ['2400'],
        4: ['A', 'B']
      };

      const result = handler.gradeMultiple(questions, studentAnswers);

      expect(result.totalQuestions).toBe(3); // Only fill_blank questions
      expect(result.totalMarks).toBe(8); // 2 + 2 + 4
      expect(result.earnedMarks).toBe(8);
      expect(result.correctCount).toBe(3);
      expect(result.incorrectCount).toBe(0);
      expect(result.unansweredCount).toBe(0);
      expect(result.percentage).toBe('100.00');
      expect(result.questionResults).toHaveLength(3);
    });

    test('should handle partially correct answers', () => {
      const studentAnswers = {
        1: ['Addis Ababa'], // Correct
        2: ['2500'], // Incorrect
        4: ['A', 'Wrong'] // Partially correct
      };

      const result = handler.gradeMultiple(questions, studentAnswers);

      expect(result.totalQuestions).toBe(3);
      expect(result.totalMarks).toBe(8);
      expect(result.earnedMarks).toBe(4); // 2 + 0 + 2
      expect(result.correctCount).toBe(1);
      expect(result.partiallyCorrectCount).toBe(1);
      expect(result.incorrectCount).toBe(1);
      expect(result.percentage).toBe('50.00');
    });

    test('should handle unanswered questions', () => {
      const studentAnswers = {
        1: ['Addis Ababa'],
        2: [], // Unanswered
        4: null // Unanswered
      };

      const result = handler.gradeMultiple(questions, studentAnswers);

      expect(result.correctCount).toBe(1);
      expect(result.unansweredCount).toBe(2);
      expect(result.earnedMarks).toBe(2);
    });

    test('should handle empty questions array', () => {
      const result = handler.gradeMultiple([], {});

      expect(result.totalQuestions).toBe(0);
      expect(result.totalMarks).toBe(0);
      expect(result.earnedMarks).toBe(0);
      expect(result.percentage).toBe('0');
    });

    test('should filter only fill_blank questions', () => {
      const mixedQuestions = [
        {
          id: 1,
          type: 'multiple_choice',
          question: 'Test?',
          options: ['A', 'B'],
          correctAnswer: 'A',
          marks: 1,
          explanation: 'This is a multiple choice question for testing purposes.'
        },
        {
          id: 2,
          type: 'fill_blank',
          question: 'The capital is _____.',
          correctAnswers: ['Addis Ababa'],
          marks: 2,
          explanation: 'Addis Ababa is the capital city of Ethiopia.'
        }
      ];

      const studentAnswers = {
        2: ['Addis Ababa']
      };

      const result = handler.gradeMultiple(mixedQuestions, studentAnswers);

      expect(result.totalQuestions).toBe(1);
      expect(result.totalMarks).toBe(2);
    });

    test('should include individual question results', () => {
      const studentAnswers = {
        1: ['Addis Ababa'],
        2: ['2400']
      };

      const result = handler.gradeMultiple(questions, studentAnswers);

      expect(result.questionResults).toHaveLength(3);
      expect(result.questionResults[0].questionId).toBe(1);
      expect(result.questionResults[0].success).toBe(true);
      expect(result.questionResults[0].isCorrect).toBe(true);
    });
  });

  // ==================== ANSWER VALIDATION TESTS ====================

  describe('areAnswersValid()', () => {
    test('should validate correct answer format', () => {
      const result = handler.areAnswersValid(['Addis Ababa', '2400'], 2);

      expect(result.valid).toBe(true);
      expect(result.message).toBe('All answers are valid');
    });

    test('should validate numeric answers', () => {
      const result = handler.areAnswersValid([2400, 3.14], 2);

      expect(result.valid).toBe(true);
    });

    test('should reject non-array answers', () => {
      const result = handler.areAnswersValid('not an array', 1);

      expect(result.valid).toBe(false);
      expect(result.message).toContain('must be provided as an array');
    });

    test('should reject null answers', () => {
      const result = handler.areAnswersValid(null, 1);

      expect(result.valid).toBe(false);
      expect(result.message).toContain('must be provided as an array');
    });

    test('should reject empty array', () => {
      const result = handler.areAnswersValid([], 2);

      expect(result.valid).toBe(false);
      expect(result.message).toContain('cannot be empty');
    });

    test('should reject wrong number of answers', () => {
      const result = handler.areAnswersValid(['A', 'B'], 3);

      expect(result.valid).toBe(false);
      expect(result.message).toContain('Expected 3 answers, but received 2');
    });

    test('should reject invalid answer types', () => {
      const result = handler.areAnswersValid(['Valid', {}, 'Valid'], 3);

      expect(result.valid).toBe(false);
      expect(result.message).toContain('must be strings or numbers');
    });

    test('should reject array with null elements', () => {
      const result = handler.areAnswersValid(['Valid', null, 'Valid'], 3);

      expect(result.valid).toBe(false);
      expect(result.message).toContain('must be strings or numbers');
    });

    test('should accept single answer', () => {
      const result = handler.areAnswersValid(['Addis Ababa'], 1);

      expect(result.valid).toBe(true);
    });

    test('should accept multiple answers', () => {
      const result = handler.areAnswersValid(['A', 'B', 'C', 'D', 'E'], 5);

      expect(result.valid).toBe(true);
    });
  });

  // ==================== STATISTICS TESTS ====================

  describe('getQuestionStatistics()', () => {
    const question = {
      id: 1,
      type: 'fill_blank',
      question: 'The capital is _____ and elevation is _____ meters.',
      correctAnswers: ['Addis Ababa', '2400'],
      marks: 4,
      explanation: 'Addis Ababa is the capital of Ethiopia at 2400 meters elevation.'
    };

    test('should calculate statistics for all correct answers', () => {
      const allStudentAnswers = [
        ['Addis Ababa', '2400'],
        ['addis ababa', '2400'],
        ['Addis Ababa', '2400']
      ];

      const stats = handler.getQuestionStatistics(question, allStudentAnswers);

      expect(stats.totalResponses).toBe(3);
      expect(stats.allCorrectCount).toBe(3);
      expect(stats.partiallyCorrectCount).toBe(0);
      expect(stats.allIncorrectCount).toBe(0);
      expect(stats.unansweredCount).toBe(0);
      expect(stats.averageScore).toBe('4.00');
      expect(stats.averageCorrectBlanks).toBe('2.00');
      expect(stats.allCorrectPercentage).toBe('100.00');
    });

    test('should calculate statistics for mixed answers', () => {
      const allStudentAnswers = [
        ['Addis Ababa', '2400'], // All correct
        ['Addis Ababa', '2500'], // Partially correct
        ['Nairobi', '1500'], // All incorrect
        [] // Unanswered
      ];

      const stats = handler.getQuestionStatistics(question, allStudentAnswers);

      expect(stats.totalResponses).toBe(4);
      expect(stats.allCorrectCount).toBe(1);
      expect(stats.partiallyCorrectCount).toBe(1);
      expect(stats.allIncorrectCount).toBe(1);
      expect(stats.unansweredCount).toBe(1);
      expect(stats.averageScore).toBe('1.50'); // (4 + 2 + 0 + 0) / 4
      expect(stats.averageCorrectBlanks).toBe('1.00'); // (2 + 1 + 0) / 3 answered = 3/3
    });

    test('should track per-blank statistics', () => {
      const allStudentAnswers = [
        ['Addis Ababa', '2400'], // Both correct
        ['Addis Ababa', '2500'], // First correct, second wrong
        ['Nairobi', '2400'] // First wrong, second correct
      ];

      const stats = handler.getQuestionStatistics(question, allStudentAnswers);

      expect(stats.blankStats).toHaveLength(2);
      
      // First blank: 2 correct, 1 incorrect
      expect(stats.blankStats[0].blankNumber).toBe(1);
      expect(stats.blankStats[0].correctAnswer).toBe('Addis Ababa');
      expect(stats.blankStats[0].correctCount).toBe(2);
      expect(stats.blankStats[0].incorrectCount).toBe(1);
      expect(stats.blankStats[0].correctPercentage).toBe('66.67');
      
      // Second blank: 2 correct, 1 incorrect
      expect(stats.blankStats[1].blankNumber).toBe(2);
      expect(stats.blankStats[1].correctAnswer).toBe('2400');
      expect(stats.blankStats[1].correctCount).toBe(2);
      expect(stats.blankStats[1].incorrectCount).toBe(1);
      expect(stats.blankStats[1].correctPercentage).toBe('66.67');
    });

    test('should track common incorrect answers', () => {
      const allStudentAnswers = [
        ['Nairobi', '2500'],
        ['Nairobi', '2600'],
        ['Kampala', '2500']
      ];

      const stats = handler.getQuestionStatistics(question, allStudentAnswers);

      // First blank: Nairobi appears twice
      expect(stats.blankStats[0].commonIncorrectAnswers['nairobi']).toBe(2);
      expect(stats.blankStats[0].commonIncorrectAnswers['kampala']).toBe(1);
      
      // Second blank: 2500 appears twice
      expect(stats.blankStats[1].commonIncorrectAnswers['2500']).toBe(2);
      expect(stats.blankStats[1].commonIncorrectAnswers['2600']).toBe(1);
    });

    test('should handle empty responses', () => {
      const allStudentAnswers = [];

      const stats = handler.getQuestionStatistics(question, allStudentAnswers);

      expect(stats.totalResponses).toBe(0);
      expect(stats.averageScore).toBe('0');
      expect(stats.averageCorrectBlanks).toBe('0');
      expect(stats.allCorrectPercentage).toBe('0');
    });

    test('should handle all unanswered', () => {
      const allStudentAnswers = [[], null, undefined];

      const stats = handler.getQuestionStatistics(question, allStudentAnswers);

      expect(stats.totalResponses).toBe(3);
      expect(stats.unansweredCount).toBe(3);
      expect(stats.averageScore).toBe('0.00');
      expect(stats.averageCorrectBlanks).toBe('0');
    });

    test('should calculate correct percentages', () => {
      const allStudentAnswers = [
        ['Addis Ababa', '2400'],
        ['Addis Ababa', '2400'],
        ['Nairobi', '1500'],
        ['Nairobi', '1500']
      ];

      const stats = handler.getQuestionStatistics(question, allStudentAnswers);

      expect(stats.allCorrectPercentage).toBe('50.00'); // 2 out of 4
      expect(stats.blankStats[0].correctPercentage).toBe('50.00'); // 2 out of 4
      expect(stats.blankStats[1].correctPercentage).toBe('50.00'); // 2 out of 4
    });

    test('should handle single blank question statistics', () => {
      const singleBlankQuestion = {
        id: 2,
        type: 'fill_blank',
        question: 'The capital is _____.',
        correctAnswers: ['Addis Ababa'],
        marks: 2,
        explanation: 'Addis Ababa is the capital city of Ethiopia.'
      };

      const allStudentAnswers = [
        ['Addis Ababa'],
        ['Nairobi']
      ];

      const stats = handler.getQuestionStatistics(singleBlankQuestion, allStudentAnswers);

      expect(stats.blankStats).toHaveLength(1);
      expect(stats.blankStats[0].correctCount).toBe(1);
      expect(stats.blankStats[0].incorrectCount).toBe(1);
    });
  });
});
