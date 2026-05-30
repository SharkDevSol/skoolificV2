/**
 * Device User Persistence Configuration
 * Settings for sync coordination, monitoring, and backup services
 */

module.exports = {
  // Distributed Lock Configuration
  lock: {
    // Lock timeout in seconds (default: 5 minutes)
    timeoutSeconds: parseInt(process.env.SYNC_LOCK_TIMEOUT) || 300,
    
    // Lock cleanup interval in minutes
    cleanupIntervalMinutes: 5,
    
    // Maximum lock retry attempts
    maxRetries: 3,
    
    // Retry delay in milliseconds
    retryDelayMs: 2000
  },

  // Device User Monitoring Configuration
  monitoring: {
    // Polling interval in minutes (default: 5 minutes)
    pollIntervalMinutes: parseInt(process.env.MONITORING_INTERVAL) || 5,
    
    // Alert threshold - send alert if user count decreases by this amount
    alertThreshold: 1,
    
    // History retention in days
    historyRetentionDays: 30
  },

  // Backup Configuration
  backup: {
    // Backup interval in hours (default: 6 hours)
    intervalHours: parseInt(process.env.BACKUP_INTERVAL) || 6,
    
    // Backup retention in days (default: 30 days)
    retentionDays: parseInt(process.env.BACKUP_RETENTION) || 30,
    
    // Backup directory path
    directory: process.env.BACKUP_DIR || './backups',
    
    // Backup file prefix
    filePrefix: 'ai06-users-backup-'
  },

  // Device User Buffer Configuration
  buffer: {
    // Buffer retention in days (default: 90 days)
    retentionDays: parseInt(process.env.BUFFER_RETENTION) || 90,
    
    // Auto-cleanup interval in days
    cleanupIntervalDays: 7
  },

  // AI06 Device Configuration
  device: {
    // Device IP address
    ip: process.env.AI06_DEVICE_IP || '192.168.1.2',
    
    // Device port
    port: parseInt(process.env.AI06_DEVICE_PORT) || 80,
    
    // Connection timeout in milliseconds
    timeoutMs: 10000,
    
    // Retry attempts for device communication
    maxRetries: 3
  },

  // Audit Log Configuration
  auditLog: {
    // Log retention in days
    retentionDays: 90,
    
    // Enable detailed logging
    detailedLogging: process.env.NODE_ENV === 'development'
  },

  // Sync Service Configuration
  sync: {
    // Enable read-only mode (never delete users from device)
    readOnlyMode: true,
    
    // Sync timeout in seconds
    timeoutSeconds: 300,
    
    // Enable automatic user buffering
    autoBuffer: true
  }
};
