const pool = require('../config/db');

async function showAllLogs() {
  try {
    console.log('\n========================================');
    console.log('📊 ALL BACKEND LOGS SUMMARY');
    console.log('========================================\n');

    // 1. Show hr_ethiopian_attendance logs (Attendance System)
    console.log('1️⃣  HR ETHIOPIAN ATTENDANCE (Attendance System Page)');
    console.log('─────────────────────────────────────────────────────');
    
    const ethAttendance = await pool.query(`
      SELECT 
        staff_id,
        staff_name,
        ethiopian_year,
        ethiopian_month,
        ethiopian_day,
        check_in,
        check_out,
        status,
        notes,
        created_at
      FROM hr_ethiopian_attendance
      ORDER BY created_at DESC
      LIMIT 50
    `);

    console.log(`Total records: ${ethAttendance.rows.length}`);
    console.log('');
    
    if (ethAttendance.rows.length > 0) {
      console.log('Recent records:');
      ethAttendance.rows.forEach((row, index) => {
        console.log(`\n${index + 1}. ${row.staff_name} (ID: ${row.staff_id})`);
        console.log(`   Date: ${row.ethiopian_day}/${row.ethiopian_month}/${row.ethiopian_year}`);
        console.log(`   Check-in: ${row.check_in || 'N/A'} | Check-out: ${row.check_out || 'N/A'}`);
        console.log(`   Status: ${row.status}`);
        console.log(`   Notes: ${row.notes || 'None'}`);
        console.log(`   Created: ${row.created_at}`);
      });
    } else {
      console.log('❌ No records found');
    }

    // 2. Show dual_mode_attendance logs
    console.log('\n\n2️⃣  DUAL MODE ATTENDANCE (Machine Logs)');
    console.log('─────────────────────────────────────────────────────');
    
    const dualMode = await pool.query(`
      SELECT 
        person_id,
        person_type,
        date,
        status,
        source_type,
        source_machine_ip,
        timestamp,
        created_at
      FROM dual_mode_attendance
      ORDER BY timestamp DESC
      LIMIT 50
    `);

    console.log(`Total records: ${dualMode.rows.length}`);
    console.log('');
    
    if (dualMode.rows.length > 0) {
      console.log('Recent records:');
      dualMode.rows.forEach((row, index) => {
        console.log(`\n${index + 1}. Person ID: ${row.person_id} (${row.person_type})`);
        console.log(`   Date: ${row.date}`);
        console.log(`   Status: ${row.status}`);
        console.log(`   Source: ${row.source_type} from ${row.source_machine_ip}`);
        console.log(`   Timestamp: ${row.timestamp}`);
      });
    } else {
      console.log('❌ No records found');
    }

    // 3. Show attendance audit log
    console.log('\n\n3️⃣  ATTENDANCE AUDIT LOG');
    console.log('─────────────────────────────────────────────────────');
    
    try {
      const auditLog = await pool.query(`
        SELECT 
          operation_type,
          performed_by,
          details,
          timestamp
        FROM attendance_audit_log
        ORDER BY timestamp DESC
        LIMIT 30
      `);

      console.log(`Total records: ${auditLog.rows.length}`);
      console.log('');
      
      if (auditLog.rows.length > 0) {
        console.log('Recent audit entries:');
        auditLog.rows.forEach((row, index) => {
          console.log(`\n${index + 1}. ${row.operation_type} by ${row.performed_by}`);
          console.log(`   Time: ${row.timestamp}`);
          try {
            const details = JSON.parse(row.details);
            console.log(`   Details:`, details);
          } catch (e) {
            console.log(`   Details: ${row.details}`);
          }
        });
      } else {
        console.log('❌ No audit records found');
      }
    } catch (err) {
      console.log('⚠️  Audit log table not accessible:', err.message);
    }

    // 4. Show statistics by source
    console.log('\n\n4️⃣  STATISTICS BY SOURCE');
    console.log('─────────────────────────────────────────────────────');
    
    const stats = await pool.query(`
      SELECT 
        source_type,
        COUNT(*) as count,
        MIN(timestamp) as first_log,
        MAX(timestamp) as last_log
      FROM dual_mode_attendance
      GROUP BY source_type
      ORDER BY count DESC
    `);

    if (stats.rows.length > 0) {
      stats.rows.forEach(row => {
        console.log(`\n${row.source_type}:`);
        console.log(`   Total logs: ${row.count}`);
        console.log(`   First log: ${row.first_log}`);
        console.log(`   Last log: ${row.last_log}`);
      });
    } else {
      console.log('❌ No statistics available');
    }

    // 5. Show statistics by staff (Ethiopian attendance)
    console.log('\n\n5️⃣  STATISTICS BY STAFF (Attendance System)');
    console.log('─────────────────────────────────────────────────────');
    
    const staffStats = await pool.query(`
      SELECT 
        staff_id,
        staff_name,
        COUNT(*) as total_days,
        COUNT(CASE WHEN status = 'PRESENT' THEN 1 END) as present_days,
        COUNT(CASE WHEN status = 'ABSENT' THEN 1 END) as absent_days,
        COUNT(CASE WHEN status = 'LATE' THEN 1 END) as late_days,
        COUNT(CASE WHEN check_out IS NULL THEN 1 END) as no_checkout_days
      FROM hr_ethiopian_attendance
      WHERE ethiopian_year = 2018 AND ethiopian_month = 6
      GROUP BY staff_id, staff_name
      ORDER BY staff_name
    `);

    if (staffStats.rows.length > 0) {
      console.log(`\nYekatit 2018 Summary:`);
      staffStats.rows.forEach(row => {
        console.log(`\n${row.staff_name} (${row.staff_id}):`);
        console.log(`   Total days: ${row.total_days}`);
        console.log(`   Present: ${row.present_days} | Absent: ${row.absent_days} | Late: ${row.late_days}`);
        console.log(`   No check-out: ${row.no_checkout_days}`);
      });
    } else {
      console.log('❌ No statistics for current month');
    }

    // 6. Show machine webhook log file
    console.log('\n\n6️⃣  MACHINE WEBHOOK LOG FILE');
    console.log('─────────────────────────────────────────────────────');
    
    const fs = require('fs');
    const path = require('path');
    const logFile = path.join(__dirname, '../machine-webhook-log.txt');
    
    if (fs.existsSync(logFile)) {
      const logContent = fs.readFileSync(logFile, 'utf8');
      const lines = logContent.split('\n');
      console.log(`Total lines: ${lines.length}`);
      console.log('\nLast 20 lines:');
      console.log(lines.slice(-20).join('\n'));
    } else {
      console.log('❌ No webhook log file found');
    }

    console.log('\n\n========================================');
    console.log('✅ LOG SUMMARY COMPLETE');
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error showing logs:', error);
    process.exit(1);
  }
}

showAllLogs();
