// branchAuth.js - Branch Code Authentication Middleware
// Validates branch code and attaches branch context to requests

const jwt = require('jsonwebtoken');
const dbManager = require('../services/DatabaseConnectionManager');

/**
 * Middleware to validate branch code from request
 * Branch code can come from:
 * 1. JWT token (req.user.branchCode)
 * 2. Request header (x-branch-code)
 * 3. Query parameter (?branchCode=XXX)
 */
const validateBranchCode = async (req, res, next) => {
  try {
    let branchCode = null;

    // Priority 1: Get from JWT token (if user is authenticated)
    if (req.user && req.user.branchCode) {
      branchCode = req.user.branchCode;
    }
    
    // Priority 2: Get from header
    if (!branchCode && req.headers['x-branch-code']) {
      branchCode = req.headers['x-branch-code'];
    }
    
    // Priority 2.5: Decode from Authorization header JWT if present
    if (!branchCode && req.headers['authorization']) {
      try {
        const auth = req.headers['authorization'];
        const token = auth && auth.split(' ')[1];
        if (token) {
          const decoded = jwt.decode(token);
          if (decoded && decoded.branchCode) branchCode = decoded.branchCode;
        }
      } catch (_) {}
    }
    
    // Priority 3: Get from query parameter
    if (!branchCode && req.query.branchCode) {
      branchCode = req.query.branchCode;
    }

    // Priority 4: Environment default branch
    if (!branchCode && (process.env.DEFAULT_BRANCH_CODE || process.env.AI06_BRANCH_CODE)) {
      branchCode = process.env.DEFAULT_BRANCH_CODE || process.env.AI06_BRANCH_CODE;
    }

    // If no branch code provided, fall back to master pool for admin or single-db deployments
    if (!branchCode) {
      if (req.user && (req.user.role === 'admin' || req.user.userType === 'admin' || req.user.role === 'sub-account')) {
        req.branchPool = dbManager ? dbManager.masterPool : require('../config/db');
        return next();
      }
      if (dbManager && dbManager.masterPool) {
        req.branchPool = dbManager.masterPool;
        return next();
      }
      return res.status(400).json({ 
        error: 'Branch code is required',
        message: 'Please provide branch code in header (x-branch-code), query parameter (?branchCode=XXX), or login with branch code'
      });
    }

    // Get database pool for this branch
    try {
      const pool = await dbManager.getPool(branchCode);
      
      // Attach branch context to request
      req.branchCode = branchCode;
      req.branchPool = pool;
      
      next();
    } catch (error) {
      // Do NOT silently fall back to masterPool - that causes 0 data!
      // masterPool connects to the master registry DB which has no class/student data.
      console.error(`❌ Branch pool error for ${branchCode}:`, error.message);
      return res.status(503).json({ 
        error: 'Branch database temporarily unavailable',
        message: `Could not connect to branch database for: ${branchCode}. Please try again.`,
        details: error.message
      });
    }

  } catch (error) {
    console.error('Branch validation error:', error);
    return res.status(500).json({ 
      error: 'Branch validation failed',
      message: error.message
    });
  }
};

/**
 * Enhanced JWT authentication middleware with branch support
 * Validates JWT token and extracts branch code
 */
const authenticateWithBranch = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: 'Access token required',
      code: 'NO_TOKEN'
    });
  }

  // Verify token with proper options to match generation settings
  const verifyOptions = {
    issuer: 'school-management-system',
    audience: 'school-app'
  };

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', verifyOptions, (err, user) => {
    if (err) {
      console.error('JWT Verification Error:', err.name, err.message);
      
      let errorResponse = { 
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      };

      if (err.name === 'TokenExpiredError') {
        errorResponse = {
          error: 'Your session has expired. Please login again.',
          code: 'TOKEN_EXPIRED'
        };
      } else if (err.name === 'JsonWebTokenError') {
        if (err.message.includes('invalid signature')) {
          errorResponse = {
            error: 'Token signature mismatch. Please logout and login again.',
            code: 'SIGNATURE_MISMATCH',
            action: 'LOGOUT_REQUIRED'
          };
        } else if (err.message.includes('jwt malformed')) {
          errorResponse = {
            error: 'Malformed token. Please login again.',
            code: 'MALFORMED_TOKEN'
          };
        } else if (err.message.includes('jwt audience invalid') || err.message.includes('jwt issuer invalid')) {
          errorResponse = {
            error: 'Token was generated with different settings. Please logout and login again.',
            code: 'TOKEN_SETTINGS_MISMATCH',
            action: 'LOGOUT_REQUIRED'
          };
        }
      }

      return res.status(403).json(errorResponse);
    }

    // Attach user info to request (includes branchCode)
    req.user = user;
    
    // Continue to branch validation
    validateBranchCode(req, res, next);
  });
};

/**
 * Generate JWT token with branch context
 */
/**
 * Like authenticateWithBranch, but a token that has only EXPIRED is still
 * accepted.
 *
 * jwt.verify validates the signature before it reports an expiry, so a token
 * that fails with TokenExpiredError was still signed for a real user of this
 * branch. The mobile apps keep their token for 24h and used to start failing
 * with 403 the moment it expired - the discipline/faults screens then showed
 * nothing until the user logged out and back in. A missing or forged token
 * is still rejected.
 */
const authenticateWithBranchAllowExpired = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: 'Access token required',
      code: 'NO_TOKEN'
    });
  }

  const verifyOptions = {
    issuer: 'school-management-system',
    audience: 'school-app'
  };

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', verifyOptions, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        // Signature was already checked by jwt.verify - the session is only
        // past its expiry, so keep serving the request.
        const decoded = jwt.decode(token);
        if (decoded) {
          console.warn('\u26a0\ufe0f Token expired - continuing with the still-valid session');
          req.user = decoded;
          req.tokenExpired = true;
          return validateBranchCode(req, res, next);
        }
      }
      return res.status(403).json({
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
    }

    req.user = user;
    validateBranchCode(req, res, next);
  });
};

const generateBranchToken = (userData, branchCode, expiresIn = '24h') => {
  const payload = {
    ...userData,
    branchCode: branchCode
  };

  return jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: expiresIn,
    issuer: 'school-management-system',
    audience: 'school-app'
  });
};

module.exports = {
  validateBranchCode,
  authenticateWithBranch,
  authenticateWithBranchAllowExpired,
  generateBranchToken
};
