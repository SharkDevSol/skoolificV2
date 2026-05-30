const pool = require('../config/db');

/**
 * DeviceUserMonitoringService - Monitors and tracks device user activities
 * Provides real-time monitoring, statistics, and health checks
 */
class DeviceUserMonitoringService {
  constructor() {
    this.monitoringInterval = null;
    this.monitoringStartTime = null;
    this.initializeMonitoringTable();
  }

  /**
   * Initialize the device_user_monitoring table
   */
  async initializeMonitoringTable() {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS device_user_monitoring (
          monitoring_id SERIAL PRIMARY KEY,
          device_user_id INTEGER NOT NULL,
          device_user_name VARCHAR(255),
          event_type VARCHAR(100) NOT NULL,
          event_data JSONB,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          source VARCHAR(100),
          severity VARCHAR(50) DEFAULT 'info'
        )
      `);

      // Create indexes for faster queries
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_device_user_monitoring_device_user_id 
        ON device_user_monitoring(device_user_id)
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_device_user_monitoring_timestamp 
        ON device_user_monitoring(timestamp DESC)
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_device_user_monitoring_event_type 
        ON device_user_monitoring(event_type)
      `);

      console.log('✅ DeviceUserMonitoringService: Monitoring table initialized');
    } catch (error) {
      console.error('❌ DeviceUserMonitoringService: Failed to initialize monitoring table:', error.message);
    }
  }

  /**
   * Log a monitoring event
   * @param {Object} event - The event to log
   * @returns {Promise<{success: boolean, monitoringId?: number, error?: string}>}
   */
  async logEvent(event) {
    try {
      const {
        deviceUserId,
        deviceUserName,
        eventType,
        eventData,
        source = 'system',
        severity = 'info'
      } = event;

      const result = await pool.query(`
        INSERT INTO device_user_monitoring 
        (device_user_id, device_user_name, event_type, event_data, source, severity)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING monitoring_id
      `, [
        deviceUserId,
        deviceUserName,
        eventType,
        JSON.stringify(eventData),
        source,
        severity
      ]);

      return {
        success: true,
        monitoringId: result.rows[0].monitoring_id
      };
    } catch (error) {
      console.error('Error logging monitoring event:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get recent events for a device user
   * @param {number} deviceUserId - The device user ID
   * @param {number} limit - Maximum number of events to retrieve
   * @returns {Promise<Array>}
   */
  async getRecentEvents(deviceUserId, limit = 50) {
    try {
      const result = await pool.query(`
        SELECT * FROM device_user_monitoring
        WHERE device_user_id = $1
        ORDER BY timestamp DESC
        LIMIT $2
      `, [deviceUserId, limit]);

      return result.rows;
    } catch (error) {
      console.error('Error getting recent events:', error);
      return [];
    }
  }

  /**
   * Get events by type
   * @param {string} eventType - The event type to filter by
   * @param {number} limit - Maximum number of events to retrieve
   * @returns {Promise<Array>}
   */
  async getEventsByType(eventType, limit = 100) {
    try {
      const result = await pool.query(`
        SELECT * FROM device_user_monitoring
        WHERE event_type = $1
        ORDER BY timestamp DESC
        LIMIT $2
      `, [eventType, limit]);

      return result.rows;
    } catch (error) {
      console.error('Error getting events by type:', error);
      return [];
    }
  }

  /**
   * Get events within a time range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {number} deviceUserId - Optional: filter by device user ID
   * @returns {Promise<Array>}
   */
  async getEventsByTimeRange(startDate, endDate, deviceUserId = null) {
    try {
      let query = `
        SELECT * FROM device_user_monitoring
        WHERE timestamp BETWEEN $1 AND $2
      `;
      const params = [startDate, endDate];

      if (deviceUserId) {
        query += ' AND device_user_id = $3';
        params.push(deviceUserId);
      }

      query += ' ORDER BY timestamp DESC';

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error getting events by time range:', error);
      return [];
    }
  }

  /**
   * Get monitoring statistics
   * @param {number} hoursBack - Number of hours to look back (default: 24)
   * @returns {Promise<Object>}
   */
  async getStatistics(hoursBack = 24) {
    try {
      const result = await pool.query(`
        SELECT 
          event_type,
          severity,
          COUNT(*) as count
        FROM device_user_monitoring
        WHERE timestamp > NOW() - INTERVAL '${hoursBack} hours'
        GROUP BY event_type, severity
        ORDER BY count DESC
      `);

      const stats = {
        totalEvents: 0,
        byEventType: {},
        bySeverity: {
          info: 0,
          warning: 0,
          error: 0,
          critical: 0
        }
      };

      result.rows.forEach(row => {
        const count = parseInt(row.count);
        stats.totalEvents += count;

        if (!stats.byEventType[row.event_type]) {
          stats.byEventType[row.event_type] = 0;
        }
        stats.byEventType[row.event_type] += count;

        if (stats.bySeverity[row.severity] !== undefined) {
          stats.bySeverity[row.severity] += count;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error getting monitoring statistics:', error);
      return {
        totalEvents: 0,
        byEventType: {},
        bySeverity: { info: 0, warning: 0, error: 0, critical: 0 }
      };
    }
  }

  /**
   * Get active device users (users with recent activity)
   * @param {number} minutesBack - Number of minutes to look back (default: 60)
   * @returns {Promise<Array>}
   */
  async getActiveDeviceUsers(minutesBack = 60) {
    try {
      const result = await pool.query(`
        SELECT DISTINCT 
          device_user_id,
          device_user_name,
          MAX(timestamp) as last_activity
        FROM device_user_monitoring
        WHERE timestamp > NOW() - INTERVAL '${minutesBack} minutes'
        GROUP BY device_user_id, device_user_name
        ORDER BY last_activity DESC
      `);

      return result.rows;
    } catch (error) {
      console.error('Error getting active device users:', error);
      return [];
    }
  }

  /**
   * Get health status of device user system
   * @returns {Promise<Object>}
   */
  async getHealthStatus() {
    try {
      const stats = await this.getStatistics(1); // Last hour
      const activeUsers = await this.getActiveDeviceUsers(60);

      const errorRate = stats.totalEvents > 0
        ? ((stats.bySeverity.error + stats.bySeverity.critical) / stats.totalEvents) * 100
        : 0;

      let status = 'healthy';
      if (errorRate > 20) {
        status = 'critical';
      } else if (errorRate > 10) {
        status = 'warning';
      } else if (errorRate > 5) {
        status = 'degraded';
      }

      return {
        status,
        errorRate: errorRate.toFixed(2),
        totalEvents: stats.totalEvents,
        activeUsers: activeUsers.length,
        lastHourStats: stats,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error getting health status:', error);
      return {
        status: 'unknown',
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Clear old monitoring records
   * @param {number} daysOld - Remove records older than this many days
   * @returns {Promise<{success: boolean, deletedCount?: number, error?: string}>}
   */
  async clearOldRecords(daysOld = 30) {
    try {
      const result = await pool.query(`
        DELETE FROM device_user_monitoring
        WHERE timestamp < NOW() - INTERVAL '${daysOld} days'
      `);

      console.log(`🧹 Cleared ${result.rowCount} old monitoring records`);
      return {
        success: true,
        deletedCount: result.rowCount
      };
    } catch (error) {
      console.error('Error clearing old records:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get device user activity summary
   * @param {number} deviceUserId - The device user ID
   * @param {number} daysBack - Number of days to look back (default: 7)
   * @returns {Promise<Object>}
   */
  async getDeviceUserActivitySummary(deviceUserId, daysBack = 7) {
    try {
      const result = await pool.query(`
        SELECT 
          DATE(timestamp) as date,
          event_type,
          COUNT(*) as count
        FROM device_user_monitoring
        WHERE device_user_id = $1
          AND timestamp > NOW() - INTERVAL '${daysBack} days'
        GROUP BY DATE(timestamp), event_type
        ORDER BY date DESC, count DESC
      `, [deviceUserId]);

      const summary = {
        deviceUserId,
        daysBack,
        dailyActivity: {}
      };

      result.rows.forEach(row => {
        const dateStr = row.date.toISOString().split('T')[0];
        if (!summary.dailyActivity[dateStr]) {
          summary.dailyActivity[dateStr] = {};
        }
        summary.dailyActivity[dateStr][row.event_type] = parseInt(row.count);
      });

      return summary;
    } catch (error) {
      console.error('Error getting device user activity summary:', error);
      return {
        deviceUserId,
        daysBack,
        dailyActivity: {},
        error: error.message
      };
    }
  }

  /**
   * Get alerts (critical and error events)
   * @param {number} limit - Maximum number of alerts to retrieve
   * @returns {Promise<Array>}
   */
  async getAlerts(limit = 50) {
    try {
      const result = await pool.query(`
        SELECT * FROM device_user_monitoring
        WHERE severity IN ('error', 'critical')
        ORDER BY timestamp DESC
        LIMIT $1
      `, [limit]);

      return result.rows;
    } catch (error) {
      console.error('Error getting alerts:', error);
      return [];
    }
  }

  /**
   * Start monitoring service
   * @param {number} intervalMinutes - Monitoring interval in minutes (default: 5)
   */
  startMonitoring(intervalMinutes = 5) {
    if (this.monitoringInterval) {
      console.log('⚠️  Monitoring service is already running');
      return;
    }

    console.log(`🚀 Starting Device User Monitoring Service (every ${intervalMinutes} minutes)`);

    // Run initial health check
    this.performHealthCheck();

    // Schedule periodic health checks
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop monitoring service
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('🛑 Monitoring service stopped');
    }
  }

  /**
   * Perform health check
   */
  async performHealthCheck() {
    try {
      // First, try to run automatic migration
      await this.runAutomaticMigration();
      
      const health = await this.getHealthStatus();
      
      // Log health status
      await this.logEvent({
        deviceUserId: 0,
        deviceUserName: 'system',
        eventType: 'health_check',
        eventData: health,
        source: 'monitoring_service',
        severity: health.status === 'healthy' ? 'info' : 
                  health.status === 'degraded' ? 'warning' : 'error'
      });

      // Log to console
      const statusEmoji = {
        healthy: '✅',
        degraded: '⚠️',
        warning: '⚠️',
        critical: '❌',
        unknown: '❓'
      };

      console.log(`${statusEmoji[health.status] || '❓'} Health Check: ${health.status.toUpperCase()} - Error Rate: ${health.errorRate}% - Active Users: ${health.activeUsers}`);

      // Auto cleanup old records if needed
      if (Math.random() < 0.1) { // 10% chance on each check
        await this.clearOldRecords(30);
      }
    } catch (error) {
      console.error('Error performing health check:', error);
    }
  }

  /**
   * Run automatic migration - discovers and buffers unmapped users
   * This runs automatically every time monitoring checks the device
   */
  async runAutomaticMigration() {
    try {
      const axios = require('axios');
      const deviceUserBufferService = require('./DeviceUserBufferService');
      
      const deviceIP = process.env.AI06_DEVICE_IP || '192.168.1.2';
      const devicePort = process.env.AI06_DEVICE_PORT || 80;
      
      // Try to get users from device
      const deviceResponse = await axios.post(
        `http://${deviceIP}:${devicePort}/cgi-bin/js/app/module/userManager.js`,
        { command: 'getUserList', token: '' },
        { timeout: 5000 }
      );

      if (deviceResponse.data && deviceResponse.data.result === 'success') {
        const deviceUsers = deviceResponse.data.users || [];
        
        let bufferedCount = 0;
        for (const user of deviceUsers) {
          // Check if user has a mapping
          const mappingResult = await pool.query(
            'SELECT person_id FROM user_machine_mapping WHERE machine_user_id = $1',
            [user.id]
          );

          if (mappingResult.rows.length === 0) {
            // User is unmapped - add to buffer
            const result = await deviceUserBufferService.upsertDeviceUser(user);
            if (result.action === 'inserted') {
              bufferedCount++;
            }
          }
        }
        
        if (bufferedCount > 0) {
          console.log(`   🔄 Auto-migration: Buffered ${bufferedCount} new unmapped users`);
        }
      }
    } catch (error) {
      // Silently fail - device might not be reachable
      // This is normal and expected when device is offline
    }
  }

  /**
   * Get monitoring service status
   */
  getMonitoringStatus() {
    return {
      isRunning: !!this.monitoringInterval,
      startedAt: this.monitoringStartTime || null
    };
  }

  /**
   * Get current device user count
   * Also runs automatic migration
   * @returns {Promise<{count: number, timestamp: Date}>}
   */
  async getCurrentUserCount() {
    try {
      // Run automatic migration first
      await this.runAutomaticMigration();
      
      const axios = require('axios');
      const deviceIP = process.env.AI06_DEVICE_IP || '192.168.1.2';
      const devicePort = process.env.AI06_DEVICE_PORT || 80;
      
      const deviceResponse = await axios.post(
        `http://${deviceIP}:${devicePort}/cgi-bin/js/app/module/userManager.js`,
        { command: 'getUserList', token: '' },
        { timeout: 5000 }
      );

      if (deviceResponse.data && deviceResponse.data.result === 'success') {
        const users = deviceResponse.data.users || [];
        return {
          count: users.length,
          timestamp: new Date()
        };
      }

      return { count: 0, timestamp: new Date(), error: 'Failed to get user list' };
    } catch (error) {
      return { count: 0, timestamp: new Date(), error: error.message };
    }
  }

  /**
   * Get user count history
   * @param {number} hours - Hours of history to retrieve
   * @returns {Promise<Array<Object>>}
   */
  async getUserCountHistory(hours = 24) {
    try {
      const result = await pool.query(`
        SELECT user_count, user_ids, timestamp
        FROM device_user_count_history
        WHERE timestamp > NOW() - INTERVAL '${hours} hours'
        ORDER BY timestamp DESC
      `);

      return result.rows;
    } catch (error) {
      console.error('Error getting user count history:', error);
      return [];
    }
  }

  /**
   * Check for missing users
   * @returns {Promise<{missing: Array<number>, count: number}>}
   */
  async checkForMissingUsers() {
    try {
      // Get current users from device
      const currentCount = await this.getCurrentUserCount();
      
      // Get last recorded count
      const lastRecord = await pool.query(`
        SELECT user_count, user_ids
        FROM device_user_count_history
        ORDER BY timestamp DESC
        LIMIT 1
      `);

      if (lastRecord.rows.length === 0) {
        return { missing: [], count: 0 };
      }

      const lastUserIds = lastRecord.rows[0].user_ids || [];
      
      // Get current user IDs
      const axios = require('axios');
      const deviceIP = process.env.AI06_DEVICE_IP || '192.168.1.2';
      const devicePort = process.env.AI06_DEVICE_PORT || 80;
      
      const deviceResponse = await axios.post(
        `http://${deviceIP}:${devicePort}/cgi-bin/js/app/module/userManager.js`,
        { command: 'getUserList', token: '' },
        { timeout: 5000 }
      );

      if (deviceResponse.data && deviceResponse.data.result === 'success') {
        const currentUsers = deviceResponse.data.users || [];
        const currentUserIds = currentUsers.map(u => u.id);
        
        // Find missing users
        const missing = lastUserIds.filter(id => !currentUserIds.includes(id));
        
        return { missing, count: missing.length };
      }

      return { missing: [], count: 0 };
    } catch (error) {
      console.error('Error checking for missing users:', error);
      return { missing: [], count: 0, error: error.message };
    }
  }
}

module.exports = new DeviceUserMonitoringService();
