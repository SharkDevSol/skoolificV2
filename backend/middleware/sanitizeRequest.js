/**
 * Request Sanitization Middleware
 * 
 * Automatically sanitizes all incoming request data (body, query, params)
 * to prevent XSS, SQL injection, and other security vulnerabilities.
 * 
 * Phase 8.1: Input Validation and Sanitization
 */

const { sanitizeText } = require('../utils/sanitizer');

/**
 * Recursively sanitize an object
 * @param {any} obj - Object to sanitize
 * @returns {any} - Sanitized object
 */
function sanitizeValue(value) {
  // Handle null and undefined
  if (value === null || value === undefined) {
    return value;
  }
  
  // Handle arrays
  if (Array.isArray(value)) {
    return value.map(item => sanitizeValue(item));
  }
  
  // Handle objects
  if (typeof value === 'object' && !(value instanceof Date)) {
    const sanitized = {};
    for (const [key, val] of Object.entries(value)) {
      sanitized[key] = sanitizeValue(val);
    }
    return sanitized;
  }
  
  // Handle strings (escape HTML entities)
  if (typeof value === 'string') {
    return sanitizeText(value);
  }
  
  // Return other types as-is (numbers, booleans, dates)
  return value;
}

/**
 * Middleware to sanitize all request data
 * Sanitizes req.body, req.query, and req.params
 */
function sanitizeRequest(req, res, next) {
  try {
    // Store original data for debugging if needed
    req.originalBody = req.body ? { ...req.body } : {};
    req.originalQuery = req.query ? { ...req.query } : {};
    req.originalParams = req.params ? { ...req.params } : {};
    
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeValue(req.body);
    }
    
    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeValue(req.query);
    }
    
    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeValue(req.params);
    }
    
    next();
  } catch (error) {
    console.error('Error in sanitizeRequest middleware:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing request data',
    });
  }
}

/**
 * Middleware to sanitize specific fields with custom rules
 * Use this for endpoints that need specific sanitization rules
 * 
 * @param {object} schema - Sanitization schema
 * @returns {function} - Express middleware
 * 
 * Example usage:
 * router.post('/register', 
 *   sanitizeFields({
 *     name: { type: 'text', required: true },
 *     email: { type: 'email', required: true },
 *     phone: { type: 'phone', required: true },
 *     age: { type: 'integer', options: { min: 5, max: 100 } }
 *   }),
 *   registerController
 * );
 */
function sanitizeFields(schema) {
  const { sanitizeObject } = require('../utils/sanitizer');
  
  return (req, res, next) => {
    try {
      // Sanitize request body according to schema
      if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body, schema);
      }
      
      next();
    } catch (error) {
      if (error.validationErrors) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.validationErrors,
        });
      }
      
      console.error('Error in sanitizeFields middleware:', error);
      res.status(500).json({
        success: false,
        message: 'Error processing request data',
      });
    }
  };
}

/**
 * Middleware to prevent common injection attacks
 * Blocks requests with suspicious patterns
 */
function preventInjection(req, res, next) {
  const suspiciousPatterns = [
    /<script[^>]*>.*?<\/script>/gi,  // Script tags
    /javascript:/gi,                  // JavaScript protocol
    /on\w+\s*=/gi,                   // Event handlers (onclick, onerror, etc.)
    /eval\s*\(/gi,                   // eval() function
    /expression\s*\(/gi,             // CSS expression()
    /<iframe[^>]*>/gi,               // iframes
    /<object[^>]*>/gi,               // objects
    /<embed[^>]*>/gi,                // embeds
    /union\s+select/gi,              // SQL UNION SELECT
    /;\s*drop\s+table/gi,            // SQL DROP TABLE
    /;\s*delete\s+from/gi,           // SQL DELETE FROM
    /;\s*update\s+\w+\s+set/gi,      // SQL UPDATE SET
  ];
  
  // Check all string values in request
  const checkValue = (value) => {
    if (typeof value === 'string') {
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(value)) {
          return true;
        }
      }
    } else if (Array.isArray(value)) {
      return value.some(item => checkValue(item));
    } else if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(val => checkValue(val));
    }
    return false;
  };
  
  // Check body, query, and params
  const hasSuspiciousContent = 
    checkValue(req.body) || 
    checkValue(req.query) || 
    checkValue(req.params);
  
  if (hasSuspiciousContent) {
    console.warn('Blocked suspicious request:', {
      ip: req.ip,
      method: req.method,
      path: req.path,
      timestamp: new Date().toISOString(),
    });
    
    return res.status(400).json({
      success: false,
      message: 'Invalid request data',
    });
  }
  
  next();
}

module.exports = {
  sanitizeRequest,
  sanitizeFields,
  preventInjection,
};
