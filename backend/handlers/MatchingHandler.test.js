/**
 * Test Suite for MatchingHandler
 * 
 * Comprehensive tests for matching question validation, grading, and statistics
 */

const MatchingHandler = require('./MatchingHandler');

describe('MatchingHandler', () => {
  let handler;

  beforeEach(() => {
    handler = new MatchingHandler();
  });

  // ==================== VALIDATION TESTS ====================

  describe('validate()', () => {
    test('should validate a correct matching question', () => {
      const question = {
        id: 1,
        type: 'matching',
        question: 'Match the Ethiopian emperors with their achievements:',
        leftColumn: ['Haile Selassie', 'Menelik II', 'Tewodros II'],
        rightColumn: ['Modernized Ethiopia', 'Defeated Italy at Adwa', 'Founded Addis Ababa'],
        correctMatches: [
          { left: 'Haile Selassie', right: 'Modernized Ethiopia' },
          { left: 'Menelik II', right: 'Defeated Italy at Adwa' },
          { left: 'Tewodros II', right: 'Founded Addis Ababa' }
        ],
        marks: 3,
        explanation: 'Historical achievements of Ethiopian emperors.'
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
        marks: 2
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Question must be of type "matching"');
    });

    test('should reject question without type', () => {
      const question = {
        id: 1,
        question: 'Test question',
        marks: 2
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(false);
    });

    test('should reject question with mismatched column lengths', () => {
      const question = {
        id: 1,
        type: 'matching',
        question: 'Match items:',
        leftColumn: ['A', 'B'],
        rightColumn: ['1', '2', '3'],
        correctMatches: [
          { left: 'A', right: '1' },
          { left: 'B', right: '2' }
        ],
        marks: 2,
        explanation: 'Test'
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('same number of items'))).toBe(true);
    });

    test('should reject question with empty columns', () => {
      const question = {
        id: 1,
        type: 'matching',
        question: 'Match items:',
        leftColumn: [],
        rightColumn: [],
        correctMatches: [],
        marks: 2,
        explanation: 'Test'
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(false);
    });

    test('should reject question without required fields', () => {
      const question = {
        id: 1,
        type: 'matching',
        question: 'Match items:'
      };

      const result = handler.validate(question);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  // ==================== NORMALIZATION TESTS ====================

  describe('normalizeMatch()', () => {
    test('should normalize match with trimming and lowercase', () => {
      const match = { left: '  Haile Selassie  ', right: '  Modernized Ethiopia  ' };
      const result = handler.normalizeMatch(match);
      
      expect(result).toEqual({
        left: 'haile selassie',
        right: 'modernized ethiopia'
      });
    });

    test('should handle already normalized match', () => {
      const match = { left: 'test', right: 'answer' };
      const result = handler.normalizeMatch(match);
      
      expect(result).toEqual({
        left: 'test',
        right: 'answer'
      });
    });

    test('should return null for invalid match (missing left)', () => {
      const match = { right: 'answer' };
      const result = handler.normalizeMatch(match);
      
      expect(result).toBeNull();
    });

    test('should return null for invalid match (missing right)', () => {
      const match = { left: 'test' };
      const result = handler.normalizeMatch(match);
      
      expect(result).toBeNull();
    });

    test('should return null for null match', () => {
      const result = handler.normalizeMatch(null);
      expect(result).toBeNull();
    });

    test('should return null for non-object match', () => {
      const result = handler.normalizeMatch('string');
      expect(result).toBeNull();
    });
  });

  describe('matchesAreEqual()', () => {
    test('should return true for identical matches', () => {
      const match1 = { left: 'A', right: 'B' };
      const match2 = { left: 'A', right: 'B' };
      
      expect(handler.matchesAreEqual(match1, match2)).toBe(true);
    });

    test('should return true for case-insensitive matches', () => {
      const match1 = { left: 'Haile Selassie', right: 'Modernized Ethiopia' };
      const match2 = { left: 'haile selassie', right: 'modernized ethiopia' };
      
      expect(handler.matchesAreEqual(match1, match2)).toBe(true);
    });

    test('should return true for matches with extra whitespace', () => {
      const match1 = { left: '  A  ', right: '  B  ' };
      const match2 = { left: 'A', right: 'B' };
      
      expect(handler.matchesAreEqual(match1, match2)).toBe(true);
    });

    test('should return false for different matches', () => {
      const match1 = { left: 'A', right: 'B' };
      const match2 = { left: 'A', right: 'C' };
      
      expect(handler.matchesAreEqual(match1, match2)).toBe(false);
    });

    test('should return false for swapped matches', () => {
      const match1 = { left: 'A', right: 'B' };
      const match2 = { left: 'B', right: 'A' };
      
      expect(handler.matchesAreEqual(match1, match2)).toBe(false);
    });

    test('should return false for invalid matches', () => {
      const match1 = { left: 'A', right: 'B' };
      const match2 = null;
      
      expect(handler.matchesAreEqual(match1, match2)).toBe(false);
    });
  });

  // ==================== GRADING TESTS ====================

  describe('grade()', () => {
    const validQuestion = {
      id: 1,
      type: 'matching',
      question: 'Match the Ethiopian emperors with their achievements:',
      leftColumn: ['Haile Selassie', 'Menelik II', 'Tewodros II'],
      rightColumn: ['Modernized Ethiopia', 'Defeated Italy at Adwa', 'Founded Addis Ababa'],
      correctMatches: [
        { left: 'Haile Selassie', right: 'Modernized Ethiopia' },
        { left: 'Menelik II', right: 'Defeated Italy at Adwa' },
        { left: 'Tewodros II', right: 'Founded Addis Ababa' }
      ],
      marks: 3,
      explanation: 'Historical achievements of Ethiopian emperors.'
    };

    test('should grade all correct answers', () => {
      const studentAnswers = [
        { left: 'Haile Selassie', right: 'Modernized Ethiopia' },
        { left: 'Menelik II', right: 'Defeated Italy at Adwa' },
        { left: 'Tewodros II', right: 'Founded Addis Ababa' }
      ];

      const result = handler.grade(validQuestion, studentAnswers);
      
      expect(result.success).toBe(true);
      expect(result.earnedMarks).toBe(3);
      expect(result.totalMarks).toBe(3);
      expect(result.isCorrect).toBe(true);
      expect(result.correctCount).toBe(3);
      expect(result.totalMatches).toBe(3);
      expect(result.feedback).toContain('Correct');
    });

    test('should grade partially correct answers (2 out of 3)', () => {
      const studentAnswers = [
        { left: 'Haile Selassie', right: 'Modernized Ethiopia' },
        { left: 'Menelik II', right: 'Defeated Italy at Adwa' },
        { left: 'Tewodros II', right: 'Wrong Answer' }
      ];

      const result = handler.grade(validQuestion, studentAnswers);
      
      expect(result.success).toBe(true);
      expect(result.earnedMarks).toBe(2);
      expect(result.totalMarks).toBe(3);
      expect(result.isCorrect).toBe(false);
      expect(result.correctCount).toBe(2);
      expect(result.feedback).toContain('Partially correct');
      expect(result.feedback).toContain('2 out of 3');
    });

    test('should grade partially correct answers (1 out of 3)', () => {
      const studentAnswers = [
        { left: 'Haile Selassie', right: 'Modernized Ethiopia' },
        { left: 'Menelik II', right: 'Wrong Answer' },
        { left: 'Tewodros II', right: 'Wrong Answer' }
      ];

      const result = handler.grade(validQuestion, studentAnswers);
      
      expect(result.success).toBe(true);
      expect(result.earnedMarks).toBe(1);
      expect(result.totalMarks).toBe(3);
      expect(result.isCorrect).toBe(false);
      expect(result.correctCount).toBe(1);
    });

    test('should grade all incorrect answers', () => {
      const studentAnswers = [
        { left: 'Haile Selassie', right: 'Wrong' },
        { left: 'Menelik II', right: 'Wrong' },
        { left: 'Tewodros II', right: 'Wrong' }
      ];

      const result = handler.grade(validQuestion, studentAnswers);
      
      expect(result.success).toBe(true);
      expect(result.earnedMarks).toBe(0);
      expect(result.totalMarks).toBe(3);
      expect(result.isCorrect).toBe(false);
      expect(result.correctCount).toBe(0);
      expect(result.feedback).toContain('Incorrect');
    });

    test('should handle case-insensitive grading', () => {
      const studentAnswers = [
        { left: 'HAILE SELASSIE', right: 'MODERNIZED ETHIOPIA' },
        { left: 'menelik ii', right: 'defeated italy at adwa' },
        { left: 'Tewodros II', right: 'Founded Addis Ababa' }
      ];

      const result = handler.grade(validQuestion, studentAnswers);
      
      expect(result.success).toBe(true);
      expect(result.earnedMarks).toBe(3);
      expect(result.isCorrect).toBe(true);
    });

    test('should handle whitespace in answers', () => {
      const studentAnswers = [
        { left: '  Haile Selassie  ', right: '  Modernized Ethiopia  ' },
        { left: 'Menelik II', right: 'Defeated Italy at Adwa' },
        { left: 'Tewodros II', right: 'Founded Addis Ababa' }
      ];

      const result = handler.grade(validQuestion, studentAnswers);
      
      expect(result.success).toBe(true);
      expect(result.earnedMarks).toBe(3);
      expect(result.isCorrect).toBe(true);
    });

    test('should handle empty student answers', () => {
      const result = handler.grade(validQuestion, []);
      
      expect(result.success).toBe(true);
      expect(result.earnedMarks).toBe(0);
      expect(result.totalMarks).toBe(3);
      expect(result.isCorrect).toBe(false);
      expect(result.feedback).toContain('No answers provided');
    });

    test('should handle null student answers', () => {
      const result = handler.grade(validQuestion, null);
      
      expect(result.success).toBe(true);
      expect(result.earnedMarks).toBe(0);
      expect(result.feedback).toContain('No answers provided');
    });

    test('should handle undefined student answers', () => {
      const result = handler.grade(validQuestion, undefined);
      
      expect(result.success).toBe(true);
      expect(result.earnedMarks).toBe(0);
      expect(result.feedback).toContain('No answers provided');
    });

    test('should reject wrong number of answers', () => {
      const studentAnswers = [
        { left: 'Haile Selassie', right: 'Modernized Ethiopia' }
      ];

      const result = handler.grade(validQuestion, studentAnswers);
      
      expect(result.success).toBe(true);
      expect(result.earnedMarks).toBe(0);
      expect(result.feedback).toContain('Expected 3 matches');
    });

    test('should reject invalid match format (missing left)', () => {
      const studentAnswers = [
        { right: 'Modernized Ethiopia' },
        { left: 'Menelik II', right: 'Defeated Italy at Adwa' },
        { left: 'Tewodros II', right: 'Founded Addis Ababa' }
      ];

      const result = handler.grade(validQuestion, studentAnswers);
      
      expect(result.success).toBe(true);
      expect(result.earnedMarks).toBe(0);
      expect(result.feedback).toContain('Invalid match format');
    });

    test('should reject invalid match format (missing right)', () => {
      const studentAnswers = [
        { left: 'Haile Selassie' },
        { left: 'Menelik II', right: 'Defeated Italy at Adwa' },
        { left: 'Tewodros II', right: 'Founded Addis Ababa' }
      ];

      const result = handler.grade(validQuestion, studentAnswers);
      
      expect(result.success).toBe(true);
      expect(result.earnedMarks).toBe(0);
      expect(result.feedback).toContain('Invalid match format');
    });

    test('should handle invalid question structure', () => {
      const invalidQuestion = {
        id: 1,
        type: 'matching',
        question: 'Test'
      };

      const studentAnswers = [
        { left: 'A', right: 'B' }
      ];

      const result = handler.grade(invalidQuestion, studentAnswers);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid question structure');
      expect(result.earnedMarks).toBe(0);
    });

    test('should include match results in response', () => {
      const studentAnswers = [
        { left: 'Haile Selassie', right: 'Modernized Ethiopia' },
        { left: 'Menelik II', right: 'Wrong' },
        { left: 'Tewodros II', right: 'Founded Addis Ababa' }
      ];

      const result = handler.grade(validQuestion, studentAnswers);
      
      expect(result.matchResults).toHaveLength(3);
      expect(result.matchResults[0].isCorrect).toBe(true);
      expect(result.matchResults[1].isCorrect).toBe(false);
      expect(result.matchResults[2].isCorrect).toBe(true);
    });

    test('should handle shuffled correct answers', () => {
      const studentAnswers = [
        { left: 'Tewodros II', right: 'Founded Addis Ababa' },
        { left: 'Haile Selassie', right: 'Modernized Ethiopia' },
        { left: 'Menelik II', right: 'Defeated Italy at Adwa' }
      ];

      const result = handler.grade(validQuestion, studentAnswers);
      
      expect(result.success).toBe(true);
      expect(result.earnedMarks).toBe(3);
      expect(result.isCorrect).toBe(true);
    });
  });

  // ==================== BATCH GRADING TESTS ====================

  describe('gradeMultiple()', () => {
    const questions = [
      {
        id: 1,
        type: 'matching',
        question: 'Match the emperors with their achievements:',
        leftColumn: ['A', 'B'],
        rightColumn: ['1', '2'],
        correctMatches: [
          { left: 'A', right: '1' },
          { left: 'B', right: '2' }
        ],
        marks: 2,
        explanation: 'Historical achievements of emperors.'
      },
      {
        id: 2,
        type: 'matching',
        question: 'Match the cities with their countries:',
        leftColumn: ['X', 'Y'],
        rightColumn: ['10', '20'],
        correctMatches: [
          { left: 'X', right: '10' },
          { left: 'Y', right: '20' }
        ],
        marks: 2,
        explanation: 'Cities and their countries.'
      },
      {
        id: 3,
        type: 'multiple_choice',
        question: 'Not a matching question',
        options: ['A', 'B'],
        correctAnswer: 'A',
        marks: 1,
        explanation: 'Test question'
      }
    ];

    test('should grade multiple matching questions', () => {
      const studentAnswers = {
        1: [
          { left: 'A', right: '1' },
          { left: 'B', right: '2' }
        ],
        2: [
          { left: 'X', right: '10' },
          { left: 'Y', right: '20' }
        ]
      };

      const result = handler.gradeMultiple(questions, studentAnswers);
      
      expect(result.totalQuestions).toBe(2);
      expect(result.totalMarks).toBe(4);
      expect(result.earnedMarks).toBe(4);
      expect(result.correctCount).toBe(2);
      expect(result.percentage).toBe('100.00');
    });

    test('should handle partially correct answers', () => {
      const studentAnswers = {
        1: [
          { left: 'A', right: '1' },
          { left: 'B', right: 'wrong' }
        ],
        2: [
          { left: 'X', right: '10' },
          { left: 'Y', right: '20' }
        ]
      };

      const result = handler.gradeMultiple(questions, studentAnswers);
      
      expect(result.totalQuestions).toBe(2);
      expect(result.earnedMarks).toBe(3);
      expect(result.correctCount).toBe(1);
      expect(result.partiallyCorrectCount).toBe(1);
    });

    test('should handle unanswered questions', () => {
      const studentAnswers = {
        1: [
          { left: 'A', right: '1' },
          { left: 'B', right: '2' }
        ]
      };

      const result = handler.gradeMultiple(questions, studentAnswers);
      
      expect(result.totalQuestions).toBe(2);
      expect(result.correctCount).toBe(1);
      expect(result.unansweredCount).toBe(1);
    });

    test('should filter only matching questions', () => {
      const studentAnswers = {
        1: [
          { left: 'A', right: '1' },
          { left: 'B', right: '2' }
        ],
        2: [
          { left: 'X', right: '10' },
          { left: 'Y', right: '20' }
        ],
        3: 'A'
      };

      const result = handler.gradeMultiple(questions, studentAnswers);
      
      expect(result.totalQuestions).toBe(2);
    });

    test('should handle empty questions array', () => {
      const result = handler.gradeMultiple([], {});
      
      expect(result.totalQuestions).toBe(0);
      expect(result.totalMarks).toBe(0);
      expect(result.earnedMarks).toBe(0);
    });
  });

  // ==================== ANSWER VALIDATION TESTS ====================

  describe('areAnswersValid()', () => {
    test('should validate correct answers', () => {
      const answers = [
        { left: 'A', right: 'B' },
        { left: 'C', right: 'D' }
      ];

      const result = handler.areAnswersValid(answers, 2);
      
      expect(result.valid).toBe(true);
      expect(result.message).toBe('All answers are valid');
    });

    test('should reject non-array answers', () => {
      const result = handler.areAnswersValid('not an array', 2);
      
      expect(result.valid).toBe(false);
      expect(result.message).toContain('must be provided as an array');
    });

    test('should reject null answers', () => {
      const result = handler.areAnswersValid(null, 2);
      
      expect(result.valid).toBe(false);
    });

    test('should reject empty array', () => {
      const result = handler.areAnswersValid([], 2);
      
      expect(result.valid).toBe(false);
      expect(result.message).toContain('cannot be empty');
    });

    test('should reject wrong count', () => {
      const answers = [
        { left: 'A', right: 'B' }
      ];

      const result = handler.areAnswersValid(answers, 2);
      
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Expected 2 matches');
    });

    test('should reject answers missing left property', () => {
      const answers = [
        { right: 'B' },
        { left: 'C', right: 'D' }
      ];

      const result = handler.areAnswersValid(answers, 2);
      
      expect(result.valid).toBe(false);
      expect(result.message).toContain('must have "left" and "right" properties');
    });

    test('should reject answers missing right property', () => {
      const answers = [
        { left: 'A' },
        { left: 'C', right: 'D' }
      ];

      const result = handler.areAnswersValid(answers, 2);
      
      expect(result.valid).toBe(false);
    });

    test('should reject non-object answers', () => {
      const answers = [
        'string',
        { left: 'C', right: 'D' }
      ];

      const result = handler.areAnswersValid(answers, 2);
      
      expect(result.valid).toBe(false);
    });
  });

  // ==================== STATISTICS TESTS ====================

  describe('getQuestionStatistics()', () => {
    const question = {
      id: 1,
      type: 'matching',
      question: 'Match the items with their descriptions:',
      leftColumn: ['A', 'B'],
      rightColumn: ['1', '2'],
      correctMatches: [
        { left: 'A', right: '1' },
        { left: 'B', right: '2' }
      ],
      marks: 2,
      explanation: 'Test matching question for statistics.'
    };

    test('should calculate statistics for all correct answers', () => {
      const allAnswers = [
        [
          { left: 'A', right: '1' },
          { left: 'B', right: '2' }
        ],
        [
          { left: 'A', right: '1' },
          { left: 'B', right: '2' }
        ]
      ];

      const stats = handler.getQuestionStatistics(question, allAnswers);
      
      expect(stats.totalResponses).toBe(2);
      expect(stats.allCorrectCount).toBe(2);
      expect(stats.partiallyCorrectCount).toBe(0);
      expect(stats.allIncorrectCount).toBe(0);
      expect(stats.averageScore).toBe('2.00');
      expect(stats.allCorrectPercentage).toBe('100.00');
    });

    test('should calculate statistics for mixed answers', () => {
      const allAnswers = [
        [
          { left: 'A', right: '1' },
          { left: 'B', right: '2' }
        ],
        [
          { left: 'A', right: '1' },
          { left: 'B', right: 'wrong' }
        ],
        [
          { left: 'A', right: 'wrong' },
          { left: 'B', right: 'wrong' }
        ]
      ];

      const stats = handler.getQuestionStatistics(question, allAnswers);
      
      expect(stats.totalResponses).toBe(3);
      expect(stats.allCorrectCount).toBe(1);
      expect(stats.partiallyCorrectCount).toBe(1);
      expect(stats.allIncorrectCount).toBe(1);
    });

    test('should handle unanswered questions', () => {
      const allAnswers = [
        [
          { left: 'A', right: '1' },
          { left: 'B', right: '2' }
        ],
        [],
        null
      ];

      const stats = handler.getQuestionStatistics(question, allAnswers);
      
      expect(stats.totalResponses).toBe(3);
      expect(stats.allCorrectCount).toBe(1);
      expect(stats.unansweredCount).toBe(2);
    });

    test('should calculate per-match-pair statistics', () => {
      const allAnswers = [
        [
          { left: 'A', right: '1' },
          { left: 'B', right: '2' }
        ],
        [
          { left: 'A', right: '1' },
          { left: 'B', right: 'wrong' }
        ]
      ];

      const stats = handler.getQuestionStatistics(question, allAnswers);
      
      expect(stats.matchPairStats).toHaveLength(2);
      expect(stats.matchPairStats[0].correctCount).toBe(2);
      expect(stats.matchPairStats[1].correctCount).toBe(1);
    });

    test('should handle empty responses', () => {
      const stats = handler.getQuestionStatistics(question, []);
      
      expect(stats.totalResponses).toBe(0);
      expect(stats.averageScore).toBe('0');
      expect(stats.allCorrectPercentage).toBe('0');
    });

    test('should calculate average correct matches', () => {
      const allAnswers = [
        [
          { left: 'A', right: '1' },
          { left: 'B', right: '2' }
        ],
        [
          { left: 'A', right: '1' },
          { left: 'B', right: 'wrong' }
        ]
      ];

      const stats = handler.getQuestionStatistics(question, allAnswers);
      
      expect(stats.averageCorrectMatches).toBe('1.50');
    });
  });
});
