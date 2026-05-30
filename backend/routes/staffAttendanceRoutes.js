const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { getEndpointPath, API_ENDPOINTS } = require('../config/api.config');

// Clock In - Step 1 (Initial timestamp)
router.post('/clock-in/step1', async (req, res) => {
  const { staffId, role, name } = req.body;

  try {
    const timestamp = new Date();
    
    // For teachers, create a pending entry
    if (role === 'Teacher') {
      const result = await pool.query(
        `INSERT INTO staff_attendance_pending 
         (staff_id, staff_name, role, step1_timestamp, status) 
         VALUES ($1, $2, $3, $4, 'pending_step2')
         RETURNING *`,
        [staffId, name, role, timestamp]
      );
      
      return res.json({
        success: true,
        requiresStep2: true,
        pendingId: result.rows[0].id,
        step1Timestamp: timestamp,
        message: 'Step 1 complete. Please confirm arrival.'
      });
    }
    
    // For general staff, directly create attendance record
    const result = await pool.query(
      `INSERT INTO staff_attendance 
       (staff_id, staff_name, role, date, time_in) 
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [staffId, name, role, timestamp.toISOString().split('T')[0], timestamp]
    );
    
    res.json({
      success: true,
      requiresStep2: false,
      attendance: result.rows[0],
      message: 'Clocked in successfully'
    });
  } catch (error) {
    console.error('Clock in step 1 error:', error);
    res.status(500).json({ error: 'Failed to clock in', details: error.message });
  }
});

// Clock In - Step 2 (Teacher confirmation)
router.post('/clock-in/step2', async (req, res) => {
  const { pendingId, staffId } = req.body;

  try {
    const timestamp = new Date();
    
    // Get pending record
    const pendingResult = await pool.query(
      'SELECT * FROM staff_attendance_pending WHERE id = $1 AND staff_id = $2 AND status = $3',
      [pendingId, staffId, 'pending_step2']
    );
    
    if (pendingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pending attendance record not found' });
    }
    
    const pending = pendingResult.rows[0];
    
    // Create final attendance record with both timestamps
    const result = await pool.query(
      `INSERT INTO staff_attendance 
       (staff_id, staff_name, role, date, time_in, step1_timestamp, step2_timestamp, verification_status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'verified')
       RETURNING *`,
      [
        pending.staff_id,
        pending.staff_name,
        pending.role,
        timestamp.toISOString().split('T')[0],
        timestamp,
        pending.step1_timestamp,
        timestamp
      ]
    );
    
    // Mark pending as completed
    await pool.query(
      'UPDATE staff_attendance_pending SET status = $1, completed_at = $2 WHERE id = $3',
      ['completed', timestamp, pendingId]
    );
    
    res.json({
      success: true,
      attendance: result.rows[0],
      message: 'Teacher attendance verified and recorded'
    });
  } catch (error) {
    console.error('Clock in step 2 error:', error);
    res.status(500).json({ error: 'Failed to complete verification', details: error.message });
  }
});

// Clock Out
router.post('/clock-out', async (req, res) => {
  const { staffId } = req.body;

  try {
    const timestamp = new Date();
    const date = timestamp.toISOString().split('T')[0];
    
    // Find today's attendance record without time_out
    const result = await pool.query(
      `UPDATE staff_attendance 
       SET time_out = $1, updated_at = $2
       WHERE staff_id = $3 AND date = $4 AND time_out IS NULL
       RETURNING *`,
      [timestamp, timestamp, staffId, date]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No active clock-in found for today' });
    }
    
    res.json({
      success: true,
      attendance: result.rows[0],
      message: 'Clocked out successfully'
    });
  } catch (error) {
    console.error('Clock out error:', error);
    res.status(500).json({ error: 'Failed to clock out', details: error.message });
  }
});

// Get today's attendance status for a staff member
router.get('/status/:staffId', async (req, res) => {
  const { staffId } = req.params;

  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Check for completed attendance
    const attendanceResult = await pool.query(
      'SELECT * FROM staff_attendance WHERE staff_id = $1 AND date = $2',
      [staffId, today]
    );
    
    // Check for pending verification (teachers)
    const pendingResult = await pool.query(
      'SELECT * FROM staff_attendance_pending WHERE staff_id = $1 AND status = $2 AND DATE(step1_timestamp) = $3',
      [staffId, 'pending_step2', today]
    );
    
    res.json({
      hasClockIn: attendanceResult.rows.length > 0,
      hasClockOut: attendanceResult.rows.length > 0 && attendanceResult.rows[0].time_out !== null,
      hasPendingVerification: pendingResult.rows.length > 0,
      attendance: attendanceResult.rows[0] || null,
      pending: pendingResult.rows[0] || null
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: 'Failed to check status', details: error.message });
  }
});

// Get attendance records (with filters)
router.get('/records', async (req, res) => {
  const { staffId, startDate, endDate, role, date } = req.query;

  try {
    let query = 'SELECT * FROM staff_attendance WHERE 1=1';
    const params = [];
    let paramCount = 1;
    
    if (staffId) {
      query += ` AND staff_id = $${paramCount}`;
      params.push(staffId);
      paramCount++;
    }
    
    if (date) {
      query += ` AND date = $${paramCount}`;
      params.push(date);
      paramCount++;
    } else {
      if (startDate) {
        query += ` AND date >= $${paramCount}`;
        params.push(startDate);
        paramCount++;
      }
      
      if (endDate) {
        query += ` AND date <= $${paramCount}`;
        params.push(endDate);
        paramCount++;
      }
    }
    
    if (role) {
      query += ` AND role = $${paramCount}`;
      params.push(role);
      paramCount++;
    }
    
    query += ' ORDER BY date DESC, time_in DESC';
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      records: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Get records error:', error);
    res.status(500).json({ error: 'Failed to fetch records', details: error.message });
  }
});

// Get attendance summary/report
router.get('/summary', async (req, res) => {
  const { startDate, endDate, role } = req.query;

  try {
    let query = `
      SELECT 
        staff_id,
        staff_name,
        role,
        COUNT(*) as total_days,
        COUNT(CASE WHEN time_out IS NOT NULL THEN 1 END) as complete_days,
        COUNT(CASE WHEN time_out IS NULL THEN 1 END) as incomplete_days,
        AVG(EXTRACT(EPOCH FROM (time_out - time_in))/3600) as avg_hours
      FROM staff_attendance
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;
    
    if (startDate) {
      query += ` AND date >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }
    
    if (endDate) {
      query += ` AND date <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }
    
    if (role) {
      query += ` AND role = $${paramCount}`;
      params.push(role);
      paramCount++;
    }
    
    query += ' GROUP BY staff_id, staff_name, role ORDER BY staff_name';
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      summary: result.rows
    });
  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({ error: 'Failed to generate summary', details: error.message });
  }
});

