/**
 * Test Suite for MultipleTrueFalseHandler
 * 
 * This test suite covers:
 * - Question validation
 * - Answer grading with various scenarios
 * - Case sensitivity handling
 * - Whitespace handling
 * - Common variations (T/F, true/false, TRUE/FALSE, 1/0, yes/no)
 * - Partial credit calculation
 * - Edge cases
 * - Multiple question grading
 * - Answer validation
 * - Question statistics
 */

const MultipleTrueFalseHandler = require('./MultipleTrueFalseHandler');

describe('MultipleTrueFalseHandler', () => {
  let handler;

  beforeEach(() => {
    handler = new MultipleTrueFalseHandler();
  });

  describe('validate()', () => {
    test('should validate a correct multiple true/false question', () => {
      const question = {
        id: 1,
        type: 'multiple_true_false',
        question: 'Evaluate the following statements about Ethiopian geography:',
        statements: [
          'Ethiopia is landlocked',
          'The Blue Nile originates in Ethiopia',
          'Ethiopia is located in West Africa'
        ],
        correctAnswers: [true, true, false],
        marks: 3,
        explanation: 'Ethiopia is landlocked (True), the Blue Nile originates from Lake Tana (True), but Ethiopia is in East Africa, not West Africa (False).'
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject question with wrong type', () => {
      const question = {
        id: 1,
        type: 'true_false',
        question: 'Evaluate the following statements:',
        statements: ['Statement 1', 'Statement 2'],
        correctAnswers: [true, false],
        marks: 2,
        explanation: 'Test explanation'
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Question must be of type "multiple_true_false"');
    });

    test('should reject question with missing required fields', () => {
      const question = {
        id: 1,
        type: 'multiple_true_false',
        question: 'Evaluate the following statements:',
        // Missing statements, correctAnswers, marks, explanation
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should reject question with mismatched array lengths', () => {
      const question = {
        id: 1,
        type: 'multiple_true_false',
        question: 'Evaluate the following statements:',
        statements: ['Statement 1', 'Statement 2', 'Statement 3'],
        correctAnswers: [true, false], // Only 2 answers for 3 statements
        marks: 3,
        explanation: 'Test explanation'
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('correctAnswers array must have the same length as statements array');
    });

    test('should reject question with too few statements', () => {
      const question = {
        id: 1,
        type: 'multiple_true_false',
        question: 'Evaluate the following statements:',
        statements: ['Only one statement'], // Minimum is 2
        correctAnswers: [true],
        marks: 1,
        explanation: 'Test explanation'
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(false);
    });

    test('should reject question with invalid marks', () => {
      const question = {
        id: 1,
        type: 'multiple_true_false',
        question: 'Evaluate the following statements:',
        statements: ['Statement 1', 'Statement 2'],
        correctAnswers: [true, false],
        marks: 0.2, // Below minimum of 0.5
        explanation: 'Test explanation'
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(false);
    });

    test('should reject null or undefined question', () => {
      const result1 = handler.validate(null);
      expect(result1.valid).toBe(false);

      const result2 = handler.validate(undefined);
      expect(result2.valid).toBe(false);
    });
  });

  describe('normalizeAnswer()', () => {
    test('should normalize "true" variations', () => {
      const variations = ['True', 'true', 'TRUE', 'T', 't', '1', 'yes', 'Yes', 'YES'];
      
      variations.forEach(variation => {
        const result = handler.normalizeAnswer(variation);
        expect(result).toBe(true);
      });
    });

    test('should normalize "false" variations', () => {
      const variations = ['False', 'false', 'FALSE', 'F', 'f', '0', 'no', 'No', 'NO'];
      
      variations.forEach(variation => {
        const result = handler.normalizeAnswer(variation);
        expect(result).toBe(false);
      });
    });

    test('should handle boolean values directly', () => {
      expect(handler.normalizeAnswer(true)).toBe(true);
      expect(handler.normalizeAnswer(false)).toBe(false);
    });

    test('should handle whitespace', () => {
      expect(handler.normalizeAnswer('  True  ')).toBe(true);
      expect(handler.normalizeAnswer('  False  ')).toBe(false);
      expect(handler.normalizeAnswer('\tT\n')).toBe(true);
      expect(handler.normalizeAnswer('\tF\n')).toBe(false);
    });

    test('should return null for invalid answers', () => {
      expect(handler.normalizeAnswer('Maybe')).toBeNull();
      expect(handler.normalizeAnswer('Yes and No')).toBeNull();
      expect(handler.normalizeAnswer('123')).toBeNull();
      expect(handler.normalizeAnswer('')).toBeNull();
      expect(handler.normalizeAnswer(null)).toBeNull();
      expect(handler.normalizeAnswer(undefined)).toBeNull();
    });
  });

  describe('grade()', () => {
    const validQuestion = {
      id: 1,
      type: 'multiple_true_false',
      question: 'Evaluate the following statements about Ethiopian geography:',
      statements: [
        'Ethiopia is landlocked',
        'The Blue Nile originates in Ethiopia',
        'Ethiopia is located in West Africa'
      ],
      correctAnswers: [true, true, false],
      marks: 3,
      explanation: 'Ethiopia is landlocked (True), the Blue Nile originates from Lake Tana (True), but Ethiopia is in East Africa, not West Africa (False).'
    };

    test('should grade all correct answers', () => {
      const result = handler.grade(validQuestion, [true, true, false]);
      
      expect(result.success).toBe(true);
      expect(result.isCorrect).toBe(true);
      expect(result.earnedMarks).toBe(3);
      expect(result.totalMarks).toBe(3);
      expect(result.correctCount).toBe(3);
      expect(result.totalStatements).toBe(3);
      expect(result.feedback).toContain('Correct');
      expect(result.feedback).toContain('All 3 statements');
    });

    test('should grade partially correct answers', () => {
      const result = handler.grade(validQuestion, [true, true, true]); // Last one is wrong
      
      expect(result.success).toBe(true);
      expect(result.isCorrect).toBe(false);
      expect(result.earnedMarks).toBe(2); // 2/3 * 3 marks
      expect(result.totalMarks).toBe(3);
      expect(result.correctCount).toBe(2);
      expect(result.feedback).toContain('Partially correct');
      expect(result.feedback).toContain('2 out of 3');
    });

    test('should grade all incorrect answers', () => {
      const result = handler.grade(validQuestion, [false, false, true]); // All wrong
      
      expect(result.success).toBe(true);
      expect(result.isCorrect).toBe(false);
      expect(result.earnedMarks).toBe(0);
      expect(result.correctCount).toBe(0);
    });

    test('should handle case-insensitive comparison', () => {
      const testCases = [
        ['TRUE', 'true', 'FALSE'],
        ['True', 'True', 'False'],
        ['true', 'true', 'false']
      ];

      testCases.forEach(answers => {
        const result = handler.grade(validQuestion, answers);
        expect(result.isCorrect).toBe(true);
        expect(result.earnedMarks).toBe(3);
      });
    });

    test('should handle whitespace trimming', () => {
      const testCases = [
        ['  true  ', '  true  ', '  false  '],
        ['true   ', 'true   ', 'false   '],
        ['   true', '   true', '   false']
      ];

      testCases.forEach(answers => {
        const result = handler.grade(validQuestion, answers);
        expect(result.isCorrect).toBe(true);
        expect(result.earnedMarks).toBe(3);
      });
    });

    test('should handle "T" and "F" variations', () => {
      const result = handler.grade(validQuestion, ['T', 'T', 'F']);
      
      expect(result.isCorrect).toBe(true);
      expect(result.earnedMarks).toBe(3);
    });

    test('should handle "1" and "0" variations', () => {
      const result = handler.grade(validQuestion, ['1', '1', '0']);
      
      expect(result.isCorrect).toBe(true);
      expect(result.earnedMarks).toBe(3);
    });

    test('should handle "yes" and "no" variations', () => {
      const result = handler.grade(validQuestion, ['yes', 'yes', 'no']);
      
      expect(result.isCorrect).toBe(true);
      expect(result.earnedMarks).toBe(3);
    });

    test('should handle boolean values directly', () => {
      const result = handler.grade(validQuestion, [true, true, false]);
      
      expect(result.isCorrect).toBe(true);
      expect(result.earnedMarks).toBe(3);
    });

    test('should handle empty answer array', () => {
      const result = handler.grade(validQuestion, []);
      
      expect(result.success).toBe(true);
      expect(result.isCorrect).toBe(false);
      expect(result.earnedMarks).toBe(0);
      expect(result.feedback).toContain('No answers provided');
    });

    test('should handle null answers', () => {
      const result = handler.grade(validQuestion, null);
      
      expect(result.success).toBe(true);
      expect(result.isCorrect).toBe(false);
      expect(result.earnedMarks).toBe(0);
      expect(result.feedback).toContain('No answers provided');
    });

    test('should handle undefined answers', () => {
      const result = handler.grade(validQuestion, undefined);
      
      expect(result.success).toBe(true);
      expect(result.isCorrect).toBe(false);
      expect(result.earnedMarks).toBe(0);
      expect(result.feedback).toContain('No answers provided');
    });

    test('should handle wrong number of answers', () => {
      const result = handler.grade(validQuestion, [true, true]); // Only 2 answers for 3 statements
      
      expect(result.success).toBe(true);
      expect(result.isCorrect).toBe(false);
      expect(result.earnedMarks).toBe(0);
      expect(result.feedback).toContain('Expected 3 answers');
      expect(result.feedback).toContain('received 2');
    });

    test('should handle invalid answer format', () => {
      const result = handler.grade(validQuestion, [true, 'Maybe', false]);
      
      expect(result.success).toBe(true);
      expect(result.isCorrect).toBe(false);
      expect(result.earnedMarks).toBe(0);
      expect(result.feedback).toContain('Invalid answer format');
    });

    test('should return statement results', () => {
      const result = handler.grade(validQuestion, [true, false, false]);
      
      expect(result.statementResults).toHaveLength(3);
      expect(result.statementResults[0].isCorrect).toBe(true);
      expect(result.statementResults[1].isCorrect).toBe(false);
      expect(result.statementResults[2].isCorrect).toBe(true);
    });

    test('should include explanation in feedback', () => {
      const result = handler.grade(validQuestion, [true, true, false]);
      
      expect(result.explanation).toBe(validQuestion.explanation);
      expect(result.feedback).toContain(validQuestion.explanation);
    });

    test('should handle invalid question structure', () => {
      const invalidQuestion = {
        id: 1,
        type: 'multiple_true_false',
        question: 'Test?',
        // Missing required fields
      };

      const result = handler.grade(invalidQuestion, [true, false]);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid question structure');
      expect(result.earnedMarks).toBe(0);
    });

    test('should handle question with fractional marks', () => {
      const fractionalQuestion = {
        ...validQuestion,
        marks: 4.5
      };

      const result = handler.grade(fractionalQuestion, [true, true, false]);
      
      expect(result.earnedMarks).toBe(4.5);
      expect(result.totalMarks).toBe(4.5);
    });

    test('should calculate partial credit correctly', () => {
      const question = {
        ...validQuestion,
        statements: ['S1', 'S2', 'S3', 'S4', 'S5'],
        correctAnswers: [true, false, true, false, true],
        marks: 5
      };

      // Student answers: [true, false, false, false, true]
      // Correct answers: [true, false, true, false, true]
      // Comparison: [✓, ✓, ✗, ✓, ✓] = 4 out of 5 correct
      const result = handler.grade(question, [true, false, false, false, true]);
      
      expect(result.correctCount).toBe(4);
      expect(result.earnedMarks).toBe(4); // (4/5) * 5 = 4
    });

    test('should round earned marks to 2 decimal places', () => {
      const question = {
        ...validQuestion,
        marks: 10
      };

      // 2 out of 3 correct: (2/3) * 10 = 6.666...
      const result = handler.grade(question, [true, true, true]);
      
      expect(result.earnedMarks).toBe(6.67);
    });

    test('should return correct and student answers', () => {
      const result = handler.grade(validQuestion, [true, false, false]);
      
      expect(result.correctAnswers).toEqual([true, true, false]);
      expect(result.studentAnswers).toEqual([true, false, false]);
    });
  });

  describe('gradeMultiple()', () => {
    const questions = [
      {
        id: 1,
        type: 'multiple_true_false',
        question: 'Evaluate statements about Ethiopia:',
        statements: ['Ethiopia is landlocked', 'Ethiopia is in West Africa'],
        correctAnswers: [true, false],
        marks: 2,
        explanation: 'Ethiopia is landlocked but in East Africa.'
      },
      {
        id: 2,
        type: 'multiple_true_false',
        question: 'Evaluate statements about math:',
        statements: ['2+2=4', '3+3=7', '5+5=10'],
        correctAnswers: [true, false, true],
        marks: 3,
        explanation: 'Basic arithmetic.'
      },
      {
        id: 3,
        type: 'multiple_true_false',
        question: 'Evaluate statements about colors:',
        statements: ['Sky is blue', 'Grass is red'],
        correctAnswers: [true, false],
        marks: 2,
        explanation: 'Common colors.'
      }
    ];

    test('should grade multiple questions correctly', () => {
      const studentAnswers = {
        1: [true, false],
        2: [true, false, true],
        3: [true, false]
      };

      const result = handler.gradeMultiple(questions, studentAnswers);
      
      expect(result.totalQuestions).toBe(3);
      expect(result.totalMarks).toBe(7);
      expect(result.earnedMarks).toBe(7);
      expect(result.correctCount).toBe(3);
      expect(result.partiallyCorrectCount).toBe(0);
      expect(result.incorrectCount).toBe(0);
      expect(result.unansweredCount).toBe(0);
      expect(result.percentage).toBe('100.00');
    });

    test('should handle mixed correct and partially correct answers', () => {
      const studentAnswers = {
        1: [true, false],      // All correct
        2: [true, true, true], // 2/3 correct (partial)
        3: [false, false]      // 1/2 correct (partial)
      };

      const result = handler.gradeMultiple(questions, studentAnswers);
      
      expect(result.totalQuestions).toBe(3);
      expect(result.correctCount).toBe(1);
      expect(result.partiallyCorrectCount).toBe(2);
      expect(result.incorrectCount).toBe(0);
    });

    test('should handle unanswered questions', () => {
      const studentAnswers = {
        1: [true, false],
        2: [],
        // 3 is missing
      };

      const result = handler.gradeMultiple(questions, studentAnswers);
      
      expect(result.correctCount).toBe(1);
      expect(result.unansweredCount).toBe(2);
    });

    test('should handle all incorrect answers', () => {
      const studentAnswers = {
        1: [false, true],      // All wrong
        2: [false, true, false], // All wrong
        3: [false, true]       // All wrong
      };

      const result = handler.gradeMultiple(questions, studentAnswers);
      
      expect(result.correctCount).toBe(0);
      expect(result.incorrectCount).toBe(3);
      expect(result.earnedMarks).toBe(0);
    });

    test('should filter only multiple true/false questions', () => {
      const mixedQuestions = [
        ...questions,
        {
          id: 4,
          type: 'true_false',
          question: 'Is this true?',
          options: ['True', 'False'],
          correctAnswer: 'True',
          marks: 1,
          explanation: 'Test explanation'
        }
      ];

      const studentAnswers = {
        1: [true, false],
        2: [true, false, true],
        3: [true, false],
        4: 'True'
      };

      const result = handler.gradeMultiple(mixedQuestions, studentAnswers);
      
      // Should only grade the 3 multiple true/false questions
      expect(result.totalQuestions).toBe(3);
      expect(result.totalMarks).toBe(7);
    });

    test('should return individual question results', () => {
      const studentAnswers = {
        1: [true, false],
        2: [true, false, true],
        3: [false, true] // Incorrect
      };

      const result = handler.gradeMultiple(questions, studentAnswers);
      
      expect(result.questionResults).toHaveLength(3);
      expect(result.questionResults[0].questionId).toBe(1);
      expect(result.questionResults[0].isCorrect).toBe(true);
      expect(result.questionResults[2].isCorrect).toBe(false);
    });

    test('should handle empty questions array', () => {
      const result = handler.gradeMultiple([], {});
      
      expect(result.totalQuestions).toBe(0);
      expect(result.totalMarks).toBe(0);
      expect(result.earnedMarks).toBe(0);
      expect(result.percentage).toBe(0);
    });

    test('should calculate percentage correctly', () => {
      const studentAnswers = {
        1: [true, false],      // 2 marks
        2: [true, true, true], // 2 marks (2/3 * 3)
        3: [true, false]       // 2 marks
      };

      const result = handler.gradeMultiple(questions, studentAnswers);
      
      expect(result.earnedMarks).toBe(6);
      expect(result.totalMarks).toBe(7);
      expect(result.percentage).toBe('85.71');
    });
  });

  describe('areAnswersValid()', () => {
    test('should validate correct answers array', () => {
      const result = handler.areAnswersValid([true, false, true], 3);
      
      expect(result.valid).toBe(true);
      expect(result.message).toBe('All answers are valid');
    });

    test('should validate answers with variations', () => {
      const result = handler.areAnswersValid(['T', 'F', 'true', 'false', '1', '0'], 6);
      
      expect(result.valid).toBe(true);
    });

    test('should reject non-array answers', () => {
      const result = handler.areAnswersValid('true', 1);
      
      expect(result.valid).toBe(false);
      expect(result.message).toContain('must be provided as an array');
    });

    test('should reject empty array', () => {
      const result = handler.areAnswersValid([], 3);
      
      expect(result.valid).toBe(false);
      expect(result.message).toContain('cannot be empty');
    });

    test('should reject wrong number of answers', () => {
      const result = handler.areAnswersValid([true, false], 3);
      
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Expected 3 answers');
      expect(result.message).toContain('received 2');
    });

    test('should reject invalid answer values', () => {
      const result = handler.areAnswersValid([true, 'Maybe', false], 3);
      
      expect(result.valid).toBe(false);
      expect(result.message).toContain('must be True or False');
    });

    test('should reject null answers', () => {
      const result = handler.areAnswersValid(null, 3);
      
      expect(result.valid).toBe(false);
      expect(result.message).toContain('must be provided as an array');
    });

    test('should reject undefined answers', () => {
      const result = handler.areAnswersValid(undefined, 3);
      
      expect(result.valid).toBe(false);
      expect(result.message).toContain('must be provided as an array');
    });
  });

  describe('getQuestionStatistics()', () => {
    const question = {
      id: 1,
      type: 'multiple_true_false',
      question: 'Evaluate statements:',
      statements: ['Statement 1', 'Statement 2', 'Statement 3'],
      correctAnswers: [true, false, true],
      marks: 3,
      explanation: 'Test explanation'
    };

    test('should calculate statistics for all correct answers', () => {
      const answers = [
        [true, false, true],
        [true, false, true],
        [true, false, true]
      ];
      
      const stats = handler.getQuestionStatistics(question, answers);
      
      expect(stats.totalResponses).toBe(3);
      expect(stats.allCorrectCount).toBe(3);
      expect(stats.partiallyCorrectCount).toBe(0);
      expect(stats.allIncorrectCount).toBe(0);
      expect(stats.allCorrectPercentage).toBe('100.00');
      expect(stats.averageScore).toBe('3.00');
    });

    test('should calculate statistics for mixed answers', () => {
      const answers = [
        [true, false, true],  // All correct
        [true, true, true],   // 2/3 correct (partial)
        [false, true, false], // 0/3 correct (all wrong)
        [true, false, false]  // 2/3 correct (partial)
      ];
      
      const stats = handler.getQuestionStatistics(question, answers);
      
      expect(stats.totalResponses).toBe(4);
      expect(stats.allCorrectCount).toBe(1);
      expect(stats.partiallyCorrectCount).toBe(2);
      expect(stats.allIncorrectCount).toBe(1);
    });

    test('should track per-statement statistics', () => {
      const answers = [
        [true, false, true],
        [true, false, false],
        [false, false, true]
      ];
      
      const stats = handler.getQuestionStatistics(question, answers);
      
      expect(stats.statementStats).toHaveLength(3);
      
      // Statement 1: correct answer is true
      expect(stats.statementStats[0].correctCount).toBe(2); // 2 students got it right
      expect(stats.statementStats[0].incorrectCount).toBe(1);
      expect(stats.statementStats[0].trueCount).toBe(2);
      expect(stats.statementStats[0].falseCount).toBe(1);
      
      // Statement 2: correct answer is false
      expect(stats.statementStats[1].correctCount).toBe(3); // All got it right
      expect(stats.statementStats[1].incorrectCount).toBe(0);
      
      // Statement 3: correct answer is true
      expect(stats.statementStats[2].correctCount).toBe(2);
      expect(stats.statementStats[2].incorrectCount).toBe(1);
    });

    test('should handle unanswered questions', () => {
      const answers = [
        [true, false, true],
        [],
        null,
        [true, false, true]
      ];
      
      const stats = handler.getQuestionStatistics(question, answers);
      
      expect(stats.totalResponses).toBe(4);
      expect(stats.unansweredCount).toBe(2);
      expect(stats.allCorrectCount).toBe(2);
    });

    test('should calculate per-statement percentages', () => {
      const answers = [
        [true, false, true],
        [true, false, true],
        [false, false, true],
        [false, false, false]
      ];
      
      const stats = handler.getQuestionStatistics(question, answers);
      
      // Statement 1: 2 correct out of 4
      expect(stats.statementStats[0].correctPercentage).toBe('50.00');
      
      // Statement 2: 4 correct out of 4
      expect(stats.statementStats[1].correctPercentage).toBe('100.00');
      
      // Statement 3: 3 correct out of 4
      expect(stats.statementStats[2].correctPercentage).toBe('75.00');
    });

    test('should handle empty answers array', () => {
      const stats = handler.getQuestionStatistics(question, []);
      
      expect(stats.totalResponses).toBe(0);
      expect(stats.allCorrectCount).toBe(0);
      expect(stats.averageScore).toBe(0);
      expect(stats.allCorrectPercentage).toBe(0);
    });

    test('should handle answer variations in statistics', () => {
      const answers = [
        ['T', 'F', 'true'],
        ['1', '0', 'yes'],
        [true, false, true]
      ];
      
      const stats = handler.getQuestionStatistics(question, answers);
      
      expect(stats.allCorrectCount).toBe(3);
      expect(stats.statementStats[0].trueCount).toBe(3);
      expect(stats.statementStats[1].falseCount).toBe(3);
    });

    test('should calculate average score correctly', () => {
      const answers = [
        [true, false, true],  // 3 marks
        [true, true, true],   // 2 marks (2/3 * 3)
        [false, false, false] // 1 mark (1/3 * 3)
      ];
      
      const stats = handler.getQuestionStatistics(question, answers);
      
      // Average: (3 + 2 + 1) / 3 = 2
      expect(stats.averageScore).toBe('2.00');
    });
  });
});
