/**
 * Integration Test Suite for All Question Type Handlers
 * 
 * This test suite verifies that all question type handlers work together correctly
 * and can be used in a unified grading system.
 */

const MultipleChoiceHandler = require('./MultipleChoiceHandler');
const TrueFalseHandler = require('./TrueFalseHandler');
const MultipleTrueFalseHandler = require('./MultipleTrueFalseHandler');
const MatchingHandler = require('./MatchingHandler');
const NumericHandler = require('./NumericHandler');
const FillBlankHandler = require('./FillBlankHandler');
const ShortAnswerHandler = require('./ShortAnswerHandler');
const EssayHandler = require('./EssayHandler');
const TransformationHandler = require('./TransformationHandler');
const { groupByType, getTypeCounts } = require('../utils/questionGrouping');

describe('Question Type Handlers Integration', () => {
  // Initialize all handlers
  const handlers = {
    multiple_choice: new MultipleChoiceHandler(),
    true_false: new TrueFalseHandler(),
    multiple_true_false: new MultipleTrueFalseHandler(),
    matching: new MatchingHandler(),
    numeric: new NumericHandler(),
    fill_blank: new FillBlankHandler(),
    short_answer: new ShortAnswerHandler(),
    essay: new EssayHandler(),
    transformation: new TransformationHandler()
  };

  // Sample exam with all question types
  const mixedExam = [
    {
      id: 1,
      type: 'multiple_choice',
      question: 'What is the capital of Ethiopia?',
      options: ['Addis Ababa', 'Nairobi', 'Kampala', 'Khartoum'],
      correctAnswer: 'Addis Ababa',
      marks: 2,
      explanation: 'Addis Ababa is the capital of Ethiopia.'
    },
    {
      id: 2,
      type: 'true_false',
      question: 'Ethiopia uses the Gregorian calendar.',
      options: ['True', 'False'],
      correctAnswer: 'False',
      marks: 1,
      explanation: 'Ethiopia uses the Ethiopian calendar.'
    },
    {
      id: 3,
      type: 'multiple_true_false',
      question: 'Evaluate the following statements:',
      statements: ['Ethiopia is landlocked', 'The Blue Nile originates in Ethiopia'],
      correctAnswers: [true, true],
      marks: 2,
      explanation: 'Both statements are true.'
    },
    {
      id: 4,
      type: 'matching',
      question: 'Match the items:',
      leftColumn: ['A', 'B'],
      rightColumn: ['1', '2'],
      correctMatches: [{ left: 'A', right: '1' }, { left: 'B', right: '2' }],
      marks: 2,
      explanation: 'Correct matches.'
    },
    {
      id: 5,
      type: 'numeric',
      question: 'What is 5 + 3?',
      correctAnswer: '8',
      marks: 1,
      explanation: 'The sum of 5 and 3 equals 8.'
    },
    {
      id: 6,
      type: 'fill_blank',
      question: 'The capital of Ethiopia is _____.',
      correctAnswers: ['Addis Ababa'],
      marks: 1,
      explanation: 'Addis Ababa is the capital.'
    },
    {
      id: 7,
      type: 'short_answer',
      question: 'Explain the significance of the Battle of Adwa.',
      modelAnswer: 'The Battle of Adwa was a decisive victory for Ethiopia against Italian colonial forces.',
      keyPoints: ['Decisive victory', 'Against Italy'],
      marks: 3,
      explanation: 'This is a key historical event in Ethiopian history.'
    },
    {
      id: 8,
      type: 'essay',
      question: 'Discuss the Ethiopian calendar system.',
      modelAnswer: 'The Ethiopian calendar is unique and has cultural significance in modern Ethiopian society.',
      rubric: [
        { criterion: 'Understanding', points: 3 },
        { criterion: 'Analysis', points: 2 }
      ],
      marks: 5,
      explanation: 'Comprehensive essay on the Ethiopian calendar system.'
    },
    {
      id: 9,
      type: 'transformation',
      question: 'Correct the errors:',
      originalText: 'She don\'t like apples.',
      correctTransformation: 'She doesn\'t like apples.',
      marks: 1,
      explanation: 'Subject-verb agreement.'
    }
  ];

  describe('Handler Initialization', () => {
    test('all handlers should be initialized', () => {
      Object.values(handlers).forEach(handler => {
        expect(handler).toBeDefined();
        expect(typeof handler.validate).toBe('function');
        expect(typeof handler.grade).toBe('function');
      });
    });

    test('all handlers should have gradeMultiple method', () => {
      Object.values(handlers).forEach(handler => {
        expect(typeof handler.gradeMultiple).toBe('function');
      });
    });

    test('all handlers should have getQuestionStatistics method', () => {
      Object.values(handlers).forEach(handler => {
        expect(typeof handler.getQuestionStatistics).toBe('function');
      });
    });
  });

  describe('Mixed Question Type Validation', () => {
    test('should validate all question types', () => {
      mixedExam.forEach(question => {
        const handler = handlers[question.type];
        const validation = handler.validate(question);
        expect(validation.valid).toBe(true);
      });
    });

    test('should detect invalid questions', () => {
      const invalidQuestion = {
        id: 10,
        type: 'multiple_choice',
        question: 'Q?', // Too short
        marks: 1
      };

      const handler = handlers.multiple_choice;
      const validation = handler.validate(invalidQuestion);
      expect(validation.valid).toBe(false);
    });
  });

  describe('Mixed Question Type Grading', () => {
    const studentAnswers = {
      1: 'Addis Ababa', // MCQ - correct
      2: 'False', // T/F - correct
      3: [true, true], // MTF - correct
      4: [{ left: 'A', right: '1' }, { left: 'B', right: '2' }], // Matching - correct
      5: '8', // Numeric - correct
      6: ['Addis Ababa'], // Fill blank - correct
      7: 'The Battle of Adwa was a decisive victory for Ethiopia against Italian colonial forces.', // Short answer - manual grading
      8: 'The Ethiopian calendar is unique and has cultural significance in modern Ethiopian society.', // Essay - manual grading
      9: 'She doesn\'t like apples.' // Transformation - correct
    };

    test('should grade all auto-gradable question types', () => {
      const autoGradableTypes = [
        'multiple_choice',
        'true_false',
        'multiple_true_false',
        'matching',
        'numeric',
        'fill_blank',
        'transformation'
      ];

      autoGradableTypes.forEach(type => {
        const question = mixedExam.find(q => q.type === type);
        const handler = handlers[type];
        const result = handler.grade(question, studentAnswers[question.id]);

        expect(result.success).toBe(true);
        expect(result.earnedMarks).toBeDefined();
        expect(result.totalMarks).toBe(question.marks);
      });
    });

    test('should mark manual grading questions correctly', () => {
      const manualGradingTypes = ['short_answer', 'essay'];

      manualGradingTypes.forEach(type => {
        const question = mixedExam.find(q => q.type === type);
        const handler = handlers[type];
        const result = handler.grade(question, studentAnswers[question.id]);

        expect(result.success).toBe(true);
        expect(result.requiresManualGrading).toBe(true);
        expect(result.earnedMarks).toBeNull();
      });
    });

    test('should calculate total marks correctly', () => {
      let totalMarks = 0;
      let earnedMarks = 0;

      mixedExam.forEach(question => {
        const handler = handlers[question.type];
        const result = handler.grade(question, studentAnswers[question.id]);

        totalMarks += result.totalMarks;
        if (result.earnedMarks !== null) {
          earnedMarks += result.earnedMarks;
        }
      });

      expect(totalMarks).toBe(18); // Sum of all marks
      expect(earnedMarks).toBe(10); // Sum of auto-graded marks (excluding manual grading)
    });
  });

  describe('Question Grouping Integration', () => {
    test('should group mixed questions by type', () => {
      const grouped = groupByType(mixedExam);

      expect(Object.keys(grouped)).toHaveLength(9);
      expect(grouped.multiple_choice).toHaveLength(1);
      expect(grouped.true_false).toHaveLength(1);
      expect(grouped.essay).toHaveLength(1);
    });

    test('should get correct type counts', () => {
      const counts = getTypeCounts(mixedExam);

      expect(counts.multiple_choice).toBe(1);
      expect(counts.true_false).toBe(1);
      expect(counts.multiple_true_false).toBe(1);
      expect(counts.matching).toBe(1);
      expect(counts.numeric).toBe(1);
      expect(counts.fill_blank).toBe(1);
      expect(counts.short_answer).toBe(1);
      expect(counts.essay).toBe(1);
      expect(counts.transformation).toBe(1);
    });
  });

  describe('Batch Grading Integration', () => {
    test('should grade multiple questions of same type', () => {
      const mcQuestions = [
        mixedExam[0], // MCQ
        {
          id: 10,
          type: 'multiple_choice',
          question: 'What is 2+2?',
          options: ['3', '4', '5'],
          correctAnswer: '4',
          marks: 1,
          explanation: 'Basic math'
        }
      ];

      const answers = {
        1: 'Addis Ababa',
        10: '4'
      };

      const handler = handlers.multiple_choice;
      const result = handler.gradeMultiple(mcQuestions, answers);

      expect(result.totalQuestions).toBe(2);
      expect(result.correctCount).toBe(2);
      expect(result.earnedMarks).toBe(3); // 2 + 1
    });
  });

  describe('Statistics Generation Integration', () => {
    test('should generate statistics for all question types', () => {
      const allAnswers = {
        multiple_choice: ['Addis Ababa', 'Nairobi', 'Addis Ababa'],
        true_false: ['False', 'True', 'False'],
        numeric: ['8', '7', '8']
      };

      // Test MCQ statistics
      const mcQuestion = mixedExam[0];
      const mcStats = handlers.multiple_choice.getQuestionStatistics(
        mcQuestion,
        allAnswers.multiple_choice
      );
      expect(mcStats.correctCount).toBe(2);
      expect(mcStats.incorrectCount).toBe(1);

      // Test T/F statistics
      const tfQuestion = mixedExam[1];
      const tfStats = handlers.true_false.getQuestionStatistics(
        tfQuestion,
        allAnswers.true_false
      );
      expect(tfStats.correctCount).toBe(2);
      expect(tfStats.incorrectCount).toBe(1);

      // Test Numeric statistics
      const numQuestion = mixedExam[4];
      const numStats = handlers.numeric.getQuestionStatistics(
        numQuestion,
        allAnswers.numeric
      );
      expect(numStats.correctCount).toBeGreaterThanOrEqual(0);
      expect(numStats.totalResponses).toBe(3);
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle invalid answers gracefully', () => {
      const invalidAnswers = {
        1: null, // MCQ - invalid
        2: undefined, // T/F - invalid
        3: 'not an array', // MTF - invalid
        4: 'not an array', // Matching - invalid
        5: 'not a number', // Numeric - invalid (but will try to parse)
        6: 'not an array', // Fill blank - invalid
        7: '', // Short answer - empty
        8: '', // Essay - empty
        9: '' // Transformation - empty
      };

      mixedExam.forEach(question => {
        const handler = handlers[question.type];
        const result = handler.grade(question, invalidAnswers[question.id]);

        // Should not throw errors
        expect(result).toBeDefined();
        expect(result.success).toBeDefined();
      });
    });

    test('should handle missing answers', () => {
      const emptyAnswers = {};

      mixedExam.forEach(question => {
        const handler = handlers[question.type];
        const result = handler.grade(question, emptyAnswers[question.id]);

        expect(result).toBeDefined();
        expect(result.earnedMarks).toBeDefined();
      });
    });
  });

  describe('Unified Grading System', () => {
    test('should create a unified grading function', () => {
      function gradeQuestion(question, studentAnswer) {
        const handler = handlers[question.type];
        if (!handler) {
          throw new Error(`Unsupported question type: ${question.type}`);
        }
        return handler.grade(question, studentAnswer);
      }

      const studentAnswers = {
        1: 'Addis Ababa',
        2: 'False',
        3: [true, true]
      };

      const results = mixedExam.slice(0, 3).map(question => 
        gradeQuestion(question, studentAnswers[question.id])
      );

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    test('should handle all question types in unified system', () => {
      function gradeExam(questions, answers) {
        const results = {
          totalQuestions: questions.length,
          totalMarks: 0,
          earnedMarks: 0,
          manualGradingRequired: 0,
          questionResults: []
        };

        questions.forEach(question => {
          const handler = handlers[question.type];
          const result = handler.grade(question, answers[question.id]);

          results.totalMarks += result.totalMarks;
          if (result.earnedMarks !== null) {
            results.earnedMarks += result.earnedMarks;
          }
          if (result.requiresManualGrading) {
            results.manualGradingRequired++;
          }

          results.questionResults.push({
            questionId: question.id,
            ...result
          });
        });

        return results;
      }

      const studentAnswers = {
        1: 'Addis Ababa',
        2: 'False',
        3: [true, true],
        4: [{ left: 'A', right: '1' }, { left: 'B', right: '2' }],
        5: '8',
        6: ['Addis Ababa'],
        7: 'Answer',
        8: 'Essay answer',
        9: 'She doesn\'t like apples.'
      };

      const results = gradeExam(mixedExam, studentAnswers);

      expect(results.totalQuestions).toBe(9);
      expect(results.totalMarks).toBe(18);
      expect(results.manualGradingRequired).toBe(2); // Short answer and essay
      expect(results.questionResults).toHaveLength(9);
    });
  });

  describe('Performance Test', () => {
    test('should handle large number of questions efficiently', () => {
      const largeExam = [];
      for (let i = 0; i < 100; i++) {
        largeExam.push({
          id: i + 1,
          type: 'multiple_choice',
          question: `What is the answer to question number ${i + 1}?`,
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 'A',
          marks: 1,
          explanation: 'The correct answer is option A for this question.'
        });
      }

      const answers = {};
      for (let i = 0; i < 100; i++) {
        answers[i + 1] = 'A';
      }

      const startTime = Date.now();
      const handler = handlers.multiple_choice;
      const result = handler.gradeMultiple(largeExam, answers);
      const endTime = Date.now();

      expect(result.totalQuestions).toBe(100);
      expect(result.correctCount).toBe(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in less than 1 second
    });
  });
});
