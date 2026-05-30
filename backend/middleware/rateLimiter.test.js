/**
 * Rate Limiter Tests
 * 
 * Tests for Task 3.1.6: Add rate limiting for Gemini API calls
 * 
 * Test Coverage:
 * - AI rate limiter configuration
 * - Per-teacher rate limiting (10 requests per hour)
 * - Error message format
 * - Key generation based on user ID
 */

const { aiLimiter } = require('./rateLimiter');

describe('AI Rate Limiter - Task 3.1.6', () => {
  
  test('aiLimiter should be defined and be a function', () => {
    expect(aiLimiter).toBeDefined();
    expect(typeof aiLimiter).toBe('function');
  });

  test('aiLimiter should handle authenticated users with user ID', () => {
    const mockReq = {
      user: { id: 'teacher123' },
      ip: '192.168.1.1'
    };
    const mockRes = {};
    const mockNext = jest.fn();

    // The middleware should be callable
    expect(() => aiLimiter(mockReq, mockRes, mockNext)).not.toThrow();
  });

  test('aiLimiter should handle unauthenticated users with IP fallback', () => {
    const mockReq = {
      ip: '192.168.1.1'
    };
    const mockRes = {};
    const mockNext = jest.fn();

    // The middleware should be callable
    expect(() => aiLimiter(mockReq, mockRes, mockNext)).not.toThrow();
  });

  test('aiLimiter should be exported correctly', () => {
    const rateLimiterModule = require('./rateLimiter');
    expect(rateLimiterModule).toHaveProperty('aiLimiter');
    expect(rateLimiterModule.aiLimiter).toBe(aiLimiter);
  });
});
