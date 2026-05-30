const pool = require('../config/db');

/**
 * ConflictResolutionService - Handles conflicts in device user management
 * Resolves duplicate entries, conflicting data, and synchronization issues
 */
class ConflictResolutionService {
  constructor() {
    this.initializeConflictTable();
  }

  /**
   * Initialize conflict tracking table
   */
  async initializeConflictTable() {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS device_user_conflicts (
          conflict_id SERIAL PRIMARY KEY,
          conflict_type VARCHAR(100) NOT NULL,
          person_id INTEGER,
          person_type VARCHAR(50),
          machine_user_id INTEGER,
          conflict_data JSONB NOT NULL,
          resolution_strategy VARCHAR(100),
          resolved BOOLEAN DEFAULT false,
          resolved_at TIMESTAMP,
          resolved_by VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_device_user_conflicts_resolved 
        ON device_user_conflicts(resolved)
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_device_user_conflicts_type 
        ON device_user_conflicts(conflict_type)
      `);

      console.log('✅ ConflictResolutionService: Conflict table initialized');
    } catch (error) {
      console.error('❌ ConflictResolutionService: Failed to initialize conflict table:', error.message);
    }
  }

  /**
   * Detect conflicts in device user mappings
   * @returns {Promise<{success: boolean, conflicts?: Array, error?: string}>}
   */
  async detectConflicts() {
    try {
      const conflicts = [];

      // Detect duplicate machine_user_id
      const duplicateMachineIds = await pool.query(`
        SELECT machine_user_id, COUNT(*) as count
        FROM user_machine_mapping
        GROUP BY machine_user_id
        HAVING COUNT(*) > 1
      `);

      for (const row of duplicateMachineIds.rows) {
        const details = await pool.query(`
          SELECT * FROM user_machine_mapping
          WHERE machine_user_id = $1
        `, [row.machine_user_id]);

        conflicts.push({
          type: 'duplicate_machine_id',
          machineUserId: row.machine_user_id,
          count: parseInt(row.count),
          records: details.rows
        });
      }

      // Detect duplicate person mappings
      const duplicatePersons = await pool.query(`
        SELECT person_id, person_type, COUNT(*) as count
        FROM user_machine_mapping
        GROUP BY person_id, person_type
        HAVING COUNT(*) > 1
      `);

      for (const row of duplicatePersons.rows) {
        const details = await pool.query(`
          SELECT * FROM user_machine_mapping
          WHERE person_id = $1 AND person_type = $2
        `, [row.person_id, row.person_type]);

        conflicts.push({
          type: 'duplicate_person',
          personId: row.person_id,
          personType: row.person_type,
          count: parseInt(row.count),
          records: details.rows
        });
      }

      // Log conflicts
      for (const conflict of conflicts) {
        await this.logConflict(conflict);
      }

      return {
        success: true,
        conflicts
      };
    } catch (error) {
      console.error('Error detecting conflicts:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Log a conflict
   * @param {Object} conflict - The conflict to log
   * @returns {Promise<{success: boolean, conflictId?: number, error?: string}>}
   */
  async logConflict(conflict) {
    try {
      const result = await pool.query(`
        INSERT INTO device_user_conflicts 
        (conflict_type, person_id, person_type, machine_user_id, conflict_data)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING conflict_id
      `, [
        conflict.type,
        conflict.personId || null,
        conflict.personType || null,
        conflict.machineUserId || null,
        JSON.stringify(conflict)
      ]);

      return {
        success: true,
        conflictId: result.rows[0].conflict_id
      };
    } catch (error) {
      console.error('Error logging conflict:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Resolve a conflict
   * @param {number} conflictId - The conflict ID to resolve
   * @param {string} strategy - Resolution strategy
   * @param {string} resolvedBy - Who resolved the conflict
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async resolveConflict(conflictId, strategy, resolvedBy = 'system') {
    try {
      // Get conflict details
      const conflictResult = await pool.query(`
        SELECT * FROM device_user_conflicts WHERE conflict_id = $1
      `, [conflictId]);

      if (conflictResult.rows.length === 0) {
        return {
          success: false,
          error: 'Conflict not found'
        };
      }

      const conflict = conflictResult.rows[0];
      const conflictData = conflict.conflict_data;

      // Apply resolution strategy
      let resolved = false;

      switch (strategy) {
        case 'keep_first':
          resolved = await this.resolveKeepFirst(conflictData);
          break;
        case 'keep_last':
          resolved = await this.resolveKeepLast(conflictData);
          break;
        case 'merge':
          resolved = await this.resolveMerge(conflictData);
          break;
        case 'manual':
          // Manual resolution - just mark as resolved
          resolved = true;
          break;
        default:
          return {
            success: false,
            error: 'Unknown resolution strategy'
          };
      }

      if (resolved) {
        // Mark conflict as resolved
        await pool.query(`
          UPDATE device_user_conflicts
          SET resolved = true,
              resolved_at = CURRENT_TIMESTAMP,
              resolved_by = $2,
              resolution_strategy = $3
          WHERE conflict_id = $1
        `, [conflictId, resolvedBy, strategy]);

        return { success: true };
      } else {
        return {
          success: false,
          error: 'Failed to apply resolution strategy'
        };
      }
    } catch (error) {
      console.error('Error resolving conflict:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Resolve by keeping first record
   */
  async resolveKeepFirst(conflictData) {
    try {
      if (!conflictData.records || conflictData.records.length < 2) {
        return false;
      }

      const keepRecord = conflictData.records[0];
      const deleteRecords = conflictData.records.slice(1);

      for (const record of deleteRecords) {
        await pool.query(`
          DELETE FROM user_machine_mapping
          WHERE person_id = $1 AND person_type = $2 AND machine_user_id = $3
        `, [record.person_id, record.person_type, record.machine_user_id]);
      }

      return true;
    } catch (error) {
      console.error('Error in resolveKeepFirst:', error);
      return false;
    }
  }

  /**
   * Resolve by keeping last record
   */
  async resolveKeepLast(conflictData) {
    try {
      if (!conflictData.records || conflictData.records.length < 2) {
        return false;
      }

      const keepRecord = conflictData.records[conflictData.records.length - 1];
      const deleteRecords = conflictData.records.slice(0, -1);

      for (const record of deleteRecords) {
        await pool.query(`
          DELETE FROM user_machine_mapping
          WHERE person_id = $1 AND person_type = $2 AND machine_user_id = $3
        `, [record.person_id, record.person_type, record.machine_user_id]);
      }

      return true;
    } catch (error) {
      console.error('Error in resolveKeepLast:', error);
      return false;
    }
  }

  /**
   * Resolve by merging records
   */
  async resolveMerge(conflictData) {
    try {
      if (!conflictData.records || conflictData.records.length < 2) {
        return false;
      }

      // Keep the most recently synced record
      const sortedRecords = conflictData.records.sort((a, b) => {
        const timeA = a.last_sync_time ? new Date(a.last_sync_time) : new Date(0);
        const timeB = b.last_sync_time ? new Date(b.last_sync_time) : new Date(0);
        return timeB - timeA;
      });

      const keepRecord = sortedRecords[0];
      const deleteRecords = sortedRecords.slice(1);

      for (const record of deleteRecords) {
        await pool.query(`
          DELETE FROM user_machine_mapping
          WHERE person_id = $1 AND person_type = $2 AND machine_user_id = $3
        `, [record.person_id, record.person_type, record.machine_user_id]);
      }

      return true;
    } catch (error) {
      console.error('Error in resolveMerge:', error);
      return false;
    }
  }

  /**
   * Get all unresolved conflicts
   * @returns {Promise<Array>}
   */
  async getUnresolvedConflicts() {
    try {
      const result = await pool.query(`
        SELECT * FROM device_user_conflicts
        WHERE resolved = false
        ORDER BY created_at DESC
      `);

      return result.rows;
    } catch (error) {
      console.error('Error getting unresolved conflicts:', error);
      return [];
    }
  }

  /**
   * Get conflict statistics
   * @returns {Promise<Object>}
   */
  async getStatistics() {
    try {
      const result = await pool.query(`
        SELECT 
          conflict_type,
          resolved,
          COUNT(*) as count
        FROM device_user_conflicts
        GROUP BY conflict_type, resolved
      `);

      const stats = {
        total: 0,
        resolved: 0,
        unresolved: 0,
        byType: {}
      };

      result.rows.forEach(row => {
        const count = parseInt(row.count);
        stats.total += count;

        if (row.resolved) {
          stats.resolved += count;
        } else {
          stats.unresolved += count;
        }

        if (!stats.byType[row.conflict_type]) {
          stats.byType[row.conflict_type] = { resolved: 0, unresolved: 0 };
        }

        if (row.resolved) {
          stats.byType[row.conflict_type].resolved += count;
        } else {
          stats.byType[row.conflict_type].unresolved += count;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error getting conflict statistics:', error);
      return {
        total: 0,
        resolved: 0,
        unresolved: 0,
        byType: {}
      };
    }
  }
}

module.exports = new ConflictResolutionService();
