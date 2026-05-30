/**
 * UserActivityMonitoringService - Comprehensive user activity monitoring
 * 
 * Tracks and monitors all user activities across the Skoolific V2 system including:
 * - Login/logout events
 * - Page views and navigation
 * - Data modifications (CRUD operations)
 * - API endpoint usage
 * - Session duration
 * - User engagement metrics
 * 
 * Phase 10.8.7: Monitor user activity
 */

const pool = require('../config/db');
const { logger } = require('../utils/logger');

class UserActivityMonitoringService {
  constructor() {
    this.initializeActivityTable();
    this.initializeSessionTable();
    this.initializeMetricsTable();
  }

  /**
   * Initialize user_activity table
   */
  async initializeActivityTable() {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_activity (
          activity_id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          username VARCHAR(255),
          user_type VARCHAR(50) NOT NULL,
          branch_code VARCHAR(10),
          activity_type VARCHAR(100) NOT NULL,
          activity_category VARCHAR(50),
          resource VARCHAR(255),
          action VARCHAR(50),
          details JSONB,
          ip_address VARCHAR(45),
          user_agent TEXT,
          session_id VARCHAR(255),
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          duration_ms INTEGER,
          status VARCHAR(20) DEFAULT 'success'
        )
      `);

      // Create indexes for faster queries
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_user_activity_user_id 
        ON user_activity(user_id)
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_user_activity_timestamp 
        ON user_activity(timestamp DESC)
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_user_activity_type 
        ON user_activity(activity_type)
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_user_activity_branch 
        ON user_activity(branch_code)
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_user_activity_session 
        ON user_activity(session_id)
      `);

