const pool = require('../config/db');

/**
 * Device User Buffer Service
 * Manages the staging area for unmapped device users
 */
class DeviceUserBufferService {
  /**
   * Add or update a device user in the buffer
   * @param {Object} deviceUser - User data from device
   * @returns {Promise<{success: boolean, bufferId: number}>}
   */
  async upsertDeviceUser(deviceUser) {
    try {
      const {
        id: deviceUserId,
        name,
        cardNumber,
        privilege,
        password,
        groupId,
        timezoneId
      } = deviceUser;

      // Check if user already exists in buffer
      const existing = await pool.query(
        'SELECT id FROM device_user_buffer WHERE device_user_id = $1',
        [deviceUserId]
      );

      if (existing.rows.length > 0) {
        // Update last_seen_at
        await pool.query(
          `UPDATE device_user_buffer 
           SET last_seen_at = NOW(), updated_at = NOW()
           WHERE device_user_id = $1`,
          [deviceUserId]
        );

        return {
          success: true,
          bufferId: existing.rows[0].id,
          action: 'updated'
        };
      } else {
        // Insert new user
        const result = await pool.query(
          `INSERT INTO device_user_buffer 
           (device_user_id, name, card_number, privilege, password, group_id, timezone_id, mapping_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'unmapped')
           RETURNING id`,
          [deviceUserId, name, cardNumber, privilege, password, groupId, timezoneId]
        );

        return {
          success: true,
          bufferId: result.rows[0].id,
          action: 'inserted'
        };
      }
    } catch (error) {
      console.error('Error upserting device user:', error);
      throw error;
    }
  }

  /**
   * Get all unmapped users from buffer
   * @param {Object} filters - Optional filters (status, dateRange)
   * @returns {Promise<Array<Object>>}
   */
  async getUnmappedUsers(filters = {}) {
    try {
      let query = `
        SELECT * FROM device_user_buffer 
        WHERE mapping_status = 'unmapped'
      `;

      const params = [];

      // Add date range filter if provided
      if (filters.startDate) {
        params.push(filters.startDate);
        query += ` AND discovered_at >= $${params.length}`;
      }

      if (filters.endDate) {
        params.push(filters.endDate);
        query += ` AND discovered_at <= $${params.length}`;
      }

      query += ' ORDER BY discovered_at DESC';

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error getting unmapped users:', error);
      throw error;
    }
  }

  /**
   * Mark a buffer user as mapped
   * @param {number} deviceUserId - Device user ID
   * @param {number} personId - Database person ID
   * @returns {Promise<{success: boolean}>}
   */
  async markAsMapped(deviceUserId, personId) {
    try {
      await pool.query(
        `UPDATE device_user_buffer 
         SET mapping_status = 'mapped', 
             mapped_to_person_id = $1, 
             mapped_at = NOW(),
             updated_at = NOW()
         WHERE device_user_id = $2`,
        [personId, deviceUserId]
      );

      return { success: true };
    } catch (error) {
      console.error('Error marking user as mapped:', error);
      throw error;
    }
  }

  /**
   * Get buffer statistics
   * @returns {Promise<{total: number, unmapped: number, mapped: number}>}
   */
  async getStatistics() {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE mapping_status = 'unmapped') as unmapped,
          COUNT(*) FILTER (WHERE mapping_status = 'mapped') as mapped
        FROM device_user_buffer
      `);

      return {
        total: parseInt(result.rows[0].total),
        unmapped: parseInt(result.rows[0].unmapped),
        mapped: parseInt(result.rows[0].mapped)
      };
    } catch (error) {
      console.error('Error getting buffer statistics:', error);
      throw error;
    }
  }

  /**
   * Clean up old mapped users from buffer
   * @param {number} daysOld - Remove records older than this many days (default: 90)
   * @returns {Promise<{success: boolean, deletedCount: number}>}
   */
  async cleanupOldRecords(daysOld = 90) {
    try {
      const result = await pool.query(`
        DELETE FROM device_user_buffer 
        WHERE mapping_status = 'mapped' 
          AND mapped_at < NOW() - INTERVAL '${daysOld} days'
        RETURNING id
      `);

      console.log(`🧹 Cleaned up ${result.rowCount} old buffer records`);
      return {
        success: true,
        deletedCount: result.rowCount
      };
    } catch (error) {
      console.error('Error cleaning up old records:', error);
      return {
        success: false,
        deletedCount: 0,
        error: error.message
      };
    }
  }
}

module.exports = new DeviceUserBufferService();
