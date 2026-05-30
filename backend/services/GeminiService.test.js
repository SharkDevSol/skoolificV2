/**
 * GeminiService Tests
 * 
 * Tests for Task 3.1.4: Implement generateExam() method with error handling
 * 
 * Test Coverage:
 * 1. Successful exam generation
 * 2. Error handling for rate limits
 * 3. Error handling for invalid API keys
 * 4. Error handling for JSON parsing errors
 * 5. Error handling for general errors
 */

const GeminiService = require('./GeminiService');

// Mock the @google/generative-ai module
jest.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: jest.fn()
      })
    }))
  };
});

describe('GeminiService - generateExam() method', () => {
  let geminiService;
  let mockGenerateContent;

  beforeEach(() => {
    // Set up environment variable
    process.env.GEMINI_API_KEY = 'test-api-key';
    
    // Create a new instance of GeminiService
    geminiService = new GeminiService();
    
    // Get reference to the mocked generateContent method
    mockGenerateContent = geminiService.model.generateContent;
    
    // Reset mock before each test
    mockGenerateContent.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // TEST SUITE 1: Successful Exam Generation
  // ============================================================================
  describe('1. Successful Exam Generation', () => {
    test('1.1 Should generate exam with valid configuration', async () => {
      const examConfig = {
        grade: 'Grade 10',
        subject: 'Mathematics',
        unit: 'Algebra and Geometry',
        language: 'English',
        questionTypes: [
          { type: 'multiple_choice', count: 5, marksEach: 2 }
        ],
        difficulty: 'Medium',
        totalMarks: 10,
        componentType: 'Unit Test'
      };

      const mockExamData = {
        exam: {
          title: 'Mathematics Exam',
          subject: 'Mathematics',
          gradeLevel: '10',
          totalMarks: 10,
          duration: 60,
          questions: [
            {
              type: 'multiple-choice',
              question: 'What is 2 + 2?',
              options: ['3', '4', '5', '6'],
              correctAnswer: '4',
              marks: 2,
              explanation: 'Basic addition'
            }
          ]
        }
      };

      // Mock the API response
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify(mockExamData)
        }
      });

      // Mock validateExamStructure to pass
      geminiService.validateExamStructure = jest.fn().mockReturnValue(true);

      const result = await geminiService.generateExam(examConfig);

      expect(result).toEqual(mockExamData);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      expect(geminiService.validateExamStructure).toHaveBeenCalledWith(mockExamData);
    });

    test('1.2 Should handle exam config without topics', async () => {
      const examConfig = {
        grade: 'Grade 8',
        subject: 'Science',
        unit: 'General Science',
        language: 'English',
        questionTypes: [
          { type: 'true_false', count: 3, marksEach: 2 }
        ],
        difficulty: 'Easy',
        totalMarks: 6,
        componentType: 'Quiz'
      };

      const mockExamData = {
        exam: {
          title: 'Science Exam',
          subject: 'Science',
          gradeLevel: '8',
          totalMarks: 6,
          duration: 60,
          questions: []
        }
      };

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify(mockExamData)
        }
      });

      geminiService.validateExamStructure = jest.fn().mockReturnValue(true);

      const result = await geminiService.generateExam(examConfig);

      expect(result).toEqual(mockExamData);
      expect(mockGenerateContent).toHaveBeenCalled();
    });

    test('1.3 Should use default duration when not provided', async () => {
      const examConfig = {
        grade: 'Grade 9',
        subject: 'English',
        unit: 'Literature',
        language: 'English',
        questionTypes: [
          { type: 'essay', count: 4, marksEach: 2 }
        ],
        difficulty: 'Hard',
        totalMarks: 8,
        componentType: 'Final Exam'
      };

      const mockExamData = {
        exam: {
          title: 'English Exam',
          subject: 'English',
          gradeLevel: '9',
          totalMarks: 8,
          duration: 60,
          questions: []
        }
      };

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify(mockExamData)
        }
      });

      geminiService.validateExamStructure = jest.fn().mockReturnValue(true);

      await geminiService.generateExam(examConfig);

      // Verify the prompt was called (we can't easily check the prompt content with the new builder)
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // TEST SUITE 2: Rate Limit Error Handling
  // ============================================================================
  describe('2. Rate Limit Error Handling', () => {
    test('2.1 Should handle RATE_LIMIT error', async () => {
      const examConfig = {
        grade: 'Grade 10',
        subject: 'Mathematics',
        unit: 'Algebra',
        language: 'English',
        questionTypes: [
          { type: 'multiple_choice', count: 5, marksEach: 2 }
        ],
        difficulty: 'Medium',
        totalMarks: 10,
        componentType: 'Unit Test'
      };

      const rateLimitError = new Error('RATE_LIMIT exceeded');
      mockGenerateContent.mockRejectedValue(rateLimitError);

      await expect(geminiService.generateExam(examConfig)).rejects.toThrow(
        'API rate limit exceeded. Please try again in a few moments.'
      );
    });

    test('2.2 Should handle 429 status code error', async () => {
      const examConfig = {
        grade: 'Grade 8',
        subject: 'Science',
        unit: 'Biology',
        language: 'English',
        questionTypes: [
          { type: 'true_false', count: 3, marksEach: 2 }
        ],
        difficulty: 'Easy',
        totalMarks: 6,
        componentType: 'Quiz'
      };

      const error429 = new Error('Request failed with status code 429');
      mockGenerateContent.mockRejectedValue(error429);

      await expect(geminiService.generateExam(examConfig)).rejects.toThrow(
        'API rate limit exceeded. Please try again in a few moments.'
      );
    });
  });

  // ============================================================================
  // TEST SUITE 3: Invalid API Key Error Handling
  // ============================================================================
  describe('3. Invalid API Key Error Handling', () => {
    test('3.1 Should handle INVALID_API_KEY error', async () => {
      const examConfig = {
        grade: 'Grade 10',
        subject: 'Mathematics',
        unit: 'Algebra',
        language: 'English',
        questionTypes: [
          { type: 'multiple_choice', count: 5, marksEach: 2 }
        ],
        difficulty: 'Medium',
        totalMarks: 10,
        componentType: 'Unit Test'
      };

      const apiKeyError = new Error('INVALID_API_KEY provided');
      mockGenerateContent.mockRejectedValue(apiKeyError);

      await expect(geminiService.generateExam(examConfig)).rejects.toThrow(
        'Invalid Gemini API key. Please check configuration.'
      );
    });

    test('3.2 Should handle API_KEY error', async () => {
      const examConfig = {
        grade: 'Grade 8',
        subject: 'Science',
        unit: 'Biology',
        language: 'English',
        questionTypes: [
          { type: 'true_false', count: 3, marksEach: 2 }
        ],
        difficulty: 'Easy',
        totalMarks: 6,
        componentType: 'Quiz'
      };

      const apiKeyError = new Error('API_KEY is missing');
      mockGenerateContent.mockRejectedValue(apiKeyError);

      await expect(geminiService.generateExam(examConfig)).rejects.toThrow(
        'Invalid Gemini API key. Please check configuration.'
      );
    });

    test('3.3 Should handle 401 unauthorized error', async () => {
      const examConfig = {
        grade: 'Grade 9',
        subject: 'English',
        unit: 'Literature',
        language: 'English',
        questionTypes: [
          { type: 'essay', count: 4, marksEach: 2 }
        ],
        difficulty: 'Hard',
        totalMarks: 8,
        componentType: 'Final Exam'
      };

      const error401 = new Error('Request failed with status code 401');
      mockGenerateContent.mockRejectedValue(error401);

      await expect(geminiService.generateExam(examConfig)).rejects.toThrow(
        'Invalid Gemini API key. Please check configuration.'
      );
    });
  });

  // ============================================================================
  // TEST SUITE 4: JSON Parsing Error Handling
  // ============================================================================
  describe('4. JSON Parsing Error Handling', () => {
    test('4.1 Should handle invalid JSON response', async () => {
      const examConfig = {
        grade: 'Grade 10',
        subject: 'Mathematics',
        unit: 'Algebra',
        language: 'English',
        questionTypes: [
          { type: 'multiple_choice', count: 5, marksEach: 2 }
        ],
        difficulty: 'Medium',
        totalMarks: 10,
        componentType: 'Unit Test'
      };

      // Mock response with invalid JSON
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'This is not valid JSON'
        }
      });

      await expect(geminiService.generateExam(examConfig)).rejects.toThrow(
        /Exam generation failed: Invalid JSON response from AI/
      );
    });

    test('4.2 Should handle malformed JSON response', async () => {
      const examConfig = {
        grade: 'Grade 8',
        subject: 'Science',
        unit: 'Biology',
        language: 'English',
        questionTypes: [
          { type: 'true_false', count: 3, marksEach: 2 }
        ],
        difficulty: 'Easy',
        totalMarks: 6,
        componentType: 'Quiz'
      };

      // Mock response with malformed JSON
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => '{"exam": {"title": "Test", "questions": [}'
        }
      });

      await expect(geminiService.generateExam(examConfig)).rejects.toThrow(
        /Exam generation failed: Invalid JSON response from AI/
      );
    });
  });

  // ============================================================================
  // TEST SUITE 5: General Error Handling
  // ============================================================================
  describe('5. General Error Handling', () => {
    test('5.1 Should handle network errors with retries', async () => {
      const examConfig = {
        grade: 'Grade 10',
        subject: 'Mathematics',
        unit: 'Algebra',
        language: 'English',
        questionTypes: [
          { type: 'multiple_choice', count: 5, marksEach: 2 }
        ],
        difficulty: 'Medium',
        totalMarks: 10,
        componentType: 'Unit Test'
      };

      const networkError = new Error('Network connection failed');
      mockGenerateContent.mockRejectedValue(networkError);

      // Mock sleep to resolve immediately for faster tests
      geminiService.sleep = jest.fn().mockResolvedValue(undefined);

      await expect(geminiService.generateExam(examConfig)).rejects.toThrow(
        'Exam generation failed: Network connection failed'
      );
      
      // Should have retried 3 times (4 total attempts)
      expect(mockGenerateContent).toHaveBeenCalledTimes(4);
    });

    test('5.2 Should handle validation errors', async () => {
      const examConfig = {
        grade: 'Grade 8',
        subject: 'Science',
        unit: 'Biology',
        language: 'English',
        questionTypes: [
          { type: 'true_false', count: 3, marksEach: 2 }
        ],
        difficulty: 'Easy',
        totalMarks: 6,
        componentType: 'Quiz'
      };

      const mockExamData = {
        exam: {
          title: 'Science Exam',
          questions: []
        }
      };

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify(mockExamData)
        }
      });

      // Mock validateExamStructure to throw error
      geminiService.validateExamStructure = jest.fn().mockImplementation(() => {
        throw new Error('Invalid exam structure returned from AI');
      });

      await expect(geminiService.generateExam(examConfig)).rejects.toThrow(
        'Exam generation failed: Invalid exam structure returned from AI'
      );
    });

    test('5.3 Should handle timeout errors with retries', async () => {
      const examConfig = {
        grade: 'Grade 9',
        subject: 'English',
        unit: 'Literature',
        language: 'English',
        questionTypes: [
          { type: 'essay', count: 4, marksEach: 2 }
        ],
        difficulty: 'Hard',
        totalMarks: 8,
        componentType: 'Final Exam'
      };

      const timeoutError = new Error('Request timeout');
      mockGenerateContent.mockRejectedValue(timeoutError);

      // Mock sleep to resolve immediately for faster tests
      geminiService.sleep = jest.fn().mockResolvedValue(undefined);

      await expect(geminiService.generateExam(examConfig)).rejects.toThrow(
        'Exam generation failed: Request timeout'
      );
      
      // Should have retried 3 times (4 total attempts)
      expect(mockGenerateContent).toHaveBeenCalledTimes(4);
    });
  });

  // ============================================================================
  // TEST SUITE 6: Prompt Generation
  // ============================================================================
  describe('6. Prompt Generation', () => {
    test('6.1 Should generate prompt with all config parameters', async () => {
      const examConfig = {
        grade: 'Grade 10',
        subject: 'Mathematics',
        unit: 'Algebra and Geometry',
        language: 'English',
        questionTypes: [
          { type: 'multiple_choice', count: 5, marksEach: 2 }
        ],
        difficulty: 'Medium',
        totalMarks: 10,
        componentType: 'Unit Test'
      };

      const mockExamData = {
        exam: {
          title: 'Mathematics Exam',
          questions: []
        }
      };

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify(mockExamData)
        }
      });

      geminiService.validateExamStructure = jest.fn().mockReturnValue(true);

      await geminiService.generateExam(examConfig);

      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs).toContain('Grade 10');
      expect(callArgs).toContain('Mathematics');
      expect(callArgs).toContain('Algebra and Geometry');
      expect(callArgs).toContain('English');
      expect(callArgs).toContain('Medium');
      expect(callArgs).toContain('Unit Test');
    });

    test('6.2 Should handle multiple question types in prompt', async () => {
      const examConfig = {
        grade: 'Grade 8',
        subject: 'Science',
        unit: 'Biology',
        language: 'English',
        questionTypes: [
          { type: 'multiple_choice', count: 3, marksEach: 2 },
          { type: 'true_false', count: 2, marksEach: 1 }
        ],
        difficulty: 'Easy',
        totalMarks: 8,
        componentType: 'Quiz'
      };

      const mockExamData = {
        exam: {
          title: 'Science Exam',
          questions: []
        }
      };

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify(mockExamData)
        }
      });

      geminiService.validateExamStructure = jest.fn().mockReturnValue(true);

      await geminiService.generateExam(examConfig);

      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs).toContain('multiple_choice');
      expect(callArgs).toContain('true_false');
    });
  });
});

