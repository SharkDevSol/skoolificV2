/**
 * Input Sanitization Utility
 * 
 * Provides comprehensive input sanitization and validation functions
 * to prevent XSS, SQL injection, and other security vulnerabilities.
 * 
 * Phase 8.1: Input Validation and Sanitization
 */

const DOMPurify = require('isomorphic-dompurify');
const validator = require('validator');

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param {string} input - Raw HTML input
 * @returns {string} - Sanitized HTML
 */
function sanitizeHTML(input) {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target'],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Sanitize plain text by escaping HTML entities
 * @param {string} input - Raw text input
 * @returns {string} - Escaped text
 */
function sanitizeText(input) {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  return validator.escape(input);
}

/**
 * Validate and normalize email address
 * @param {string} email - Email address
 * @returns {string|null} - Normalized email or null if invalid
 */
function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') {
    return null;
  }
  
  const trimmed = email.trim().toLowerCase();
  
  if (!validator.isEmail(trimmed)) {
    return null;
  }
  
  return validator.normalizeEmail(trimmed);
}

/**
 * Validate and normalize phone number (Ethiopian format)
 * @param {string} phone - Phone number
 * @returns {string|null} - Normalized phone or null if invalid
 */
function sanitizePhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return null;
  }
  
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Handle Ethiopian formats
  if (cleaned.startsWith('251')) {
    // +251912345678 format
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith('0')) {
    // 0912345678 format
    cleaned = cleaned.substring(1);
  }
  
  // Validate length (should be 9 digits after country code)
  if (cleaned.length !== 9) {
    return null;
  }
  
  // Validate Ethiopian mobile prefixes (91, 92, 93, 94, 97, 98, 99)
  const validPrefixes = ['91', '92', '93', '94', '97', '98', '99'];
  const prefix = cleaned.substring(0, 2);
  
  if (!validPrefixes.includes(prefix)) {
    return null;
  }
  
  // Return in standard format: 0912345678
  return '0' + cleaned;
}

/**
 * Validate and sanitize URL
 * @param {string} url - URL string
 * @returns {string|null} - Sanitized URL or null if invalid
 */
function sanitizeURL(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }
  
  const trimmed = url.trim();
  
  if (!validator.isURL(trimmed, {
    protocols: ['http', 'https'],
    require_protocol: true,
  })) {
    return null;
  }
  
  return trimmed;
}

/**
 * Sanitize integer input
 * @param {any} input - Input value
 * @param {object} options - Validation options
 * @returns {number|null} - Sanitized integer or null if invalid
 */
function sanitizeInteger(input, options = {}) {
  const { min = null, max = null } = options;
  
  const num = parseInt(input, 10);
  
  if (isNaN(num)) {
    return null;
  }
  
  if (min !== null && num < min) {
    return null;
  }
  
  if (max !== null && num > max) {
    return null;
  }
  
  return num;
}

/**
 * Sanitize float input
 * @param {any} input - Input value
 * @param {object} options - Validation options
 * @returns {number|null} - Sanitized float or null if invalid
 */
function sanitizeFloat(input, options = {}) {
  const { min = null, max = null, decimals = null } = options;
  
  let num = parseFloat(input);
  
  if (isNaN(num)) {
    return null;
  }
  
  if (decimals !== null) {
    num = parseFloat(num.toFixed(decimals));
  }
  
  if (min !== null && num < min) {
    return null;
  }
  
  if (max !== null && num > max) {
    return null;
  }
  
  return num;
}

/**
 * Sanitize boolean input
 * @param {any} input - Input value
 * @returns {boolean} - Sanitized boolean
 */
function sanitizeBoolean(input) {
  if (typeof input === 'boolean') {
    return input;
  }
  
  if (typeof input === 'string') {
    const lower = input.toLowerCase().trim();
    return lower === 'true' || lower === '1' || lower === 'yes';
  }
  
  if (typeof input === 'number') {
    return input !== 0;
  }
  
  return false;
}

/**
 * Sanitize date input
 * @param {any} input - Input value
 * @returns {Date|null} - Sanitized date or null if invalid
 */
function sanitizeDate(input) {
  if (!input) {
    return null;
  }
  
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }
  
  if (typeof input === 'string' && validator.isISO8601(input)) {
    const date = new Date(input);
    return isNaN(date.getTime()) ? null : date;
  }
  
  return null;
}

/**
 * Sanitize alphanumeric string (letters, numbers, spaces, hyphens, underscores)
 * @param {string} input - Input string
 * @param {object} options - Validation options
 * @returns {string|null} - Sanitized string or null if invalid
 */
