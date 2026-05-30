// Simple script to drop the old attendance table
// It will be recreated automatically with the new structure

const pool = require('../config/db');

async function dropAttendanceTable() {
  try {
    console.log('🗑️  Dropping old attendance table...');

    await pool.query(`DROP TABLE IF EXISTS hr_ethiopian_attendance;`);

    console.log('✅ Table dropped successfully!');
    console.log('📝 The table will be recreated automatically with the new structure when you mark attendance.');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run
dropAttendanceTable()
  .then(() => {
    console.log('\n✅ Done! Restart your backend server and try again.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
