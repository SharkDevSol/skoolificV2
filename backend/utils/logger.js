/**
 * Security Logging Utility
 * 
 * Provides comprehensive logging for security events using Winston.
 * 
 * Phase 8.8: Security Audit and Logging
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Create Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'skoolific-backend' },
  transports: [
    // Error logs
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '30d',
    }),
    
    // Combined logs
    new DailyRotateFile({
      filename: path.join(logsDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
    }),
    
    // Security logs
    new DailyRotateFile({
      filename: path.join(logsDir, 'security-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'warn',
      maxSize: '20m',
      maxFiles: '90d', // Keep security logs longer
    }),
  ],
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
  }));
}

/**
 * Log authentication attempt
 */
function logAuthAttempt(username, success, ip, userAgent, reason = null) {
  const logData = {
    event: 'auth_attempt',
    username,
    success,
    ip,
    userAgent,
    timestamp: new Date().toISOString(),
  };
  
  if (reason) {
    logData.reason = reason;
  }
  
  if (success) {
    logger.info('Authentication successful', logData);
  } else {
    logger.warn('Authentication failed', logData);
  }
}

/**
 * Log permission change
 */
function logPermissionChange(adminUser, targetUser, oldPermissions, newPermissions, ip) {
  logger.warn('Permission change', {
    event: 'permission_change',
    adminUser,
    targetUser,
    oldPermissions,
    newPermissions,
    ip,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Log data access
 */
function logDataAccess(user, resource, action, ip, success = true) {
  logger.info('Data access', {
    event: 'data_access',
    user,
    resource,
    action,
    success,
    ip,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Log security event
 */
function logSecurityEvent(event, details, severity = 'warn') {
  logger.log(severity, `Security event: ${event}`, {
    event: 'security',
    type: event,
    ...details,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Log error with context
 */
function logError(error, context = {}) {
  logger.error('Application error', {
    event: 'error',
    message: error.message,
    stack: error.stack,
    ...context,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Log suspicious activity
 */
function logSuspiciousActivity(type, details, ip, userAgent) {
  logger.warn('Suspicious activity detected', {
    event: 'suspicious_activity',
    type,
    details,
    ip,
    userAgent,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Log password change
 */
function logPasswordChange(username, ip, success = true) {
  logger.warn('Password change', {
    event: 'password_change',
    username,
    success,
    ip,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Log account lockout
 */
function logAccountLockout(username, ip, reason) {
  logger.warn('Account lockout', {
    event: 'account_lockout',
    username,
    ip,
    reason,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Log CSRF token validation failure
 */
function logCsrfFailure(ip, userAgent, path) {
  logger.warn('CSRF validation failed', {
    event: 'csrf_failure',
    ip,
    userAgent,
    path,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Log rate limit exceeded
 */
function logRateLimitExceeded(ip, endpoint, limit) {
  logger.warn('Rate limit exceeded', {
    event: 'rate_limit_exceeded',
    ip,
    endpoint,
    limit,
    timestamp: new Date().toISOString(),
  });
}

module.exports = {
  logger,
  logAuthAttempt,
  logPermissionChange,
  logDataAccess,
  logSecurityEvent,
  logError,
  logSuspiciousActivity,
  logPasswordChange,
  logAccountLockout,
  logCsrfFailure,
  logRateLimitExceeded,
};
