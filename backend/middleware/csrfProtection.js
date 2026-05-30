/**
 * CSRF Protection Middleware
 * 
 * Implements Cross-Site Request Forgery protection using csrf-csrf package.
 * Protects state-changing operations (POST, PUT, DELETE, PATCH).
 * 
 * Phase 8.3: XSS and CSRF Protection
 */

const { doubleCsrf } = require('csrf-csrf');

// Configure CSRF protection
const {
  generateToken,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || 'your-csrf-secret-change-in-production',
  cookieName: '__Host-psifi.x-csrf-token',
  cookieOptions: {
    sameSite: 'strict',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getTokenFromRequest: (req) => {
    // Check multiple sources for CSRF token
    return req.headers['x-csrf-token'] || 
           req.headers['x-xsrf-token'] ||
           req.body?._csrf ||
           req.query?._csrf;
  },
});

/**
 * Middleware to generate and attach CSRF token to response
 * Use this on routes that render forms or need CSRF tokens
 */
function attachCsrfToken(req, res, next) {
  try {
    const csrfToken = generateToken(req, res);
    
    // Attach token to response locals for template rendering
    res.locals.csrfToken = csrfToken;
    
    // Also send in response header for API clients
    res.setHeader('X-CSRF-Token', csrfToken);
    
    next();
  } catch (error) {
    console.error('Error generating CSRF token:', error);
    next(error);
  }
}

/**
 * Middleware to validate CSRF token on state-changing requests
 * Automatically applied to POST, PUT, DELETE, PATCH requests
 */
const validateCsrfToken = doubleCsrfProtection;

/**
 * Error handler for CSRF validation failures
 */
function csrfErrorHandler(err, req, res, next) {
  if (err.code === 'EBADCSRFTOKEN' || err.message?.includes('CSRF')) {
    return res.status(403).json({
      success: false,
      message: 'Invalid CSRF token. Please refresh the page and try again.',
      error: 'CSRF_VALIDATION_FAILED',
    });
  }
  next(err);
}

/**
 * Endpoint to get CSRF token
 * Frontend can call this to get a fresh token
 */
function getCsrfToken(req, res) {
  const csrfToken = generateToken(req, res);
  res.json({
    success: true,
    csrfToken,
  });
}

module.exports = {
  attachCsrfToken,
  validateCsrfToken,
  csrfErrorHandler,
  getCsrfToken,
  generateToken,
};
