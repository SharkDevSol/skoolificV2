/**
 * Check All Attendance Tables
 * 
 * This script checks what attendance data exists in the database
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkAttendanceTables() {
  console.log('🔍 Checking Attendance Tables...\n');

  try {
    // Check hr_ethiopian_attendance
    console.log('📋 Table: hr_ethiopian_attendance');
    const result1 = await pool.query('SELECT COUNT(*) FROM hr_ethiopian_attendance');
    console.log(`   Records: ${result1.rows[0].count}`);
    
    if (parseInt(result1.rows[0].count) > 0) {
      const sample = await pool.query('SELECT * FROM hr_ethiopian_attendance LIMIT 3');
      console.log('   Sample records:');
      sample.rows.forEach(row => {
        console.log(`   - ${row.staff_name}: Day ${row.ethiopian_day}, Month ${row.ethiopian_month}, Year ${row.ethiopian_year}, Status: ${row.status}`);
      });
    }
    
    console.log('\n');
    
    // Check staff_attendance_ethiopian (if exists)
    try {
      console.log('📋 Table: staff_attendance_ethiopian');
      const result2 = await pool.query('SELECT COUNT(*) FROM staff_attendance_ethiopian');
      console.log(`   Records: ${result2.rows[0].count}`);
    } catch (err) {
      console.log('   Table does not exist');
    }
    
    console.log('\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkAttendanceTables();
