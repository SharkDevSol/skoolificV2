/**
 * Short Answer Handler Test Suite
 * 
 * Comprehensive tests for ShortAnswerHandler functionality including:
 * - Question validation
 * - Manual grading workflow (marking questions for manual review)
 * - Answer format validation
 * - Batch processing (gradeMultiple)
 * - Statistics generation (after manual grading)
 * 
 * IMPORTANT: Short answer questions CANNOT be auto-graded.
 * All tests verify that questions are correctly marked for manual grading.
 */

const ShortAnswerHandler = require('./ShortAnswerHandler');

describe('ShortAnswerHandler', () => {
  let handler;

  beforeEach(() => {
    handler = new ShortAnswerHandler();
  });

  // ==================== VALIDATION TESTS ====================

  describe('validate()', () => {
    test('should validate a correct short answer question', () => {
      const question = {
        id: 1,
        type: 'short_answer',
        question: 'Explain the significance of the Battle of Adwa in Ethiopian history.',
        modelAnswer: 'The Battle of Adwa (1896) was a decisive victory for Ethiopia against Italian colonial forces. It preserved Ethiopian independence and made Ethiopia the only African nation to successfully resist European colonization during the Scramble for Africa.',
        keyPoints: [
          'Decisive Ethiopian victory',
          'Defeated Italian colonization attempt',
          'Preserved Ethiopian independence',
          'Symbol of African resistance'
        ],
        marks: 5,
        explanation: 'A complete answer should mention the victory over Italy, preservation of independence, and significance for African resistance to colonialism.'
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject question with wrong type', () => {
      const question = {
        id: 1,
        type: 'multiple_choice',
        question: 'Test question',
        modelAnswer: 'Test answer',
        keyPoints: ['Point 1', 'Point 2'],
        marks: 5,
        explanation: 'Test explanation'
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Question must be of type "short_answer"');
    });

    test('should reject question without modelAnswer', () => {
      const question = {
        id: 1,
        type: 'short_answer',
        question: 'Explain the significance of the Battle of Adwa.',
        keyPoints: ['Point 1', 'Point 2'],
        marks: 5,
        explanation: 'Test explanation'
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('modelAnswer'))).toBe(true);
    });

    test('should reject question without keyPoints', () => {
      const question = {
        id: 1,
        type: 'short_answer',
        question: 'Explain the significance of the Battle of Adwa.',
        modelAnswer: 'Test answer',
        marks: 5,
        explanation: 'Test explanation'
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('keyPoints'))).toBe(true);
    });

    test('should reject question with too few keyPoints', () => {
      const question = {
        id: 1,
        type: 'short_answer',
        question: 'Explain the significance of the Battle of Adwa.',
        modelAnswer: 'Test answer',
        keyPoints: ['Only one point'],
        marks: 5,
        explanation: 'Test explanation'
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(false);
    });

    test('should reject question without marks', () => {
      const question = {
        id: 1,
        type: 'short_answer',
        question: 'Explain the significance of the Battle of Adwa.',
        modelAnswer: 'Test answer',
        keyPoints: ['Point 1', 'Point 2'],
        explanation: 'Test explanation'
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(false);
    });

    test('should reject question without explanation', () => {
      const question = {
        id: 1,
        type: 'short_answer',
        question: 'Explain the significance of the Battle of Adwa.',
        modelAnswer: 'Test answer',
        keyPoints: ['Point 1', 'Point 2'],
        marks: 5
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(false);
    });

    test('should reject question with modelAnswer too short', () => {
      const question = {
        id: 1,
        type: 'short_answer',
        question: 'Explain the significance of the Battle of Adwa.',
        modelAnswer: 'Too short',
        keyPoints: ['Point 1', 'Point 2'],
        marks: 5,
        explanation: 'Test explanation'
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(false);
    });

    test('should validate question with maximum keyPoints', () => {
      const question = {
        id: 1,
        type: 'short_answer',
        question: 'Explain the significance of the Battle of Adwa.',
        modelAnswer: 'The Battle of Adwa was a significant event in Ethiopian history.',
        keyPoints: [
          'Point 1', 'Point 2', 'Point 3', 'Point 4', 'Point 5',
          'Point 6', 'Point 7', 'Point 8', 'Point 9', 'Point 10'
        ],
        marks: 10,
        explanation: 'Test explanation'
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(true);
    });
  });

  // ==================== ANSWER VALIDATION TESTS ====================

  describe('isAnswerValid()', () => {
    test('should validate a valid string answer', () => {
      const result = handler.isAnswerValid('This is a valid answer.');
      expect(result.valid).toBe(true);
      expect(result.message).toBe('Answer is valid');
    });

    test('should validate a long answer', () => {
      const longAnswer = 'The Battle of Adwa was a decisive victory for Ethiopia against Italian colonial forces in 1896. This battle preserved Ethiopian independence and made Ethiopia the only African nation to successfully resist European colonization during the Scramble for Africa.';
      const result = handler.isAnswerValid(longAnswer);
      expect(result.valid).toBe(true);
    });

    test('should reject null answer', () => {
      const result = handler.isAnswerValid(null);
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Answer is required');
    });

    test('should reject undefined answer', () => {
      const result = handler.isAnswerValid(undefined);
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Answer is required');
    });

    test('should reject non-string answer', () => {
      const result = handler.isAnswerValid(12345);
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Answer must be a string');
    });

    test('should reject object answer', () => {
      const result = handler.isAnswerValid({ answer: 'test' });
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Answer must be a string');
    });

    test('should reject array answer', () => {
      const result = handler.isAnswerValid(['answer']);
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Answer must be a string');
    });

    test('should reject empty string', () => {
      const result = handler.isAnswerValid('');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Answer cannot be empty');
    });

    test('should reject whitespace-only string', () => {
      const result = handler.isAnswerValid('   ');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Answer cannot be empty');
    });

    test('should validate answer with leading/trailing whitespace', () => {
      const result = handler.isAnswerValid('  Valid answer  ');
      expect(result.valid).toBe(true);
    });
  });

  // ==================== GRADING TESTS (MANUAL GRADING WORKFLOW) ====================

  describe('grade()', () => {
    const validQuestion = {
      id: 1,
      type: 'short_answer',
      question: 'Explain the significance of the Battle of Adwa in Ethiopian history.',
      modelAnswer: 'The Battle of Adwa (1896) was a decisive victory for Ethiopia against Italian colonial forces. It preserved Ethiopian independence and made Ethiopia the only African nation to successfully resist European colonization during the Scramble for Africa.',
      keyPoints: [
        'Decisive Ethiopian victory',
        'Defeated Italian colonization attempt',
        'Preserved Ethiopian independence',
        'Symbol of African resistance'
      ],
      marks: 5,
      explanation: 'A complete answer should mention the victory over Italy, preservation of independence, and significance for African resistance to colonialism.'
    };

    test('should mark valid answer for manual grading', () => {
      const studentAnswer = 'The Battle of Adwa was a significant victory for Ethiopia against Italy in 1896. It helped preserve Ethiopian independence during the colonial era.';
      const result = handler.grade(validQuestion, studentAnswer);

      expect(result.success).toBe(true);
      expect(result.earnedMarks).toBe(null); // Cannot auto-grade
      expect(result.totalMarks).toBe(5);
      expect(result.requiresManualGrading).toBe(true);
      expect(result.isAnswered).toBe(true);
      expect(result.feedback).toBe('Pending manual grading by teacher');
      expect(result.studentAnswer).toBe(studentAnswer);
      expect(result.modelAnswer).toBe(validQuestion.modelAnswer);
      expect(result.keyPoints).toEqual(validQuestion.keyPoints);
      expect(result.explanation).toBe(validQuestion.explanation);
    });

    test('should provide model answer and key points for teacher reference', () => {
      const studentAnswer = 'Test answer';
      const result = handler.grade(validQuestion, studentAnswer);

      expect(result.modelAnswer).toBe(validQuestion.modelAnswer);
      expect(result.keyPoints).toEqual(validQuestion.keyPoints);
      expect(result.keyPoints).toHaveLength(4);
    });

    test('should handle empty student answer', () => {
      const result = handler.grade(validQuestion, '');

      expect(result.success).toBe(true);
      expect(result.earnedMarks).toBe(null);
      expect(result.requiresManualGrading).toBe(true);
      expect(result.isAnswered).toBe(false);
      expect(result.feedback).toBe('Answer cannot be empty');
    });

    test('should handle null student answer', () => {
      const result = handler.grade(validQuestion, null);

      expect(result.success).toBe(true);
      expect(result.earnedMarks).toBe(null);
      expect(result.requiresManualGrading).toBe(true);
      expect(result.isAnswered).toBe(false);
      expect(result.feedback).toBe('Answer is required');
    });

    test('should handle undefined student answer', () => {
      const result = handler.grade(validQuestion, undefined);

      expect(result.success).toBe(true);
      expect(result.earnedMarks).toBe(null);
      expect(result.requiresManualGrading).toBe(true);
      expect(result.isAnswered).toBe(false);
    });

    test('should handle whitespace-only answer', () => {
      const result = handler.grade(validQuestion, '   ');

      expect(result.success).toBe(true);
      expect(result.earnedMarks).toBe(null);
      expect(result.requiresManualGrading).toBe(true);
      expect(result.isAnswered).toBe(false);
      expect(result.feedback).toBe('Answer cannot be empty');
    });

    test('should handle invalid question structure', () => {
      const invalidQuestion = {
        id: 1,
        type: 'multiple_choice',
        question: 'Test',
        marks: 1
      };

      const result = handler.grade(invalidQuestion, 'test answer');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid question structure');
      expect(result.earnedMarks).toBe(null);
      expect(result.requiresManualGrading).toBe(true);
    });

    test('should handle short student answer', () => {
      const shortAnswer = 'Ethiopia won.';
      const result = handler.grade(validQuestion, shortAnswer);

      expect(result.success).toBe(true);
      expect(result.earnedMarks).toBe(null);
      expect(result.requiresManualGrading).toBe(true);
      expect(result.isAnswered).toBe(true);
      expect(result.studentAnswer).toBe(shortAnswer);
    });

    test('should handle long student answer', () => {
      const longAnswer = 'The Battle of Adwa, fought on March 1, 1896, was a decisive military victory for Ethiopia against the Kingdom of Italy. Emperor Menelik II led Ethiopian forces to defeat the Italian army, which had attempted to colonize Ethiopia. This victory was significant for several reasons: First, it preserved Ethiopian independence during the Scramble for Africa when most of the continent was being colonized by European powers. Second, it demonstrated that African nations could successfully resist European colonization. Third, it made Ethiopia a symbol of African resistance and independence. The battle had lasting impacts on African nationalism and anti-colonial movements throughout the continent.';
      const result = handler.grade(validQuestion, longAnswer);

      expect(result.success).toBe(true);
      expect(result.earnedMarks).toBe(null);
      expect(result.requiresManualGrading).toBe(true);
      expect(result.isAnswered).toBe(true);
      expect(result.studentAnswer).toBe(longAnswer);
    });

    test('should never assign marks automatically', () => {
      const perfectAnswer = validQuestion.modelAnswer;
      const result = handler.grade(validQuestion, perfectAnswer);

      // Even if student provides the exact model answer, no auto-grading
      expect(result.earnedMarks).toBe(null);
      expect(result.requiresManualGrading).toBe(true);
    });

    test('should include explanation in result', () => {
      const result = handler.grade(validQuestion, 'Test answer');

      expect(result.explanation).toBe(validQuestion.explanation);
    });
  });

  // ==================== BATCH GRADING TESTS ====================

  describe('gradeMultiple()', () => {
    const questions = [
      {
        id: 1,
        type: 'short_answer',
        question: 'Explain the significance of the Battle of Adwa.',
        modelAnswer: 'The Battle of Adwa was a decisive victory for Ethiopia.',
        keyPoints: ['Victory', 'Independence'],
        marks: 5,
        explanation: 'Test explanation 1'
      },
      {
        id: 2,
        type: 'short_answer',
        question: 'Describe the Ethiopian calendar system.',
        modelAnswer: 'The Ethiopian calendar is approximately 7-8 years behind the Gregorian calendar.',
        keyPoints: ['Different from Gregorian', '13 months'],
        marks: 3,
        explanation: 'Test explanation 2'
      },
      {
        id: 3,
        type: 'multiple_choice', // Different type, should be ignored
        question: 'Test?',
        options: ['A', 'B'],
        correctAnswer: 'A',
        marks: 1,
        explanation: 'Test explanation 3'
      },
      {
        id: 4,
        type: 'short_answer',
        question: 'What is the capital of Ethiopia?',
        modelAnswer: 'Addis Ababa is the capital of Ethiopia.',
        keyPoints: ['Addis Ababa', 'Capital city'],
        marks: 2,
        explanation: 'Test explanation 4'
      }
    ];

    test('should process multiple questions for manual grading', () => {
      const studentAnswers = {
        1: 'The Battle of Adwa was important.',
        2: 'The Ethiopian calendar is unique.',
        4: 'Addis Ababa'
      };

      const result = handler.gradeMultiple(questions, studentAnswers);

      expect(result.totalQuestions).toBe(3); // Only short_answer questions
      expect(result.totalMarks).toBe(10); // 5 + 3 + 2
      expect(result.earnedMarks).toBe(null); // Cannot auto-grade
      expect(result.answeredCount).toBe(3);
      expect(result.unansweredCount).toBe(0);
      expect(result.requiresManualGrading).toBe(true);
      expect(result.questionResults).toHaveLength(3);
    });

    test('should handle unanswered questions', () => {
      const studentAnswers = {
        1: 'Answer to question 1',
        2: null, // Unanswered
        4: '' // Empty answer
      };

      const result = handler.gradeMultiple(questions, studentAnswers);

      expect(result.answeredCount).toBe(1);
      expect(result.unansweredCount).toBe(2);
      expect(result.requiresManualGrading).toBe(true);
    });

    test('should handle all unanswered questions', () => {
      const studentAnswers = {
        1: null,
        2: undefined,
        4: ''
      };

      const result = handler.gradeMultiple(questions, studentAnswers);

      expect(result.answeredCount).toBe(0);
      expect(result.unansweredCount).toBe(3);
      expect(result.totalMarks).toBe(10);
      expect(result.earnedMarks).toBe(null);
    });

    test('should filter only short_answer questions', () => {
      const mixedQuestions = [
        {
          id: 1,
          type: 'multiple_choice',
          question: 'Test?',
          options: ['A', 'B'],
          correctAnswer: 'A',
          marks: 1,
          explanation: 'Test'
        },
        {
          id: 2,
          type: 'short_answer',
          question: 'Explain something.',
          modelAnswer: 'This is the model answer.',
          keyPoints: ['Point 1', 'Point 2'],
          marks: 5,
          explanation: 'Test'
        }
      ];

      const studentAnswers = {
        2: 'Student answer'
      };

      const result = handler.gradeMultiple(mixedQuestions, studentAnswers);

      expect(result.totalQuestions).toBe(1);
      expect(result.totalMarks).toBe(5);
    });

    test('should include individual question results', () => {
      const studentAnswers = {
        1: 'Answer 1',
        2: 'Answer 2'
      };

      const result = handler.gradeMultiple(questions, studentAnswers);

      expect(result.questionResults).toHaveLength(3);
      expect(result.questionResults[0].questionId).toBe(1);
      expect(result.questionResults[0].success).toBe(true);
      expect(result.questionResults[0].requiresManualGrading).toBe(true);
      expect(result.questionResults[0].earnedMarks).toBe(null);
    });

    test('should handle empty questions array', () => {
      const result = handler.gradeMultiple([], {});

      expect(result.totalQuestions).toBe(0);
      expect(result.totalMarks).toBe(0);
      expect(result.earnedMarks).toBe(null);
      expect(result.requiresManualGrading).toBe(true);
    });

    test('should provide model answers and key points for all questions', () => {
      const studentAnswers = {
        1: 'Answer 1',
        2: 'Answer 2',
        4: 'Answer 4'
      };

      const result = handler.gradeMultiple(questions, studentAnswers);

      result.questionResults.forEach(qResult => {
        expect(qResult.modelAnswer).toBeDefined();
        expect(qResult.keyPoints).toBeDefined();
        expect(Array.isArray(qResult.keyPoints)).toBe(true);
      });
    });
  });

  // ==================== STATISTICS TESTS ====================

  describe('getQuestionStatistics()', () => {
    const question = {
      id: 1,
      type: 'short_answer',
      question: 'Explain the significance of the Battle of Adwa.',
      modelAnswer: 'The Battle of Adwa was a decisive victory for Ethiopia.',
      keyPoints: ['Victory', 'Independence', 'Resistance', 'Colonialism'],
      marks: 10,
      explanation: 'Test explanation'
    };

    test('should calculate statistics for graded responses', () => {
      const gradedResponses = [
        { studentAnswer: 'Answer 1', earnedMarks: 10 },
        { studentAnswer: 'Answer 2', earnedMarks: 8 },
        { studentAnswer: 'Answer 3', earnedMarks: 6 },
        { studentAnswer: 'Answer 4', earnedMarks: 4 }
      ];

      const stats = handler.getQuestionStatistics(question, gradedResponses);

      expect(stats.totalResponses).toBe(4);
      expect(stats.gradedCount).toBe(4);
      expect(stats.ungradedCount).toBe(0);
      expect(stats.averageScore).toBe('7.00'); // (10+8+6+4)/4
      expect(stats.averagePercentage).toBe('70.00'); // 28/40 * 100
    });

    test('should handle mix of graded and ungraded responses', () => {
      const responses = [
        { studentAnswer: 'Answer 1', earnedMarks: 10 },
        { studentAnswer: 'Answer 2', earnedMarks: null }, // Ungraded
        { studentAnswer: 'Answer 3', earnedMarks: 8 },
        { studentAnswer: 'Answer 4', earnedMarks: undefined } // Ungraded
      ];

      const stats = handler.getQuestionStatistics(question, responses);

      expect(stats.totalResponses).toBe(4);
      expect(stats.gradedCount).toBe(2);
      expect(stats.ungradedCount).toBe(2);
      expect(stats.averageScore).toBe('9.00'); // (10+8)/2
    });

    test('should calculate score distribution', () => {
      const responses = [
        { studentAnswer: 'A1', earnedMarks: 10 }, // 100% - fullMarks
        { studentAnswer: 'A2', earnedMarks: 10 }, // 100% - fullMarks
        { studentAnswer: 'A3', earnedMarks: 8 },  // 80% - threeQuarters
        { studentAnswer: 'A4', earnedMarks: 6 },  // 60% - half
        { studentAnswer: 'A5', earnedMarks: 3 },  // 30% - quarter
        { studentAnswer: 'A6', earnedMarks: 0 }   // 0% - zero
      ];

      const stats = handler.getQuestionStatistics(question, responses);

      expect(stats.scoreDistribution.fullMarks).toBe(2);
      expect(stats.scoreDistribution.threeQuarters).toBe(1);
      expect(stats.scoreDistribution.half).toBe(1);
      expect(stats.scoreDistribution.quarter).toBe(1);
      expect(stats.scoreDistribution.zero).toBe(1);
    });

    test('should handle empty responses', () => {
      const stats = handler.getQuestionStatistics(question, []);

      expect(stats.totalResponses).toBe(0);
      expect(stats.gradedCount).toBe(0);
      expect(stats.ungradedCount).toBe(0);
      expect(stats.averageScore).toBe('0');
      expect(stats.averagePercentage).toBe('0');
    });

    test('should handle all ungraded responses', () => {
      const responses = [
        { studentAnswer: 'Answer 1', earnedMarks: null },
        { studentAnswer: 'Answer 2', earnedMarks: null },
        { studentAnswer: 'Answer 3', earnedMarks: undefined }
      ];

      const stats = handler.getQuestionStatistics(question, responses);

      expect(stats.totalResponses).toBe(3);
      expect(stats.gradedCount).toBe(0);
      expect(stats.ungradedCount).toBe(3);
      expect(stats.averageScore).toBe('0');
    });

    test('should include model answer and key points', () => {
      const stats = handler.getQuestionStatistics(question, []);

      expect(stats.modelAnswer).toBe(question.modelAnswer);
      expect(stats.keyPoints).toEqual(question.keyPoints);
    });

    test('should calculate correct percentages for edge cases', () => {
      const responses = [
        { studentAnswer: 'A1', earnedMarks: 10 }, // 100%
        { studentAnswer: 'A2', earnedMarks: 7.5 }, // 75%
        { studentAnswer: 'A3', earnedMarks: 5 }, // 50%
        { studentAnswer: 'A4', earnedMarks: 2.5 }, // 25%
        { studentAnswer: 'A5', earnedMarks: 0 } // 0%
      ];

      const stats = handler.getQuestionStatistics(question, responses);

      expect(stats.scoreDistribution.fullMarks).toBe(1);
      expect(stats.scoreDistribution.threeQuarters).toBe(1);
      expect(stats.scoreDistribution.half).toBe(1);
      expect(stats.scoreDistribution.quarter).toBe(1);
      expect(stats.scoreDistribution.zero).toBe(1);
    });

    test('should handle partial marks correctly', () => {
      const responses = [
        { studentAnswer: 'A1', earnedMarks: 9.5 },
        { studentAnswer: 'A2', earnedMarks: 7.8 },
        { studentAnswer: 'A3', earnedMarks: 5.2 }
      ];

      const stats = handler.getQuestionStatistics(question, responses);

      expect(stats.gradedCount).toBe(3);
      expect(stats.averageScore).toBe('7.50'); // (9.5+7.8+5.2)/3
    });

    test('should include questionId in statistics', () => {
      const stats = handler.getQuestionStatistics(question, []);

      expect(stats.questionId).toBe(question.id);
    });
  });
});
