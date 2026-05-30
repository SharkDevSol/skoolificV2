/**
 * Test Suite for TrueFalseHandler
 * 
 * This test suite covers:
 * - Question validation
 * - Answer grading with various scenarios
 * - Case sensitivity handling
 * - Whitespace handling
 * - Common variations (T/F, true/false, TRUE/FALSE)
 * - Edge cases
 * - Multiple question grading
 * - Answer validation
 * - Question statistics
 */

const TrueFalseHandler = require('./TrueFalseHandler');

describe('TrueFalseHandler', () => {
  let handler;

  beforeEach(() => {
    handler = new TrueFalseHandler();
  });

  describe('validate()', () => {
    test('should validate a correct true/false question', () => {
      const question = {
        id: 1,
        type: 'true_false',
        question: 'Ethiopia uses the Gregorian calendar.',
        options: ['True', 'False'],
        correctAnswer: 'False',
        marks: 1,
        explanation: 'Ethiopia uses the Ethiopian calendar, which is different from the Gregorian calendar.'
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject question with wrong type', () => {
      const question = {
        id: 1,
        type: 'multiple_choice',
        question: 'Ethiopia uses the Gregorian calendar.',
        options: ['True', 'False'],
        correctAnswer: 'False',
        marks: 1,
        explanation: 'Test explanation'
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Question must be of type "true_false"');
    });

    test('should reject question with missing required fields', () => {
      const question = {
        id: 1,
        type: 'true_false',
        question: 'Ethiopia uses the Gregorian calendar.',
        // Missing options, correctAnswer, marks, explanation
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should reject question with invalid options', () => {
      const question = {
        id: 1,
        type: 'true_false',
        question: 'Ethiopia uses the Gregorian calendar.',
        options: ['Yes', 'No'], // Should be ['True', 'False']
        correctAnswer: 'No',
        marks: 1,
        explanation: 'Test explanation'
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(false);
    });

    test('should reject question with invalid correctAnswer', () => {
      const question = {
        id: 1,
        type: 'true_false',
        question: 'Ethiopia uses the Gregorian calendar.',
        options: ['True', 'False'],
        correctAnswer: 'Maybe', // Invalid
        marks: 1,
        explanation: 'Test explanation'
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(false);
    });

    test('should reject question with invalid marks', () => {
      const question = {
        id: 1,
        type: 'true_false',
        question: 'Ethiopia uses the Gregorian calendar.',
        options: ['True', 'False'],
        correctAnswer: 'False',
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
    test('should normalize "True" variations', () => {
      const variations = ['True', 'true', 'TRUE', 'T', 't', '1', 'yes', 'Yes', 'YES'];
      
      variations.forEach(variation => {
        const result = handler.normalizeAnswer(variation);
        expect(result).toBe('True');
      });
    });

    test('should normalize "False" variations', () => {
      const variations = ['False', 'false', 'FALSE', 'F', 'f', '0', 'no', 'No', 'NO'];
      
      variations.forEach(variation => {
        const result = handler.normalizeAnswer(variation);
        expect(result).toBe('False');
      });
    });

    test('should handle whitespace', () => {
      expect(handler.normalizeAnswer('  True  ')).toBe('True');
      expect(handler.normalizeAnswer('  False  ')).toBe('False');
      expect(handler.normalizeAnswer('\tT\n')).toBe('True');
      expect(handler.normalizeAnswer('\tF\n')).toBe('False');
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
      type: 'true_false',
      question: 'Ethiopia uses the Gregorian calendar.',
      options: ['True', 'False'],
      correctAnswer: 'False',
      marks: 1,
      explanation: 'Ethiopia uses the Ethiopian calendar, which is different from the Gregorian calendar.'
    };

    test('should grade correct answer', () => {
      const result = handler.grade(validQuestion, 'False');
      
      expect(result.success).toBe(true);
      expect(result.isCorrect).toBe(true);
      expect(result.earnedMarks).toBe(1);
      expect(result.totalMarks).toBe(1);
      expect(result.feedback).toContain('Correct');
    });

    test('should grade incorrect answer', () => {
      const result = handler.grade(validQuestion, 'True');
      
      expect(result.success).toBe(true);
      expect(result.isCorrect).toBe(false);
      expect(result.earnedMarks).toBe(0);
      expect(result.totalMarks).toBe(1);
      expect(result.feedback).toContain('Incorrect');
    });

    test('should handle case-insensitive comparison', () => {
      const testCases = ['false', 'FALSE', 'False', 'FaLsE'];

      testCases.forEach(answer => {
        const result = handler.grade(validQuestion, answer);
        expect(result.isCorrect).toBe(true);
        expect(result.earnedMarks).toBe(1);
      });
    });

    test('should handle whitespace trimming', () => {
      const testCases = ['  False  ', 'False   ', '   False', '\tFalse\n'];

      testCases.forEach(answer => {
        const result = handler.grade(validQuestion, answer);
        expect(result.isCorrect).toBe(true);
        expect(result.earnedMarks).toBe(1);
      });
    });

    test('should handle "T" and "F" variations', () => {
      const questionTrue = {
        ...validQuestion,
        correctAnswer: 'True'
      };

      expect(handler.grade(questionTrue, 'T').isCorrect).toBe(true);
      expect(handler.grade(questionTrue, 't').isCorrect).toBe(true);
      expect(handler.grade(validQuestion, 'F').isCorrect).toBe(true);
      expect(handler.grade(validQuestion, 'f').isCorrect).toBe(true);
    });

    test('should handle "1" and "0" variations', () => {
      const questionTrue = {
        ...validQuestion,
        correctAnswer: 'True'
      };

      expect(handler.grade(questionTrue, '1').isCorrect).toBe(true);
      expect(handler.grade(validQuestion, '0').isCorrect).toBe(true);
    });

    test('should handle "yes" and "no" variations', () => {
      const questionTrue = {
        ...validQuestion,
        correctAnswer: 'True'
      };

      expect(handler.grade(questionTrue, 'yes').isCorrect).toBe(true);
      expect(handler.grade(questionTrue, 'Yes').isCorrect).toBe(true);
      expect(handler.grade(validQuestion, 'no').isCorrect).toBe(true);
      expect(handler.grade(validQuestion, 'No').isCorrect).toBe(true);
    });

    test('should handle empty answer', () => {
      const result = handler.grade(validQuestion, '');
      
      expect(result.success).toBe(true);
      expect(result.isCorrect).toBe(false);
      expect(result.earnedMarks).toBe(0);
      expect(result.feedback).toContain('No answer provided');
    });

    test('should handle null answer', () => {
      const result = handler.grade(validQuestion, null);
      
      expect(result.success).toBe(true);
      expect(result.isCorrect).toBe(false);
      expect(result.earnedMarks).toBe(0);
      expect(result.feedback).toContain('No answer provided');
    });

    test('should handle undefined answer', () => {
      const result = handler.grade(validQuestion, undefined);
      
      expect(result.success).toBe(true);
      expect(result.isCorrect).toBe(false);
      expect(result.earnedMarks).toBe(0);
      expect(result.feedback).toContain('No answer provided');
    });

    test('should handle invalid answer format', () => {
      const result = handler.grade(validQuestion, 'Maybe');
      
      expect(result.success).toBe(true);
      expect(result.isCorrect).toBe(false);
      expect(result.earnedMarks).toBe(0);
      expect(result.feedback).toContain('Invalid answer format');
    });

    test('should return correct answer in result', () => {
      const result = handler.grade(validQuestion, 'True');
      
      expect(result.correctAnswer).toBe('False');
      expect(result.studentAnswer).toBe('True');
    });

    test('should include explanation in feedback', () => {
      const result = handler.grade(validQuestion, 'False');
      
      expect(result.explanation).toBe(validQuestion.explanation);
      expect(result.feedback).toContain(validQuestion.explanation);
    });

    test('should handle invalid question structure', () => {
      const invalidQuestion = {
        id: 1,
        type: 'true_false',
        question: 'Test?',
        // Missing required fields
      };

      const result = handler.grade(invalidQuestion, 'True');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid question structure');
      expect(result.earnedMarks).toBe(0);
    });

    test('should handle question with fractional marks', () => {
      const fractionalQuestion = {
        ...validQuestion,
        marks: 1.5
      };

      const result = handler.grade(fractionalQuestion, 'False');
      
      expect(result.earnedMarks).toBe(1.5);
      expect(result.totalMarks).toBe(1.5);
    });

    test('should handle correctAnswer with lowercase', () => {
      const lowercaseQuestion = {
        ...validQuestion,
        correctAnswer: 'false'
      };

      const result = handler.grade(lowercaseQuestion, 'False');
      expect(result.isCorrect).toBe(true);
    });
  });

  describe('gradeMultiple()', () => {
    const questions = [
      {
        id: 1,
        type: 'true_false',
        question: 'Ethiopia uses the Gregorian calendar.',
        options: ['True', 'False'],
        correctAnswer: 'False',
        marks: 1,
        explanation: 'Ethiopia uses the Ethiopian calendar.'
      },
      {
        id: 2,
        type: 'true_false',
        question: 'Addis Ababa is the capital of Ethiopia.',
        options: ['True', 'False'],
        correctAnswer: 'True',
        marks: 1,
        explanation: 'Addis Ababa is indeed the capital.'
      },
      {
        id: 3,
        type: 'true_false',
        question: 'Ethiopia is located in West Africa.',
        options: ['True', 'False'],
        correctAnswer: 'False',
        marks: 1,
        explanation: 'Ethiopia is in East Africa.'
      }
    ];

    test('should grade multiple questions correctly', () => {
      const studentAnswers = {
        1: 'False',
        2: 'True',
        3: 'False'
      };

      const result = handler.gradeMultiple(questions, studentAnswers);
      
      expect(result.totalQuestions).toBe(3);
      expect(result.totalMarks).toBe(3);
      expect(result.earnedMarks).toBe(3);
      expect(result.correctCount).toBe(3);
      expect(result.incorrectCount).toBe(0);
      expect(result.unansweredCount).toBe(0);
      expect(result.percentage).toBe('100.00');
    });

    test('should handle mixed correct and incorrect answers', () => {
      const studentAnswers = {
        1: 'False', // Correct
        2: 'False', // Incorrect
        3: 'False'  // Correct
      };

      const result = handler.gradeMultiple(questions, studentAnswers);
      
      expect(result.totalQuestions).toBe(3);
      expect(result.totalMarks).toBe(3);
      expect(result.earnedMarks).toBe(2);
      expect(result.correctCount).toBe(2);
      expect(result.incorrectCount).toBe(1);
      expect(result.percentage).toBe('66.67');
    });

    test('should handle unanswered questions', () => {
      const studentAnswers = {
        1: 'False',
        2: '',
        // 3 is missing
      };

      const result = handler.gradeMultiple(questions, studentAnswers);
      
      expect(result.correctCount).toBe(1);
      expect(result.unansweredCount).toBe(2);
      expect(result.earnedMarks).toBe(1);
    });

    test('should handle answer variations', () => {
      const studentAnswers = {
        1: 'f',     // False variation
        2: 'T',     // True variation
        3: '0'      // False variation
      };

      const result = handler.gradeMultiple(questions, studentAnswers);
      
      expect(result.correctCount).toBe(3);
      expect(result.earnedMarks).toBe(3);
    });

    test('should filter only true/false questions', () => {
      const mixedQuestions = [
        ...questions,
        {
          id: 4,
          type: 'multiple_choice',
          question: 'What is the capital?',
          options: ['Addis Ababa', 'Nairobi'],
          correctAnswer: 'Addis Ababa',
          marks: 2,
          explanation: 'Test explanation'
        }
      ];

      const studentAnswers = {
        1: 'False',
        2: 'True',
        3: 'False',
        4: 'Addis Ababa'
      };

      const result = handler.gradeMultiple(mixedQuestions, studentAnswers);
      
      // Should only grade the 3 true/false questions
      expect(result.totalQuestions).toBe(3);
      expect(result.totalMarks).toBe(3);
    });

    test('should return individual question results', () => {
      const studentAnswers = {
        1: 'False',
        2: 'True',
        3: 'True' // Incorrect
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

    test('should handle invalid answers in multiple grading', () => {
      const studentAnswers = {
        1: 'Maybe',  // Invalid
        2: 'True',   // Correct
        3: 'False'   // Correct
      };

      const result = handler.gradeMultiple(questions, studentAnswers);
      
      expect(result.correctCount).toBe(2);
      expect(result.incorrectCount).toBe(1);
      expect(result.earnedMarks).toBe(2);
    });
  });

  describe('isAnswerValid()', () => {
    test('should validate "True" and variations', () => {
      const variations = ['True', 'true', 'TRUE', 'T', 't', '1', 'yes'];
      
      variations.forEach(answer => {
        const result = handler.isAnswerValid(answer);
        expect(result.valid).toBe(true);
        expect(result.message).toBe('Answer is valid');
      });
    });

    test('should validate "False" and variations', () => {
      const variations = ['False', 'false', 'FALSE', 'F', 'f', '0', 'no'];
      
      variations.forEach(answer => {
        const result = handler.isAnswerValid(answer);
        expect(result.valid).toBe(true);
        expect(result.message).toBe('Answer is valid');
      });
    });

    test('should validate answer with whitespace', () => {
      const result1 = handler.isAnswerValid('  True  ');
      expect(result1.valid).toBe(true);

      const result2 = handler.isAnswerValid('  False  ');
      expect(result2.valid).toBe(true);
    });

    test('should reject invalid answers', () => {
      const invalidAnswers = ['Maybe', 'Yes and No', '123', 'Unknown'];
      
      invalidAnswers.forEach(answer => {
        const result = handler.isAnswerValid(answer);
        expect(result.valid).toBe(false);
        expect(result.message).toContain('must be True or False');
      });
    });

    test('should reject empty answer', () => {
      const result = handler.isAnswerValid('');
      
      expect(result.valid).toBe(false);
      expect(result.message).toContain('cannot be empty');
    });

    test('should reject null answer', () => {
      const result = handler.isAnswerValid(null);
      
      expect(result.valid).toBe(false);
      expect(result.message).toContain('cannot be empty');
    });
  });

  describe('getQuestionStatistics()', () => {
    const question = {
      id: 1,
      type: 'true_false',
      question: 'Ethiopia uses the Gregorian calendar.',
      options: ['True', 'False'],
      correctAnswer: 'False',
      marks: 1,
      explanation: 'Ethiopia uses the Ethiopian calendar.'
    };

    test('should calculate statistics for all correct answers', () => {
      const answers = ['False', 'false', 'F'];
      
      const stats = handler.getQuestionStatistics(question, answers);
      
      expect(stats.totalResponses).toBe(3);
      expect(stats.correctCount).toBe(3);
      expect(stats.incorrectCount).toBe(0);
      expect(stats.correctPercentage).toBe('100.00');
      expect(stats.averageScore).toBe('1.00');
    });

    test('should calculate statistics for mixed answers', () => {
      const answers = [
        'False', // Correct
        'True',  // Incorrect
        'False', // Correct
        'True'   // Incorrect
      ];
      
      const stats = handler.getQuestionStatistics(question, answers);
      
      expect(stats.totalResponses).toBe(4);
      expect(stats.correctCount).toBe(2);
      expect(stats.incorrectCount).toBe(2);
      expect(stats.correctPercentage).toBe('50.00');
      expect(stats.averageScore).toBe('0.50');
    });

    test('should track true/false distribution', () => {
      const answers = [
        'True',
        'True',
        'False',
        'False',
        'False'
      ];
      
      const stats = handler.getQuestionStatistics(question, answers);
      
      expect(stats.trueCount).toBe(2);
      expect(stats.falseCount).toBe(3);
      expect(stats.invalidCount).toBe(0);
    });

    test('should handle unanswered questions', () => {
      const answers = ['False', '', null, 'True'];
      
      const stats = handler.getQuestionStatistics(question, answers);
      
      expect(stats.totalResponses).toBe(4);
      expect(stats.unansweredCount).toBe(2);
      expect(stats.correctCount).toBe(1);
      expect(stats.incorrectCount).toBe(1);
    });

    test('should handle answer variations in distribution', () => {
      const answers = [
        'True',
        'true',
        'T',
        'False',
        'false',
        'F'
      ];
      
      const stats = handler.getQuestionStatistics(question, answers);
      
      expect(stats.trueCount).toBe(3);
      expect(stats.falseCount).toBe(3);
    });

    test('should track invalid answers', () => {
      const answers = [
        'False',
        'Maybe',
        'True',
        'Unknown'
      ];
      
      const stats = handler.getQuestionStatistics(question, answers);
      
      expect(stats.invalidCount).toBe(2);
      expect(stats.trueCount).toBe(1);
      expect(stats.falseCount).toBe(1);
    });

    test('should handle empty answers array', () => {
      const stats = handler.getQuestionStatistics(question, []);
      
      expect(stats.totalResponses).toBe(0);
      expect(stats.correctCount).toBe(0);
      expect(stats.averageScore).toBe(0);
      expect(stats.correctPercentage).toBe(0);
    });

    test('should handle all unanswered', () => {
      const answers = ['', null, undefined];
      
      const stats = handler.getQuestionStatistics(question, answers);
      
      expect(stats.unansweredCount).toBe(3);
      expect(stats.correctCount).toBe(0);
      expect(stats.incorrectCount).toBe(0);
    });
  });
});
