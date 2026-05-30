/**
 * Unit Tests for GeminiService
 * Tests AI exam generation with mocked Gemini API
 */

const GeminiService = require('../GeminiService');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Mock the Google Generative AI module
jest.mock('@google/generative-ai');
jest.mock('../GeminiPromptBuilder');

describe('GeminiService', () => {
  let service;
  let mockModel;
  let mockGenerateContent;
  let mockResponse;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock response
    mockResponse = {
      text: jest.fn()
    };

    mockGenerateContent = jest.fn().mockResolvedValue({
      response: mockResponse
    });

    mockModel = {
      generateContent: mockGenerateContent
    };

    // Mock GoogleGenerativeAI
    GoogleGenerativeAI.mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue(mockModel)
    }));

    service = new GeminiService();
  });

  describe('Constructor', () => {
    it('should initialize with Gemini API', () => {
      expect(GoogleGenerativeAI).toHaveBeenCalledWith(process.env.GEMINI_API_KEY);
      expect(service.genAI).toBeDefined();
      expect(service.model).toBeDefined();
      expect(service.promptBuilder).toBeDefined();
    });

    it('should configure model with correct settings', () => {
      const mockGetModel = GoogleGenerativeAI.mock.results[0].value.getGenerativeModel;
      expect(mockGetModel).toHaveBeenCalledWith({
        model: 'gemini-1.5-pro',
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json'
        }
      });
    });
  });

  describe('generateExam()', () => {
    const validExamConfig = {
      grade: '10',
      subject: 'Mathematics',
      unit: 'Algebra',
      language: 'English',
      questionTypes: [
        { type: 'multiple_choice', count: 5, marksEach: 2 }
      ],
      difficulty: 'Medium',
      totalMarks: 10,
      componentType: 'Test 1'
    };

    const validExamResponse = {
      exam: {
        title: 'Mathematics Test',
        instructions: 'Answer all questions',
        totalMarks: 10,
        questions: [
          {
            id: 1,
            type: 'multiple_choice',
            question: 'What is 2+2?',
            marks: 2,
            options: ['3', '4', '5', '6'],
            correctAnswer: '4',
            explanation: '2+2 equals 4'
          }
        ]
      }
    };

    it('should generate exam successfully', async () => {
      mockResponse.text.mockReturnValue(JSON.stringify(validExamResponse));

      const result = await service.generateExam(validExamConfig);

      expect(result).toEqual(validExamResponse);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('should validate exam structure', async () => {
      mockResponse.text.mockReturnValue(JSON.stringify(validExamResponse));

      const result = await service.generateExam(validExamConfig);

      expect(result.exam).toBeDefined();
      expect(result.exam.questions).toBeDefined();
      expect(Array.isArray(result.exam.questions)).toBe(true);
    });

    it('should throw error for invalid JSON response', async () => {
      mockResponse.text.mockReturnValue('Invalid JSON');

      await expect(service.generateExam(validExamConfig))
        .rejects.toThrow('Invalid JSON response from AI');
    });

    it('should throw error for missing exam structure', async () => {
      mockResponse.text.mockReturnValue(JSON.stringify({ invalid: 'structure' }));

      await expect(service.generateExam(validExamConfig))
        .rejects.toThrow('Invalid exam structure returned from AI');
    });

    it('should throw error for missing questions', async () => {
      mockResponse.text.mockReturnValue(JSON.stringify({ exam: {} }));

      await expect(service.generateExam(validExamConfig))
        .rejects.toThrow('Invalid exam structure returned from AI');
    });

    it('should handle rate limit error', async () => {
      mockGenerateContent.mockRejectedValue(new Error('RATE_LIMIT exceeded'));

      await expect(service.generateExam(validExamConfig))
        .rejects.toThrow('API rate limit exceeded');
    });

    it('should handle 429 status code', async () => {
      mockGenerateContent.mockRejectedValue(new Error('429 Too Many Requests'));

      await expect(service.generateExam(validExamConfig))
        .rejects.toThrow('API rate limit exceeded');
    });

    it('should handle invalid API key error', async () => {
      mockGenerateContent.mockRejectedValue(new Error('INVALID_API_KEY'));

      await expect(service.generateExam(validExamConfig))
        .rejects.toThrow('Invalid Gemini API key');
    });

    it('should handle 401 unauthorized error', async () => {
      mockGenerateContent.mockRejectedValue(new Error('401 Unauthorized'));

      await expect(service.generateExam(validExamConfig))
        .rejects.toThrow('Invalid Gemini API key');
    });

    it('should retry on transient errors', async () => {
      mockGenerateContent
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          response: {
            text: () => JSON.stringify(validExamResponse)
          }
        });

      const result = await service.generateExam(validExamConfig);

      expect(result).toEqual(validExamResponse);
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it('should use exponential backoff for retries', async () => {
      const sleepSpy = jest.spyOn(service, 'sleep').mockResolvedValue();
      
      mockGenerateContent
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          response: {
            text: () => JSON.stringify(validExamResponse)
          }
        });

      await service.generateExam(validExamConfig);

      expect(sleepSpy).toHaveBeenCalledWith(1000); // 2^0 * 1000
      sleepSpy.mockRestore();
    });

    it('should stop retrying after max retries', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Network error'));

      await expect(service.generateExam(validExamConfig))
        .rejects.toThrow('Exam generation failed');

      expect(mockGenerateContent).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    it('should not retry rate limit errors', async () => {
      mockGenerateContent.mockRejectedValue(new Error('RATE_LIMIT'));

      await expect(service.generateExam(validExamConfig))
        .rejects.toThrow('API rate limit exceeded');

      expect(mockGenerateContent).toHaveBeenCalledTimes(1); // No retries
    });

    it('should not retry auth errors', async () => {
      mockGenerateContent.mockRejectedValue(new Error('INVALID_API_KEY'));

      await expect(service.generateExam(validExamConfig))
        .rejects.toThrow('Invalid Gemini API key');

      expect(mockGenerateContent).toHaveBeenCalledTimes(1); // No retries
    });
  });

  describe('validateExamStructure()', () => {
    it('should validate correct exam structure', () => {
      const validExam = {
        exam: {
          questions: [
            {
              type: 'multiple_choice',
              question: 'Test question?',
              marks: 2,
              correctAnswer: 'A'
            }
          ]
        }
      };

      expect(() => service.validateExamStructure(validExam)).not.toThrow();
    });

    it('should throw error for missing exam property', () => {
      const invalidExam = { questions: [] };

      expect(() => service.validateExamStructure(invalidExam))
        .toThrow('Invalid exam structure');
    });

    it('should throw error for missing questions array', () => {
      const invalidExam = { exam: {} };

      expect(() => service.validateExamStructure(invalidExam))
        .toThrow('Invalid exam structure');
    });

    it('should throw error for question missing type', () => {
      const invalidExam = {
        exam: {
          questions: [
            {
              question: 'Test?',
              marks: 2,
              correctAnswer: 'A'
            }
          ]
        }
      };

      expect(() => service.validateExamStructure(invalidExam))
        .toThrow('Question 1 is missing required fields');
    });

    it('should throw error for question missing question text', () => {
      const invalidExam = {
        exam: {
          questions: [
            {
              type: 'multiple_choice',
              marks: 2,
              correctAnswer: 'A'
            }
          ]
        }
      };

      expect(() => service.validateExamStructure(invalidExam))
        .toThrow('Question 1 is missing required fields');
    });

    it('should throw error for question missing marks', () => {
      const invalidExam = {
        exam: {
          questions: [
            {
              type: 'multiple_choice',
              question: 'Test?',
              correctAnswer: 'A'
            }
          ]
        }
      };

      expect(() => service.validateExamStructure(invalidExam))
        .toThrow('Question 1 is missing required fields');
    });

    it('should throw error for question missing correctAnswer', () => {
      const invalidExam = {
        exam: {
          questions: [
            {
              type: 'multiple_choice',
              question: 'Test?',
              marks: 2
            }
          ]
        }
      };

      expect(() => service.validateExamStructure(invalidExam))
        .toThrow('Question 1 is missing required fields');
    });

    it('should validate multiple questions', () => {
      const validExam = {
        exam: {
          questions: [
            {
              type: 'multiple_choice',
              question: 'Q1?',
              marks: 2,
              correctAnswer: 'A'
            },
            {
              type: 'true_false',
              question: 'Q2?',
              marks: 1,
              correctAnswer: 'true'
            }
          ]
        }
      };

      expect(() => service.validateExamStructure(validExam)).not.toThrow();
    });

    it('should identify which question is invalid', () => {
      const invalidExam = {
        exam: {
          questions: [
            {
              type: 'multiple_choice',
              question: 'Q1?',
              marks: 2,
              correctAnswer: 'A'
            },
            {
              type: 'true_false',
              question: 'Q2?',
              marks: 1
              // Missing correctAnswer
            }
          ]
        }
      };

      expect(() => service.validateExamStructure(invalidExam))
        .toThrow('Question 2 is missing required fields');
    });
  });

  describe('shouldRetry()', () => {
    it('should not retry rate limit errors', () => {
      const error = new Error('RATE_LIMIT exceeded');
      expect(service.shouldRetry(error)).toBe(false);
    });

    it('should not retry 429 errors', () => {
      const error = new Error('429 Too Many Requests');
      expect(service.shouldRetry(error)).toBe(false);
    });

    it('should not retry invalid API key errors', () => {
      const error = new Error('INVALID_API_KEY');
      expect(service.shouldRetry(error)).toBe(false);
    });

    it('should not retry 401 errors', () => {
      const error = new Error('401 Unauthorized');
      expect(service.shouldRetry(error)).toBe(false);
    });

    it('should not retry validation errors', () => {
      const error = new Error('Invalid exam structure');
      expect(service.shouldRetry(error)).toBe(false);
    });

    it('should retry network errors', () => {
      const error = new Error('Network error');
      expect(service.shouldRetry(error)).toBe(true);
    });

    it('should retry timeout errors', () => {
      const error = new Error('Request timeout');
      expect(service.shouldRetry(error)).toBe(true);
    });

    it('should retry generic errors', () => {
      const error = new Error('Something went wrong');
      expect(service.shouldRetry(error)).toBe(true);
    });
  });

  describe('sleep()', () => {
    it('should wait for specified milliseconds', async () => {
      const start = Date.now();
      await service.sleep(100);
      const end = Date.now();

      expect(end - start).toBeGreaterThanOrEqual(90); // Allow some variance
    });

    it('should return a promise', () => {
      const result = service.sleep(10);
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('Error handling', () => {
    it('should provide helpful error messages', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Unknown error'));

      await expect(service.generateExam({}))
        .rejects.toThrow('Exam generation failed');
    });

    it('should preserve original error message', async () => {
      const originalError = 'Specific error details';
      mockGenerateContent.mockRejectedValue(new Error(originalError));

      await expect(service.generateExam({}))
        .rejects.toThrow(originalError);
    });
  });
});
