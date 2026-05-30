// Export all middleware from a single entry point
const auth = require('./auth');
const branchAuth = require('./branchAuth');
const rateLimiter = require('./rateLimiter');
const inputValidation = require('./inputValidation');
const fileValidation = require('./fileValidation');
const security = require('./security');
const financeAuth = require('./financeAuth');
const auditLogger = require('./auditLogger');

module.exports = {
  // Authentication
  ...auth,
  
  // Branch Authentication (Multi-Branch Support)
  ...branchAuth,
  
  // Rate limiting
  ...rateLimiter,
  
  // Input validation
  ...inputValidation,
  
  // File validation
  ...fileValidation,
  
  // Security headers and utilities
  ...security,
  
  // Finance authentication and authorization
  ...financeAuth,
  
  // Audit logging
  ...auditLogger,
};