// Cancel pending verification (if needed)
router.delete('/pending/:pendingId', async (req, res) => {
  const { pendingId } = req.params;

  try {
    const result = await pool.query(
      'UPDATE staff_attendance_pending SET status = $1 WHERE id = $2 RETURNING *',
      ['cancelled', pendingId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pending record not found' });
    }
    
    res.json({
      success: true,
      message: 'Pending verification cancelled'
    });
  } catch (error) {
    console.error('Cancel pending error:', error);
    res.status(500).json({ error: 'Failed to cancel', details: error.message });
  }
});

// Get staff profile for attendance
router.get('/profile/:staffId', async (req, res) => {
  const { staffId } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM staff_attendance_profiles WHERE staff_id = $1',
      [staffId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Staff profile not found' });
    }
    
    res.json({
      success: true,
      profile: result.rows[0]
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile', details: error.message });
  }
});

// Migrate existing staff to attendance system (one-time migration)
router.post('/migrate-existing-staff', async (req, res) => {
  try {
    // This will scan all staff tables and create attendance profiles
    const schemas = ['teachers', 'administrators', 'support_staff', 'general_staff'];
    let migratedCount = 0;
    let errors = [];

    for (const schema of schemas) {
      try {
        // Get all tables in this schema
        const tablesResult = await pool.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = $1 
          AND table_type = 'BASE TABLE'
        `, [schema]);

        for (const tableRow of tablesResult.rows) {
          const tableName = tableRow.table_name;
          
          try {
            // Get staff from this table
            const staffResult = await pool.query(`
              SELECT global_staff_id, name, role 
              FROM "${schema}"."${tableName}"
              WHERE global_staff_id IS NOT NULL 
              AND name IS NOT NULL
            `);

            for (const staff of staffResult.rows) {
              try {
                // Determine role
                const attendanceRole = staff.role || 
                                      (schema === 'teachers' ? 'Teacher' : 'General Staff');

                // Insert profile
                await pool.query(`
                  INSERT INTO staff_attendance_profiles 
                  (staff_id, staff_name, role, created_at)
                  VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                  ON CONFLICT (staff_id) DO NOTHING
                `, [staff.global_staff_id.toString(), staff.name, attendanceRole]);

                migratedCount++;
              } catch (e) {
                errors.push(`Failed for ${staff.name}: ${e.message}`);
              }
            }
          } catch (e) {
            errors.push(`Failed for table ${schema}.${tableName}: ${e.message}`);
          }
        }
      } catch (e) {
        errors.push(`Failed for schema ${schema}: ${e.message}`);
      }
    }

    res.json({
      success: true,
      message: `Migration completed. ${migratedCount} staff profiles created.`,
      migratedCount,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ error: 'Migration failed', details: error.message });
  }
});

module.exports = router;
