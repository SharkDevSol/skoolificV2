const ZKLib = require('zklib');
const pool = require('../config/db');

class DirectMachineSync {
  constructor() {
    this.machineIP = '10.22.134.43';
    this.machinePort = 4370;
    this.syncInterval = null;
    this.isRunning = false;
    this.lastSyncTime = null;
    this.zkInstance = null;
  }

  /**
   * Connect to machine
   */
  async connect() {
    try {
      console.log(`🔌 Connecting to machine at ${this.machineIP}:${this.machinePort}...`);
      
      this.zkInstance = new ZKLib({
        ip: this.machineIP,
        port: this.machinePort,
        timeout: 10000,
        inport: 4000
      });
      
      await this.zkInstance.createSocket();
      
      console.log('✅ Connected to machine successfully!');
      return true;
    } catch (error) {
      console.error('❌ Connection failed:', error.message);
      return false;
    }
  }

  /**
   * Disconnect from machine
   */
  async disconnect() {
    try {
      if (this.zkInstance) {
        await this.zkInstance.disconnect();
        this.zkInstance = null;
        console.log('🔌 Disconnected from machine');
      }
    } catch (error) {
      console.error('Error disconnecting:', error.message);
    }
  }

  /**
   * Get attendance logs from machine
   */
  async getAttendanceLogs() {
    try {
      if (!this.zkInstance) {
        const connected = await this.connect();
        if (!connected) {
          return { success: false, error: 'Failed to connect' };
        }
      }

      console.log('📥 Fetching attendance logs from machine...');
      
      const logs = await this.zkInstance.getAttendances();
      
      console.log(`✅ Retrieved ${logs.data ? logs.data.length : 0} attendance records`);
      
      return {
        success: true,
        logs: logs.data || []
      };

    } catch (error) {
      console.error('❌ Error getting attendance logs:', error.message);
      await this.disconnect();
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync attendance from machine to database
   */
  async syncNow() {
    const startTime = new Date();
    console.log(`\n🔄 [${startTime.toLocaleTimeString()}] Starting direct machine sync...`);

    try {
      // Get logs from machine
      const result = await this.getAttendanceLogs();
      
      if (!result.success) {
        return {
          success: false,
          error: result.error,
          recordsProcessed: 0,
          recordsSaved: 0
        };
      }

      const logs = result.logs;
      console.log(`📝 Total records from machine: ${logs.length}`);

      // Filter records since last sync
      const cutoffTime = this.lastSyncTime || new Date(Date.now() - 24 * 60 * 60 * 1000);
      const newLogs = logs.filter(log => {
        const logTime = new Date(log.recordTime);
        return logTime > cutoffTime;
      });

      console.log(`🆕 New records since last sync: ${newLogs.length}`);

      if (newLogs.length === 0) {
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

      for (const log of newLogs) {
        try {
          const userId = parseInt(log.deviceUserId);
          const timestamp = new Date(log.recordTime);
          const date = timestamp.toISOString().split('T')[0];

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

          // Insert attendance record
          await pool.query(
            `INSERT INTO dual_mode_attendance 
             (person_id, person_type, date, status, source_type, source_machine_ip, timestamp)
             VALUES ($1, $2, $3, 'present', 'machine', $4, $5)
             ON CONFLICT DO NOTHING`,
            [person_id, person_type, date, this.machineIP, timestamp]
          );

          recordsSaved++;

        } catch (error) {
          console.error('Error processing log:', error.message);
        }
      }

      // Log sync operation
      await pool.query(
        `INSERT INTO attendance_audit_log (operation_type, performed_by, details)
         VALUES ('machine_sync', 'system', $1)`,
        [JSON.stringify({
          source: 'Direct_Machine',
          machineIP: this.machineIP,
          recordsProcessed: newLogs.length,
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

      // Disconnect after sync
      await this.disconnect();

      return {
        success: true,
        recordsProcessed: newLogs.length,
        recordsSaved,
        unmappedUserIds: Array.from(unmappedUserIds)
      };

    } catch (error) {
      console.error('❌ Sync failed:', error.message);
      await this.disconnect();
      return {
        success: false,
        error: error.message,
        recordsProcessed: 0,
        recordsSaved: 0
      };
    }
  }

  /**
   * Start automatic sync
   */
  startAutoSync(intervalMinutes = 2) {
    if (this.isRunning) {
      console.log('⚠️  Auto-sync is already running');
      return;
    }

    console.log(`🚀 Starting direct machine sync (every ${intervalMinutes} minutes)`);
    console.log(`   Machine: ${this.machineIP}:${this.machinePort}`);
    this.isRunning = true;

    // Run immediately on start
    this.syncNow();

    // Then run at intervals
    this.syncInterval = setInterval(() => {
      this.syncNow();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop automatic sync
   */
  async stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      this.isRunning = false;
      await this.disconnect();
      console.log('🛑 Auto-sync stopped');
    }
  }

  /**
   * Get sync status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastSyncTime: this.lastSyncTime,
      machineIP: this.machineIP,
      machinePort: this.machinePort
    };
  }
}

module.exports = new DirectMachineSync();
