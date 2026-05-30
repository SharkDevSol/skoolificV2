/**
 * User Activity Monitoring Routes
 * 
 * API endpoints for accessing user activity data and statistics
 * 
 * Phase 10.8.7: Monitor user activity
 */

const express = require('express');
const router = express.Router();
const userActivityMonitoring = require('../services/UserActivityMonitoringService');
const { authenticateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { logger } = require('../utils/logger');

/**
 * GET /api/user-activity/active-users
 * Get currently active users
 */
router.get('/active-users', authenticateToken, authorize(['admin', 'super_admin']), async (req, res) => {
  try {
    const { branchCode, userType, minutesBack = 30 } = req.query;

    const activeUsers = await userActivityMonitoring.getActiveUsers({
      branchCode,
      userType,
      minutesBack: parseInt(minutesBack)
    });

    res.json({
      success: true,
      activeUsers,
      count: activeUsers.length,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error getting active users:', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get active users'
    });
  }
});

/**
 * GET /api/user-activity/statistics
 * Get activity statistics
 */
router.get('/statistics', authenticateToken, authorize(['admin', 'super_admin']), async (req, res) => {
  try {
    const { branchCode, userType, startDate, endDate, hoursBack = 24 } = req.query;

    const statistics = await userActivityMonitoring.getActivityStatistics({
      branchCode,
      userType,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      hoursBack: parseInt(hoursBack)
    });

    res.json({
      success: true,
      statistics
    });
  } catch (error) {
    logger.error('Error getting activity statistics:', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get activity statistics'
    });
  }
});

/**
 * GET /api/user-activity/sessions
 * Get session statistics
 */
router.get('/sessions', authenticateToken, authorize(['admin', 'super_admin']), async (req, res) => {
  try {
    const { branchCode, userType, daysBack = 7 } = req.query;

    const sessionStats = await userActivityMonitoring.getSessionStatistics({
      branchCode,
      userType,
      daysBack: parseInt(daysBack)
    });

    res.json({
      success: true,
      sessionStats
    });
  } catch (error) {
    logger.error('Error getting session statistics:', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get session statistics'
    });
  }
});

/**
 * GET /api/user-activity/user/:userId
 * Get activity history for a specific user
 */
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 100, offset = 0, startDate, endDate, activityType, activityCategory } = req.query;

    // Users can only view their own activity unless they're admin
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && req.user.id != userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to view this user\'s activity'
      });
    }

    const activities = await userActivityMonitoring.getUserActivity(parseInt(userId), {
      limit: parseInt(limit),
      offset: parseInt(offset),
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      activityType,
      activityCategory
    });

    res.json({
      success: true,
      activities,
      count: activities.length
    });
  } catch (error) {
    logger.error('Error getting user activity:', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get user activity'
    });
  }
});

/**
 * GET /api/user-activity/engagement/:userId
 * Get user engagement score
 */
router.get('/engagement/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { daysBack = 30 } = req.query;

    // Users can only view their own engagement unless they're admin
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && req.user.id != userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to view this user\'s engagement'
      });
    }

    const engagement = await userActivityMonitoring.getUserEngagementScore(
      parseInt(userId),
      parseInt(daysBack)
    );

    res.json({
      success: true,
      engagement
    });
  } catch (error) {
    logger.error('Error getting user engagement:', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get user engagement'
    });
  }
});

/**
 * POST /api/user-activity/generate-metrics
 * Generate daily metrics (admin only)
 */
router.post('/generate-metrics', authenticateToken, authorize(['admin', 'super_admin']), async (req, res) => {
  try {
    const { date } = req.body;
    const targetDate = date ? new Date(date) : new Date();

    const result = await userActivityMonitoring.generateDailyMetrics(targetDate);

    res.json({
      success: result.success,
      message: result.success ? 'Daily metrics generated successfully' : 'Failed to generate metrics',
      error: result.error
    });
  } catch (error) {
    logger.error('Error generating daily metrics:', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to generate daily metrics'
    });
  }
});

/**
 * DELETE /api/user-activity/cleanup
 * Clean up old activity records (admin only)
 */
router.delete('/cleanup', authenticateToken, authorize(['admin', 'super_admin']), async (req, res) => {
  try {
    const { daysOld = 90 } = req.query;

    const result = await userActivityMonitoring.cleanupOldRecords(parseInt(daysOld));

    res.json({
      success: result.success,
      deletedCount: result.deletedCount,
      message: result.success 
        ? `Cleaned up ${result.deletedCount} old records` 
        : 'Failed to clean up records',
      error: result.error
    });
  } catch (error) {
    logger.error('Error cleaning up old records:', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to clean up old records'
    });
  }
});

/**
 * GET /api/user-activity/dashboard
 * Get comprehensive dashboard data for monitoring
 */
router.get('/dashboard', authenticateToken, authorize(['admin', 'super_admin']), async (req, res) => {
  try {
    const { branchCode, userType } = req.query;

    // Get multiple metrics in parallel
    const [activeUsers, statistics, sessionStats] = await Promise.all([
      userActivityMonitoring.getActiveUsers({ branchCode, userType, minutesBack: 30 }),
      userActivityMonitoring.getActivityStatistics({ branchCode, userType, hoursBack: 24 }),
      userActivityMonitoring.getSessionStatistics({ branchCode, userType, daysBack: 7 })
    ]);

    res.json({
      success: true,
      dashboard: {
        activeUsers: {
          count: activeUsers.length,
          users: activeUsers
        },
        last24Hours: statistics,
        last7Days: sessionStats
      },
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error getting activity dashboard:', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get activity dashboard'
    });
  }
});

module.exports = router;
