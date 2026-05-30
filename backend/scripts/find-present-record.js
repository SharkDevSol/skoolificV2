// Script to find the PRESENT record
const pool = require('../config/db');

async function findPresentRecord() {
  console.log('\n========================================');
  console.log('🔍 Finding PRESENT Record');
  console.log('========================================\n');

  try {
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
        check_in_time,
        status,
        notes,
        created_at
      FROM academic_student_attendance
      WHERE status = 'PRESENT'
      ORDER BY created_at DESC
    `);

    if (result.rows.length === 0) {
      console.log('❌ No PRESENT records found');
    } else {
      console.log(`✅ Found ${result.rows.length} PRESENT record(s):\n`);
      
      result.rows.forEach((record, index) => {
        console.log(`Record ${index + 1}:`);
        console.log(`  Student: ${record.student_name} (ID: ${record.student_id})`);
        console.log(`  Class: ${record.class_name}`);
        console.log(`  Machine ID: ${record.smachine_id}`);
        console.log(`  Date: ${record.ethiopian_day}/${record.ethiopian_month}/${record.ethiopian_year} (${record.day_of_week})`);
        console.log(`  Check-in Time: ${record.check_in_time}`);
        console.log(`  Status: ${record.status}`);
        console.log(`  Notes: ${record.notes}`);
        console.log(`  Created: ${record.created_at}`);
        console.log('');
      });
    }

    console.log('========================================\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

findPresentRecord();
