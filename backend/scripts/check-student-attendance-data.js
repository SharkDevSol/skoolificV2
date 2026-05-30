// Script to check student attendance data
const pool = require('../config/db');

async function checkStudentAttendanceData() {
  console.log('\n========================================');
  console.log('📊 Checking Student Attendance Data');
  console.log('========================================\n');

  try {
    // Get all student attendance records
    const result = await pool.query(`
      SELECT 
        student_id,
        student_name,
        class_name,
        smachine_id,
        ethiopian_year,
        ethiopian_month,
        ethiopian_day,
        day_of_week,
        week_number,
        check_in_time,
        status,
        notes,
        created_at
      FROM academic_student_attendance
      ORDER BY created_at DESC
      LIMIT 20
    `);

    console.log(`Found ${result.rows.length} recent attendance records:\n`);

    result.rows.forEach((record, index) => {
      console.log(`Record ${index + 1}:`);
      console.log(`  Student: ${record.student_name} (ID: ${record.student_id})`);
      console.log(`  Class: ${record.class_name}`);
      console.log(`  Machine ID: ${record.smachine_id}`);
      console.log(`  Date: ${record.ethiopian_day}/${record.ethiopian_month}/${record.ethiopian_year} (${record.day_of_week})`);
      console.log(`  Week: ${record.week_number}`);
      console.log(`  Check-in Time: ${record.check_in_time}`);
      console.log(`  Status: ${record.status}`);
      console.log(`  Notes: ${record.notes}`);
      console.log(`  Created: ${record.created_at}`);
      console.log('');
    });

    // Count by status
    const statusCount = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM academic_student_attendance
      GROUP BY status
      ORDER BY status
    `);

    console.log('========================================');
    console.log('Status Summary:');
    console.log('========================================\n');
    
    statusCount.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.count}`);
    });

    console.log('\n========================================\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkStudentAttendanceData();
