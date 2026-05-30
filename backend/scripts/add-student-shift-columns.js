const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

async function addStudentShiftColumns() {
  try {
    console.log('\n========================================');
    console.log('🔄 Adding Shift Support to Student Attendance');
    console.log('========================================\n');

    // Read and execute the SQL file
    const sqlPath = path.join(__dirname, '../database/add_student_shift_columns.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await pool.query(sql);

    console.log('✅ Shift columns added to academic_student_attendance_settings');
    console.log('✅ Created academic_class_shift_assignment table');
    console.log('✅ Added shift_number column to academic_student_attendance');
    console.log('✅ Created indexes');

    // Update existing settings with default shift times
    const updateResult = await pool.query(`
      UPDATE academic_student_attendance_settings
      SET 
        shift1_check_in_start = check_in_start_time,
        shift1_check_in_end = check_in_end_time,
        shift1_late_threshold = late_threshold_time,
        shift1_absent_marking = absent_marking_time,
        shift2_check_in_start = '13:00:00',
        shift2_check_in_end = '14:30:00',
        shift2_late_threshold = '14:00:00',
        shift2_absent_marking = '15:00:00'
      WHERE id = (SELECT id FROM academic_student_attendance_settings ORDER BY id DESC LIMIT 1)
      RETURNING *
    `);

    if (updateResult.rows.length > 0) {
      console.log('✅ Updated settings with default shift times');
      console.log('\nShift 1 Times:');
      console.log(`  Check-in: ${updateResult.rows[0].shift1_check_in_start} - ${updateResult.rows[0].shift1_check_in_end}`);
      console.log(`  Late Threshold: ${updateResult.rows[0].shift1_late_threshold}`);
      console.log(`  Auto-Absent: ${updateResult.rows[0].shift1_absent_marking}`);
      console.log('\nShift 2 Times:');
      console.log(`  Check-in: ${updateResult.rows[0].shift2_check_in_start} - ${updateResult.rows[0].shift2_check_in_end}`);
      console.log(`  Late Threshold: ${updateResult.rows[0].shift2_late_threshold}`);
      console.log(`  Auto-Absent: ${updateResult.rows[0].shift2_absent_marking}`);
    }

    // Get all classes and assign them to Shift 1 by default
    const classesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'classes_schema'
      ORDER BY table_name
    `);

    console.log(`\n📋 Found ${classesResult.rows.length} classes`);

    for (const row of classesResult.rows) {
      const className = row.table_name;
      
      await pool.query(`
        INSERT INTO academic_class_shift_assignment (class_name, shift_number)
        VALUES ($1, 1)
        ON CONFLICT (class_name) DO NOTHING
      `, [className]);
    }

    console.log('✅ Assigned all classes to Shift 1 by default');

    console.log('\n========================================');
    console.log('✅ Student Attendance Shift Support Complete');
    console.log('========================================\n');
    console.log('Next Steps:');
    console.log('1. Go to Student Attendance Time Settings page');
    console.log('2. Configure times for Shift 1 and Shift 2');
    console.log('3. Assign classes to their respective shifts');
    console.log('4. Attendance will automatically use shift-specific times\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding shift columns:', error);
    process.exit(1);
  }
}

addStudentShiftColumns();
