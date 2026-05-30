const { default: MDBReader } = require('mdb-reader');
const pool = require('../config/db');
const path = require('path');
const syncCoordinator = require('./SyncCoordinator');
const deviceUserBufferService = require('./DeviceUserBufferService');
const deviceUserAuditService = require('./DeviceUserAuditService');

class AASRealtimeSync {
  constructor() {
    this.dbPath = 'C:\\AttendanceF\\tmkq.mdb';
    this.syncInterval = null;
    this.isRunning = false;
    this.lastSyncTime = null;
  }

  /**
   * Start automatic sync service
   * @param {number} intervalMinutes - How often to sync (default: 2 minutes)
   */
  startAutoSync(intervalMinutes = 2) {
    if (this.isRunning) {
      console.log('⚠️  Auto-sync is already running');
      return;
    }

    console.log(`🚀 Starting AAS 6.0 real-time sync (every ${intervalMinutes} minutes)`);
    this.isRunning = true;

    // Run immediately on start
    this.syncNow();

    // Then run at intervals
    this.syncInterval = setInterval(() => {
      this.syncNow();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop automatic sync service
   */
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      this.isRunning = false;
      console.log('🛑 Auto-sync stopped');
    }
  }

  /**
   * Sync now (manual trigger)
   */
  async syncNow() {
    const startTime = new Date();
    console.log(`\n🔄 [${startTime.toLocaleTimeString()}] Starting sync from AAS 6.0...`);

    let lockId = null;

    try {
      // Acquire distributed lock
      const lockResult = await syncCoordinator.acquireLock('aasRealtimeSync', 300);
      if (!lockResult.success) {
        console.log('⚠️  Could not acquire sync lock, another sync is in progress');
        return { success: false, error: 'Lock acquisition failed' };
      }
      lockId = lockResult.lockId;
      console.log('🔒 Sync lock acquired');

      // Log sync start
      await deviceUserAuditService.logOperation({
        operationType: 'sync_started',
        deviceUserId: null,
        deviceUserName: null,
        performedBy: 'system',
        serviceName: 'aasRealtimeSync',
        details: { startTime: startTime.toISOString() }
      });

      try {
      // Read AAS database
      const buffer = require('fs').readFileSync(this.dbPath);
      const reader = new MDBReader(buffer);

      // Find attendance table (common names in ZKTeco databases)
      const tableNames = reader.getTableNames();
      console.log(`📊 Available tables: ${tableNames.join(', ')}`);

      // Try common table names
      const possibleTableNames = [
        'TimeRecords1',      // AAS 6.0 main table (found in your database!)
        'TimeRecords2',      // AAS 6.0 backup table
        'tmpTRecords',       // AAS 6.0 temp table
        'CHECKINOUT',
        'att_log',
        'AttendanceLog',
        'Attendance',
        'CheckInOut',
        'ATTLOG'
      ];

      let attendanceTable = null;
      let tableName = null;

      for (const name of possibleTableNames) {
        if (tableNames.includes(name)) {
          attendanceTable = reader.getTable(name);
          tableName = name;
          break;
        }
      }

      if (!attendanceTable) {
        console.log('⚠️  Could not find attendance table. Available tables:', tableNames);
        console.log('💡 Please check AAS database structure');
        return {
          success: false,
          error: 'Attendance table not found',
          availableTables: tableNames
        };
      }

      console.log(`✅ Found attendance table: ${tableName}`);

      // Get records
      const records = attendanceTable.getData();
      console.log(`📝 Total records in AAS database: ${records.length}`);

      // Filter records since last sync (or last 24 hours if first sync)
      const cutoffTime = this.lastSyncTime || new Date(Date.now() - 24 * 60 * 60 * 1000);
      const newRecords = records.filter(record => {
        const recordTime = this.parseDateTime(record);
        return recordTime && recordTime > cutoffTime;
      });

      console.log(`🆕 New records since last sync: ${newRecords.length}`);

      if (newRecords.length === 0) {
        console.log('✅ No new records to sync');
        this.lastSyncTime = startTime;
        return {
          success: true,
          recordsProcessed: 0,
          recordsSaved: 0,
          message: 'No new records'
        };
      }

      // Process and save records
      let recordsSaved = 0;
      let unmappedUserIds = new Set();

      for (const record of newRecords) {
        try {
          const userId = this.extractUserId(record);
          const dateTime = this.parseDateTime(record);

          if (!userId || !dateTime) {
            continue;
          }

          // Find person by machine user ID
          const mappingResult = await pool.query(
            'SELECT person_id, person_type FROM user_machine_mapping WHERE machine_user_id = $1',
            [userId]
          );

          if (mappingResult.rows.length === 0) {
            unmappedUserIds.add(userId);
            continue;
          }

          const { person_id, person_type } = mappingResult.rows[0];
          const date = dateTime.toISOString().split('T')[0];

          // Insert attendance record
          await pool.query(
            `INSERT INTO dual_mode_attendance 
             (person_id, person_type, date, status, source_type, source_machine_ip, timestamp)
             VALUES ($1, $2, $3, 'present', 'machine', '10.22.134.43', $4)
             ON CONFLICT DO NOTHING`,
            [person_id, person_type, date, dateTime]
          );

          recordsSaved++;

        } catch (error) {
          console.error('Error processing record:', error.message);
        }
      }

      // Log sync operation
      await pool.query(
        `INSERT INTO attendance_audit_log (operation_type, performed_by, details)
         VALUES ('machine_sync', 'system', $1)`,
        [JSON.stringify({
          source: 'AAS_Realtime',
          recordsProcessed: newRecords.length,
          recordsSaved,
          unmappedUserIds: Array.from(unmappedUserIds),
          syncTime: startTime.toISOString()
        })]
      );

      this.lastSyncTime = startTime;

      console.log(`✅ Sync completed: ${recordsSaved} records saved`);
      if (unmappedUserIds.size > 0) {
        console.log(`⚠️  Unmapped User IDs: ${Array.from(unmappedUserIds).join(', ')}`);
      }

      return {
        success: true,
        recordsProcessed: newRecords.length,
        recordsSaved,
        unmappedUserIds: Array.from(unmappedUserIds)
      };

      } finally {
        // Always release lock
        if (lockId) {
          await syncCoordinator.releaseLock(lockId);
          console.log('🔓 Sync lock released');
        }
      }

    } catch (error) {
      console.error('❌ Sync failed:', error.message);
      
      // Release lock on error
      if (lockId) {
        try {
          await syncCoordinator.releaseLock(lockId);
        } catch (releaseError) {
          console.error('Failed to release lock:', releaseError);
        }
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Extract user ID from record (handles different column names)
   */
  extractUserId(record) {
    // Try common column names (based on your AAS database structure)
    const possibleColumns = [
      'emp_id',           // AAS 6.0 uses this!
      'card_id',          // Alternative in AAS
      'USERID', 
      'UserId', 
      'user_id', 
      'BADGENUMBER', 
      'BadgeNumber', 
      'badge_number'
    ];
    
    for (const col of possibleColumns) {
      if (record[col] !== undefined && record[col] !== null) {
        // Try to parse as integer
        const parsed = parseInt(record[col]);
        if (!isNaN(parsed)) {
          return parsed;
        }
        // If it's already a number, return it
        if (typeof record[col] === 'number') {
          return record[col];
        }
      }
    }

    return null;
  }

  /**
   * Parse date/time from record (handles different column names and formats)
   */
  parseDateTime(record) {
    // AAS 6.0 uses sign_date + sign_timestring
    if (record['sign_date'] && record['sign_timestring']) {
      try {
        const dateStr = record['sign_date'];
        const timeStr = record['sign_timestring'];
        
        // Combine date and time
        const combined = `${dateStr} ${timeStr}`;
        const date = new Date(combined);
        
        if (!isNaN(date.getTime())) {
          return date;
        }
      } catch (e) {
        // Continue to try other methods
      }
    }

    // Try other common column names
    const possibleColumns = [
      'sign_time',
      'KqTime',
      'CHECKTIME', 
      'CheckTime', 
      'check_time', 
      'DATETIME', 
      'DateTime', 
      'date_time'
    ];
    
    for (const col of possibleColumns) {
      if (record[col]) {
        const date = new Date(record[col]);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }

    return null;
  }

  /**
   * Get sync status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastSyncTime: this.lastSyncTime,
      dbPath: this.dbPath
    };
  }

  /**
   * Inspect AAS database structure (for debugging)
   */
  async inspectDatabase() {
    try {
      const buffer = require('fs').readFileSync(this.dbPath);
      const reader = new MDBReader(buffer);

      const tableNames = reader.getTableNames();
      const structure = {};

      for (const tableName of tableNames) {
        const table = reader.getTable(tableName);
        const columns = table.getColumnNames();
        const rowCount = table.getData().length;

        structure[tableName] = {
          columns,
          rowCount
        };

        // Show sample data for attendance-related tables
        if (tableName.toLowerCase().includes('check') || 
            tableName.toLowerCase().includes('att') ||
            tableName.toLowerCase().includes('log')) {
          const sampleData = table.getData().slice(0, 3);
          structure[tableName].sampleData = sampleData;
        }
      }

      return structure;

    } catch (error) {
      console.error('Error inspecting database:', error);
      throw error;
    }
  }
}

module.exports = new AASRealtimeSync();
