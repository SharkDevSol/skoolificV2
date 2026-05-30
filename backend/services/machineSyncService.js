const ZKLib = require('node-zklib');
const pool = require('../config/db');

class MachineSyncService {
  async testConnection(machineId) {
    let zkInstance = null;
    
    try {
      console.log(`[testConnection] Looking up machine: ${machineId}`);
      const machineResult = await pool.query(
        'SELECT * FROM machine_config WHERE id = $1 AND enabled = true',
        [machineId]
      );

      if (machineResult.rows.length === 0) {
        return { success: false, message: 'Machine not found or disabled' };
      }

      const machine = machineResult.rows[0];
      console.log(`[testConnection] Machine config: IP=${machine.ip_address}, Port=${machine.port}`);
      
      console.log('[testConnection] Creating ZKLib instance...');
      zkInstance = new ZKLib(machine.ip_address, machine.port, 10000, 4000);
      
      console.log('[testConnection] Attempting to create socket...');
      await zkInstance.createSocket();
      
      console.log('[testConnection] Socket created, getting device info...');
      const deviceInfo = await zkInstance.getInfo();
      
      console.log('[testConnection] Device info received:', deviceInfo);
      await zkInstance.disconnect();

      return {
        success: true,
        message: 'Connection successful',
        machineInfo: {
          serialNumber: deviceInfo.serialNumber || 'N/A',
          firmwareVersion: deviceInfo.fwVersion || 'N/A',
          platform: deviceInfo.platform || 'N/A',
          deviceName: deviceInfo.deviceName || 'N/A'
        }
      };
    } catch (error) {
      console.error('[testConnection] Error occurred:', error);
      console.error('[testConnection] Error stack:', error.stack);
      
      if (zkInstance) {
        try { 
          console.log('[testConnection] Attempting to disconnect...');
          await zkInstance.disconnect(); 
        } catch (e) {
          console.error('[testConnection] Disconnect error:', e);
        }
      }
      
      let errorMessage = error.message || 'Unknown error';
      
      // Provide more specific error messages
      if (errorMessage.includes('ETIMEDOUT') || errorMessage.includes('timeout')) {
        errorMessage = 'Connection timeout - machine not responding. Check if machine is on and connected to network.';
      } else if (errorMessage.includes('ECONNREFUSED')) {
        errorMessage = 'Connection refused - machine rejected connection. Check IP address and port.';
      } else if (errorMessage.includes('EHOSTUNREACH')) {
        errorMessage = 'Host unreachable - cannot reach machine IP. Check network connection.';
      } else if (errorMessage.includes('ENETUNREACH')) {
        errorMessage = 'Network unreachable - check if machine is on same network.';
      }
      
      return { 
        success: false, 
        message: `Connection failed: ${errorMessage}`,
        details: {
          originalError: error.message,
          errorType: error.code || 'UNKNOWN'
        }
      };
    }
  }

  async connectWithRetry(machine, maxRetries = 3) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const zkInstance = new ZKLib(machine.ip_address, machine.port, 10000, 4000);
        await zkInstance.createSocket();
        console.log(`Connected to machine ${machine.id} on attempt ${attempt}`);
        return zkInstance;
      } catch (error) {
        lastError = error;
        console.error(`Connection attempt ${attempt} failed:`, error.message);
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    throw new Error(`Failed to connect after ${maxRetries} attempts: ${lastError.message}`);
  }

  async syncFromMachine(machineId) {
    let zkInstance = null;
    const syncLogId = null;
    const startTime = new Date();
    
    try {
      const machineResult = await pool.query(
        'SELECT * FROM machine_config WHERE id = $1 AND enabled = true',
        [machineId]
      );

      if (machineResult.rows.length === 0) {
        throw new Error('Machine not found or disabled');
      }

      const machine = machineResult.rows[0];
      
      const logResult = await pool.query(
        `INSERT INTO sync_log (machine_id, started_at, success, records_retrieved, records_saved)
         VALUES ($1, $2, false, 0, 0) RETURNING id`,
        [machineId, startTime]
      );
      const syncLogId = logResult.rows[0].id;

      zkInstance = await this.connectWithRetry(machine);
      const attendances = await zkInstance.getAttendances();
      await zkInstance.disconnect();

      const logs = attendances.data || [];
      const lastSyncTime = machine.last_sync_at ? new Date(machine.last_sync_at) : new Date(0);
      const newLogs = logs.filter(log => new Date(log.recordTime) > lastSyncTime);

      let recordsSaved = 0;
      const unmatchedUserIds = [];

      for (const log of newLogs) {
        const mappingResult = await pool.query(
          'SELECT person_id, person_type FROM user_machine_mapping WHERE machine_user_id = $1',
          [log.deviceUserId]
        );

        if (mappingResult.rows.length === 0) {
          if (!unmatchedUserIds.includes(log.deviceUserId)) {
            unmatchedUserIds.push(log.deviceUserId);
          }
          continue;
        }

        const mapping = mappingResult.rows[0];
        const attendanceDate = new Date(log.recordTime).toISOString().split('T')[0];

        await pool.query(
          `INSERT INTO dual_mode_attendance (person_id, person_type, date, status, source_type, source_machine_ip, timestamp)
           VALUES ($1, $2, $3, 'present', 'machine', $4, $5)
           ON CONFLICT DO NOTHING`,
          [mapping.person_id, mapping.person_type, attendanceDate, machine.ip_address, log.recordTime]
        );
        recordsSaved++;
      }

      await pool.query(
        `UPDATE sync_log SET completed_at = $1, success = true, records_retrieved = $2, records_saved = $3
         WHERE id = $4`,
        [new Date(), newLogs.length, recordsSaved, syncLogId]
      );

      await pool.query(
        'UPDATE machine_config SET last_sync_at = $1 WHERE id = $2',
        [new Date(), machineId]
      );

      await pool.query(
        `INSERT INTO attendance_audit_log (operation_type, performed_by, details)
         VALUES ('machine_sync', 'system', $1)`,
        [JSON.stringify({ machineId, recordsRetrieved: newLogs.length, recordsSaved, unmatchedUserIds })]
      );

      return {
        success: true,
        recordsRetrieved: newLogs.length,
        recordsSaved,
        unmatchedUserIds,
        errors: []
      };

    } catch (error) {
      console.error('Machine sync failed:', error);
      
      if (syncLogId) {
        await pool.query(
          `UPDATE sync_log SET completed_at = $1, success = false, error_message = $2 WHERE id = $3`,
          [new Date(), error.message, syncLogId]
        );
      }

      if (zkInstance) {
        try { await zkInstance.disconnect(); } catch (e) {}
      }

      return {
        success: false,
        recordsRetrieved: 0,
        recordsSaved: 0,
        unmatchedUserIds: [],
        errors: [error.message]
      };
    }
  }

  async getUnmappedUserIds() {
    try {
      const result = await pool.query(
        `SELECT DISTINCT machine_user_id 
         FROM (SELECT DISTINCT deviceUserId as machine_user_id FROM dual_mode_attendance WHERE source_type = 'machine') AS machine_users
         WHERE machine_user_id NOT IN (SELECT machine_user_id FROM user_machine_mapping)`
      );
      return { unmappedIds: result.rows.map(r => r.machine_user_id) };
    } catch (error) {
      console.error('Error getting unmapped user IDs:', error);
      return { unmappedIds: [] };
    }
  }
}

module.exports = new MachineSyncService();
