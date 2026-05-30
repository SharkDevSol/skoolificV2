/**
 * Delete All Attendance Data
 * 
 * This script deletes all attendance records from the database
 * Use this to start fresh for testing
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function deleteAllAttendance() {
  console.log('🗑️  Deleting All Attendance Data...\n');

  try {
    console.log('📋 Deleting from hr_ethiopian_attendance table...');
    
    const result = await pool.query('DELETE FROM hr_ethiopian_attendance');
    
    console.log(`✅ Deleted ${result.rowCount} attendance records`);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ ATTENDANCE DATA CLEARED!');
    console.log('='.repeat(60));
    console.log('\n📋 You can now test with a clean slate:');
    console.log('   1. Go to HR → Attendance System');
    console.log('   2. All cells should be empty');
    console.log('   3. Mark attendance to test');
    console.log('\n');

  } catch (error) {
    console.error('❌ Error deleting attendance:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the deletion
deleteAllAttendance()
  .then(() => {
    console.log('✅ Deletion completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Deletion failed:', error);
    process.exit(1);
  });
