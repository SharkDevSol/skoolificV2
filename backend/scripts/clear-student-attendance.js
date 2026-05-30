// Script to clear all student attendance records
const pool = require('../config/db');

async function clearStudentAttendance() {
  console.log('\n========================================');
  console.log('🗑️  Clearing Student Attendance Records');
  console.log('========================================\n');

  try {
    // First, show current count
    const countResult = await pool.query(`
      SELECT COUNT(*) as total FROM academic_student_attendance
    `);
    
    const totalRecords = countResult.rows[0].total;
    console.log(`📊 Current records: ${totalRecords}\n`);

    if (totalRecords === 0) {
      console.log('✅ No records to delete. Database is already empty.\n');
      return;
    }

    // Show breakdown by status
    const statusResult = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM academic_student_attendance
      GROUP BY status
      ORDER BY status
    `);

    console.log('Breakdown by status:');
    statusResult.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.count}`);
    });
    console.log('');

    // Delete all records
    console.log('🗑️  Deleting all records...\n');
    
    const deleteResult = await pool.query(`
      DELETE FROM academic_student_attendance
    `);

    console.log('========================================');
    console.log('✅ Successfully deleted all records!');
    console.log('========================================');
    console.log(`   Total deleted: ${totalRecords}`);
    console.log('   Database is now empty');
    console.log('========================================\n');

    // Verify deletion
    const verifyResult = await pool.query(`
      SELECT COUNT(*) as total FROM academic_student_attendance
    `);
    
    const remainingRecords = verifyResult.rows[0].total;
    
    if (remainingRecords === 0) {
      console.log('✅ Verification: Database is empty\n');
    } else {
      console.log(`⚠️  Warning: ${remainingRecords} records still remain\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

clearStudentAttendance();
