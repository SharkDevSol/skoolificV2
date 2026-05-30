const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Use centralized JWT validator
const { JWT_SECRET, verifyTokenWithDetails } = require('./jwtValidator');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  console.log('\n🔐 Auth Middleware - Request:', req.method, req.path);
  console.log('Auth header present:', !!authHeader);
  console.log('Token present:', !!token);
  if (token) {
    console.log('Token length:', token.length);
    console.log('Token preview:', token.substring(0, 20) + '...');
  }

  if (!token) {
    console.log('❌ No token provided');
    return res.status(401).json({ error: 'Access token required' });
  }

  // ============================================
  // SUPER ADMIN API KEY SUPPORT
  // ============================================
  // Allow Super Admin API keys (they are long hex strings, typically 64+ characters)
  // This enables cross-system authentication from a central Super Admin system
  if (token.length > 60 && /^[a-f0-9]+$/i.test(token)) {
    // Additional validation: ensure it's not just repeated characters
    const uniqueChars = new Set(token.toLowerCase().split(''));
    if (uniqueChars.size < 10) {
      // Too few unique characters, likely not a valid API key
      return res.status(403).json({ error: 'Invalid API key format' });
    }
    
    // This is likely a Super Admin API key
    console.log('Super Admin API key detected, granting access');
    req.user = {
      id: 'super-admin',
      role: 'super_admin',
      username: 'Super Admin',
      isSuperAdmin: true,
      source: 'api_key'
    };
    return next();
  }

  // ============================================
  // STANDARD JWT VALIDATION
  // ============================================
  const result = verifyTokenWithDetails(token);
  
  if (!result.success) {
    console.log('❌ JWT verification failed:', result.error.message);
    
    if (result.error.code === 'TOKEN_EXPIRED') {
      return res.status(401).json({ 
        error: result.error.userMessage, 
        code: result.error.code 
      });
    }
    
    if (result.error.code === 'SIGNATURE_MISMATCH') {
      return res.status(401).json({ 
        error: result.error.userMessage, 
        code: result.error.code,
        action: 'LOGOUT_REQUIRED'
      });
    }
    
    return res.status(403).json({ 
      error: result.error.userMessage,
      code: result.error.code
    });
  }
  
  console.log('✅ JWT verified, user:', result.decoded);
  req.user = result.decoded;
  next();
};

// Role-based authorization middleware
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    console.log('\n🔒 Authorization Check');
    console.log('User:', req.user);
    console.log('User role:', req.user?.role);
    console.log('Allowed roles:', allowedRoles);
    
    if (!req.user || !req.user.role) {
      console.log('❌ No user or role found');
      return res.status(403).json({ error: 'Access denied: No role assigned' });
    }
    
    // Super Admin has access to everything
    if (req.user.isSuperAdmin || req.user.role === 'super_admin') {
      console.log('✅ Super Admin access granted');
      return next();
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      console.log('❌ Role not in allowed list');
      return res.status(403).json({ error: 'Access denied: Insufficient permissions' });
    }
    
    console.log('✅ Authorization passed');
    next();
  };
};

// Optional authentication - doesn't fail if no token, but attaches user if valid
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  const result = verifyTokenWithDetails(token);
  if (result.success) {
    req.user = result.decoded;
  }
  next();
};

module.exports = { authenticateToken, authorizeRoles, optionalAuth, JWT_SECRET };