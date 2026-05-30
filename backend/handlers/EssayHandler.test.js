/**
 * Test Suite for EssayHandler
 * 
 * Tests validation, manual grading workflow, and statistics generation
 * for essay/open-ended questions in the AI Test Generator system.
 */

const EssayHandler = require('./EssayHandler');

describe('EssayHandler', () => {
  let handler;

  beforeEach(() => {
    handler = new EssayHandler();
  });

  describe('validate()', () => {
    test('should validate a correct essay question', () => {
      const question = {
        id: 1,
        type: 'essay',
        question: 'Discuss the impact of the Ethiopian calendar system on modern Ethiopian society.',
        modelAnswer: 'The Ethiopian calendar, which is approximately 7-8 years behind the Gregorian calendar, has both cultural significance and practical implications for modern Ethiopian society.',
        rubric: [
          { criterion: 'Understanding of calendar system', points: 3 },
          { criterion: 'Analysis of advantages', points: 2 }
        ],
        marks: 5,
        explanation: 'A strong essay should demonstrate understanding and provide analysis.'
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject question with wrong type', () => {
      const question = {
        id: 1,
        type: 'multiple_choice',
        question: 'Test question?',
        marks: 5
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Question must be of type "essay"');
    });

    test('should reject question without type', () => {
      const question = {
        id: 1,
        question: 'Test question?',
        marks: 5
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Question must be of type "essay"');
    });

    test('should reject question without required fields', () => {
      const question = {
        id: 1,
        type: 'essay',
        question: 'Test?'
        // Missing modelAnswer, rubric, marks, explanation
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should reject question with short question text', () => {
      const question = {
        id: 1,
        type: 'essay',
        question: 'Short?', // Too short (< 10 chars)
        modelAnswer: 'This is a model answer that is long enough to pass validation.',
        rubric: [{ criterion: 'Test', points: 5 }],
        marks: 5,
        explanation: 'Test explanation'
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(false);
    });

    test('should reject question with short model answer', () => {
      const question = {
        id: 1,
        type: 'essay',
        question: 'Discuss the Ethiopian calendar system and its impact.',
        modelAnswer: 'Short', // Too short (< 50 chars)
        rubric: [{ criterion: 'Test', points: 5 }],
        marks: 5,
        explanation: 'Test explanation'
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(false);
    });

    test('should reject question without rubric', () => {
      const question = {
        id: 1,
        type: 'essay',
        question: 'Discuss the Ethiopian calendar system and its impact.',
        modelAnswer: 'This is a model answer that is long enough to pass validation.',
        marks: 5,
        explanation: 'Test explanation'
        // Missing rubric
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(false);
    });

    test('should reject question with empty rubric', () => {
      const question = {
        id: 1,
        type: 'essay',
        question: 'Discuss the Ethiopian calendar system and its impact.',
        modelAnswer: 'This is a model answer that is long enough to pass validation.',
        rubric: [], // Empty rubric
        marks: 5,
        explanation: 'Test explanation'
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(false);
    });

    test('should reject question with rubric points not summing to marks', () => {
      const question = {
        id: 1,
        type: 'essay',
        question: 'Discuss the Ethiopian calendar system and its impact.',
        modelAnswer: 'This is a model answer that is long enough to pass validation.',
        rubric: [
          { criterion: 'Understanding', points: 2 },
          { criterion: 'Analysis', points: 2 }
          // Total: 4, but marks is 5
        ],
        marks: 5,
        explanation: 'Test explanation'
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(false);
    });
  });

  describe('isAnswerValid()', () => {
    test('should accept valid essay answer', () => {
      const answer = 'This is a valid essay answer that is long enough to meet the minimum length requirement for essay questions.';
      const result = handler.isAnswerValid(answer);
      
      expect(result.valid).toBe(true);
      expect(result.message).toBe('Answer is valid');
    });

    test('should reject undefined answer', () => {
      const result = handler.isAnswerValid(undefined);
      
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Answer is required');
    });

    test('should reject null answer', () => {
      const result = handler.isAnswerValid(null);
      
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Answer is required');
    });

    test('should reject non-string answer', () => {
      const result = handler.isAnswerValid(12345);
      
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Answer must be a string');
    });

    test('should reject empty string answer', () => {
      const result = handler.isAnswerValid('');
      
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Answer cannot be empty');
    });

    test('should reject whitespace-only answer', () => {
      const result = handler.isAnswerValid('   \n\t  ');
      
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Answer cannot be empty');
    });

    test('should reject answer shorter than minimum length', () => {
      const shortAnswer = 'Too short'; // Less than 50 characters
      const result = handler.isAnswerValid(shortAnswer);
      
      expect(result.valid).toBe(false);
      expect(result.message).toContain('must be at least 50 characters');
    });

    test('should accept answer with custom minimum length', () => {
      const answer = 'Short answer'; // 12 characters
      const result = handler.isAnswerValid(answer, 10);
      
      expect(result.valid).toBe(true);
      expect(result.message).toBe('Answer is valid');
    });

    test('should reject answer shorter than custom minimum length', () => {
      const answer = 'Short'; // 5 characters
      const result = handler.isAnswerValid(answer, 10);
      
      expect(result.valid).toBe(false);
      expect(result.message).toContain('must be at least 10 characters');
    });
  });

  describe('grade()', () => {
    const validQuestion = {
      id: 1,
      type: 'essay',
      question: 'Discuss the impact of the Ethiopian calendar system on modern Ethiopian society.',
      modelAnswer: 'The Ethiopian calendar, which is approximately 7-8 years behind the Gregorian calendar, has both cultural significance and practical implications for modern Ethiopian society.',
      rubric: [
        { criterion: 'Understanding of calendar system', points: 3 },
        { criterion: 'Analysis of impact', points: 2 }
      ],
      marks: 5,
      explanation: 'A strong essay should demonstrate understanding and provide analysis.'
    };

    test('should mark valid answer for manual grading', () => {
      const studentAnswer = 'The Ethiopian calendar is unique and has significant cultural importance. It affects daily life in Ethiopia in many ways, including business operations and international relations.';
      
      const result = handler.grade(validQuestion, studentAnswer);
      
      expect(result.success).toBe(true);
      expect(result.earnedMarks).toBeNull();
      expect(result.totalMarks).toBe(5);
      expect(result.requiresManualGrading).toBe(true);
      expect(result.isAnswered).toBe(true);
      expect(result.feedback).toContain('Pending manual grading');
      expect(result.studentAnswer).toBe(studentAnswer);
      expect(result.modelAnswer).toBe(validQuestion.modelAnswer);
      expect(result.rubric).toEqual(validQuestion.rubric);
      expect(result.explanation).toBe(validQuestion.explanation);
      expect(result.wordCount).toBeGreaterThan(0);
    });

    test('should include word count in result', () => {
      const studentAnswer = 'This is a test answer with exactly ten words here.';
      
      const result = handler.grade(validQuestion, studentAnswer);
      
      expect(result.wordCount).toBe(10);
    });

    test('should reject invalid question structure', () => {
      const invalidQuestion = {
        id: 1,
        type: 'essay',
        question: 'Short?' // Too short
      };
      const studentAnswer = 'This is a valid essay answer that is long enough to meet requirements.';
      
      const result = handler.grade(invalidQuestion, studentAnswer);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid question structure');
      expect(result.requiresManualGrading).toBe(true);
      expect(result.earnedMarks).toBeNull();
    });

    test('should reject undefined student answer', () => {
      const result = handler.grade(validQuestion, undefined);
      
      expect(result.success).toBe(true);
      expect(result.isAnswered).toBe(false);
      expect(result.requiresManualGrading).toBe(true);
      expect(result.feedback).toBe('Answer is required');
    });

    test('should reject empty student answer', () => {
      const result = handler.grade(validQuestion, '');
      
      expect(result.success).toBe(true);
      expect(result.isAnswered).toBe(false);
      expect(result.requiresManualGrading).toBe(true);
      expect(result.feedback).toBe('Answer cannot be empty');
    });

    test('should reject student answer shorter than minimum length', () => {
      const shortAnswer = 'Too short';
      const result = handler.grade(validQuestion, shortAnswer);
      
      expect(result.success).toBe(true);
      expect(result.isAnswered).toBe(false);
      expect(result.requiresManualGrading).toBe(true);
      expect(result.feedback).toContain('must be at least 50 characters');
    });

    test('should accept custom minimum length', () => {
      const shortAnswer = 'This is short';
      const result = handler.grade(validQuestion, shortAnswer, 10);
      
      expect(result.success).toBe(true);
      expect(result.isAnswered).toBe(true);
      expect(result.requiresManualGrading).toBe(true);
    });

    test('should include rubric in grading result', () => {
      const studentAnswer = 'The Ethiopian calendar is unique and has significant cultural importance. It affects daily life in Ethiopia in many ways.';
      
      const result = handler.grade(validQuestion, studentAnswer);
      
      expect(result.rubric).toBeDefined();
      expect(Array.isArray(result.rubric)).toBe(true);
      expect(result.rubric).toHaveLength(2);
      expect(result.rubric[0]).toHaveProperty('criterion');
      expect(result.rubric[0]).toHaveProperty('points');
    });
  });

  describe('gradeMultiple()', () => {
    const questions = [
      {
        id: 1,
        type: 'essay',
        question: 'Discuss the Ethiopian calendar system.',
        modelAnswer: 'The Ethiopian calendar is unique and has cultural significance in modern Ethiopian society.',
        rubric: [
          { criterion: 'Understanding', points: 3 },
          { criterion: 'Analysis', points: 2 }
        ],
        marks: 5,
        explanation: 'Test explanation for the Ethiopian calendar question'
      },
      {
        id: 2,
        type: 'essay',
        question: 'Analyze the impact of technology on education.',
        modelAnswer: 'Technology has transformed education in many ways through digital tools and online learning.',
        rubric: [
          { criterion: 'Analysis', points: 2 },
          { criterion: 'Examples', points: 1 }
        ],
        marks: 3,
        explanation: 'Test explanation for the technology question'
      },
      {
        id: 3,
        type: 'multiple_choice', // Different type - should be filtered out
        question: 'What is 2+2?',
        options: ['3', '4', '5'],
        correctAnswer: '4',
        marks: 1,
        explanation: 'Basic math'
      }
    ];

    test('should grade multiple essay questions', () => {
      const studentAnswers = {
        1: 'The Ethiopian calendar is approximately 7-8 years behind the Gregorian calendar and has deep cultural roots in Ethiopian society.',
        2: 'Technology has revolutionized education through online learning platforms, digital resources, and interactive educational tools.',
        3: '4' // This should be ignored (not an essay)
      };

      const result = handler.gradeMultiple(questions, studentAnswers);

      expect(result.totalQuestions).toBe(2); // Only essay questions
      expect(result.totalMarks).toBe(8); // 5 + 3
      expect(result.earnedMarks).toBeNull();
      expect(result.answeredCount).toBe(2);
      expect(result.unansweredCount).toBe(0);
      expect(result.requiresManualGrading).toBe(true);
      expect(result.questionResults).toHaveLength(2);
    });

    test('should handle unanswered questions', () => {
      const studentAnswers = {
        1: 'The Ethiopian calendar is approximately 7-8 years behind the Gregorian calendar and has cultural significance.',
        2: '' // Empty answer
      };

      const result = handler.gradeMultiple(questions, studentAnswers);

      expect(result.answeredCount).toBe(1);
      expect(result.unansweredCount).toBe(1);
    });

    test('should handle missing answers', () => {
      const studentAnswers = {
        1: 'The Ethiopian calendar is approximately 7-8 years behind the Gregorian calendar and has cultural significance.'
        // Question 2 not answered
      };

      const result = handler.gradeMultiple(questions, studentAnswers);

      expect(result.answeredCount).toBe(1);
      expect(result.unansweredCount).toBe(1);
    });

    test('should filter out non-essay questions', () => {
      const studentAnswers = {
        1: 'The Ethiopian calendar is approximately 7-8 years behind the Gregorian calendar and has cultural significance.',
        2: 'Technology has revolutionized education through online learning platforms and digital resources worldwide.',
        3: '4'
      };

      const result = handler.gradeMultiple(questions, studentAnswers);

      expect(result.totalQuestions).toBe(2); // Only essays
      expect(result.questionResults).toHaveLength(2);
    });

    test('should include question IDs in results', () => {
      const studentAnswers = {
        1: 'The Ethiopian calendar is approximately 7-8 years behind the Gregorian calendar and has cultural significance.',
        2: 'Technology has revolutionized education through various means including online platforms and digital tools.'
      };

      const result = handler.gradeMultiple(questions, studentAnswers);

      expect(result.questionResults[0].questionId).toBe(1);
      expect(result.questionResults[1].questionId).toBe(2);
    });
  });

  describe('getQuestionStatistics()', () => {
    const question = {
      id: 1,
      type: 'essay',
      question: 'Discuss the Ethiopian calendar system.',
      modelAnswer: 'The Ethiopian calendar is unique.',
      rubric: [
        { criterion: 'Understanding', points: 3 },
        { criterion: 'Analysis', points: 2 }
      ],
      marks: 5,
      explanation: 'Test'
    };

    test('should generate statistics for graded responses', () => {
      const gradedResponses = [
        { studentAnswer: 'Good answer', earnedMarks: 5, rubricScores: { 'Understanding': 3, 'Analysis': 2 } },
        { studentAnswer: 'Average answer', earnedMarks: 3, rubricScores: { 'Understanding': 2, 'Analysis': 1 } },
        { studentAnswer: 'Poor answer', earnedMarks: 1, rubricScores: { 'Understanding': 1, 'Analysis': 0 } }
      ];

      const stats = handler.getQuestionStatistics(question, gradedResponses);

      expect(stats.questionId).toBe(1);
      expect(stats.totalResponses).toBe(3);
      expect(stats.gradedCount).toBe(3);
      expect(stats.ungradedCount).toBe(0);
      expect(stats.averageScore).toBe('3.00'); // (5+3+1)/3
      expect(stats.averagePercentage).toBe('60.00'); // (9/15)*100
    });

    test('should handle ungraded responses', () => {
      const gradedResponses = [
        { studentAnswer: 'Answer 1', earnedMarks: 5 },
        { studentAnswer: 'Answer 2', earnedMarks: null }, // Ungraded
        { studentAnswer: 'Answer 3', earnedMarks: 3 }
      ];

      const stats = handler.getQuestionStatistics(question, gradedResponses);

      expect(stats.totalResponses).toBe(3);
      expect(stats.gradedCount).toBe(2);
      expect(stats.ungradedCount).toBe(1);
      expect(stats.averageScore).toBe('4.00'); // (5+3)/2
    });

    test('should categorize scores into distribution', () => {
      const gradedResponses = [
        { studentAnswer: 'A', earnedMarks: 5 },    // 100% - fullMarks
        { studentAnswer: 'B', earnedMarks: 4 },    // 80% - threeQuarters
        { studentAnswer: 'C', earnedMarks: 2.5 },  // 50% - half
        { studentAnswer: 'D', earnedMarks: 1.5 },  // 30% - quarter
        { studentAnswer: 'E', earnedMarks: 0 }     // 0% - zero
      ];

      const stats = handler.getQuestionStatistics(question, gradedResponses);

      expect(stats.scoreDistribution.fullMarks).toBe(1);
      expect(stats.scoreDistribution.threeQuarters).toBe(1);
      expect(stats.scoreDistribution.half).toBe(1);
      expect(stats.scoreDistribution.quarter).toBe(1);
      expect(stats.scoreDistribution.zero).toBe(1);
    });

    test('should calculate rubric statistics', () => {
      const gradedResponses = [
        { studentAnswer: 'A', earnedMarks: 5, rubricScores: { 'Understanding': 3, 'Analysis': 2 } },
        { studentAnswer: 'B', earnedMarks: 3, rubricScores: { 'Understanding': 2, 'Analysis': 1 } }
      ];

      const stats = handler.getQuestionStatistics(question, gradedResponses);

      expect(stats.rubricStats).toBeDefined();
      expect(stats.rubricStats['Understanding']).toBeDefined();
      expect(stats.rubricStats['Understanding'].maxPoints).toBe(3);
      expect(stats.rubricStats['Understanding'].averageScore).toBe('2.50'); // (3+2)/2
      expect(stats.rubricStats['Analysis']).toBeDefined();
      expect(stats.rubricStats['Analysis'].maxPoints).toBe(2);
      expect(stats.rubricStats['Analysis'].averageScore).toBe('1.50'); // (2+1)/2
    });

    test('should calculate average word count', () => {
      const gradedResponses = [
        { studentAnswer: 'This is a test answer', earnedMarks: 5 }, // 5 words
        { studentAnswer: 'Another test answer here', earnedMarks: 3 } // 4 words
      ];

      const stats = handler.getQuestionStatistics(question, gradedResponses);

      expect(stats.averageWordCount).toBe('5'); // (5+4)/2 = 4.5, rounded to 5
    });

    test('should handle empty responses array', () => {
      const stats = handler.getQuestionStatistics(question, []);

      expect(stats.totalResponses).toBe(0);
      expect(stats.gradedCount).toBe(0);
      expect(stats.averageScore).toBe('0');
    });

    test('should include model answer and rubric in stats', () => {
      const stats = handler.getQuestionStatistics(question, []);

      expect(stats.modelAnswer).toBe(question.modelAnswer);
      expect(stats.rubric).toEqual(question.rubric);
    });
  });

  describe('validateRubric()', () => {
    test('should validate correct rubric', () => {
      const question = {
        rubric: [
          { criterion: 'Understanding', points: 3 },
          { criterion: 'Analysis', points: 2 }
        ],
        marks: 5
      };

      const result = handler.validateRubric(question);

      expect(result.valid).toBe(true);
      expect(result.message).toBe('Rubric is valid');
      expect(result.totalPoints).toBe(5);
    });

    test('should reject missing rubric', () => {
      const question = { marks: 5 };

      const result = handler.validateRubric(question);

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Rubric must be an array');
    });

    test('should reject empty rubric', () => {
      const question = {
        rubric: [],
        marks: 5
      };

      const result = handler.validateRubric(question);

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Rubric must contain at least one criterion');
    });

    test('should reject rubric with points not summing to marks', () => {
      const question = {
        rubric: [
          { criterion: 'Understanding', points: 2 },
          { criterion: 'Analysis', points: 2 }
        ],
        marks: 5 // Total is 4, not 5
      };

      const result = handler.validateRubric(question);

      expect(result.valid).toBe(false);
      expect(result.message).toContain('must sum to question marks');
    });

    test('should reject rubric with invalid criterion', () => {
      const question = {
        rubric: [
          { criterion: '', points: 3 }, // Empty criterion
          { criterion: 'Analysis', points: 2 }
        ],
        marks: 5
      };

      const result = handler.validateRubric(question);

      expect(result.valid).toBe(false);
    });

    test('should reject rubric with invalid points', () => {
      const question = {
        rubric: [
          { criterion: 'Understanding', points: -1 }, // Negative points
          { criterion: 'Analysis', points: 6 }
        ],
        marks: 5
      };

      const result = handler.validateRubric(question);

      expect(result.valid).toBe(false);
    });

    test('should accept rubric with floating point tolerance', () => {
      const question = {
        rubric: [
          { criterion: 'Understanding', points: 2.5 },
          { criterion: 'Analysis', points: 2.5 }
        ],
        marks: 5.0
      };

      const result = handler.validateRubric(question);

      expect(result.valid).toBe(true);
    });
  });
});