      logger.info('UserActivityMonitoringService: Activity table initialized');
    } catch (error) {
      logger.error('Failed to initialize user activity table:', { error: error.message });
    }
  }

  /**
   * Initialize user_sessions table
   */
  async initializeSessionTable() {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_sessions (
          session_id VARCHAR(255) PRIMARY KEY,
          user_id INTEGER NOT NULL,
          username VARCHAR(255),
          user_type VARCHAR(50) NOT NULL,
          branch_code VARCHAR(10),
          login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          logout_time TIMESTAMP,
          session_duration_minutes INTEGER,
          ip_address VARCHAR(45),
          user_agent TEXT,
          device_type VARCHAR(50),
          is_active BOOLEAN DEFAULT true
        )
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id 
        ON user_sessions(user_id)
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_user_sessions_active 
        ON user_sessions(is_active)
      `);

      logger.info('UserActivityMonitoringService: Sessions table initialized');
    } catch (error) {
      logger.error('Failed to initialize user sessions table:', { error: error.message });
    }
  }

  /**
   * Initialize user_activity_metrics table for aggregated statistics
   */
  async initializeMetricsTable() {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_activity_metrics (
          metric_id SERIAL PRIMARY KEY,
          date DATE NOT NULL,
          branch_code VARCHAR(10),
          user_type VARCHAR(50),
          total_users INTEGER DEFAULT 0,
          total_sessions INTEGER DEFAULT 0,
          total_activities INTEGER DEFAULT 0,
          avg_session_duration_minutes DECIMAL(10,2),
          most_active_hour INTEGER,
          most_used_feature VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(date, branch_code, user_type)
        )
      `);

      logger.info('UserActivityMonitoringService: Metrics table initialized');
    } catch (error) {
      logger.error('Failed to initialize user activity metrics table:', { error: error.message });
    }
  }

  /**
   * Log user activity
   * @param {Object} activity - Activity details
   * @returns {Promise<{success: boolean, activityId?: number, error?: string}>}
   */
  async logActivity(activity) {
    try {
      const {
        userId,
        username,
        userType,
        branchCode,
        activityType,
        activityCategory = null,
        resource = null,
        action = null,
        details = {},
        ipAddress = null,
        userAgent = null,
        sessionId = null,
        durationMs = null,
        status = 'success'
      } = activity;

      const result = await pool.query(`
        INSERT INTO user_activity 
        (user_id, username, user_type, branch_code, activity_type, activity_category, 
         resource, action, details, ip_address, user_agent, session_id, duration_ms, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING activity_id
      `, [
        userId,
        username,
        userType,
        branchCode,
        activityType,
        activityCategory,
        resource,
        action,
        JSON.stringify(details),
        ipAddress,
        userAgent,
        sessionId,
        durationMs,
        status
      ]);

      // Update session last activity
      if (sessionId) {
        await this.updateSessionActivity(sessionId);
      }

      return {
        success: true,
        activityId: result.rows[0].activity_id
      };
    } catch (error) {
      logger.error('Error logging user activity:', { error: error.message, activity });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create new user session
   * @param {Object} session - Session details
   * @returns {Promise<{success: boolean, sessionId?: string, error?: string}>}
   */
  async createSession(session) {
    try {
      const {
        sessionId,
        userId,
        username,
        userType,
        branchCode,
        ipAddress,
        userAgent,
        deviceType = 'unknown'
      } = session;

      await pool.query(`
        INSERT INTO user_sessions 
        (session_id, user_id, username, user_type, branch_code, ip_address, user_agent, device_type)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (session_id) 
        DO UPDATE SET 
          last_activity = CURRENT_TIMESTAMP,
          is_active = true
      `, [
        sessionId,
        userId,
        username,
        userType,
        branchCode,
        ipAddress,
        userAgent,
        deviceType
      ]);

      // Log login activity
      await this.logActivity({
        userId,
        username,
        userType,
        branchCode,
        activityType: 'login',
        activityCategory: 'authentication',
        ipAddress,
        userAgent,
        sessionId,
        status: 'success'
      });

      return {
        success: true,
        sessionId
      };
    } catch (error) {
      logger.error('Error creating user session:', { error: error.message, session });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * End user session
   * @param {string} sessionId - Session ID
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async endSession(sessionId) {
    try {
      const result = await pool.query(`
        UPDATE user_sessions
        SET 
          logout_time = CURRENT_TIMESTAMP,
          session_duration_minutes = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - login_time)) / 60,
          is_active = false
        WHERE session_id = $1
        RETURNING user_id, username, user_type, branch_code
      `, [sessionId]);

      if (result.rows.length > 0) {
        const session = result.rows[0];
        
        // Log logout activity
        await this.logActivity({
          userId: session.user_id,
          username: session.username,
          userType: session.user_type,
          branchCode: session.branch_code,
          activityType: 'logout',
          activityCategory: 'authentication',
          sessionId,
          status: 'success'
        });
      }

      return { success: true };
    } catch (error) {
      logger.error('Error ending user session:', { error: error.message, sessionId });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update session last activity timestamp
   * @param {string} sessionId - Session ID
   */
  async updateSessionActivity(sessionId) {
    try {
      await pool.query(`
        UPDATE user_sessions
        SET last_activity = CURRENT_TIMESTAMP
        WHERE session_id = $1 AND is_active = true
      `, [sessionId]);
    } catch (error) {
      // Silent fail - not critical
    }
  }

  /**
   * Get user activity history
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getUserActivity(userId, options = {}) {
    try {
      const {
        limit = 100,
        offset = 0,
        startDate = null,
        endDate = null,
        activityType = null,
        activityCategory = null
      } = options;

      let query = `
        SELECT * FROM user_activity
        WHERE user_id = $1
      `;
      const params = [userId];
      let paramIndex = 2;

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

      if (activityType) {
        query += ` AND activity_type = $${paramIndex}`;
        params.push(activityType);
        paramIndex++;
      }

      if (activityCategory) {
        query += ` AND activity_category = $${paramIndex}`;
        params.push(activityCategory);
        paramIndex++;
      }

      query += ` ORDER BY timestamp DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting user activity:', { error: error.message, userId });
      return [];
    }
  }

  /**
   * Get active users
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getActiveUsers(options = {}) {
    try {
      const {
        branchCode = null,
        userType = null,
        minutesBack = 30
      } = options;

      let query = `
        SELECT DISTINCT 
          s.user_id,
          s.username,
          s.user_type,
          s.branch_code,
          s.login_time,
          s.last_activity,
          s.device_type,
          COUNT(a.activity_id) as activity_count
        FROM user_sessions s
        LEFT JOIN user_activity a ON s.session_id = a.session_id 
          AND a.timestamp > NOW() - INTERVAL '${minutesBack} minutes'
        WHERE s.is_active = true
          AND s.last_activity > NOW() - INTERVAL '${minutesBack} minutes'
      `;
      const params = [];
      let paramIndex = 1;

      if (branchCode) {
        query += ` AND s.branch_code = $${paramIndex}`;
        params.push(branchCode);
        paramIndex++;
      }

      if (userType) {
        query += ` AND s.user_type = $${paramIndex}`;
        params.push(userType);
        paramIndex++;
      }

      query += `
        GROUP BY s.user_id, s.username, s.user_type, s.branch_code, 
                 s.login_time, s.last_activity, s.device_type
        ORDER BY s.last_activity DESC
      `;

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting active users:', { error: error.message });
      return [];
    }
  }

  /**
   * Get activity statistics
   * @param {Object} options - Query options
   * @returns {Promise<Object>}
   */
  async getActivityStatistics(options = {}) {
    try {
      const {
        branchCode = null,
        userType = null,
        startDate = null,
        endDate = null,
        hoursBack = 24
      } = options;

      let dateFilter = '';
      const params = [];
      let paramIndex = 1;

      if (startDate && endDate) {
        dateFilter = `WHERE timestamp BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
        params.push(startDate, endDate);
        paramIndex += 2;
      } else {
        dateFilter = `WHERE timestamp > NOW() - INTERVAL '${hoursBack} hours'`;
      }

      if (branchCode) {
        dateFilter += ` AND branch_code = $${paramIndex}`;
        params.push(branchCode);
        paramIndex++;
      }

      if (userType) {
        dateFilter += ` AND user_type = $${paramIndex}`;
        params.push(userType);
        paramIndex++;
      }

      // Get overall statistics
      const statsResult = await pool.query(`
        SELECT 
          COUNT(*) as total_activities,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT session_id) as total_sessions,
          AVG(duration_ms) as avg_duration_ms
        FROM user_activity
        ${dateFilter}
      `, params);

      // Get activity breakdown by type
      const typeResult = await pool.query(`
        SELECT 
          activity_type,
          COUNT(*) as count
        FROM user_activity
        ${dateFilter}
        GROUP BY activity_type
        ORDER BY count DESC
      `, params);

      // Get activity breakdown by category
      const categoryResult = await pool.query(`
        SELECT 
          activity_category,
          COUNT(*) as count
        FROM user_activity
        ${dateFilter}
        GROUP BY activity_category
        ORDER BY count DESC
      `, params);

      // Get hourly distribution
      const hourlyResult = await pool.query(`
        SELECT 
          EXTRACT(HOUR FROM timestamp) as hour,
          COUNT(*) as count
        FROM user_activity
        ${dateFilter}
        GROUP BY hour
        ORDER BY hour
      `, params);

      // Get most active users
      const topUsersResult = await pool.query(`
        SELECT 
          user_id,
          username,
          user_type,
          COUNT(*) as activity_count
        FROM user_activity
        ${dateFilter}
        GROUP BY user_id, username, user_type
        ORDER BY activity_count DESC
        LIMIT 10
      `, params);

      return {
        overall: statsResult.rows[0],
        byType: typeResult.rows,
        byCategory: categoryResult.rows,
        hourlyDistribution: hourlyResult.rows,
        topUsers: topUsersResult.rows,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error getting activity statistics:', { error: error.message });
      return {
        overall: {},
        byType: [],
        byCategory: [],
        hourlyDistribution: [],
        topUsers: [],
        error: error.message
      };
    }
  }

  /**
   * Get session statistics
   * @param {Object} options - Query options
   * @returns {Promise<Object>}
   */
  async getSessionStatistics(options = {}) {
    try {
      const {
        branchCode = null,
        userType = null,
        daysBack = 7
      } = options;

      let whereClause = `WHERE login_time > NOW() - INTERVAL '${daysBack} days'`;
      const params = [];
      let paramIndex = 1;

      if (branchCode) {
        whereClause += ` AND branch_code = $${paramIndex}`;
        params.push(branchCode);
        paramIndex++;
      }

      if (userType) {
        whereClause += ` AND user_type = $${paramIndex}`;
        params.push(userType);
        paramIndex++;
      }

      const result = await pool.query(`
        SELECT 
          COUNT(*) as total_sessions,
          COUNT(DISTINCT user_id) as unique_users,
          AVG(session_duration_minutes) as avg_session_duration,
          MAX(session_duration_minutes) as max_session_duration,
          MIN(session_duration_minutes) as min_session_duration,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_sessions,
          COUNT(CASE WHEN is_active = false THEN 1 END) as ended_sessions
        FROM user_sessions
        ${whereClause}
      `, params);

      // Get daily session counts
      const dailyResult = await pool.query(`
        SELECT 
          DATE(login_time) as date,
          COUNT(*) as session_count,
          COUNT(DISTINCT user_id) as unique_users
        FROM user_sessions
        ${whereClause}
        GROUP BY DATE(login_time)
        ORDER BY date DESC
      `, params);

      return {
        overall: result.rows[0],
        daily: dailyResult.rows,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error getting session statistics:', { error: error.message });
      return {
        overall: {},
        daily: [],
        error: error.message
      };
    }
  }

  /**
   * Generate daily metrics
   * @param {Date} date - Date to generate metrics for
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async generateDailyMetrics(date = new Date()) {
    try {
      const dateStr = date.toISOString().split('T')[0];

      // Get metrics by branch and user type
      const result = await pool.query(`
        SELECT 
          a.branch_code,
          a.user_type,
          COUNT(DISTINCT a.user_id) as total_users,
          COUNT(DISTINCT a.session_id) as total_sessions,
          COUNT(*) as total_activities,
          AVG(s.session_duration_minutes) as avg_session_duration,
          MODE() WITHIN GROUP (ORDER BY EXTRACT(HOUR FROM a.timestamp)) as most_active_hour,
          MODE() WITHIN GROUP (ORDER BY a.activity_type) as most_used_feature
        FROM user_activity a
        LEFT JOIN user_sessions s ON a.session_id = s.session_id
        WHERE DATE(a.timestamp) = $1
        GROUP BY a.branch_code, a.user_type
      `, [dateStr]);

      // Insert or update metrics
      for (const row of result.rows) {
        await pool.query(`
          INSERT INTO user_activity_metrics 
          (date, branch_code, user_type, total_users, total_sessions, total_activities, 
           avg_session_duration_minutes, most_active_hour, most_used_feature)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (date, branch_code, user_type)
          DO UPDATE SET
            total_users = EXCLUDED.total_users,
            total_sessions = EXCLUDED.total_sessions,
            total_activities = EXCLUDED.total_activities,
            avg_session_duration_minutes = EXCLUDED.avg_session_duration_minutes,
            most_active_hour = EXCLUDED.most_active_hour,
            most_used_feature = EXCLUDED.most_used_feature,
            created_at = CURRENT_TIMESTAMP
        `, [
          dateStr,
          row.branch_code,
          row.user_type,
          row.total_users,
          row.total_sessions,
          row.total_activities,
          row.avg_session_duration,
          row.most_active_hour,
          row.most_used_feature
        ]);
      }

      logger.info('Daily metrics generated successfully', { date: dateStr });
      return { success: true };
    } catch (error) {
      logger.error('Error generating daily metrics:', { error: error.message, date });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clean up old activity records
   * @param {number} daysOld - Remove records older than this many days
   * @returns {Promise<{success: boolean, deletedCount?: number, error?: string}>}
   */
  async cleanupOldRecords(daysOld = 90) {
    try {
      const activityResult = await pool.query(`
        DELETE FROM user_activity
        WHERE timestamp < NOW() - INTERVAL '${daysOld} days'
      `);

      const sessionResult = await pool.query(`
        DELETE FROM user_sessions
        WHERE login_time < NOW() - INTERVAL '${daysOld} days'
        AND is_active = false
      `);

      logger.info('Old activity records cleaned up', {
        activitiesDeleted: activityResult.rowCount,
        sessionsDeleted: sessionResult.rowCount
      });

      return {
        success: true,
        deletedCount: activityResult.rowCount + sessionResult.rowCount
      };
    } catch (error) {
      logger.error('Error cleaning up old records:', { error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get user engagement score
   * @param {number} userId - User ID
   * @param {number} daysBack - Number of days to analyze
   * @returns {Promise<Object>}
   */
  async getUserEngagementScore(userId, daysBack = 30) {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total_activities,
          COUNT(DISTINCT DATE(timestamp)) as active_days,
          COUNT(DISTINCT session_id) as total_sessions,
          AVG(duration_ms) as avg_activity_duration,
          COUNT(DISTINCT activity_type) as feature_diversity
        FROM user_activity
        WHERE user_id = $1
          AND timestamp > NOW() - INTERVAL '${daysBack} days'
      `, [userId]);

      const stats = result.rows[0];
      
      // Calculate engagement score (0-100)
      const activeDaysScore = (parseInt(stats.active_days) / daysBack) * 40;
      const activityScore = Math.min((parseInt(stats.total_activities) / 100) * 30, 30);
      const diversityScore = Math.min((parseInt(stats.feature_diversity) / 10) * 30, 30);
      
      const engagementScore = Math.round(activeDaysScore + activityScore + diversityScore);

      return {
        userId,
        engagementScore,
        totalActivities: parseInt(stats.total_activities),
        activeDays: parseInt(stats.active_days),
        totalSessions: parseInt(stats.total_sessions),
        avgActivityDuration: parseFloat(stats.avg_activity_duration) || 0,
        featureDiversity: parseInt(stats.feature_diversity),
        period: `${daysBack} days`
      };
    } catch (error) {
      logger.error('Error calculating user engagement score:', { error: error.message, userId });
      return {
        userId,
        engagementScore: 0,
        error: error.message
      };
    }
  }
}

module.exports = new UserActivityMonitoringService();
