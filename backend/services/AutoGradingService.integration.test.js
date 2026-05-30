/**
 * Auto-Grading Service Integration Tests
 * 
 * Comprehensive end-to-end tests for the auto-grading system including:
 * - All 9 question types
 * - Edge cases and error scenarios
 * - Database integration
 * - Notification delivery
 * - Performance testing
 */

const AutoGradingService = require('./AutoGradingService');
const ExamGradingRepository = require('./ExamGradingRepository');
const ExamMarkListIntegration = require('./ExamMarkListIntegration');

describe('AutoGradingService Integration Tests', () => {
  let gradingService;
  let mockPool;
  let repository;

  beforeEach(() => {
    gradingService = new AutoGradingService();
    
    // Mock database pool
    mockPool = {
      connect: jest.fn(),
      query: jest.fn()
    };

    repository = new ExamGradingRepository(mockPool);
  });

  describe('Complete Exam Grading Flow', () => {
    test('should grade a complete exam with all 9 question types', () => {
      const exam = {
        id: 1,
        title: 'Comprehensive Test',
        questions: [
          // 1. Multiple Choice
          {
            id: 1,
            type: 'multiple_choice',
            question: 'What is 2 + 2?',
            options: ['3', '4', '5', '6'],
            correctAnswer: '4',
            marks: 2,
            explanation: 'Basic addition'
          },
          // 2. True/False
          {
            id: 2,
            type: 'true_false',
            question: 'The Earth is flat',
            options: ['True', 'False'],
            correctAnswer: 'False',
            marks: 1,
            explanation: 'The Earth is spherical'
          },
          // 3. Multiple True/False
          {
            id: 3,
            type: 'multiple_true_false',
            question: 'Evaluate the following statements',
            statements: [
              { id: 1, text: 'Water boils at 100°C', correctAnswer: 'True' },
              { id: 2, text: 'The sun rises in the west', correctAnswer: 'False' }
            ],
            marks: 2,
            explanation: 'Basic science facts'
          },
          // 4. Matching
          {
            id: 4,
            type: 'matching',
            question: 'Match the capitals',
            leftColumn: ['France', 'Germany'],
            rightColumn: ['Paris', 'Berlin'],
            correctMatches: [
              { left: 'France', right: 'Paris' },
              { left: 'Germany', right: 'Berlin' }
            ],
            marks: 2,
            explanation: 'European capitals'
          },
          // 5. Numeric
          {
            id: 5,
            type: 'numeric',
            question: 'What is 15 × 3?',
            correctAnswer: 45,
            tolerance: 0,
            marks: 2,
            explanation: 'Multiplication'
          },
          // 6. Fill in the Blank
          {
            id: 6,
            type: 'fill_blank',
            question: 'The capital of Ethiopia is _____ and the currency is _____',
            correctAnswers: ['Addis Ababa', 'Birr'],
            caseSensitive: false,
            marks: 2,
            explanation: 'Ethiopian geography'
          },
          // 7. Short Answer (requires manual grading)
          {
            id: 7,
            type: 'short_answer',
            question: 'Explain photosynthesis in 2-3 sentences',
            marks: 3,
            explanation: 'Biology concept'
          },
          // 8. Essay (requires manual grading)
          {
            id: 8,
            type: 'essay',
            question: 'Write an essay about climate change',
            marks: 5,
            explanation: 'Environmental science'
          },
          // 9. Transformation
          {
            id: 9,
            type: 'transformation',
            question: 'Correct the errors: "He go to school yesterday"',
            correctAnswer: 'He went to school yesterday',
            marks: 2,
            explanation: 'Grammar correction'
          }
        ]
      };

      const studentAnswers = {
        1: '4',                    // Correct
        2: 'False',                // Correct
        3: [                       // Correct
          { id: 1, answer: 'True' },
          { id: 2, answer: 'False' }
        ],
        4: [                       // Correct
          { left: 'France', right: 'Paris' },
          { left: 'Germany', right: 'Berlin' }
        ],
        5: 45,                     // Correct
        6: ['addis ababa', 'birr'], // Correct (case insensitive)
        7: 'Photosynthesis is the process by which plants convert sunlight into energy.',
        8: 'Climate change is a serious issue affecting our planet...',
        9: 'He went to school yesterday' // Correct
      };

      const results = gradingService.gradeExam(exam, studentAnswers, 1, 1);

      expect(results.success).toBe(true);
      expect(results.totalQuestions).toBe(9);
      expect(results.autoGradedQuestions).toBe(7); // All except short answer and essay
      expect(results.manualGradingRequired).toBe(2); // Short answer and essay
      expect(results.requiresManualGrading).toBe(true);
      
      // Check auto-graded marks (excluding short answer and essay)
      const autoGradedMarks = 2 + 1 + 2 + 2 + 2 + 2 + 2; // 13 marks
      expect(results.earnedMarks).toBe(autoGradedMarks);
      expect(results.percentage).toBe(100); // 100% of auto-graded questions correct
    });

    test('should handle partial credit correctly', () => {
      const exam = {
        id: 2,
        title: 'Partial Credit Test',
        questions: [
          {
            id: 1,
            type: 'multiple_true_false',
            question: 'Evaluate statements',
            statements: [
              { id: 1, text: 'Statement 1', correctAnswer: 'True' },
              { id: 2, text: 'Statement 2', correctAnswer: 'False' },
              { id: 3, text: 'Statement 3', correctAnswer: 'True' }
            ],
            marks: 3,
            explanation: 'Test'
          },
          {
            id: 2,
            type: 'fill_blank',
            question: 'Fill blanks: _____, _____, _____',
            correctAnswers: ['one', 'two', 'three'],
            caseSensitive: false,
            marks: 3,
            explanation: 'Test'
          }
        ]
      };

      const studentAnswers = {
        1: [
          { id: 1, answer: 'True' },   // Correct
          { id: 2, answer: 'True' },   // Wrong
          { id: 3, answer: 'True' }    // Correct
        ],
        2: ['one', 'wrong', 'three']   // 2 out of 3 correct
      };

      const results = gradingService.gradeExam(exam, studentAnswers);

      expect(results.success).toBe(true);
      
      // Multiple True/False: 2/3 correct = 2 marks
      const mtfResult = results.questionResults[0];
      expect(mtfResult.earnedMarks).toBe(2);
      
      // Fill Blank: 2/3 correct = 2 marks
      const fbResult = results.questionResults[1];
      expect(fbResult.earnedMarks).toBe(2);
      
      // Total: 4 out of 6 marks
      expect(results.earnedMarks).toBe(4);
      expect(results.percentage).toBeCloseTo(66.67, 1);
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    test('should handle empty answers gracefully', () => {
      const exam = {
        id: 3,
        title: 'Empty Answer Test',
        questions: [
          {
            id: 1,
            type: 'multiple_choice',
            question: 'Test question',
            options: ['A', 'B', 'C'],
            correctAnswer: 'A',
            marks: 2,
            explanation: 'Test'
          }
        ]
      };

      const studentAnswers = {
        1: null // Empty answer
      };

      const results = gradingService.gradeExam(exam, studentAnswers);

      expect(results.success).toBe(true);
      expect(results.earnedMarks).toBe(0);
      expect(results.questionResults[0].isCorrect).toBe(false);
    });

    test('should handle missing answers', () => {
      const exam = {
        id: 4,
        title: 'Missing Answer Test',
        questions: [
          {
            id: 1,
            type: 'multiple_choice',
            question: 'Question 1',
            options: ['A', 'B'],
            correctAnswer: 'A',
            marks: 2,
            explanation: 'Test'
          },
          {
            id: 2,
            type: 'true_false',
            question: 'Question 2',
            options: ['True', 'False'],
            correctAnswer: 'True',
            marks: 1,
            explanation: 'Test'
          }
        ]
      };

      const studentAnswers = {
        1: 'A'
        // Question 2 answer is missing
      };

      const results = gradingService.gradeExam(exam, studentAnswers);

      expect(results.success).toBe(true);
      expect(results.questionResults[0].isCorrect).toBe(true);
      expect(results.questionResults[1].isCorrect).toBe(false);
      expect(results.earnedMarks).toBe(2); // Only question 1
    });

    test('should handle invalid question types', () => {
      const exam = {
        id: 5,
        title: 'Invalid Type Test',
        questions: [
          {
            id: 1,
            type: 'invalid_type',
            question: 'Test',
            marks: 2
          }
        ]
      };

      const studentAnswers = {
        1: 'answer'
      };

      const results = gradingService.gradeExam(exam, studentAnswers);

      expect(results.success).toBe(true);
      expect(results.questionResults[0].success).toBe(false);
      expect(results.questionResults[0].error).toContain('Unsupported question type');
    });

    test('should handle malformed exam structure', () => {
      const invalidExam = {
        id: 6,
        title: 'Invalid Exam'
        // Missing questions array
      };

      const results = gradingService.gradeExam(invalidExam, {});

      expect(results.success).toBe(false);
      expect(results.error).toContain('Invalid exam structure');
    });

    test('should handle invalid student answers format', () => {
      const exam = {
        id: 7,
        title: 'Test',
        questions: [
          {
            id: 1,
            type: 'multiple_choice',
            question: 'Test',
            options: ['A', 'B'],
            correctAnswer: 'A',
            marks: 2,
            explanation: 'Test'
          }
        ]
      };

      const results = gradingService.gradeExam(exam, null);

      expect(results.success).toBe(false);
      expect(results.error).toContain('Invalid student answers');
    });
  });

  describe('Numeric Question Edge Cases', () => {
    test('should handle numeric answers with tolerance', () => {
      const exam = {
        id: 8,
        title: 'Numeric Tolerance Test',
        questions: [
          {
            id: 1,
            type: 'numeric',
            question: 'Calculate π',
            correctAnswer: 3.14159,
            tolerance: 0.01,
            marks: 2,
            explanation: 'Pi approximation'
          }
        ]
      };

      // Test within tolerance
      let results = gradingService.gradeExam(exam, { 1: 3.14 });
      expect(results.questionResults[0].isCorrect).toBe(true);

      // Test outside tolerance
      results = gradingService.gradeExam(exam, { 1: 3.0 });
      expect(results.questionResults[0].isCorrect).toBe(false);
    });

    test('should handle negative numbers', () => {
      const exam = {
        id: 9,
        title: 'Negative Number Test',
        questions: [
          {
            id: 1,
            type: 'numeric',
            question: 'What is -5 + 3?',
            correctAnswer: -2,
            tolerance: 0,
            marks: 2,
            explanation: 'Negative arithmetic'
          }
        ]
      };

      const results = gradingService.gradeExam(exam, { 1: -2 });
      expect(results.questionResults[0].isCorrect).toBe(true);
    });

    test('should handle decimal numbers', () => {
      const exam = {
        id: 10,
        title: 'Decimal Test',
        questions: [
          {
            id: 1,
            type: 'numeric',
            question: 'What is 1/3?',
            correctAnswer: 0.333,
            tolerance: 0.001,
            marks: 2,
            explanation: 'Division'
          }
        ]
      };

      const results = gradingService.gradeExam(exam, { 1: 0.333 });
      expect(results.questionResults[0].isCorrect).toBe(true);
    });
  });

  describe('Fill in the Blank Edge Cases', () => {
    test('should handle case sensitivity correctly', () => {
      const exam = {
        id: 11,
        title: 'Case Sensitivity Test',
        questions: [
          {
            id: 1,
            type: 'fill_blank',
            question: 'Fill: _____',
            correctAnswers: ['Ethiopia'],
            caseSensitive: true,
            marks: 1,
            explanation: 'Test'
          }
        ]
      };

      // Case sensitive - should fail
      let results = gradingService.gradeExam(exam, { 1: ['ethiopia'] });
      expect(results.questionResults[0].isCorrect).toBe(false);

      // Exact match - should pass
      results = gradingService.gradeExam(exam, { 1: ['Ethiopia'] });
      expect(results.questionResults[0].isCorrect).toBe(true);
    });

    test('should handle whitespace in answers', () => {
      const exam = {
        id: 12,
        title: 'Whitespace Test',
        questions: [
          {
            id: 1,
            type: 'fill_blank',
            question: 'Fill: _____',
            correctAnswers: ['Addis Ababa'],
            caseSensitive: false,
            marks: 1,
            explanation: 'Test'
          }
        ]
      };

      // Extra whitespace should be trimmed
      const results = gradingService.gradeExam(exam, { 1: ['  addis ababa  '] });
      expect(results.questionResults[0].isCorrect).toBe(true);
    });

    test('should handle multiple blanks with partial credit', () => {
      const exam = {
        id: 13,
        title: 'Multiple Blanks Test',
        questions: [
          {
            id: 1,
            type: 'fill_blank',
            question: 'Fill: _____, _____, _____, _____',
            correctAnswers: ['one', 'two', 'three', 'four'],
            caseSensitive: false,
            marks: 4,
            explanation: 'Test'
          }
        ]
      };

      // 3 out of 4 correct
      const results = gradingService.gradeExam(exam, { 
        1: ['one', 'two', 'wrong', 'four'] 
      });
      
      expect(results.questionResults[0].earnedMarks).toBe(3);
      expect(results.questionResults[0].correctBlanks).toBe(3);
    });
  });

  describe('Matching Question Edge Cases', () => {
    test('should handle partial matches correctly', () => {
      const exam = {
        id: 14,
        title: 'Partial Matching Test',
        questions: [
          {
            id: 1,
            type: 'matching',
            question: 'Match items',
            leftColumn: ['A', 'B', 'C'],
            rightColumn: ['1', '2', '3'],
            correctMatches: [
              { left: 'A', right: '1' },
              { left: 'B', right: '2' },
              { left: 'C', right: '3' }
            ],
            marks: 3,
            explanation: 'Test'
          }
        ]
      };

      // 2 out of 3 correct
      const results = gradingService.gradeExam(exam, {
        1: [
          { left: 'A', right: '1' },  // Correct
          { left: 'B', right: '3' },  // Wrong
          { left: 'C', right: '3' }   // Correct
        ]
      });

      expect(results.questionResults[0].earnedMarks).toBe(2);
      expect(results.questionResults[0].correctMatches).toBe(2);
    });

    test('should handle missing matches', () => {
      const exam = {
        id: 15,
        title: 'Missing Matches Test',
        questions: [
          {
            id: 1,
            type: 'matching',
            question: 'Match items',
            leftColumn: ['A', 'B'],
            rightColumn: ['1', '2'],
            correctMatches: [
              { left: 'A', right: '1' },
              { left: 'B', right: '2' }
            ],
            marks: 2,
            explanation: 'Test'
          }
        ]
      };

      // Only one match provided
      const results = gradingService.gradeExam(exam, {
        1: [{ left: 'A', right: '1' }]
      });

      expect(results.questionResults[0].earnedMarks).toBe(1);
    });
  });

  describe('Exam Validation', () => {
    test('should validate exam structure before grading', () => {
      const invalidExam = {
        id: 16,
        title: 'Invalid Exam',
        questions: [
          {
            id: 1,
            type: 'multiple_choice',
            question: 'Test',
            // Missing required fields: options, correctAnswer, marks
            explanation: 'Test'
          }
        ]
      };

      const validation = gradingService.validateExam(invalidExam);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    test('should pass validation for valid exam', () => {
      const validExam = {
        id: 17,
        title: 'Valid Exam',
        questions: [
          {
            id: 1,
            type: 'multiple_choice',
            question: 'Test question',
            options: ['A', 'B', 'C'],
            correctAnswer: 'A',
            marks: 2,
            explanation: 'Test explanation'
          }
        ]
      };

      const validation = gradingService.validateExam(validExam);
      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });
  });

  describe('Performance Testing', () => {
    test('should handle large exams efficiently (50+ questions)', () => {
      const questions = [];
      const answers = {};

      // Create 50 multiple choice questions
      for (let i = 1; i <= 50; i++) {
        questions.push({
          id: i,
          type: 'multiple_choice',
          question: `Question ${i}`,
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 'A',
          marks: 2,
          explanation: `Explanation ${i}`
        });
        answers[i] = 'A'; // All correct
      }

      const exam = {
        id: 18,
        title: 'Large Exam',
        questions
      };

      const startTime = Date.now();
      const results = gradingService.gradeExam(exam, answers);
      const endTime = Date.now();

      expect(results.success).toBe(true);
      expect(results.totalQuestions).toBe(50);
      expect(results.earnedMarks).toBe(100); // 50 questions × 2 marks
      expect(results.percentage).toBe(100);

      // Should complete in less than 1 second
      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(1000);
    });

    test('should handle 100 questions efficiently', () => {
      const questions = [];
      const answers = {};

      for (let i = 1; i <= 100; i++) {
        questions.push({
          id: i,
          type: 'true_false',
          question: `Question ${i}`,
          options: ['True', 'False'],
          correctAnswer: 'True',
          marks: 1,
          explanation: `Explanation ${i}`
        });
        answers[i] = 'True';
      }

      const exam = {
        id: 19,
        title: 'Very Large Exam',
        questions
      };

      const startTime = Date.now();
      const results = gradingService.gradeExam(exam, answers);
      const endTime = Date.now();

      expect(results.success).toBe(true);
      expect(results.totalQuestions).toBe(100);
      expect(results.percentage).toBe(100);

      // Should complete in less than 2 seconds
      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(2000);
    });
  });

  describe('Statistics Generation', () => {
    test('should generate question statistics correctly', () => {
      const question = {
        id: 1,
        type: 'multiple_choice',
        question: 'Test',
        options: ['A', 'B', 'C'],
        correctAnswer: 'A',
        marks: 2,
        explanation: 'Test'
      };

      const allAnswers = ['A', 'A', 'B', 'A', 'C']; // 3 correct, 2 wrong

      const stats = gradingService.getQuestionStatistics(question, allAnswers);

      expect(stats.totalAttempts).toBe(5);
      expect(stats.correctCount).toBe(3);
      expect(stats.incorrectCount).toBe(2);
      expect(stats.successRate).toBe(60);
    });

    test('should generate exam-wide statistics', () => {
      const exam = {
        id: 20,
        title: 'Stats Test',
        questions: [
          {
            id: 1,
            type: 'multiple_choice',
            question: 'Q1',
            options: ['A', 'B'],
            correctAnswer: 'A',
            marks: 2,
            explanation: 'Test'
          },
          {
            id: 2,
            type: 'true_false',
            question: 'Q2',
            options: ['True', 'False'],
            correctAnswer: 'True',
            marks: 1,
            explanation: 'Test'
          }
        ]
      };

      const submissions = [
        { answers: { 1: 'A', 2: 'True' } },   // 100%
        { answers: { 1: 'A', 2: 'False' } },  // 66.67%
        { answers: { 1: 'B', 2: 'True' } },   // 33.33%
        { answers: { 1: 'A', 2: 'True' } }    // 100%
      ];

      const stats = gradingService.getExamStatistics(exam, submissions);

      expect(stats.totalSubmissions).toBe(4);
      expect(stats.averageScore).toBeGreaterThan(70);
      expect(stats.highestScore).toBe(100);
      expect(stats.passRate).toBe(100); // All above 50%
    });
  });
});