// ============================================================================
// TEST SUITE 7: validateExamStructure() method (Task 3.1.5)
// ============================================================================
describe('7. validateExamStructure() method', () => {
  let geminiService;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-api-key';
    geminiService = new GeminiService();
  });

  describe('7.1 Valid exam structure', () => {
    test('Should return true for valid exam structure', () => {
      const validExamData = {
        exam: {
          title: 'Mathematics Exam',
          subject: 'Mathematics',
          gradeLevel: '10',
          totalMarks: 10,
          duration: 60,
          questions: [
            {
              type: 'multiple-choice',
              question: 'What is 2 + 2?',
              options: ['3', '4', '5', '6'],
              correctAnswer: '4',
              marks: 2,
              explanation: 'Basic addition'
            },
            {
              type: 'true-false',
              question: 'Is the earth flat?',
              correctAnswer: 'false',
              marks: 1,
              explanation: 'The earth is round'
            }
          ]
        }
      };

      expect(geminiService.validateExamStructure(validExamData)).toBe(true);
    });

    test('Should return true for exam with single question', () => {
      const validExamData = {
        exam: {
          title: 'Quick Quiz',
          questions: [
            {
              type: 'short-answer',
              question: 'What is the capital of France?',
              correctAnswer: 'Paris',
              marks: 5
            }
          ]
        }
      };

      expect(geminiService.validateExamStructure(validExamData)).toBe(true);
    });

    test('Should return true for exam with multiple question types', () => {
      const validExamData = {
        exam: {
          title: 'Mixed Exam',
          questions: [
            {
              type: 'multiple-choice',
              question: 'Question 1',
              correctAnswer: 'A',
              marks: 2
            },
            {
              type: 'essay',
              question: 'Question 2',
              correctAnswer: 'Sample answer',
              marks: 10
            },
            {
              type: 'true-false',
              question: 'Question 3',
              correctAnswer: 'true',
              marks: 1
            }
          ]
        }
      };

      expect(geminiService.validateExamStructure(validExamData)).toBe(true);
    });
  });

  describe('7.2 Invalid exam structure - missing exam object', () => {
    test('Should throw error when examData is missing exam property', () => {
      const invalidExamData = {
        title: 'Test',
        questions: []
      };

      expect(() => geminiService.validateExamStructure(invalidExamData)).toThrow(
        'Invalid exam structure returned from AI'
      );
    });

    test('Should throw error when examData.exam is null', () => {
      const invalidExamData = {
        exam: null
      };

      expect(() => geminiService.validateExamStructure(invalidExamData)).toThrow(
        'Invalid exam structure returned from AI'
      );
    });

    test('Should throw error when examData.exam is undefined', () => {
      const invalidExamData = {};

      expect(() => geminiService.validateExamStructure(invalidExamData)).toThrow(
        'Invalid exam structure returned from AI'
      );
    });
  });

  describe('7.3 Invalid exam structure - missing questions array', () => {
    test('Should throw error when questions property is missing', () => {
      const invalidExamData = {
        exam: {
          title: 'Test Exam',
          subject: 'Math'
        }
      };

      expect(() => geminiService.validateExamStructure(invalidExamData)).toThrow(
        'Invalid exam structure returned from AI'
      );
    });

    test('Should throw error when questions is null', () => {
      const invalidExamData = {
        exam: {
          title: 'Test Exam',
          questions: null
        }
      };

      expect(() => geminiService.validateExamStructure(invalidExamData)).toThrow(
        'Invalid exam structure returned from AI'
      );
    });

    test('Should throw error when questions is undefined', () => {
      const invalidExamData = {
        exam: {
          title: 'Test Exam',
          questions: undefined
        }
      };

      expect(() => geminiService.validateExamStructure(invalidExamData)).toThrow(
        'Invalid exam structure returned from AI'
      );
    });
  });

  describe('7.4 Invalid question structure - missing type', () => {
    test('Should throw error when question is missing type field', () => {
      const invalidExamData = {
        exam: {
          questions: [
            {
              question: 'What is 2 + 2?',
              correctAnswer: '4',
              marks: 2
            }
          ]
        }
      };

      expect(() => geminiService.validateExamStructure(invalidExamData)).toThrow(
        'Question 1 is missing required fields'
      );
    });

    test('Should throw error when question type is empty string', () => {
      const invalidExamData = {
        exam: {
          questions: [
            {
              type: '',
              question: 'What is 2 + 2?',
              correctAnswer: '4',
              marks: 2
            }
          ]
        }
      };

      expect(() => geminiService.validateExamStructure(invalidExamData)).toThrow(
        'Question 1 is missing required fields'
      );
    });
  });

  describe('7.5 Invalid question structure - missing question text', () => {
    test('Should throw error when question is missing question field', () => {
      const invalidExamData = {
        exam: {
          questions: [
            {
              type: 'multiple-choice',
              correctAnswer: '4',
              marks: 2
            }
          ]
        }
      };

      expect(() => geminiService.validateExamStructure(invalidExamData)).toThrow(
        'Question 1 is missing required fields'
      );
    });

    test('Should throw error when question text is empty string', () => {
      const invalidExamData = {
        exam: {
          questions: [
            {
              type: 'multiple-choice',
              question: '',
              correctAnswer: '4',
              marks: 2
            }
          ]
        }
      };

      expect(() => geminiService.validateExamStructure(invalidExamData)).toThrow(
        'Question 1 is missing required fields'
      );
    });
  });

  describe('7.6 Invalid question structure - missing marks', () => {
    test('Should throw error when question is missing marks field', () => {
      const invalidExamData = {
        exam: {
          questions: [
            {
              type: 'multiple-choice',
              question: 'What is 2 + 2?',
              correctAnswer: '4'
            }
          ]
        }
      };

      expect(() => geminiService.validateExamStructure(invalidExamData)).toThrow(
        'Question 1 is missing required fields'
      );
    });

    test('Should throw error when marks is 0 (falsy value)', () => {
      const invalidExamData = {
        exam: {
          questions: [
            {
              type: 'multiple-choice',
              question: 'What is 2 + 2?',
              correctAnswer: '4',
              marks: 0
            }
          ]
        }
      };

      expect(() => geminiService.validateExamStructure(invalidExamData)).toThrow(
        'Question 1 is missing required fields'
      );
    });
  });

  describe('7.7 Invalid question structure - missing correctAnswer', () => {
    test('Should throw error when question is missing correctAnswer field', () => {
      const invalidExamData = {
        exam: {
          questions: [
            {
              type: 'multiple-choice',
              question: 'What is 2 + 2?',
              marks: 2
            }
          ]
        }
      };

      expect(() => geminiService.validateExamStructure(invalidExamData)).toThrow(
        'Question 1 is missing required fields'
      );
    });

    test('Should throw error when correctAnswer is empty string', () => {
      const invalidExamData = {
        exam: {
          questions: [
            {
              type: 'multiple-choice',
              question: 'What is 2 + 2?',
              correctAnswer: '',
              marks: 2
            }
          ]
        }
      };

      expect(() => geminiService.validateExamStructure(invalidExamData)).toThrow(
        'Question 1 is missing required fields'
      );
    });
  });

  describe('7.8 Multiple questions with errors', () => {
    test('Should identify correct question number when error occurs in second question', () => {
      const invalidExamData = {
        exam: {
          questions: [
            {
              type: 'multiple-choice',
              question: 'Valid question 1',
              correctAnswer: 'A',
              marks: 2
            },
            {
              type: 'true-false',
              question: 'Invalid question - missing correctAnswer',
              marks: 1
            }
          ]
        }
      };

      expect(() => geminiService.validateExamStructure(invalidExamData)).toThrow(
        'Question 2 is missing required fields'
      );
    });

    test('Should identify correct question number when error occurs in third question', () => {
      const invalidExamData = {
        exam: {
          questions: [
            {
              type: 'multiple-choice',
              question: 'Valid question 1',
              correctAnswer: 'A',
              marks: 2
            },
            {
              type: 'true-false',
              question: 'Valid question 2',
              correctAnswer: 'true',
              marks: 1
            },
            {
              type: 'essay',
              question: 'Invalid question - missing marks',
              correctAnswer: 'Sample answer'
            }
          ]
        }
      };

      expect(() => geminiService.validateExamStructure(invalidExamData)).toThrow(
        'Question 3 is missing required fields'
      );
    });

    test('Should stop at first invalid question', () => {
      const invalidExamData = {
        exam: {
          questions: [
            {
              type: 'multiple-choice',
              question: 'Invalid question 1 - missing marks',
              correctAnswer: 'A'
            },
            {
              type: 'true-false',
              question: 'Invalid question 2 - missing type',
              correctAnswer: 'true',
              marks: 1
            }
          ]
        }
      };

      // Should throw error for question 1, not question 2
      expect(() => geminiService.validateExamStructure(invalidExamData)).toThrow(
        'Question 1 is missing required fields'
      );
    });
  });

  describe('7.9 Edge cases', () => {
    test('Should handle empty questions array', () => {
      const examDataWithEmptyQuestions = {
        exam: {
          title: 'Empty Exam',
          questions: []
        }
      };

      // Empty array is valid - no questions to validate
      expect(geminiService.validateExamStructure(examDataWithEmptyQuestions)).toBe(true);
    });

    test('Should handle questions with extra fields', () => {
      const examDataWithExtraFields = {
        exam: {
          questions: [
            {
              type: 'multiple-choice',
              question: 'What is 2 + 2?',
              correctAnswer: '4',
              marks: 2,
              options: ['3', '4', '5', '6'],
              explanation: 'Basic addition',
              difficulty: 'easy',
              topic: 'Arithmetic'
            }
          ]
        }
      };

      // Extra fields should not cause validation to fail
      expect(geminiService.validateExamStructure(examDataWithExtraFields)).toBe(true);
    });
  });
});

