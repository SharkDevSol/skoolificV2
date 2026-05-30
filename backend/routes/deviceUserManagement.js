const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const deviceUserBufferService = require('../services/DeviceUserBufferService');
const conflictResolutionService = require('../services/ConflictResolutionService');
const deviceUserMonitoringService = require('../services/DeviceUserMonitoringService');
const backupRestoreService = require('../services/BackupRestoreService');
const { authenticateWithBranch, validateBranchCode } = require('../middleware/branchAuth');
const { getEndpointPath, API_ENDPOINTS } = require('../config/api.config');

// ============================================
// Buffer Management Endpoints
// ============================================

/**
 * GET /api/device-users/buffer
 * Retrieve all buffer records with filtering and pagination
 */
router.get('/buffer', authenticateWithBranch, async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    
    const filters = {};
    if (status) {
      filters.status = status;
    }

    const users = await deviceUserBufferService.getUnmappedUsers(filters);
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedUsers = users.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: users.length,
        totalPages: Math.ceil(users.length / limit)
      }
    });
  } catch (error) {
    console.error('Failed to get buffer users:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/device-users/buffer/:id/map
 * Create user_machine_mapping for an unmapped user
 */
router.post('/buffer/:id/map', authenticateWithBranch, async (req, res) => {
  try {
    const { id } = req.params;
    const { personId, personType = 'staff' } = req.body;

    // Validate person exists
    const personCheck = await pool.query(
      'SELECT id FROM staff WHERE id = $1',
      [personId]
    );

    if (personCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Person ID does not exist in staff table'
      });
    }

    // Get buffer user
    const bufferUser = await pool.query(
      'SELECT device_user_id FROM device_user_buffer WHERE id = $1',
      [id]
    );

    if (bufferUser.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Buffer user not found'
      });
    }

    const deviceUserId = bufferUser.rows[0].device_user_id;

    // Create mapping
    await pool.query(
      `INSERT INTO user_machine_mapping (machine_user_id, person_id, person_type)
       VALUES ($1, $2, $3)
       ON CONFLICT (machine_user_id) DO UPDATE SET person_id = $2, person_type = $3`,
      [deviceUserId, personId, personType]
    );

    // Mark as mapped in buffer
    await deviceUserBufferService.markAsMapped(deviceUserId, personId);

    res.json({
      success: true,
      message: 'User mapped successfully'
    });
  } catch (error) {
    console.error('Failed to map user:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/device-users/buffer/statistics
 * Get buffer statistics
 */
router.get('/buffer/statistics', authenticateWithBranch, async (req, res) => {
  try {
    const stats = await deviceUserBufferService.getStatistics();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Failed to get buffer statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// Conflict Resolution Endpoints
// ============================================

/**
 * GET /api/device-users/conflicts
 * Retrieve unresolved conflicts
 */
router.get('/conflicts', authenticateWithBranch, async (req, res) => {
  try {
    const conflicts = await conflictResolutionService.getUnresolvedConflicts();
    res.json({
      success: true,
      data: conflicts
    });
  } catch (error) {
    console.error('Failed to get conflicts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/device-users/conflicts/:id/resolve
 * Resolve a conflict
 */
router.post('/conflicts/:id/resolve', authenticateWithBranch, async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution } = req.body;
    const adminId = req.user.id;

    if (!['use_device', 'use_database', 'merge'].includes(resolution)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid resolution strategy'
      });
    }

    await conflictResolutionService.resolveConflict(id, resolution, adminId);

    res.json({
      success: true,
      message: 'Conflict resolved successfully'
    });
  } catch (error) {
    console.error('Failed to resolve conflict:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// Backup and Restore Endpoints
// ============================================

/**
 * GET /api/device-users/backups
 * List available backups
 */
router.get('/backups', authenticateWithBranch, async (req, res) => {
  try {
    const backups = await backupRestoreService.listBackups();
    res.json({
      success: true,
      data: backups
    });
  } catch (error) {
    console.error('Failed to list backups:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/device-users/backups/:filename/restore
 * Restore users from backup
 */
router.post('/backups/:filename/restore', authenticateWithBranch, async (req, res) => {
  try {
    const { filename } = req.params;
    const { dryRun = false } = req.body;

    const result = await backupRestoreService.restoreFromBackup(filename, dryRun);

    res.json({
      success: result.success,
      data: {
        restored: result.restored,
        failed: result.failed,
        dryRun
      }
    });
  } catch (error) {
    console.error('Failed to restore backup:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/device-users/backups/create
 * Manually trigger a backup
 */
router.post('/backups/create', authenticateWithBranch, async (req, res) => {
  try {
    const result = await backupRestoreService.backupDeviceUsers();
    res.json({
      success: result.success,
      data: {
        backupFile: result.backupFile,
        userCount: result.userCount
      }
    });
  } catch (error) {
    console.error('Failed to create backup:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// Monitoring Endpoints
// ============================================

/**
 * GET /api/device-users/monitoring/status
 * Get current device user count and status
 */
router.get('/monitoring/status', authenticateWithBranch, async (req, res) => {
  try {
    const status = await deviceUserMonitoringService.getCurrentUserCount();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Failed to get monitoring status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/device-users/monitoring/history
 * Get user count history
 */
router.get('/monitoring/history', authenticateWithBranch, async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const history = await deviceUserMonitoringService.getUserCountHistory(parseInt(hours));
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Failed to get monitoring history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/device-users/monitoring/missing
 * Check for missing users
 */
router.get('/monitoring/missing', authenticateWithBranch, async (req, res) => {
  try {
    const result = await deviceUserMonitoringService.checkForMissingUsers();
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Failed to check for missing users:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
