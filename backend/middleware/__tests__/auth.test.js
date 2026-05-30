/**
 * Authentication Middleware Unit Tests
 * 
 * Comprehensive test suite for authentication middleware.
 * Tests cover:
 * - Token authentication
 * - Super Admin API key support
 * - Role-based authorization
 * - Optional authentication
 * - Error handling
 * - Token expiration
 * 
 * Target: 80%+ code coverage
 */

// Mock dependencies
jest.mock('../jwtValidator');
const { verifyTokenWithDetails } = require('../jwtValidator');

const { authenticateToken, authorizeRoles, optionalAuth } = require('../auth');

describe('Authentication Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    // Create mock request, response, and next
    req = {
      headers: {},
      method: 'GET',
      path: '/api/test',
      user: null
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    next = jest.fn();

    // Clear all mocks
    jest.clearAllMocks();
  });

  // ============================================================================
  // TEST SUITE 1: Token Authentication - Success Cases
  // ============================================================================
  describe('1. Token Authentication - Success Cases', () => {
    test('1.1 Should authenticate valid JWT token', () => {
      req.headers.authorization = 'Bearer validtoken123';

      verifyTokenWithDetails.mockReturnValue({
        success: true,
        decoded: {
          id: 1,
          username: 'testuser',
          role: 'admin'
        }
      });

      authenticateToken(req, res, next);

      expect(verifyTokenWithDetails).toHaveBeenCalledWith('validtoken123');
      expect(req.user).toEqual({
        id: 1,
        username: 'testuser',
        role: 'admin'
      });
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('1.2 Should authenticate Super Admin API key', () => {
      // 64-character hex string (typical API key)
      const apiKey = 'a'.repeat(64);
      req.headers.authorization = `Bearer ${apiKey}`;

      authenticateToken(req, res, next);

      expect(req.user).toEqual({
        id: 'super-admin',
        role: 'super_admin',
        username: 'Super Admin',
        isSuperAdmin: true,
        source: 'api_key'
      });
      expect(next).toHaveBeenCalled();
      expect(verifyTokenWithDetails).not.toHaveBeenCalled();
    });

    test('1.3 Should authenticate long hex API key with sufficient entropy', () => {
      const apiKey = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      req.headers.authorization = `Bearer ${apiKey}`;

      authenticateToken(req, res, next);

      expect(req.user.isSuperAdmin).toBe(true);
      expect(next).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // TEST SUITE 2: Token Authentication - Error Cases
  // ============================================================================
  describe('2. Token Authentication - Error Cases', () => {
    test('2.1 Should return 401 when no token provided', () => {
      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access token required' });
      expect(next).not.toHaveBeenCalled();
    });

    test('2.2 Should return 401 when authorization header is empty', () => {
      req.headers.authorization = '';

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access token required' });
    });

    test('2.3 Should return 401 when token is expired', () => {
      req.headers.authorization = 'Bearer expiredtoken';

      verifyTokenWithDetails.mockReturnValue({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Token expired',
          userMessage: 'Your session has expired. Please login again.'
        }
      });

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Your session has expired. Please login again.',
        code: 'TOKEN_EXPIRED'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('2.4 Should return 401 when signature mismatch', () => {
      req.headers.authorization = 'Bearer invalidtoken';

      verifyTokenWithDetails.mockReturnValue({
        success: false,
        error: {
          code: 'SIGNATURE_MISMATCH',
          message: 'Invalid signature',
          userMessage: 'Invalid token signature'
        }
      });

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid token signature',
        code: 'SIGNATURE_MISMATCH',
        action: 'LOGOUT_REQUIRED'
      });
    });

    test('2.5 Should return 403 for other token errors', () => {
      req.headers.authorization = 'Bearer badtoken';

      verifyTokenWithDetails.mockReturnValue({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid token',
          userMessage: 'Token is invalid'
        }
      });

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Token is invalid',
        code: 'INVALID_TOKEN'
      });
    });

    test('2.6 Should reject API key with low entropy', () => {
      // API key with repeated characters (low entropy)
      const lowEntropyKey = 'a'.repeat(70);
      req.headers.authorization = `Bearer ${lowEntropyKey}`;

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid API key format' });
      expect(next).not.toHaveBeenCalled();
    });

    test('2.7 Should reject short hex strings as API keys', () => {
      const shortHex = 'abc123';
      req.headers.authorization = `Bearer ${shortHex}`;

      verifyTokenWithDetails.mockReturnValue({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid token',
          userMessage: 'Token is invalid'
        }
      });

      authenticateToken(req, res, next);

      expect(verifyTokenWithDetails).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ============================================================================
  // TEST SUITE 3: Role-Based Authorization
  // ============================================================================
  describe('3. Role-Based Authorization', () => {
    test('3.1 Should allow access for authorized role', () => {
      req.user = {
        id: 1,
        username: 'admin',
        role: 'admin'
      };

      const middleware = authorizeRoles('admin', 'teacher');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('3.2 Should allow Super Admin access to everything', () => {
      req.user = {
        id: 'super-admin',
        username: 'Super Admin',
        role: 'super_admin',
        isSuperAdmin: true
      };

      const middleware = authorizeRoles('admin');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('3.3 Should deny access for unauthorized role', () => {
      req.user = {
        id: 1,
        username: 'student',
        role: 'student'
      };

      const middleware = authorizeRoles('admin', 'teacher');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access denied: Insufficient permissions'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('3.4 Should deny access when no user', () => {
      req.user = null;

      const middleware = authorizeRoles('admin');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access denied: No role assigned'
      });
    });

    test('3.5 Should deny access when user has no role', () => {
      req.user = {
        id: 1,
        username: 'user'
      };

      const middleware = authorizeRoles('admin');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access denied: No role assigned'
      });
    });

    test('3.6 Should handle multiple allowed roles', () => {
      req.user = {
        id: 1,
        username: 'teacher',
        role: 'teacher'
      };

      const middleware = authorizeRoles('admin', 'teacher', 'staff');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('3.7 Should handle single allowed role', () => {
      req.user = {
        id: 1,
        username: 'admin',
        role: 'admin'
      };

      const middleware = authorizeRoles('admin');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // TEST SUITE 4: Optional Authentication
  // ============================================================================
  describe('4. Optional Authentication', () => {
    test('4.1 Should proceed without token', () => {
      optionalAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeNull();
    });

    test('4.2 Should attach user if valid token provided', () => {
      req.headers.authorization = 'Bearer validtoken';

      // Mock jwt.verify to call callback with user
      const jwt = require('jsonwebtoken');
      jest.spyOn(jwt, 'verify').mockImplementation((token, secret, callback) => {
        callback(null, { id: 1, username: 'user', role: 'student' });
      });

      optionalAuth(req, res, next);

      expect(req.user).toEqual({ id: 1, username: 'user', role: 'student' });
      expect(next).toHaveBeenCalled();

      jwt.verify.mockRestore();
    });

    test('4.3 Should proceed without user if invalid token', () => {
      req.headers.authorization = 'Bearer invalidtoken';

      const jwt = require('jsonwebtoken');
      jest.spyOn(jwt, 'verify').mockImplementation((token, secret, callback) => {
        callback(new Error('Invalid token'), null);
      });

      optionalAuth(req, res, next);

      expect(req.user).toBeNull();
      expect(next).toHaveBeenCalled();

      jwt.verify.mockRestore();
    });

    test('4.4 Should handle missing authorization header', () => {
      delete req.headers.authorization;

      optionalAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeNull();
    });
  });

  // ============================================================================
  // TEST SUITE 5: Edge Cases
  // ============================================================================
  describe('5. Edge Cases', () => {
    test('5.1 Should handle malformed authorization header', () => {
      req.headers.authorization = 'InvalidFormat';

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access token required' });
    });

    test('5.2 Should handle authorization header without Bearer prefix', () => {
      req.headers.authorization = 'token123';

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('5.3 Should handle very long tokens', () => {
      const longToken = 'a'.repeat(10000);
      req.headers.authorization = `Bearer ${longToken}`;

      verifyTokenWithDetails.mockReturnValue({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid token',
          userMessage: 'Token is invalid'
        }
      });

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('5.4 Should handle empty Bearer token', () => {
      req.headers.authorization = 'Bearer ';

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('5.5 Should handle case-sensitive role matching', () => {
      req.user = {
        id: 1,
        username: 'user',
        role: 'Admin' // Different case
      };

      const middleware = authorizeRoles('admin');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    test('5.6 Should handle super_admin role string', () => {
      req.user = {
        id: 1,
        username: 'superadmin',
        role: 'super_admin'
      };

      const middleware = authorizeRoles('admin');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