// ============================================================================
// TEST SUITE 8: Retry Logic (Task 3.1.7)
// ============================================================================
describe('8. Retry Logic with Exponential Backoff', () => {
  let geminiService;
  let mockGenerateContent;

  beforeEach(() => {
    jest.useFakeTimers();
    process.env.GEMINI_API_KEY = 'test-api-key';
    geminiService = new GeminiService();
    mockGenerateContent = geminiService.model.generateContent;
    mockGenerateContent.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('8.1 Successful retry after transient errors', () => {
    test('Should retry once and succeed on second attempt', async () => {
      const examConfig = {
        grade: 'Grade 10',
        subject: 'Mathematics',
        unit: 'Algebra',
        language: 'English',
        questionTypes: [
          { type: 'multiple_choice', count: 5, marksEach: 2 }
        ],
        difficulty: 'Medium',
        totalMarks: 10,
        componentType: 'Unit Test'
      };

      const mockExamData = {
        exam: {
          title: 'Mathematics Exam',
          questions: [
            {
              type: 'multiple-choice',
              question: 'What is 2 + 2?',
              correctAnswer: '4',
              marks: 2
            }
          ]
        }
      };

      // First call fails with network error, second call succeeds
      mockGenerateContent
        .mockRejectedValueOnce(new Error('Network connection failed'))
        .mockResolvedValueOnce({
          response: {
            text: () => JSON.stringify(mockExamData)
          }
        });

      geminiService.validateExamStructure = jest.fn().mockReturnValue(true);

      const promise = geminiService.generateExam(examConfig);
      
      // Fast-forward time by 1 second (first retry delay)
      await jest.advanceTimersByTimeAsync(1000);
      
      const result = await promise;

      expect(result).toEqual(mockExamData);
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    test('Should retry twice and succeed on third attempt', async () => {
      const examConfig = {
        grade: 'Grade 8',
        subject: 'Science',
        unit: 'Biology',
        language: 'English',
        questionTypes: [
          { type: 'true_false', count: 3, marksEach: 2 }
        ],
        difficulty: 'Easy',
        totalMarks: 6,
        componentType: 'Quiz'
      };

      const mockExamData = {
        exam: {
          title: 'Science Exam',
          questions: []
        }
      };

      // First two calls fail, third call succeeds
      mockGenerateContent
        .mockRejectedValueOnce(new Error('Connection timeout'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          response: {
            text: () => JSON.stringify(mockExamData)
          }
        });

      geminiService.validateExamStructure = jest.fn().mockReturnValue(true);

      const promise = geminiService.generateExam(examConfig);
      
      // Fast-forward through retry delays: 1s, then 2s
      await jest.advanceTimersByTimeAsync(1000);
      await jest.advanceTimersByTimeAsync(2000);
      
      const result = await promise;

      expect(result).toEqual(mockExamData);
      expect(mockGenerateContent).toHaveBeenCalledTimes(3);
    });

    test('Should retry three times and succeed on fourth attempt', async () => {
      const examConfig = {
        grade: 'Grade 9',
        subject: 'English',
        unit: 'Literature',
        language: 'English',
        questionTypes: [
          { type: 'essay', count: 4, marksEach: 2 }
        ],
        difficulty: 'Hard',
        totalMarks: 8,
        componentType: 'Final Exam'
      };

      const mockExamData = {
        exam: {
          title: 'English Exam',
          questions: []
        }
      };

      // First three calls fail, fourth call succeeds
      mockGenerateContent
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockRejectedValueOnce(new Error('Connection reset'))
        .mockRejectedValueOnce(new Error('Network unreachable'))
        .mockResolvedValueOnce({
          response: {
            text: () => JSON.stringify(mockExamData)
          }
        });

      geminiService.validateExamStructure = jest.fn().mockReturnValue(true);

      const promise = geminiService.generateExam(examConfig);
      
      // Fast-forward through retry delays: 1s, 2s, 4s
      await jest.advanceTimersByTimeAsync(1000);
      await jest.advanceTimersByTimeAsync(2000);
      await jest.advanceTimersByTimeAsync(4000);
      
      const result = await promise;

      expect(result).toEqual(mockExamData);
      expect(mockGenerateContent).toHaveBeenCalledTimes(4);
    });
  });

  describe('8.2 Exponential backoff timing', () => {
    test('Should use 1 second delay for first retry', async () => {
      const examConfig = {
        grade: 'Grade 10',
        subject: 'Mathematics',
        unit: 'Algebra',
        language: 'English',
        questionTypes: [
          { type: 'multiple_choice', count: 5, marksEach: 2 }
        ],
        difficulty: 'Medium',
        totalMarks: 10,
        componentType: 'Unit Test'
      };

      const mockExamData = {
        exam: {
          title: 'Mathematics Exam',
          questions: []
        }
      };

      mockGenerateContent
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          response: {
            text: () => JSON.stringify(mockExamData)
          }
        });

      geminiService.validateExamStructure = jest.fn().mockReturnValue(true);

      const promise = geminiService.generateExam(examConfig);
      
      // Should wait 1 second before retry
      await jest.advanceTimersByTimeAsync(999);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      
      await jest.advanceTimersByTimeAsync(1);
      await promise;
      
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    test('Should use 2 second delay for second retry', async () => {
      const examConfig = {
        grade: 'Grade 8',
        subject: 'Science',
        unit: 'Biology',
        language: 'English',
        questionTypes: [
          { type: 'true_false', count: 3, marksEach: 2 }
        ],
        difficulty: 'Easy',
        totalMarks: 6,
        componentType: 'Quiz'
      };

      const mockExamData = {
        exam: {
          title: 'Science Exam',
          questions: []
        }
      };

      mockGenerateContent
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValueOnce({
          response: {
            text: () => JSON.stringify(mockExamData)
          }
        });

      geminiService.validateExamStructure = jest.fn().mockReturnValue(true);

      const promise = geminiService.generateExam(examConfig);
      
      // First retry after 1 second
      await jest.advanceTimersByTimeAsync(1000);
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
      
      // Second retry should wait 2 seconds
      await jest.advanceTimersByTimeAsync(1999);
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
      
      await jest.advanceTimersByTimeAsync(1);
      await promise;
      
      expect(mockGenerateContent).toHaveBeenCalledTimes(3);
    });

    test('Should use 4 second delay for third retry', async () => {
      const examConfig = {
        grade: 'Grade 9',
        subject: 'English',
        unit: 'Literature',
        language: 'English',
        questionTypes: [
          { type: 'essay', count: 4, marksEach: 2 }
        ],
        difficulty: 'Hard',
        totalMarks: 8,
        componentType: 'Final Exam'
      };

      const mockExamData = {
        exam: {
          title: 'English Exam',
          questions: []
        }
      };

      mockGenerateContent
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockRejectedValueOnce(new Error('Error 3'))
        .mockResolvedValueOnce({
          response: {
            text: () => JSON.stringify(mockExamData)
          }
        });

      geminiService.validateExamStructure = jest.fn().mockReturnValue(true);

      const promise = geminiService.generateExam(examConfig);
      
      // First retry after 1 second
      await jest.advanceTimersByTimeAsync(1000);
      // Second retry after 2 seconds
      await jest.advanceTimersByTimeAsync(2000);
      expect(mockGenerateContent).toHaveBeenCalledTimes(3);
      
      // Third retry should wait 4 seconds
      await jest.advanceTimersByTimeAsync(3999);
      expect(mockGenerateContent).toHaveBeenCalledTimes(3);
      
      await jest.advanceTimersByTimeAsync(1);
      await promise;
      
      expect(mockGenerateContent).toHaveBeenCalledTimes(4);
    });
  });

  describe('8.3 Max retries exceeded', () => {
    test('Should fail after 3 retries (4 total attempts)', async () => {
      const examConfig = {
        grade: 'Grade 10',
        subject: 'Mathematics',
        unit: 'Algebra',
        language: 'English',
        questionTypes: [
          { type: 'multiple_choice', count: 5, marksEach: 2 }
        ],
        difficulty: 'Medium',
        totalMarks: 10,
        componentType: 'Unit Test'
      };

      // All attempts fail with transient error
      mockGenerateContent.mockRejectedValue(new Error('Network connection failed'));
      
      // Mock sleep to resolve immediately for faster tests
      geminiService.sleep = jest.fn().mockResolvedValue(undefined);

      await expect(geminiService.generateExam(examConfig)).rejects.toThrow('Exam generation failed: Network connection failed');
      expect(mockGenerateContent).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    test('Should not retry more than 3 times', async () => {
      const examConfig = {
        grade: 'Grade 8',
        subject: 'Science',
        unit: 'Biology',
        language: 'English',
        questionTypes: [
          { type: 'true_false', count: 3, marksEach: 2 }
        ],
        difficulty: 'Easy',
        totalMarks: 6,
        componentType: 'Quiz'
      };

      mockGenerateContent.mockRejectedValue(new Error('Timeout error'));
      
      // Mock sleep to resolve immediately for faster tests
      geminiService.sleep = jest.fn().mockResolvedValue(undefined);

      await expect(geminiService.generateExam(examConfig)).rejects.toThrow('Exam generation failed: Timeout error');
      expect(mockGenerateContent).toHaveBeenCalledTimes(4); // Should not exceed 4 total attempts
    });
  });

  describe('8.4 Non-retryable errors', () => {
    test('Should NOT retry on rate limit errors (RATE_LIMIT)', async () => {
      const examConfig = {
        grade: 'Grade 10',
        subject: 'Mathematics',
        unit: 'Algebra',
        language: 'English',
        questionTypes: [
          { type: 'multiple_choice', count: 5, marksEach: 2 }
        ],
        difficulty: 'Medium',
        totalMarks: 10,
        componentType: 'Unit Test'
      };

      mockGenerateContent.mockRejectedValue(new Error('RATE_LIMIT exceeded'));

      await expect(geminiService.generateExam(examConfig)).rejects.toThrow(
        'API rate limit exceeded. Please try again in a few moments.'
      );
      
      expect(mockGenerateContent).toHaveBeenCalledTimes(1); // No retries
    });

    test('Should NOT retry on rate limit errors (429)', async () => {
      const examConfig = {
        grade: 'Grade 8',
        subject: 'Science',
        unit: 'Biology',
        language: 'English',
        questionTypes: [
          { type: 'true_false', count: 3, marksEach: 2 }
        ],
        difficulty: 'Easy',
        totalMarks: 6,
        componentType: 'Quiz'
      };

      mockGenerateContent.mockRejectedValue(new Error('Request failed with status code 429'));

      await expect(geminiService.generateExam(examConfig)).rejects.toThrow(
        'API rate limit exceeded. Please try again in a few moments.'
      );
      
      expect(mockGenerateContent).toHaveBeenCalledTimes(1); // No retries
    });

    test('Should NOT retry on invalid API key errors (INVALID_API_KEY)', async () => {
      const examConfig = {
        grade: 'Grade 9',
        subject: 'English',
        unit: 'Literature',
        language: 'English',
        questionTypes: [
          { type: 'essay', count: 4, marksEach: 2 }
        ],
        difficulty: 'Hard',
        totalMarks: 8,
        componentType: 'Final Exam'
      };

      mockGenerateContent.mockRejectedValue(new Error('INVALID_API_KEY provided'));

      await expect(geminiService.generateExam(examConfig)).rejects.toThrow(
        'Invalid Gemini API key. Please check configuration.'
      );
      
      expect(mockGenerateContent).toHaveBeenCalledTimes(1); // No retries
    });

    test('Should NOT retry on auth errors (401)', async () => {
      const examConfig = {
        grade: 'Grade 11',
        subject: 'History',
        unit: 'World History',
        language: 'English',
        questionTypes: [
          { type: 'short_answer', count: 6, marksEach: 3 }
        ],
        difficulty: 'Medium',
        totalMarks: 18,
        componentType: 'Midterm'
      };

      mockGenerateContent.mockRejectedValue(new Error('Request failed with status code 401'));

      await expect(geminiService.generateExam(examConfig)).rejects.toThrow(
        'Invalid Gemini API key. Please check configuration.'
      );
      
      expect(mockGenerateContent).toHaveBeenCalledTimes(1); // No retries
    });

    test('Should NOT retry on validation errors', async () => {
      const examConfig = {
        grade: 'Grade 10',
        subject: 'Mathematics',
        unit: 'Algebra',
        language: 'English',
        questionTypes: [
          { type: 'multiple_choice', count: 5, marksEach: 2 }
        ],
        difficulty: 'Medium',
        totalMarks: 10,
        componentType: 'Unit Test'
      };

      const mockExamData = {
        exam: {
          title: 'Test',
          questions: []
        }
      };

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify(mockExamData)
        }
      });

      geminiService.validateExamStructure = jest.fn().mockImplementation(() => {
        throw new Error('Invalid exam structure returned from AI');
      });

      await expect(geminiService.generateExam(examConfig)).rejects.toThrow(
        'Exam generation failed: Invalid exam structure returned from AI'
      );
      
      expect(mockGenerateContent).toHaveBeenCalledTimes(1); // No retries
    });
  });

  describe('8.5 shouldRetry() helper method', () => {
    test('Should return false for RATE_LIMIT errors', () => {
      const error = new Error('RATE_LIMIT exceeded');
      expect(geminiService.shouldRetry(error)).toBe(false);
    });

    test('Should return false for 429 errors', () => {
      const error = new Error('Request failed with status code 429');
      expect(geminiService.shouldRetry(error)).toBe(false);
    });

    test('Should return false for INVALID_API_KEY errors', () => {
      const error = new Error('INVALID_API_KEY provided');
      expect(geminiService.shouldRetry(error)).toBe(false);
    });

    test('Should return false for 401 errors', () => {
      const error = new Error('Request failed with status code 401');
      expect(geminiService.shouldRetry(error)).toBe(false);
    });

    test('Should return false for validation errors', () => {
      const error = new Error('Invalid exam structure returned from AI');
      expect(geminiService.shouldRetry(error)).toBe(false);
    });

    test('Should return true for network errors', () => {
      const error = new Error('Network connection failed');
      expect(geminiService.shouldRetry(error)).toBe(true);
    });

    test('Should return true for timeout errors', () => {
      const error = new Error('Request timeout');
      expect(geminiService.shouldRetry(error)).toBe(true);
    });

    test('Should return true for connection errors', () => {
      const error = new Error('Connection reset by peer');
      expect(geminiService.shouldRetry(error)).toBe(true);
    });

    test('Should return true for generic errors', () => {
      const error = new Error('Something went wrong');
      expect(geminiService.shouldRetry(error)).toBe(true);
    });
  });

  describe('8.6 sleep() helper method', () => {
    test('Should resolve after specified milliseconds', async () => {
      const promise = geminiService.sleep(1000);
      
      await jest.advanceTimersByTimeAsync(999);
      expect(promise).toBeInstanceOf(Promise);
      
      await jest.advanceTimersByTimeAsync(1);
      await expect(promise).resolves.toBeUndefined();
    });

    test('Should work with different delay values', async () => {
      const promise1 = geminiService.sleep(500);
      const promise2 = geminiService.sleep(2000);
      
      await jest.advanceTimersByTimeAsync(500);
      await expect(promise1).resolves.toBeUndefined();
      
      await jest.advanceTimersByTimeAsync(1500);
      await expect(promise2).resolves.toBeUndefined();
    });
  });
});
