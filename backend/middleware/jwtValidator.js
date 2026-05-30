/**
 * JWT Validator Middleware
 * 
 * Prevents JWT token issues by:
 * 1. Validating JWT_SECRET on server startup
 * 2. Providing clear error messages
 * 3. Auto-detecting token/secret mismatches
 */

const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET;

// Validate JWT_SECRET on module load (server startup)
function validateJWTSecret() {
  console.log('\n🔐 Validating JWT Configuration...');
  
  if (!JWT_SECRET) {
    console.error('❌ CRITICAL ERROR: JWT_SECRET is not set in .env file!');
    console.error('   Add this to backend/.env:');
    console.error('   JWT_SECRET="' + require('crypto').randomBytes(48).toString('base64').replace(/[^a-zA-Z0-9]/g, '') + '"');
    process.exit(1);
  }

  if (JWT_SECRET.length < 32) {
    console.error('❌ CRITICAL ERROR: JWT_SECRET is too short!');
    console.error('   Current length:', JWT_SECRET.length);
    console.error('   Minimum required: 32 characters');
    console.error('   Generate a new one:');
    console.error('   JWT_SECRET="' + require('crypto').randomBytes(48).toString('base64').replace(/[^a-zA-Z0-9]/g, '') + '"');
    process.exit(1);
  }

  // Check for common weak secrets
  const weakSecrets = ['secret', 'password', 'admin', '12345', 'test', 'development'];
  const lowerSecret = JWT_SECRET.toLowerCase();
  
  for (const weak of weakSecrets) {
    if (lowerSecret.includes(weak)) {
      console.warn('⚠️  WARNING: JWT_SECRET contains common word "' + weak + '"');
      console.warn('   Consider using a more secure random secret for production');
    }
  }

  console.log('✅ JWT_SECRET validated successfully');
  console.log('   Length:', JWT_SECRET.length, 'characters');
  console.log('   Preview:', JWT_SECRET.substring(0, 10) + '...' + JWT_SECRET.substring(JWT_SECRET.length - 10));
}

// Enhanced token verification with better error messages
function verifyTokenWithDetails(token) {
  try {
    // Verify with proper options to match generation settings
    const verifyOptions = {
      issuer: 'school-management-system',
      audience: 'school-app'
    };
    
    const decoded = jwt.verify(token, JWT_SECRET, verifyOptions);
    return { success: true, decoded, error: null };
  } catch (error) {
    let userMessage = 'Invalid token';
    let code = 'INVALID_TOKEN';

    if (error.name === 'TokenExpiredError') {
      userMessage = 'Your session has expired. Please login again.';
      code = 'TOKEN_EXPIRED';
    } else if (error.name === 'JsonWebTokenError') {
      if (error.message.includes('invalid signature')) {
        userMessage = 'Token signature mismatch. Please logout and login again.';
        code = 'SIGNATURE_MISMATCH';
        console.warn('⚠️  JWT Signature Mismatch Detected!');
        console.warn('   This usually means:');
        console.warn('   1. JWT_SECRET was changed after token was issued');
        console.warn('   2. Token was generated on different server');
        console.warn('   3. User needs to logout and login again');
      } else if (error.message.includes('jwt malformed')) {
        userMessage = 'Malformed token. Please login again.';
        code = 'MALFORMED_TOKEN';
      } else if (error.message.includes('jwt audience invalid') || error.message.includes('jwt issuer invalid')) {
        userMessage = 'Token was generated with different settings. Please logout and login again.';
        code = 'TOKEN_SETTINGS_MISMATCH';
        console.warn('⚠️  JWT Settings Mismatch Detected!');
        console.warn('   Token issuer/audience does not match current settings');
        console.warn('   User needs to logout and login again');
      }
    }

    return { 
      success: false, 
      decoded: null, 
      error: {
        name: error.name,
        message: error.message,
        userMessage,
        code
      }
    };
  }
}

// Generate token with consistent settings
function generateToken(payload, expiresIn = '24h') {
  if (!payload.id || !payload.username) {
    throw new Error('Token payload must include id and username');
  }

  return jwt.sign(
    payload,
    JWT_SECRET,
    { 
      expiresIn,
      issuer: 'school-management-system',
      audience: 'school-app'
    }
  );
}

// Validate on startup
validateJWTSecret();

module.exports = {
  JWT_SECRET,
  validateJWTSecret,
  verifyTokenWithDetails,
  generateToken
};
