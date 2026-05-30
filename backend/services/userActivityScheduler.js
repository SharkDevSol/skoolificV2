/**
 * User Activity Scheduler
 * 
 * Scheduled jobs for user activity monitoring:
 * - Generate daily metrics
 * - Clean up old records
 * - End inactive sessions
 * 
 * Phase 10.8.7: Monitor user activity
 */

const userActivityMonitoring = require('./UserActivityMonitoringService');
const { logger } = require('../utils/logger');

class UserActivityScheduler {
  constructor() {
    this.dailyMetricsInterval = null;
    this.cleanupInterval = null;
    this.sessionCleanupInterval = null;
  }

  /**
   * Start all scheduled jobs
   */
  start() {
    logger.info('Starting User Activity Scheduler...');

    // Generate daily metrics every day at midnight
    this.startDailyMetricsJob();

    // Clean up old records once a week
    this.startCleanupJob();

    // Clean up inactive sessions every hour
    this.startSessionCleanupJob();

    logger.info('User Activity Scheduler started successfully');
  }

  /**
   * Stop all scheduled jobs
   */
  stop() {
    if (this.dailyMetricsInterval) {
      clearInterval(this.dailyMetricsInterval);
      this.dailyMetricsInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.sessionCleanupInterval) {
      clearInterval(this.sessionCleanupInterval);
      this.sessionCleanupInterval = null;
    }

    logger.info('User Activity Scheduler stopped');
  }

  /**
   * Start daily metrics generation job
   * Runs every day at midnight
   */
  startDailyMetricsJob() {
    // Calculate time until next midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const timeUntilMidnight = tomorrow - now;

    // Run first time at midnight
    setTimeout(() => {
      this.generateDailyMetrics();

      // Then run every 24 hours
      this.dailyMetricsInterval = setInterval(() => {
        this.generateDailyMetrics();
      }, 24 * 60 * 60 * 1000);
    }, timeUntilMidnight);

    logger.info('Daily metrics job scheduled', {
      nextRun: tomorrow.toISOString()
    });
  }

  /**
   * Start cleanup job
   * Runs once a week
   */
  startCleanupJob() {
    // Run immediately on start
    this.cleanupOldRecords();

    // Then run every 7 days
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldRecords();
    }, 7 * 24 * 60 * 60 * 1000);

    logger.info('Cleanup job scheduled (runs weekly)');
  }

  /**
   * Start session cleanup job
   * Runs every hour
   */
  startSessionCleanupJob() {
    // Run immediately on start
    this.cleanupInactiveSessions();

    // Then run every hour
    this.sessionCleanupInterval = setInterval(() => {
      this.cleanupInactiveSessions();
    }, 60 * 60 * 1000);

    logger.info('Session cleanup job scheduled (runs hourly)');
  }

  /**
   * Generate daily metrics for yesterday
   */
  async generateDailyMetrics() {
    try {
      logger.info('Generating daily metrics...');

      // Generate metrics for yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const result = await userActivityMonitoring.generateDailyMetrics(yesterday);

      if (result.success) {
        logger.info('Daily metrics generated successfully', {
          date: yesterday.toISOString().split('T')[0]
        });
      } else {
        logger.error('Failed to generate daily metrics', {
          error: result.error
        });
      }
    } catch (error) {
      logger.error('Error in daily metrics job:', { error: error.message });
    }
  }

  /**
   * Clean up old activity records
   */
  async cleanupOldRecords() {
    try {
      logger.info('Cleaning up old activity records...');

      // Keep records for 90 days
      const result = await userActivityMonitoring.cleanupOldRecords(90);

      if (result.success) {
        logger.info('Old records cleaned up successfully', {
          deletedCount: result.deletedCount
        });
      } else {
        logger.error('Failed to clean up old records', {
          error: result.error
        });
      }
    } catch (error) {
      logger.error('Error in cleanup job:', { error: error.message });
    }
  }

  /**
   * Clean up inactive sessions
   * End sessions that have been inactive for more than 24 hours
   */
  async cleanupInactiveSessions() {
    try {
      logger.info('Cleaning up inactive sessions...');

      const pool = require('../config/db');

      // End sessions inactive for more than 24 hours
      const result = await pool.query(`
        UPDATE user_sessions
        SET 
          logout_time = last_activity,
          session_duration_minutes = EXTRACT(EPOCH FROM (last_activity - login_time)) / 60,
          is_active = false
        WHERE is_active = true
          AND last_activity < NOW() - INTERVAL '24 hours'
        RETURNING session_id
      `);

      if (result.rowCount > 0) {
        logger.info('Inactive sessions cleaned up', {
          count: result.rowCount
        });
      }
    } catch (error) {
      logger.error('Error cleaning up inactive sessions:', { error: error.message });
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: !!(this.dailyMetricsInterval || this.cleanupInterval || this.sessionCleanupInterval),
      jobs: {
        dailyMetrics: !!this.dailyMetricsInterval,
        cleanup: !!this.cleanupInterval,
        sessionCleanup: !!this.sessionCleanupInterval
      }
    };
  }
}

module.exports = new UserActivityScheduler();
