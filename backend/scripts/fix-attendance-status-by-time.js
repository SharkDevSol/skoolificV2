const pool = require('../config/db');

async function fixAttendanceStatusByTime() {
  try {
    console.log('\n========================================');
    console.log('🔧 Fixing Attendance Status Based on Check-in Time');
    console.log('========================================\n');

    // Get settings
    const settingsResult = await pool.query(
      'SELECT shift1_late_threshold, shift2_late_threshold FROM academic_student_attendance_settings ORDER BY id DESC LIMIT 1'
    );

    if (settingsResult.rows.length === 0) {
      console.log('❌ No settings found');
      process.exit(1);
    }

    const settings = settingsResult.rows[0];
    console.log('⚙️  Settings loaded:');
    console.log(`   Shift 1 Late Threshold: ${settings.shift1_late_threshold}`);
    console.log(`   Shift 2 Late Threshold: ${settings.shift2_late_threshold}\n`);

    // Get all attendance records with PRESENT or LATE status
    const recordsResult = await pool.query(`
      SELECT 
        a.*,
        COALESCE(c.shift_number, 1) as shift_number
      FROM academic_student_attendance a
      LEFT JOIN academic_class_shift_assignment c ON c.class_name = a.class_name
      WHERE a.status IN ('PRESENT', 'LATE')
        AND a.check_in_time IS NOT NULL
      ORDER BY a.ethiopian_year DESC, a.ethiopian_month DESC, a.ethiopian_day DESC
    `);

    console.log(`📊 Found ${recordsResult.rows.length} records to check\n`);

    let correctedCount = 0;
    let alreadyCorrectCount = 0;

    for (const record of recordsResult.rows) {
      const shiftNumber = record.shift_number || 1;
      const lateThreshold = shiftNumber === 2 
        ? settings.shift2_late_threshold 
        : settings.shift1_late_threshold;
      
      const checkInTime = record.check_in_time.substring(0, 5); // HH:MM
      const lateThresholdTime = lateThreshold.substring(0, 5); // HH:MM
      
      let correctStatus;
      if (checkInTime > lateThresholdTime) {
        correctStatus = 'LATE';
      } else {
        correctStatus = 'PRESENT';
      }

      if (record.status !== correctStatus) {
        // Update the record
        await pool.query(`
          UPDATE academic_student_attendance
          SET status = $1, updated_at = NOW()
          WHERE id = $2
        `, [correctStatus, record.id]);

        console.log(`✅ Corrected: ${record.student_name} (${record.class_name})`);
        console.log(`   Date: ${record.ethiopian_day}/${record.ethiopian_month}/${record.ethiopian_year}`);
        console.log(`   Check-in: ${checkInTime}, Threshold: ${lateThresholdTime} (Shift ${shiftNumber})`);
        console.log(`   Status: ${record.status} → ${correctStatus}\n`);
        
        correctedCount++;
      } else {
        alreadyCorrectCount++;
      }
    }

    console.log('========================================');
    console.log('📊 Summary:');
    console.log(`   Total Records Checked: ${recordsResult.rows.length}`);
    console.log(`   Corrected: ${correctedCount}`);
    console.log(`   Already Correct: ${alreadyCorrectCount}`);
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixAttendanceStatusByTime();
