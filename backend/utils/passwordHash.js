/**
 * Password Hashing Utility
 * 
 * Provides secure password hashing using bcrypt with 12 salt rounds.
 * 
 * Phase 8.6: Password Security
 */

const bcrypt = require('bcrypt');

const SALT_ROUNDS = 12;

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
async function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }
  
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} - True if password matches
 */
async function verifyPassword(password, hash) {
  if (!password || !hash) {
    return false;
  }
  
  return await bcrypt.compare(password, hash);
}

/**
 * Check password strength
 * @param {string} password - Password to check
 * @returns {object} - Strength analysis
 */
function checkPasswordStrength(password) {
  const result = {
    score: 0,
    feedback: [],
    isStrong: false,
  };
  
  if (!password) {
    result.feedback.push('Password is required');
    return result;
  }
  
  // Length check
  if (password.length < 8) {
    result.feedback.push('Password must be at least 8 characters');
  } else if (password.length >= 8 && password.length < 12) {
    result.score += 1;
    result.feedback.push('Consider using a longer password (12+ characters)');
  } else {
    result.score += 2;
  }
  
  // Uppercase check
  if (/[A-Z]/.test(password)) {
    result.score += 1;
  } else {
    result.feedback.push('Add uppercase letters');
  }
  
  // Lowercase check
  if (/[a-z]/.test(password)) {
    result.score += 1;
  } else {
    result.feedback.push('Add lowercase letters');
  }
  
  // Number check
  if (/\d/.test(password)) {
    result.score += 1;
  } else {
    result.feedback.push('Add numbers');
  }
  
  // Special character check
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    result.score += 1;
  } else {
    result.feedback.push('Add special characters (!@#$%^&*)');
  }
  
  // Common password check
  const commonPasswords = ['password', '12345678', 'qwerty', 'abc123', 'password123'];
  if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
    result.score = 0;
    result.feedback.push('Password is too common');
  }
  
  // Determine strength
  if (result.score >= 5) {
    result.isStrong = true;
    result.strength = 'Strong';
  } else if (result.score >= 3) {
    result.strength = 'Medium';
  } else {
    result.strength = 'Weak';
  }
  
  return result;
}

/**
 * Validate password meets minimum requirements
 * @param {string} password - Password to validate
 * @returns {object} - Validation result
 */
function validatePassword(password) {
  const errors = [];
  
  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
    return { valid: false, errors };
  }
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  hashPassword,
  verifyPassword,
  checkPasswordStrength,
  validatePassword,
};
