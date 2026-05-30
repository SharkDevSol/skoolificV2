/**
 * Test Suite for MultipleChoiceHandler
 * 
 * This test suite covers:
 * - Question validation
 * - Answer grading with various scenarios
 * - Case sensitivity handling
 * - Whitespace handling
 * - Edge cases
 * - Multiple question grading
 * - Answer validation
 * - Question statistics
 */

const MultipleChoiceHandler = require('./MultipleChoiceHandler');

describe('MultipleChoiceHandler', () => {
  let handler;

  beforeEach(() => {
    handler = new MultipleChoiceHandler();
  });

  describe('validate()', () => {
    test('should validate a correct multiple choice question', () => {
      const question = {
        id: 1,
        type: 'multiple_choice',
        question: 'What is the capital of Ethiopia?',
        options: ['Addis Ababa', 'Nairobi', 'Kampala', 'Khartoum'],
        correctAnswer: 'Addis Ababa',
        marks: 2,
        explanation: 'Addis Ababa is the capital and largest city of Ethiopia.'
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject question with wrong type', () => {
      const question = {
        id: 1,
        type: 'true_false',
        question: 'What is the capital of Ethiopia?',
        options: ['Addis Ababa', 'Nairobi'],
        correctAnswer: 'Addis Ababa',
        marks: 2,
        explanation: 'Test explanation'
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Question must be of type "multiple_choice"');
    });

    test('should reject question with missing required fields', () => {
      const question = {
        id: 1,
        type: 'multiple_choice',
        question: 'What is the capital of Ethiopia?',
        // Missing options, correctAnswer, marks, explanation
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should reject question with too few options', () => {
      const question = {
        id: 1,
        type: 'multiple_choice',
        question: 'What is the capital of Ethiopia?',
        options: ['Addis Ababa'], // Only 1 option, minimum is 2
        correctAnswer: 'Addis Ababa',
        marks: 2,
        explanation: 'Test explanation'
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(false);
    });

    test('should reject question with correctAnswer not in options', () => {
      const question = {
        id: 1,
        type: 'multiple_choice',
        question: 'What is the capital of Ethiopia?',
        options: ['Nairobi', 'Kampala', 'Khartoum'],
        correctAnswer: 'Addis Ababa', // Not in options
        marks: 2,
        explanation: 'Test explanation'
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('correctAnswer must be one of the provided options');
    });

    test('should reject question with invalid marks', () => {
      const question = {
        id: 1,
        type: 'multiple_choice',
        question: 'What is the capital of Ethiopia?',
        options: ['Addis Ababa', 'Nairobi'],
        correctAnswer: 'Addis Ababa',
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

  describe('grade()', () => {
    const validQuestion = {
      id: 1,
      type: 'multiple_choice',
      question: 'What is the capital of Ethiopia?',
      options: ['Addis Ababa', 'Nairobi', 'Kampala', 'Khartoum'],
      correctAnswer: 'Addis Ababa',
      marks: 2,
      explanation: 'Addis Ababa is the capital and largest city of Ethiopia.'
    };

    test('should grade correct answer', () => {
      const result = handler.grade(validQuestion, 'Addis Ababa');
      
      expect(result.success).toBe(true);
      expect(result.isCorrect).toBe(true);
      expect(result.earnedMarks).toBe(2);
      expect(result.totalMarks).toBe(2);
      expect(result.feedback).toContain('Correct');
    });

    test('should grade incorrect answer', () => {
      const result = handler.grade(validQuestion, 'Nairobi');
      
      expect(result.success).toBe(true);
      expect(result.isCorrect).toBe(false);
      expect(result.earnedMarks).toBe(0);
      expect(result.totalMarks).toBe(2);
      expect(result.feedback).toContain('Incorrect');
    });

    test('should handle case-insensitive comparison', () => {
      const testCases = [
        'addis ababa',
        'ADDIS ABABA',
        'AdDiS aBaBa',
        'Addis Ababa'
      ];

      testCases.forEach(answer => {
        const result = handler.grade(validQuestion, answer);
        expect(result.isCorrect).toBe(true);
        expect(result.earnedMarks).toBe(2);
      });
    });

    test('should handle whitespace trimming', () => {
      const testCases = [
        '  Addis Ababa  ',
        'Addis Ababa   ',
        '   Addis Ababa',
        '\tAddis Ababa\n'
      ];

      testCases.forEach(answer => {
        const result = handler.grade(validQuestion, answer);
        expect(result.isCorrect).toBe(true);
        expect(result.earnedMarks).toBe(2);
      });
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

    test('should return correct answer in result', () => {
      const result = handler.grade(validQuestion, 'Nairobi');
      
      expect(result.correctAnswer).toBe('Addis Ababa');
      expect(result.studentAnswer).toBe('Nairobi');
    });

    test('should include explanation in feedback', () => {
      const result = handler.grade(validQuestion, 'Addis Ababa');
      
      expect(result.explanation).toBe(validQuestion.explanation);
      expect(result.feedback).toContain(validQuestion.explanation);
    });

    test('should handle invalid question structure', () => {
      const invalidQuestion = {
        id: 1,
        type: 'multiple_choice',
        question: 'Test?',
        // Missing required fields
      };

      const result = handler.grade(invalidQuestion, 'Answer');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid question structure');
      expect(result.earnedMarks).toBe(0);
    });

    test('should handle question with fractional marks', () => {
      const fractionalQuestion = {
        ...validQuestion,
        marks: 1.5
      };

      const result = handler.grade(fractionalQuestion, 'Addis Ababa');
      
      expect(result.earnedMarks).toBe(1.5);
      expect(result.totalMarks).toBe(1.5);
    });
  });

  describe('gradeMultiple()', () => {
    const questions = [
      {
        id: 1,
        type: 'multiple_choice',
        question: 'What is the capital of Ethiopia?',
        options: ['Addis Ababa', 'Nairobi', 'Kampala', 'Khartoum'],
        correctAnswer: 'Addis Ababa',
        marks: 2,
        explanation: 'Addis Ababa is the capital.'
      },
      {
        id: 2,
        type: 'multiple_choice',
        question: 'What is 2 + 2?',
        options: ['3', '4', '5', '6'],
        correctAnswer: '4',
        marks: 1,
        explanation: 'The sum of 2 and 2 equals 4.'
      },
      {
        id: 3,
        type: 'multiple_choice',
        question: 'What color is the sky?',
        options: ['Blue', 'Red', 'Green', 'Yellow'],
        correctAnswer: 'Blue',
        marks: 1,
        explanation: 'The sky appears blue during the day.'
      }
    ];

    test('should grade multiple questions correctly', () => {
      const studentAnswers = {
        1: 'Addis Ababa',
        2: '4',
        3: 'Blue'
      };

      const result = handler.gradeMultiple(questions, studentAnswers);
      
      expect(result.totalQuestions).toBe(3);
      expect(result.totalMarks).toBe(4);
      expect(result.earnedMarks).toBe(4);
      expect(result.correctCount).toBe(3);
      expect(result.incorrectCount).toBe(0);
      expect(result.unansweredCount).toBe(0);
      expect(result.percentage).toBe('100.00');
    });

    test('should handle mixed correct and incorrect answers', () => {
      const studentAnswers = {
        1: 'Addis Ababa', // Correct
        2: '5',           // Incorrect
        3: 'Blue'         // Correct
      };

      const result = handler.gradeMultiple(questions, studentAnswers);
      
      expect(result.totalQuestions).toBe(3);
      expect(result.totalMarks).toBe(4);
      expect(result.earnedMarks).toBe(3);
      expect(result.correctCount).toBe(2);
      expect(result.incorrectCount).toBe(1);
      expect(result.percentage).toBe('75.00');
    });

    test('should handle unanswered questions', () => {
      const studentAnswers = {
        1: 'Addis Ababa',
        2: '',
        // 3 is missing
      };

      const result = handler.gradeMultiple(questions, studentAnswers);
      
      expect(result.correctCount).toBe(1);
      expect(result.unansweredCount).toBe(2);
      expect(result.earnedMarks).toBe(2);
    });

    test('should filter only multiple choice questions', () => {
      const mixedQuestions = [
        ...questions,
        {
          id: 4,
          type: 'true_false',
          question: 'Is this true?',
          options: ['True', 'False'],
          correctAnswer: 'True',
          marks: 1,
          explanation: 'This is a test explanation for validation.'
        }
      ];

      const studentAnswers = {
        1: 'Addis Ababa',
        2: '4',
        3: 'Blue',
        4: 'True'
      };

      const result = handler.gradeMultiple(mixedQuestions, studentAnswers);
      
      // Should only grade the 3 multiple choice questions
      expect(result.totalQuestions).toBe(3);
      expect(result.totalMarks).toBe(4);
    });

    test('should return individual question results', () => {
      const studentAnswers = {
        1: 'Addis Ababa',
        2: '4',
        3: 'Red' // Incorrect
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
  });

  describe('isAnswerValid()', () => {
    const question = {
      id: 1,
      type: 'multiple_choice',
      question: 'What is the capital of Ethiopia?',
      options: ['Addis Ababa', 'Nairobi', 'Kampala', 'Khartoum'],
      correctAnswer: 'Addis Ababa',
      marks: 2,
      explanation: 'This is a test explanation for validation.'
    };

    test('should validate answer that exists in options', () => {
      const result = handler.isAnswerValid(question, 'Addis Ababa');
      
      expect(result.valid).toBe(true);
      expect(result.message).toBe('Answer is valid');
    });

    test('should validate answer with different case', () => {
      const result = handler.isAnswerValid(question, 'addis ababa');
      
      expect(result.valid).toBe(true);
    });

    test('should validate answer with whitespace', () => {
      const result = handler.isAnswerValid(question, '  Addis Ababa  ');
      
      expect(result.valid).toBe(true);
    });

    test('should reject answer not in options', () => {
      const result = handler.isAnswerValid(question, 'Cairo');
      
      expect(result.valid).toBe(false);
      expect(result.message).toContain('must be one of the provided options');
    });

    test('should reject empty answer', () => {
      const result = handler.isAnswerValid(question, '');
      
      expect(result.valid).toBe(false);
      expect(result.message).toContain('cannot be empty');
    });

    test('should handle question with missing options', () => {
      const invalidQuestion = {
        ...question,
        options: undefined
      };

      const result = handler.isAnswerValid(invalidQuestion, 'Addis Ababa');
      
      expect(result.valid).toBe(false);
      expect(result.message).toContain('not properly defined');
    });
  });

  describe('getQuestionStatistics()', () => {
    const question = {
      id: 1,
      type: 'multiple_choice',
      question: 'What is the capital of Ethiopia?',
      options: ['Addis Ababa', 'Nairobi', 'Kampala', 'Khartoum'],
      correctAnswer: 'Addis Ababa',
      marks: 2,
      explanation: 'This is a test explanation for validation.'
    };

    test('should calculate statistics for all correct answers', () => {
      const answers = ['Addis Ababa', 'Addis Ababa', 'Addis Ababa'];
      
      const stats = handler.getQuestionStatistics(question, answers);
      
      expect(stats.totalResponses).toBe(3);
      expect(stats.correctCount).toBe(3);
      expect(stats.incorrectCount).toBe(0);
      expect(stats.correctPercentage).toBe('100.00');
      expect(stats.averageScore).toBe('2.00');
    });

    test('should calculate statistics for mixed answers', () => {
      const answers = [
        'Addis Ababa', // Correct
        'Nairobi',     // Incorrect
        'Addis Ababa', // Correct
        'Kampala'      // Incorrect
      ];
      
      const stats = handler.getQuestionStatistics(question, answers);
      
      expect(stats.totalResponses).toBe(4);
      expect(stats.correctCount).toBe(2);
      expect(stats.incorrectCount).toBe(2);
      expect(stats.correctPercentage).toBe('50.00');
      expect(stats.averageScore).toBe('1.00');
    });

    test('should track option distribution', () => {
      const answers = [
        'Addis Ababa',
        'Addis Ababa',
        'Nairobi',
        'Kampala',
        'Addis Ababa'
      ];
      
      const stats = handler.getQuestionStatistics(question, answers);
      
      expect(stats.optionDistribution['Addis Ababa']).toBe(3);
      expect(stats.optionDistribution['Nairobi']).toBe(1);
      expect(stats.optionDistribution['Kampala']).toBe(1);
      expect(stats.optionDistribution['Khartoum']).toBe(0);
    });

    test('should handle unanswered questions', () => {
      const answers = ['Addis Ababa', '', null, 'Nairobi'];
      
      const stats = handler.getQuestionStatistics(question, answers);
      
      expect(stats.totalResponses).toBe(4);
      expect(stats.unansweredCount).toBe(2);
      expect(stats.correctCount).toBe(1);
      expect(stats.incorrectCount).toBe(1);
    });

    test('should handle case-insensitive option distribution', () => {
      const answers = [
        'Addis Ababa',
        'addis ababa',
        'ADDIS ABABA'
      ];
      
      const stats = handler.getQuestionStatistics(question, answers);
      
      // All should be counted under the original option name
      expect(stats.optionDistribution['Addis Ababa']).toBe(3);
    });

    test('should handle empty answers array', () => {
      const stats = handler.getQuestionStatistics(question, []);
      
      expect(stats.totalResponses).toBe(0);
      expect(stats.correctCount).toBe(0);
      expect(stats.averageScore).toBe(0);
      expect(stats.correctPercentage).toBe(0);
    });
  });
});
