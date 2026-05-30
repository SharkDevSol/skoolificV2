const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Audit Action Types
 */
const AUDIT_ACTIONS = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  VIEW: 'VIEW',
  EXPORT: 'EXPORT',
};

/**
 * Create an audit log entry
 * @param {Object} params - Audit log parameters
 * @param {string} params.entityType - Type of entity (Invoice, Payment, etc.)
 * @param {string} params.entityId - ID of the entity
 * @param {string} params.action - Action performed (CREATE, UPDATE, DELETE, etc.)
 * @param {string} params.userId - ID of user performing action
 * @param {Object} params.oldValue - Previous value (for updates)
 * @param {Object} params.newValue - New value
 * @param {string} params.ipAddress - IP address of request
 * @param {string} params.userAgent - User agent string
 * @returns {Promise<Object>} - Created audit log entry
 */
async function createAuditLog({
  entityType,
  entityId,
  action,
  userId,
  oldValue = null,
  newValue = null,
  ipAddress = null,
  userAgent = null,
}) {
  try {
    const auditLog = await prisma.auditLog.create({
      data: {
        entityType,
        entityId,
        action,
        userId,
        oldValue: oldValue ? JSON.parse(JSON.stringify(oldValue)) : null,
        newValue: newValue ? JSON.parse(JSON.stringify(newValue)) : null,
        ipAddress,
        userAgent,
      },
    });

    return auditLog;
  } catch (error) {
    // Log error but don't fail the main operation
    console.error('Failed to create audit log:', error);
    return null;
  }
}

/**
 * Middleware to log access attempts
 * Logs both successful and denied access attempts
 */
function logAccessAttempt(entityType, action) {
  return async (req, res, next) => {
    const originalSend = res.send;
    const startTime = Date.now();

    // Capture response
    res.send = function (data) {
      res.send = originalSend;

      // Log access attempt after response is sent
      setImmediate(async () => {
        try {
          const statusCode = res.statusCode;
          const success = statusCode >= 200 && statusCode < 300;
          const denied = statusCode === 403 || statusCode === 401;

          // Only log if user is authenticated or if it's a denial
          if (req.user || denied) {
            await createAuditLog({
              entityType: entityType || 'SYSTEM',
              entityId: req.params.id || 'N/A',
              action: action || req.method,
              userId: req.user?.id || 'ANONYMOUS',
              oldValue: null,
              newValue: {
                endpoint: req.originalUrl,
                method: req.method,
                statusCode,
                success,
                denied,
                duration: Date.now() - startTime,
              },
              ipAddress: req.ip || req.connection.remoteAddress,
              userAgent: req.get('user-agent'),
            });
          }
        } catch (error) {
          console.error('Error logging access attempt:', error);
        }
      });

      return originalSend.call(this, data);
    };

    next();
  };
}

/**
 * Middleware to log entity modifications
 * Should be called after the modification is complete
 */
function logEntityModification(entityType, action) {
  return async (req, res, next) => {
    // Store original data for comparison
    req.auditContext = {
      entityType,
      action,
      oldValue: null,
      newValue: null,
    };

    // Attach helper function to log the modification
    req.logAudit = async (entityId, oldValue = null, newValue = null) => {
      if (!req.user) {
        return;
      }

      await createAuditLog({
        entityType,
        entityId,
        action,
        userId: req.user.id,
        oldValue,
        newValue,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
      });
    };

    next();
  };
}

/**
 * Helper function to get entity before modification
 * @param {string} model - Prisma model name
 * @param {string} id - Entity ID
 * @returns {Promise<Object>} - Entity data
 */
async function getEntityBeforeModification(model, id) {
  try {
    const entity = await prisma[model].findUnique({
      where: { id },
    });
    return entity;
  } catch (error) {
    console.error(`Error fetching entity before modification:`, error);
    return null;
  }
}

/**
 * Audit trail query helpers
 */
async function getAuditTrail(entityType, entityId, options = {}) {
  const { limit = 100, offset = 0, startDate, endDate } = options;

  const where = {
    entityType,
    entityId,
  };

  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) where.timestamp.gte = new Date(startDate);
    if (endDate) where.timestamp.lte = new Date(endDate);
  }

  const auditLogs = await prisma.auditLog.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: limit,
    skip: offset,
  });

  return auditLogs;
}

async function getUserAuditTrail(userId, options = {}) {
  const { limit = 100, offset = 0, startDate, endDate, action } = options;

  const where = {
    userId,
  };

  if (action) {
    where.action = action;
  }

  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) where.timestamp.gte = new Date(startDate);
    if (endDate) where.timestamp.lte = new Date(endDate);
  }

  const auditLogs = await prisma.auditLog.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: limit,
    skip: offset,
  });

  return auditLogs;
}

module.exports = {
  AUDIT_ACTIONS,
  createAuditLog,
  logAccessAttempt,
  logEntityModification,
  getEntityBeforeModification,
  getAuditTrail,
  getUserAuditTrail,
};
