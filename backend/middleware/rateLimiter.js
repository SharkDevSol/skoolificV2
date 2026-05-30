const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: {
    error: 'Too many requests, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const isLocalhost = req.ip === '127.0.0.1' || 
                       req.ip === '::1' || 
                       req.ip === '::ffff:127.0.0.1' ||
                       req.hostname === 'localhost';
    return isLocalhost;
  }
});

// Strict limiter for login attempts - 1 minute lockout after 3 failed attempts
const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 3, // 3 attempts per minute per IP+UserAgent
  message: {
    error: 'Too many login attempts, please try again after 1 minute.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  // Key by IP + User-Agent so each browser/tab is tracked separately
  keyGenerator: (req) => {
    const ip = ipKeyGenerator(req.ip || req.connection.remoteAddress || 'unknown', 56);
    const ua = req.headers['user-agent'] || 'unknown';
    // Use first 50 chars of UA to differentiate browsers/tabs
    return `${ip}-${ua.substring(0, 50)}`;
  },
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many login attempts. Please wait 1 minute before trying again.',
      retryAfter: 60
    });
  }
});

// Password reset limiter
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset attempts per hour
  message: {
    error: 'Too many password reset attempts, please try again after 1 hour.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// File upload limiter
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each IP to 50 uploads per hour
  message: {
    error: 'Too many file uploads, please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// AI exam generation rate limiter (expensive operation)
// Limits to 10 exam generations per hour per teacher
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 exam generations per hour
  message: {
    success: false,
    message: 'Too many exam generation requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Key by user ID to track per teacher
  keyGenerator: (req) => {
    // Use authenticated user ID if available
    if (req.user?.id || req.user?.userId) {
      const userId = req.user.id || req.user.userId;
      return `ai-gen-${userId}`;
    }
    // Fall back to IP with proper IPv6 handling
    return `ai-gen-${ipKeyGenerator(req.ip, 56)}`;
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many exam generation requests. Please try again later.',
      retryAfter: '1 hour'
    });
  }
});

module.exports = {
  apiLimiter,
  loginLimiter,
  passwordResetLimiter,
  uploadLimiter,
  aiLimiter
};
