const pool = require('../config/db');

/**
 * Device User Audit Service
 * Comprehensive logging of all user-related operations
 */
class DeviceUserAuditService {
  /**
   * Log a user operation
   * @param {Object} operation - Operation details
   * @param {string} operation.operationType - Type of operation (user_discovered, user_buffered, user_deleted, etc.)
   * @param {number} operation.deviceUserId - Device user ID
   * @param {string} operation.deviceUserName - User name
   * @param {string} operation.performedBy - User/service that performed operation
   * @param {string} operation.serviceName - Sync service name
   * @param {Object} operation.details - Additional details
   * @returns {Promise<{logId: number}>}
   */
  async logOperation(operation) {
    try {
      const {
        operationType,
        deviceUserId,
        deviceUserName,
        performedBy,
        serviceName,
        details
      } = operation;

      const result = await pool.query(
        `INSERT INTO device_user_audit_log 
         (operation_type, device_user_id, device_user_name, performed_by, service_name, details)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [operationType, deviceUserId, deviceUserName, performedBy, serviceName, JSON.stringify(details)]
      );

      return { logId: result.rows[0].id };
    } catch (error) {
      console.error('Failed to log operation:', error);
      throw error;
    }
  }

  /**
   * Query audit logs
   * @param {Object} filters - Query filters
   * @param {string} filters.operationType - Filter by operation type
   * @param {number} filters.deviceUserId - Filter by device user ID
   * @param {Date} filters.startDate - Filter by start date
   * @param {Date} filters.endDate - Filter by end date
   * @param {number} filters.limit - Limit results (default: 100)
   * @returns {Promise<Array<Object>>}
   */
  async queryLogs(filters = {}) {
    try {
      const { operationType, deviceUserId, startDate, endDate, limit = 100 } = filters;
      
      let query = 'SELECT * FROM device_user_audit_log WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (operationType) {
        query += ` AND operation_type = $${paramIndex}`;
        params.push(operationType);
        paramIndex++;
      }

      if (deviceUserId) {
        query += ` AND device_user_id = $${paramIndex}`;
        params.push(deviceUserId);
        paramIndex++;
      }

      if (startDate) {
        query += ` AND timestamp >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        query += ` AND timestamp <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      query += ` ORDER BY timestamp DESC LIMIT $${paramIndex}`;
      params.push(limit);

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Failed to query logs:', error);
      throw error;
    }
  }

  /**
   * Get logs for a specific user
   * @param {number} deviceUserId - Device user ID
   * @returns {Promise<Array<Object>>}
   */
  async getUserLogs(deviceUserId) {
    try {
      const result = await pool.query(
        `SELECT * FROM device_user_audit_log 
         WHERE device_user_id = $1 
         ORDER BY timestamp DESC 
         LIMIT 100`,
        [deviceUserId]
      );

      return result.rows;
    } catch (error) {
      console.error('Failed to get user logs:', error);
      throw error;
    }
  }
}

module.exports = new DeviceUserAuditService();
