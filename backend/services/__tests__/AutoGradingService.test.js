/**
 * AutoGradingService Unit Tests
 * 
 * Comprehensive test suite for the AutoGradingService class.
 * Tests cover:
 * - Constructor and initialization
 * - Exam grading (success cases)
 * - Question grading (all types)
 * - Error handling
 * - Edge cases
 * - Statistics generation
 * - Validation
 * 
 * Target: 80%+ code coverage
 */

const AutoGradingService = require('../AutoGradingService');

describe('AutoGradingService', () => {
  let service;

  beforeEach(() => {
    service = new AutoGradingService();
  });

  // ============================================================================
  // TEST SUITE 1: Constructor and Initialization
  // ============================================================================
  describe('1. Constructor and Initialization', () => {
    test('1.1 Should initialize with all question type handlers', () => {
      expect(service).toBeDefined();
      expect(service.handlers).toBeDefined();
      expect(service.handlers.multiple_choice).toBeDefined();
      expect(service.handlers.true_false).toBeDefined();
      expect(service.handlers.multiple_true_false).toBeDefined();
      expect(service.handlers.matching).toBeDefined();
      expect(service.handlers.numeric).toBeDefined();
      expect(service.handlers.fill_blank).toBeDefined();
      expect(service.handlers.short_answer).toBeDefined();
      expect(service.handlers.essay).toBeDefined();
      expect(service.handlers.transformation).toBeDefined();
    });

    test('1.2 Should have 9 question type handlers', () => {
      const handlerCount = Object.keys(service.handlers).length;
      expect(handlerCount).toBe(9);
    });
  });

  // ============================================================================
  // TEST SUITE 2: Exam Grading - Success Cases
  // ============================================================================
  describe('2. Exam Grading - Success Cases', () => {
    test('2.1 Should grade a complete exam with multiple question types', () => {
      const exam = {
        questions: [
          {
            id: 1,
            type: 'multiple_choice',
            question: 'What is 2+2?',
            options: ['3', '4', '5', '6'],
            correctAnswer: '4',
            marks: 2,
            explanation: '2+2 equals 4'
          },
          {
            id: 2,
            type: 'true_false',
            question: 'The sky is blue',
            options: ['True', 'False'],
            correctAnswer: 'True',
            marks: 1,
            explanation: 'The sky appears blue due to Rayleigh scattering'
          },
          {
            id: 3,
            type: 'numeric',
            question: 'What is 10 * 5?',
            correctAnswer: 50,
            marks: 2,
            explanation: '10 multiplied by 5 equals 50'
          }
        ]
      };

      const studentAnswers = {
        1: '4',
        2: 'True',
        3: 50
      };

      const result = service.gradeExam(exam, studentAnswers, 'student123', 'exam456');

      expect(result.success).toBe(true);
      expect(result.studentId).toBe('student123');
      expect(result.examId).toBe('exam456');
      expect(result.totalQuestions).toBe(3);
      expect(result.totalMarks).toBe(5);
      expect(result.earnedMarks).toBe(5);
      expect(result.percentage).toBe(100);
      expect(result.autoGradedQuestions).toBe(3);
      expect(result.manualGradingRequired).toBe(0);
      expect(result.requiresManualGrading).toBe(false);
      expect(result.questionResults).toHaveLength(3);
      expect(result.gradedAt).toBeDefined();
    });

    test('2.2 Should handle partially correct answers', () => {
      const exam = {
        questions: [
          {
            id: 1,
            type: 'multiple_choice',
            question: 'What is the capital of France?',
            options: ['London', 'Paris', 'Berlin', 'Madrid'],
            correctAnswer: 'Paris',
            marks: 2,
            explanation: 'Paris is the capital of France'
          },
          {
            id: 2,
            type: 'multiple_choice',
            question: 'What is 5+5?',
            options: ['8', '9', '10', '11'],
            correctAnswer: '10',
            marks: 2,
            explanation: '5+5 equals 10'
          }
        ]
      };

      const studentAnswers = {
        1: 'Paris',  // Correct
        2: '9'       // Incorrect
      };

      const result = service.gradeExam(exam, studentAnswers);

      expect(result.success).toBe(true);
      expect(result.totalMarks).toBe(4);
      expect(result.earnedMarks).toBe(2);
      expect(result.percentage).toBe(50);
    });

    test('2.3 Should handle exams with manual grading required', () => {
      const exam = {
        questions: [
          {
            id: 1,
            type: 'multiple_choice',
            question: 'What is 2+2?',
            options: ['3', '4', '5', '6'],
            correctAnswer: '4',
            marks: 2,
            explanation: '2+2 equals 4'
          },
          {
            id: 2,
            type: 'essay',
            question: 'Explain photosynthesis',
            marks: 10,
            explanation: 'Photosynthesis is the process by which plants convert light energy into chemical energy'
          }
        ]
      };

      const studentAnswers = {
        1: '4',
        2: 'Photosynthesis is when plants make food using sunlight...'
      };

      const result = service.gradeExam(exam, studentAnswers);

      expect(result.success).toBe(true);
      expect(result.totalMarks).toBe(12);
      expect(result.earnedMarks).toBe(2); // Only auto-graded question
      expect(result.autoGradedQuestions).toBe(1);
      expect(result.manualGradingRequired).toBe(1);
      expect(result.requiresManualGrading).toBe(true);
      expect(result.percentage).toBe(100); // 100% of auto-gradable questions correct
    });

    test('2.4 Should handle empty student answers', () => {
      const exam = {
        questions: [
          {
            id: 1,
            type: 'multiple_choice',
            question: 'What is 2+2?',
            options: ['3', '4', '5', '6'],
            correctAnswer: '4',
            marks: 2,
            explanation: '2+2 equals 4'
          }
        ]
      };

      const studentAnswers = {};

      const result = service.gradeExam(exam, studentAnswers);

      expect(result.success).toBe(true);
      expect(result.earnedMarks).toBe(0);
      expect(result.percentage).toBe(0);
    });

    test('2.5 Should round percentage to 2 decimal places', () => {
      const exam = {
        questions: [
          {
            id: 1,
            type: 'multiple_choice',
            question: 'Question 1',
            options: ['A', 'B', 'C', 'D'],
            correctAnswer: 'A',
            marks: 3,
            explanation: 'Explanation'
          },
          {
            id: 2,
            type: 'multiple_choice',
            question: 'Question 2',
            options: ['A', 'B', 'C', 'D'],
            correctAnswer: 'B',
            marks: 3,
            explanation: 'Explanation'
          },
          {
            id: 3,
            type: 'multiple_choice',
            question: 'Question 3',
            options: ['A', 'B', 'C', 'D'],
            correctAnswer: 'C',
            marks: 3,
            explanation: 'Explanation'
          }
        ]
      };

      const studentAnswers = {
        1: 'A',  // Correct
        2: 'X',  // Incorrect
        3: 'X'   // Incorrect
      };

      const result = service.gradeExam(exam, studentAnswers);

      expect(result.percentage).toBe(33.33);
    });
  });

  // ============================================================================
  // TEST SUITE 3: Exam Grading - Error Cases
  // ============================================================================
  describe('3. Exam Grading - Error Cases', () => {
    test('3.1 Should return error for invalid exam structure (no exam)', () => {
      const result = service.gradeExam(null, {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid exam structure');
    });

    test('3.2 Should return error for invalid exam structure (no questions)', () => {
      const result = service.gradeExam({}, {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid exam structure');
    });

    test('3.3 Should return error for invalid exam structure (questions not array)', () => {
      const result = service.gradeExam({ questions: 'not an array' }, {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid exam structure');
    });

    test('3.4 Should return error for invalid student answers (null)', () => {
      const exam = {
        questions: [
          {
            id: 1,
            type: 'multiple_choice',
            question: 'Test',
            options: ['A', 'B'],
            correctAnswer: 'A',
            marks: 1,
            explanation: 'Test'
          }
        ]
      };

      const result = service.gradeExam(exam, null);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid student answers');
    });

    test('3.5 Should return error for invalid student answers (not object)', () => {
      const exam = {
        questions: [
          {
            id: 1,
            type: 'multiple_choice',
            question: 'Test',
            options: ['A', 'B'],
            correctAnswer: 'A',
            marks: 1,
            explanation: 'Test'
          }
        ]
      };

      const result = service.gradeExam(exam, 'not an object');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid student answers');
    });
  });

  // ============================================================================
  // TEST SUITE 4: Question Grading
  // ============================================================================
  describe('4. Question Grading', () => {
    test('4.1 Should grade multiple choice question correctly', () => {
      const question = {
        id: 1,
        type: 'multiple_choice',
        question: 'What is 2+2?',
        options: ['3', '4', '5', '6'],
        correctAnswer: '4',
        marks: 2,
        explanation: '2+2 equals 4'
      };

      const result = service.gradeQuestion(question, '4');

      expect(result.success).toBe(true);
      expect(result.isCorrect).toBe(true);
      expect(result.earnedMarks).toBe(2);
      expect(result.totalMarks).toBe(2);
    });

    test('4.2 Should grade true/false question correctly', () => {
      const question = {
        id: 1,
        type: 'true_false',
        question: 'The Earth is flat',
        options: ['True', 'False'],
        correctAnswer: 'False',
        marks: 1,
        explanation: 'The Earth is spherical'
      };

      const result = service.gradeQuestion(question, 'False');

      expect(result.success).toBe(true);
      expect(result.isCorrect).toBe(true);
      expect(result.earnedMarks).toBe(1);
    });

    test('4.3 Should grade numeric question correctly', () => {
      const question = {
        id: 1,
        type: 'numeric',
        question: 'What is 10 * 5?',
        correctAnswer: 50,
        marks: 2,
        explanation: '10 * 5 = 50'
      };

      const result = service.gradeQuestion(question, 50);

      expect(result.success).toBe(true);
      expect(result.isCorrect).toBe(true);
      expect(result.earnedMarks).toBe(2);
    });

    test('4.4 Should flag essay question for manual grading', () => {
      const question = {
        id: 1,
        type: 'essay',
        question: 'Explain photosynthesis',
        marks: 10,
        explanation: 'Photosynthesis explanation'
      };

      const result = service.gradeQuestion(question, 'Student essay answer...');

      expect(result.success).toBe(true);
      expect(result.requiresManualGrading).toBe(true);
      expect(result.earnedMarks).toBeNull();
    });

    test('4.5 Should flag short answer question for manual grading', () => {
      const question = {
        id: 1,
        type: 'short_answer',
        question: 'What is the capital of France?',
        marks: 2,
        explanation: 'Paris'
      };

      const result = service.gradeQuestion(question, 'Paris');

      expect(result.success).toBe(true);
      expect(result.requiresManualGrading).toBe(true);
    });

    test('4.6 Should return error for invalid question (no type)', () => {
      const question = {
        id: 1,
        question: 'Test question',
        marks: 1
      };

      const result = service.gradeQuestion(question, 'answer');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid question');
    });

    test('4.7 Should return error for unsupported question type', () => {
      const question = {
        id: 1,
        type: 'unsupported_type',
        question: 'Test question',
        marks: 1
      };

      const result = service.gradeQuestion(question, 'answer');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported question type');
    });

    test('4.8 Should return error for invalid question structure', () => {
      const question = {
        id: 1,
        type: 'multiple_choice',
        question: 'Test question',
        // Missing options and correctAnswer
        marks: 1
      };

      const result = service.gradeQuestion(question, 'answer');

      expect(result.success).toBe(false);
      expect(result.error).toContain('validation failed');
    });
  });

  // ============================================================================
  // TEST SUITE 5: Helper Methods
  // ============================================================================
  describe('5. Helper Methods', () => {
    test('5.1 compareExact should compare answers correctly for MCQ', () => {
      const result = service.compareExact('Paris', 'Paris', 'multiple_choice');
      expect(result).toBe(true);
    });

    test('5.2 compareExact should be case-insensitive', () => {
      const result = service.compareExact('Paris', 'paris', 'multiple_choice');
      expect(result).toBe(true);
    });

    test('5.3 compareExact should handle incorrect answers', () => {
      const result = service.compareExact('Paris', 'London', 'multiple_choice');
      expect(result).toBe(false);
    });

    test('5.4 compareExact should return false for unsupported type', () => {
      const result = service.compareExact('answer', 'answer', 'unsupported_type');
      expect(result).toBe(false);
    });

    test('5.5 compareFillBlank should compare fill-in-the-blank answers', () => {
      const correctAnswers = ['Paris', 'London', 'Berlin'];
      const studentAnswers = ['Paris', 'London', 'Berlin'];

      const result = service.compareFillBlank(correctAnswers, studentAnswers);

      expect(result.isCorrect).toBe(true);
      expect(result.correctCount).toBe(3);
      expect(result.totalBlanks).toBe(3);
    });

    test('5.6 compareFillBlank should handle partially correct answers', () => {
      const correctAnswers = ['Paris', 'London', 'Berlin'];
      const studentAnswers = ['Paris', 'Madrid', 'Berlin'];

      const result = service.compareFillBlank(correctAnswers, studentAnswers);

      expect(result.isCorrect).toBe(false);
      expect(result.correctCount).toBe(2);
      expect(result.totalBlanks).toBe(3);
    });

    test('5.7 gradeMatching should grade matching questions', () => {
      const correctMatches = [
        { left: 'France', right: 'Paris' },
        { left: 'UK', right: 'London' },
        { left: 'Germany', right: 'Berlin' }
      ];

      const studentMatches = [
        { left: 'France', right: 'Paris' },
        { left: 'UK', right: 'London' },
        { left: 'Germany', right: 'Berlin' }
      ];

      const result = service.gradeMatching(correctMatches, studentMatches);

      expect(result.isCorrect).toBe(true);
      expect(result.correctCount).toBe(3);
      expect(result.totalMatches).toBe(3);
    });

    test('5.8 gradeMatching should handle partially correct matches', () => {
      const correctMatches = [
        { left: 'France', right: 'Paris' },
        { left: 'UK', right: 'London' },
        { left: 'Germany', right: 'Berlin' }
      ];

      const studentMatches = [
        { left: 'France', right: 'Paris' },
        { left: 'UK', right: 'Berlin' },  // Wrong
        { left: 'Germany', right: 'London' }  // Wrong
      ];

      const result = service.gradeMatching(correctMatches, studentMatches);

      expect(result.isCorrect).toBe(false);
      expect(result.correctCount).toBe(1);
      expect(result.totalMatches).toBe(3);
    });
  });

  // ============================================================================
  // TEST SUITE 6: Statistics
  // ============================================================================
  describe('6. Statistics', () => {
    test('6.1 Should get question statistics', () => {
      const question = {
        id: 1,
        type: 'multiple_choice',
        question: 'What is 2+2?',
        options: ['3', '4', '5', '6'],
        correctAnswer: '4',
        marks: 2,
        explanation: '2+2 equals 4'
      };

      const allAnswers = ['4', '4', '3', '4', '5'];

      const stats = service.getQuestionStatistics(question, allAnswers);

      expect(stats).toBeDefined();
    });

    test('6.2 Should return error for unsupported question type in statistics', () => {
      const question = {
        id: 1,
        type: 'unsupported_type',
        question: 'Test',
        marks: 1
      };

      const stats = service.getQuestionStatistics(question, []);

      expect(stats.error).toContain('Unsupported question type');
    });

    test('6.3 Should get exam-wide statistics', () => {
      const exam = {
        questions: [
          {
            id: 1,
            type: 'multiple_choice',
            question: 'What is 2+2?',
            options: ['3', '4', '5', '6'],
            correctAnswer: '4',
            marks: 2,
            explanation: '2+2 equals 4'
          },
          {
            id: 2,
            type: 'true_false',
            question: 'The sky is blue',
            options: ['True', 'False'],
            correctAnswer: 'True',
            marks: 1,
            explanation: 'The sky is blue'
          }
        ]
      };

      const allSubmissions = [
        { answers: { 1: '4', 2: 'True' } },
        { answers: { 1: '4', 2: 'False' } },
        { answers: { 1: '3', 2: 'True' } }
      ];

      const stats = service.getExamStatistics(exam, allSubmissions);

      expect(stats.totalSubmissions).toBe(3);
      expect(stats.totalQuestions).toBe(2);
      expect(stats.averageScore).toBeGreaterThan(0);
      expect(stats.highestScore).toBeLessThanOrEqual(100);
      expect(stats.lowestScore).toBeGreaterThanOrEqual(0);
      expect(stats.passRate).toBeGreaterThanOrEqual(0);
      expect(stats.questionStatistics).toHaveLength(2);
    });

    test('6.4 Should handle empty submissions in exam statistics', () => {
      const exam = {
        questions: [
          {
            id: 1,
            type: 'multiple_choice',
            question: 'Test',
            options: ['A', 'B'],
            correctAnswer: 'A',
            marks: 1,
            explanation: 'Test'
          }
        ]
      };

      const stats = service.getExamStatistics(exam, []);

      expect(stats.totalSubmissions).toBe(0);
      expect(stats.averageScore).toBe(0);
    });

    test('6.5 Should return error for invalid inputs in exam statistics', () => {
      const stats = service.getExamStatistics(null, []);

      expect(stats.error).toBeDefined();
    });
  });

  // ============================================================================
  // TEST SUITE 7: Validation
  // ============================================================================
  describe('7. Validation', () => {
    test('7.1 Should validate correct exam structure', () => {
      const exam = {
        questions: [
          {
            id: 1,
            type: 'multiple_choice',
            question: 'What is 2+2?',
            options: ['3', '4', '5', '6'],
            correctAnswer: '4',
            marks: 2,
            explanation: '2+2 equals 4'
          }
        ]
      };

      const validation = service.validateExam(exam);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('7.2 Should return error for null exam', () => {
      const validation = service.validateExam(null);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Exam object is required');
    });

    test('7.3 Should return error for exam without questions', () => {
      const validation = service.validateExam({});

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Exam must have a questions array');
    });

    test('7.4 Should return error for exam with empty questions array', () => {
      const validation = service.validateExam({ questions: [] });

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Exam must have at least one question');
    });

    test('7.5 Should return error for unsupported question type', () => {
      const exam = {
        questions: [
          {
            id: 1,
            type: 'unsupported_type',
            question: 'Test',
            marks: 1
          }
        ]
      };

      const validation = service.validateExam(exam);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('Unsupported question type');
    });

    test('7.6 Should return error for invalid question structure', () => {
      const exam = {
        questions: [
          {
            id: 1,
            type: 'multiple_choice',
            question: 'Test',
            // Missing options and correctAnswer
            marks: 1
          }
        ]
      };

      const validation = service.validateExam(exam);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    test('7.7 Should validate multiple questions and collect all errors', () => {
      const exam = {
        questions: [
          {
            id: 1,
            type: 'unsupported_type',
            question: 'Test 1',
            marks: 1
          },
          {
            id: 2,
            type: 'multiple_choice',
            question: 'Test 2',
            // Missing options
            marks: 1
          }
        ]
      };

      const validation = service.validateExam(exam);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ============================================================================
  // TEST SUITE 8: Edge Cases
  // ============================================================================
  describe('8. Edge Cases', () => {
    test('8.1 Should handle exam with only manual grading questions', () => {
      const exam = {
        questions: [
          {
            id: 1,
            type: 'essay',
            question: 'Essay 1',
            marks: 10,
            explanation: 'Explanation'
          },
          {
            id: 2,
            type: 'short_answer',
            question: 'Short answer 1',
            marks: 5,
            explanation: 'Explanation'
          }
        ]
      };

      const studentAnswers = {
        1: 'Essay answer...',
        2: 'Short answer...'
      };

      const result = service.gradeExam(exam, studentAnswers);

      expect(result.success).toBe(true);
      expect(result.autoGradedQuestions).toBe(0);
      expect(result.manualGradingRequired).toBe(2);
      expect(result.earnedMarks).toBe(0);
      expect(result.percentage).toBe(0); // No auto-gradable questions
    });

    test('8.2 Should handle very large exams', () => {
      const questions = [];
      const answers = {};

      for (let i = 1; i <= 100; i++) {
        questions.push({
          id: i,
          type: 'multiple_choice',
          question: `Question ${i}`,
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 'A',
          marks: 1,
          explanation: 'Explanation'
        });
        answers[i] = 'A';
      }

      const exam = { questions };
      const result = service.gradeExam(exam, answers);

      expect(result.success).toBe(true);
      expect(result.totalQuestions).toBe(100);
      expect(result.earnedMarks).toBe(100);
      expect(result.percentage).toBe(100);
    });

    test('8.3 Should handle questions with zero marks', () => {
      const exam = {
        questions: [
          {
            id: 1,
            type: 'multiple_choice',
            question: 'Bonus question',
            options: ['A', 'B'],
            correctAnswer: 'A',
            marks: 0,
            explanation: 'Bonus'
          }
        ]
      };

      const studentAnswers = { 1: 'A' };
      const result = service.gradeExam(exam, studentAnswers);

      expect(result.success).toBe(true);
      expect(result.totalMarks).toBe(0);
    });

    test('8.4 Should handle null question in gradeQuestion', () => {
      const result = service.gradeQuestion(null, 'answer');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid question');
    });

    test('8.5 Should handle undefined student answer', () => {
      const question = {
        id: 1,
        type: 'multiple_choice',
        question: 'Test',
        options: ['A', 'B'],
        correctAnswer: 'A',
        marks: 1,
        explanation: 'Test'
      };

      const result = service.gradeQuestion(question, undefined);

      expect(result.success).toBe(true);
      expect(result.isCorrect).toBe(false);
    });
  });
});