function sanitizeAlphanumeric(input, options = {}) {
  const { minLength = 1, maxLength = 255, allowSpaces = true } = options;
  
  if (!input || typeof input !== 'string') {
    return null;
  }
  
  const trimmed = input.trim();
  
  // Check length
  if (trimmed.length < minLength || trimmed.length > maxLength) {
    return null;
  }
  
  // Check pattern
  const pattern = allowSpaces 
    ? /^[a-zA-Z0-9\s\-_]+$/ 
    : /^[a-zA-Z0-9\-_]+$/;
  
  if (!pattern.test(trimmed)) {
    return null;
  }
  
  return trimmed;
}

/**
 * Sanitize enum value (must be in allowed list)
 * @param {any} input - Input value
 * @param {array} allowedValues - Array of allowed values
 * @returns {any|null} - Sanitized value or null if invalid
 */
function sanitizeEnum(input, allowedValues) {
  if (!Array.isArray(allowedValues) || allowedValues.length === 0) {
    throw new Error('allowedValues must be a non-empty array');
  }
  
  if (!allowedValues.includes(input)) {
    return null;
  }
  
  return input;
}

/**
 * Comprehensive input sanitization
 * Automatically detects type and applies appropriate sanitization
 * @param {any} input - Input value
 * @param {string} type - Expected type (text, html, email, phone, url, integer, float, boolean, date, alphanumeric, enum)
 * @param {object} options - Type-specific options
 * @returns {any} - Sanitized value
 */
function sanitizeInput(input, type = 'text', options = {}) {
  switch (type) {
    case 'html':
      return sanitizeHTML(input);
    
    case 'text':
      return sanitizeText(input);
    
    case 'email':
      return sanitizeEmail(input);
    
    case 'phone':
      return sanitizePhone(input);
    
    case 'url':
      return sanitizeURL(input);
    
    case 'integer':
      return sanitizeInteger(input, options);
    
    case 'float':
      return sanitizeFloat(input, options);
    
    case 'boolean':
      return sanitizeBoolean(input);
    
    case 'date':
      return sanitizeDate(input);
    
    case 'alphanumeric':
      return sanitizeAlphanumeric(input, options);
    
    case 'enum':
      if (!options.allowedValues) {
        throw new Error('allowedValues option is required for enum type');
      }
      return sanitizeEnum(input, options.allowedValues);
    
    default:
      return sanitizeText(input);
  }
}

/**
 * Sanitize an object with multiple fields
 * @param {object} data - Input data object
 * @param {object} schema - Sanitization schema
 * @returns {object} - Sanitized data object
 * 
 * Example schema:
 * {
 *   name: { type: 'text', required: true },
 *   email: { type: 'email', required: true },
 *   age: { type: 'integer', options: { min: 0, max: 150 } },
 *   bio: { type: 'html' }
 * }
 */
function sanitizeObject(data, schema) {
  if (!data || typeof data !== 'object') {
    throw new Error('Data must be an object');
  }
  
  if (!schema || typeof schema !== 'object') {
    throw new Error('Schema must be an object');
  }
  
  const sanitized = {};
  const errors = [];
  
  for (const [field, config] of Object.entries(schema)) {
    const { type = 'text', required = false, options = {} } = config;
    const value = data[field];
    
    // Check required fields
    if (required && (value === undefined || value === null || value === '')) {
      errors.push(`Field '${field}' is required`);
      continue;
    }
    
    // Skip optional empty fields
    if (!required && (value === undefined || value === null || value === '')) {
      continue;
    }
    
    // Sanitize the value
    const sanitizedValue = sanitizeInput(value, type, options);
    
    // Check if sanitization failed
    if (sanitizedValue === null && required) {
      errors.push(`Field '${field}' has invalid format`);
      continue;
    }
    
    if (sanitizedValue !== null) {
      sanitized[field] = sanitizedValue;
    }
  }
  
  if (errors.length > 0) {
    const error = new Error('Validation failed');
    error.validationErrors = errors;
    throw error;
  }
  
  return sanitized;
}

module.exports = {
  sanitizeInput,
  sanitizeObject,
  sanitizeHTML,
  sanitizeText,
  sanitizeEmail,
  sanitizePhone,
  sanitizeURL,
  sanitizeInteger,
  sanitizeFloat,
  sanitizeBoolean,
  sanitizeDate,
  sanitizeAlphanumeric,
  sanitizeEnum,
};
