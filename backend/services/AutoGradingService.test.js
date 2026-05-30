/**
 * Test Suite for AutoGradingService
 * 
 * Tests the automatic grading functionality for exam submissions
 */

const AutoGradingService = require('./AutoGradingService');

describe('AutoGradingService', () => {
  let service;

  beforeEach(() => {
    service = new AutoGradingService();
  });

  describe('Constructor', () => {
    test('should initialize with all question type handlers', () => {
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
  });

  describe('gradeQuestion', () => {
    test('should grade a multiple choice question correctly', () => {
      const question = {
        id: 1,
        type: 'multiple_choice',
        question: 'What is 2+2?',
        options: ['3', '4', '5'],
        correctAnswer: '4',
        marks: 2,
        explanation: 'Basic math'
      };

      const result = service.gradeQuestion(question, '4');

      expect(result.success).toBe(true);
      expect(result.isCorrect).toBe(true);
      expect(result.earnedMarks).toBe(2);
      expect(result.totalMarks).toBe(2);
    });

    test('should grade an incorrect answer', () => {
      const question = {
        id: 1,
        type: 'multiple_choice',
        question: 'What is 2+2?',
        options: ['3', '4', '5'],
        correctAnswer: '4',
        marks: 2,
        explanation: 'Basic math'
      };

      const result = service.gradeQuestion(question, '3');

      expect(result.success).toBe(true);
      expect(result.isCorrect).toBe(false);
      expect(result.earnedMarks).toBe(0);
      expect(result.totalMarks).toBe(2);
    });

    test('should handle invalid question type', () => {
      const question = {
        id: 1,
        type: 'invalid_type',
        question: 'Test question',
        marks: 1
      };

      const result = service.gradeQuestion(question, 'answer');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported question type');
    });

    test('should handle question without type', () => {
      const question = {
        id: 1,
        question: 'Test question',
        marks: 1
      };

      const result = service.gradeQuestion(question, 'answer');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid question');
    });

    test('should handle invalid question structure', () => {
      const question = {
        id: 1,
        type: 'multiple_choice',
        question: 'Q?', // Too short
        marks: 1
      };

      const result = service.gradeQuestion(question, 'answer');

      expect(result.success).toBe(false);
      expect(result.error).toContain('validation failed');
    });

    test('should mark short answer for manual grading', () => {
      const question = {
        id: 1,
        type: 'short_answer',
        question: 'Explain photosynthesis.',
        modelAnswer: 'Photosynthesis is the process by which plants convert light energy into chemical energy.',
        keyPoints: ['Light energy', 'Chemical energy', 'Plants'],
        marks: 5,
        explanation: 'Key biological process'
      };

      const result = service.gradeQuestion(question, 'Plants use sunlight to make food.');

      expect(result.success).toBe(true);
      expect(result.requiresManualGrading).toBe(true);
      expect(result.earnedMarks).toBeNull();
    });

    test('should mark essay for manual grading', () => {
      const question = {
        id: 1,
        type: 'essay',
        question: 'Discuss the impact of climate change on biodiversity.',
        modelAnswer: 'Climate change significantly affects biodiversity through habitat loss, species extinction, and ecosystem disruption.',
        rubric: [
          { criterion: 'Understanding', points: 3 },
          { criterion: 'Analysis', points: 2 }
        ],
        marks: 5,
        explanation: 'Environmental essay'
      };

      const result = service.gradeQuestion(question, 'Climate change is bad for animals and plants because it changes their homes.');

      expect(result.success).toBe(true);
      expect(result.requiresManualGrading).toBe(true);
      expect(result.earnedMarks).toBeNull();
    });
  });

  describe('gradeExam', () => {
    const sampleExam = {
      id: 'exam-1',
      title: 'Sample Exam',
      questions: [
        {
          id: 1,
          type: 'multiple_choice',
          question: 'What is 2+2?',
          options: ['3', '4', '5'],
          correctAnswer: '4',
          marks: 2,
          explanation: 'Basic math'
        },
        {
          id: 2,
          type: 'true_false',
          question: 'The Earth is flat.',
          options: ['True', 'False'],
          correctAnswer: 'False',
          marks: 1,
          explanation: 'Basic geography'
        },
        {
          id: 3,
          type: 'numeric',
          question: 'What is 10 divided by 2?',
          correctAnswer: '5',
          marks: 2,
          explanation: 'Basic division'
        },
        {
          id: 4,
          type: 'short_answer',
          question: 'Explain gravity.',
          modelAnswer: 'Gravity is a force that attracts objects with mass toward each other.',
          keyPoints: ['Force', 'Mass', 'Attraction'],
          marks: 5,
          explanation: 'Physics concept'
        }
      ]
    };

    test('should grade a complete exam with all correct answers', () => {
      const studentAnswers = {
        1: '4',
        2: 'False',
        3: '5',
        4: 'Gravity is a force that pulls objects together.'
      };

      const result = service.gradeExam(sampleExam, studentAnswers, 'student-1', 'exam-1');

      expect(result.success).toBe(true);
      expect(result.studentId).toBe('student-1');
      expect(result.examId).toBe('exam-1');
      expect(result.totalQuestions).toBe(4);
      expect(result.totalMarks).toBe(10);
      expect(result.earnedMarks).toBe(5); // Only auto-graded questions (MCQ + T/F + Numeric)
      expect(result.autoGradedQuestions).toBe(3);
      expect(result.manualGradingRequired).toBe(1);
      expect(result.requiresManualGrading).toBe(true);
      expect(result.percentage).toBe(100); // 5/5 for auto-graded questions
      expect(result.questionResults).toHaveLength(4);
    });

    test('should grade exam with some incorrect answers', () => {
      const studentAnswers = {
        1: '3', // Wrong
        2: 'False', // Correct
        3: '4', // Wrong
        4: 'Answer'
      };

      const result = service.gradeExam(sampleExam, studentAnswers);

      expect(result.success).toBe(true);
      expect(result.earnedMarks).toBe(1); // Only T/F correct
      expect(result.percentage).toBe(20); // 1/5 for auto-graded questions
    });

    test('should handle missing answers', () => {
      const studentAnswers = {
        1: '4'
        // Missing answers for questions 2, 3, 4
      };

      const result = service.gradeExam(sampleExam, studentAnswers);

      expect(result.success).toBe(true);
      expect(result.earnedMarks).toBe(2); // Only question 1 correct
      expect(result.questionResults).toHaveLength(4);
    });

    test('should handle invalid exam structure', () => {
      const result = service.gradeExam(null, {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid exam structure');
    });

    test('should handle invalid student answers', () => {
      const result = service.gradeExam(sampleExam, null);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid student answers');
    });

    test('should handle exam with no questions', () => {
      const emptyExam = { questions: [] };
      const result = service.gradeExam(emptyExam, {});

      expect(result.success).toBe(true);
      expect(result.totalQuestions).toBe(0);
      expect(result.totalMarks).toBe(0);
      expect(result.earnedMarks).toBe(0);
    });

    test('should calculate percentage correctly for mixed results', () => {
      const studentAnswers = {
        1: '4',    // Correct (2 marks)
        2: 'True', // Wrong (0 marks)
        3: '5',    // Correct (2 marks)
        4: 'Answer' // Manual grading
      };

      const result = service.gradeExam(sampleExam, studentAnswers);

      expect(result.earnedMarks).toBe(4); // 2 + 0 + 2
      expect(result.percentage).toBe(80); // 4/5 * 100
    });

    test('should include grading timestamp', () => {
      const result = service.gradeExam(sampleExam, { 1: '4', 2: 'False', 3: '5', 4: 'Answer' });

      expect(result.gradedAt).toBeDefined();
      expect(new Date(result.gradedAt)).toBeInstanceOf(Date);
    });
  });

  describe('compareExact', () => {
    test('should compare answers using gradeQuestion', () => {
      // Test MCQ
      const mcqQuestion = {
        id: 1,
        type: 'multiple_choice',
        question: 'What is the answer?',
        options: ['A', 'B', 'C'],
        correctAnswer: 'A',
        marks: 1,
        explanation: 'Test explanation'
      };
      
      expect(service.gradeQuestion(mcqQuestion, 'A').isCorrect).toBe(true);
      expect(service.gradeQuestion(mcqQuestion, 'a').isCorrect).toBe(true); // Case insensitive
      expect(service.gradeQuestion(mcqQuestion, 'B').isCorrect).toBe(false);
      
      // Test T/F
      const tfQuestion = {
        id: 2,
        type: 'true_false',
        question: 'Is this true?',
        options: ['True', 'False'],
        correctAnswer: 'True',
        marks: 1,
        explanation: 'Test explanation'
      };
      
      expect(service.gradeQuestion(tfQuestion, 'True').isCorrect).toBe(true);
      expect(service.gradeQuestion(tfQuestion, 'true').isCorrect).toBe(true);
      expect(service.gradeQuestion(tfQuestion, 'False').isCorrect).toBe(false);
      
      // Test Numeric
      const numQuestion = {
        id: 3,
        type: 'numeric',
        question: 'What is the answer?',
        correctAnswer: '42',
        marks: 1,
        explanation: 'Test explanation'
      };
      
      expect(service.gradeQuestion(numQuestion, '42').isCorrect).toBe(true);
      expect(service.gradeQuestion(numQuestion, '42.0').isCorrect).toBe(true);
      expect(service.gradeQuestion(numQuestion, '43').isCorrect).toBe(false);
    });

    test('should handle invalid question type in compareExact', () => {
      expect(service.compareExact('A', 'A', 'invalid_type')).toBe(false);
    });
  });

  describe('compareFillBlank', () => {
    test('should compare fill blank answers using gradeQuestion', () => {
      const question = {
        id: 1,
        type: 'fill_blank',
        question: 'The capital of _____ is _____ for testing purposes only',
        correctAnswers: ['Paris', 'France'],
        marks: 2,
        explanation: 'Test explanation'
      };
      
      // All correct
      let result = service.gradeQuestion(question, ['Paris', 'France']);
      expect(result.isCorrect).toBe(true);
      expect(result.correctCount).toBe(2);
      expect(result.earnedMarks).toBe(2);
      
      // Partial correct
      result = service.gradeQuestion(question, ['Paris', 'Germany']);
      expect(result.isCorrect).toBe(false);
      expect(result.correctCount).toBe(1);
      expect(result.earnedMarks).toBe(1);
      
      // Case insensitive
      result = service.gradeQuestion(question, ['paris', 'france']);
      expect(result.isCorrect).toBe(true);
      expect(result.correctCount).toBe(2);
    });
  });

  describe('gradeMatching', () => {
    test('should grade matching using gradeQuestion', () => {
      const question = {
        id: 1,
        type: 'matching',
        question: 'Match the items for testing purposes only',
        leftColumn: ['A', 'B'],
        rightColumn: ['1', '2'],
        correctMatches: [
          { left: 'A', right: '1' },
          { left: 'B', right: '2' }
        ],
        marks: 2,
        explanation: 'Test explanation'
      };
      
      // All correct
      let result = service.gradeQuestion(question, [
        { left: 'A', right: '1' },
        { left: 'B', right: '2' }
      ]);
      expect(result.isCorrect).toBe(true);
      expect(result.correctCount).toBe(2);
      expect(result.earnedMarks).toBe(2);
      
      // Partial correct
      result = service.gradeQuestion(question, [
        { left: 'A', right: '2' },
        { left: 'B', right: '2' }
      ]);
      expect(result.isCorrect).toBe(false);
      expect(result.correctCount).toBe(1);
      expect(result.earnedMarks).toBe(1);
    });
  });

  describe('getQuestionStatistics', () => {
    test('should get statistics for multiple choice question', () => {
      const question = {
        id: 1,
        type: 'multiple_choice',
        question: 'What is 2+2?',
        options: ['3', '4', '5'],
        correctAnswer: '4',
        marks: 2,
        explanation: 'Basic math'
      };

      const allAnswers = ['4', '3', '4', '4', '5'];

      const stats = service.getQuestionStatistics(question, allAnswers);

      expect(stats.totalResponses).toBe(5);
      expect(stats.correctCount).toBe(3);
      expect(stats.incorrectCount).toBe(2);
      expect(parseFloat(stats.correctPercentage)).toBe(60);
    });

    test('should handle unsupported question type', () => {
      const question = {
        id: 1,
        type: 'invalid_type',
        question: 'Test',
        marks: 1
      };

      const stats = service.getQuestionStatistics(question, []);

      expect(stats.error).toContain('Unsupported question type');
    });
  });

  describe('getExamStatistics', () => {
    const sampleExam = {
      questions: [
        {
          id: 1,
          type: 'multiple_choice',
          question: 'What is 2+2?',
          options: ['3', '4', '5'],
          correctAnswer: '4',
          marks: 2,
          explanation: 'Basic math'
        },
        {
          id: 2,
          type: 'true_false',
          question: 'The Earth is flat.',
          options: ['True', 'False'],
          correctAnswer: 'False',
          marks: 1,
          explanation: 'Basic geography'
        }
      ]
    };

    test('should calculate exam-wide statistics', () => {
      const allSubmissions = [
        { studentId: 's1', answers: { 1: '4', 2: 'False' } },  // 100%
        { studentId: 's2', answers: { 1: '3', 2: 'False' } },  // 33.33%
        { studentId: 's3', answers: { 1: '4', 2: 'True' } }    // 66.67%
      ];

      const stats = service.getExamStatistics(sampleExam, allSubmissions);

      expect(stats.totalSubmissions).toBe(3);
      expect(stats.totalQuestions).toBe(2);
      expect(stats.averageScore).toBeCloseTo(66.67, 1);
      expect(stats.highestScore).toBe(100);
      expect(stats.lowestScore).toBeCloseTo(33.33, 1);
      expect(stats.passRate).toBeCloseTo(66.67, 1);
      expect(stats.questionStatistics).toHaveLength(2);
    });

    test('should handle empty submissions', () => {
      const stats = service.getExamStatistics(sampleExam, []);

      expect(stats.totalSubmissions).toBe(0);
      expect(stats.averageScore).toBe(0);
      expect(stats.highestScore).toBe(0);
      expect(stats.lowestScore).toBe(100);
    });

    test('should handle invalid inputs', () => {
      const stats = service.getExamStatistics(null, []);

      expect(stats.error).toBeDefined();
    });
  });

  describe('validateExam', () => {
    test('should validate a valid exam', () => {
      const exam = {
        questions: [
          {
            id: 1,
            type: 'multiple_choice',
            question: 'What is 2+2?',
            options: ['3', '4', '5'],
            correctAnswer: '4',
            marks: 2,
            explanation: 'Basic math'
          }
        ]
      };

      const result = service.validateExam(exam);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect missing exam object', () => {
      const result = service.validateExam(null);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Exam object is required');
    });

    test('should detect missing questions array', () => {
      const result = service.validateExam({});

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Exam must have a questions array');
    });

    test('should detect empty questions array', () => {
      const result = service.validateExam({ questions: [] });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Exam must have at least one question');
    });

    test('should detect unsupported question type', () => {
      const exam = {
        questions: [
          {
            id: 1,
            type: 'invalid_type',
            question: 'Test',
            marks: 1
          }
        ]
      };

      const result = service.validateExam(exam);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Unsupported question type');
    });

    test('should detect invalid question structure', () => {
      const exam = {
        questions: [
          {
            id: 1,
            type: 'multiple_choice',
            question: 'Q?', // Too short
            marks: 1
          }
        ]
      };

      const result = service.validateExam(exam);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should validate multiple questions', () => {
      const exam = {
        questions: [
          {
            id: 1,
            type: 'multiple_choice',
            question: 'What is 2+2?',
            options: ['3', '4', '5'],
            correctAnswer: '4',
            marks: 2,
            explanation: 'Basic math'
          },
          {
            id: 2,
            type: 'invalid_type',
            question: 'Test',
            marks: 1
          }
        ]
      };

      const result = service.validateExam(exam);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Question 2');
    });
  });

  describe('Integration with Question Handlers', () => {
    test('should work with all question types', () => {
      const exam = {
        questions: [
          {
            id: 1,
            type: 'multiple_choice',
            question: 'What is the capital of Ethiopia?',
            options: ['Addis Ababa', 'Nairobi', 'Kampala'],
            correctAnswer: 'Addis Ababa',
            marks: 2,
            explanation: 'Capital city'
          },
          {
            id: 2,
            type: 'true_false',
            question: 'Ethiopia uses the Gregorian calendar.',
            options: ['True', 'False'],
            correctAnswer: 'False',
            marks: 1,
            explanation: 'Ethiopian calendar'
          },
          {
            id: 3,
            type: 'multiple_true_false',
            question: 'Evaluate the statements:',
            statements: ['Ethiopia is landlocked', 'The Blue Nile originates in Ethiopia'],
            correctAnswers: [true, true],
            marks: 2,
            explanation: 'Geography facts'
          },
          {
            id: 4,
            type: 'matching',
            question: 'Match the items:',
            leftColumn: ['A', 'B'],
            rightColumn: ['1', '2'],
            correctMatches: [{ left: 'A', right: '1' }, { left: 'B', right: '2' }],
            marks: 2,
            explanation: 'Matching test'
          },
          {
            id: 5,
            type: 'numeric',
            question: 'What is 5 + 3?',
            correctAnswer: '8',
            marks: 1,
            explanation: 'Basic addition'
          },
          {
            id: 6,
            type: 'fill_blank',
            question: 'The capital of Ethiopia is _____.',
            correctAnswers: ['Addis Ababa'],
            marks: 1,
            explanation: 'Capital city'
          },
          {
            id: 7,
            type: 'transformation',
            question: 'Correct the errors:',
            originalText: 'She don\'t like apples.',
            correctTransformation: 'She doesn\'t like apples.',
            marks: 1,
            explanation: 'Grammar correction'
          }
        ]
      };

      const studentAnswers = {
        1: 'Addis Ababa',
        2: 'False',
        3: [true, true],
        4: [{ left: 'A', right: '1' }, { left: 'B', right: '2' }],
        5: '8',
        6: ['Addis Ababa'],
        7: 'She doesn\'t like apples.'
      };

      const result = service.gradeExam(exam, studentAnswers);

      expect(result.success).toBe(true);
      expect(result.totalQuestions).toBe(7);
      expect(result.earnedMarks).toBe(10); // All correct
      expect(result.percentage).toBe(100);
    });
  });
});
