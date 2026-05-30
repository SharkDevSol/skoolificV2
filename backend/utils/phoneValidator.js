/**
 * Phone Number Validation Utility
 * Validates phone numbers for Ethiopian and international formats
 */

/**
 * Validate Ethiopian phone number
 * Formats: +251912345678, 0912345678, 912345678
 * 
 * @param {string} phone - Phone number to validate
 * @returns {Object} - { valid: boolean, formatted: string, error: string }
 */
function validateEthiopianPhone(phone) {
  if (!phone) {
    return { valid: false, error: 'Phone number is required' };
  }

  // Remove spaces, dashes, and parentheses
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');

  // Ethiopian phone number patterns
  const patterns = [
    /^\+251[79]\d{8}$/,      // +251912345678 (international format)
    /^0[79]\d{8}$/,          // 0912345678 (local format with 0)
    /^[79]\d{8}$/            // 912345678 (local format without 0)
  ];

  // Check if matches any pattern
  const isValid = patterns.some(pattern => pattern.test(cleaned));

  if (!isValid) {
    return {
      valid: false,
      error: 'Invalid Ethiopian phone number. Format: +251912345678 or 0912345678'
    };
  }

  // Format to international format (+251...)
  let formatted = cleaned;
  if (formatted.startsWith('0')) {
    formatted = '+251' + formatted.substring(1);
  } else if (!formatted.startsWith('+')) {
    formatted = '+251' + formatted;
  }

  return {
    valid: true,
    formatted: formatted,
    error: null
  };
}

/**
 * Validate international phone number (basic validation)
 * Accepts any number starting with + and 10-15 digits
 * 
 * @param {string} phone - Phone number to validate
 * @returns {Object} - { valid: boolean, formatted: string, error: string }
 */
function validateInternationalPhone(phone) {
  if (!phone) {
    return { valid: false, error: 'Phone number is required' };
  }

  // Remove spaces, dashes, and parentheses
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');

  // International format: +[country code][number] (10-15 digits total)
  const pattern = /^\+\d{10,15}$/;

  if (!pattern.test(cleaned)) {
    return {
      valid: false,
      error: 'Invalid international phone number. Format: +[country code][number]'
    };
  }

  return {
    valid: true,
    formatted: cleaned,
    error: null
  };
}

/**
 * Validate phone number (tries Ethiopian first, then international)
 * 
 * @param {string} phone - Phone number to validate
 * @param {boolean} ethiopianOnly - If true, only accept Ethiopian numbers
 * @returns {Object} - { valid: boolean, formatted: string, error: string }
 */
function validatePhone(phone, ethiopianOnly = false) {
  // Try Ethiopian format first
  const ethiopianResult = validateEthiopianPhone(phone);
  if (ethiopianResult.valid) {
    return ethiopianResult;
  }

  // If Ethiopian only, return error
  if (ethiopianOnly) {
    return ethiopianResult;
  }

  // Try international format
  return validateInternationalPhone(phone);
}

/**
 * Format phone number for display
 * Converts +251912345678 to 0912 345 678
 * 
 * @param {string} phone - Phone number to format
 * @returns {string} - Formatted phone number
 */
function formatPhoneForDisplay(phone) {
  if (!phone) return '';

  // Remove spaces, dashes, and parentheses
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');

  // Ethiopian number
  if (cleaned.startsWith('+251')) {
    const local = '0' + cleaned.substring(4);
    return local.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
  }

  // Already in local format
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return cleaned.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
  }

  // Return as-is for other formats
  return phone;
}

/**
 * Check if phone number is Ethiopian
 * 
 * @param {string} phone - Phone number to check
 * @returns {boolean} - True if Ethiopian number
 */
function isEthiopianPhone(phone) {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  return cleaned.startsWith('+251') || 
         cleaned.startsWith('09') || 
         cleaned.startsWith('07') ||
         /^[79]\d{8}$/.test(cleaned);
}

/**
 * Normalize phone number to international format
 * 
 * @param {string} phone - Phone number to normalize
 * @returns {string} - Normalized phone number (+251...)
 */
function normalizePhone(phone) {
  const result = validatePhone(phone);
  return result.valid ? result.formatted : phone;
}

module.exports = {
  validatePhone,
  validateEthiopianPhone,
  validateInternationalPhone,
  formatPhoneForDisplay,
  isEthiopianPhone,
  normalizePhone
};
