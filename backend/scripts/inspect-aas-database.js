require('dotenv').config();
const aasRealtimeSync = require('../services/aasRealtimeSync');

/**
 * Inspect AAS 6.0 database structure
 * Shows tables, columns, and sample data
 */

async function inspectDatabase() {
  console.log('🔍 Inspecting AAS 6.0 Database Structure\n');
  console.log('='.repeat(70));
  console.log('Database: C:\\AttendanceF\\tmkq.mdb');
  console.log('='.repeat(70));

  try {
    const structure = await aasRealtimeSync.inspectDatabase();

    console.log(`\n📊 Found ${Object.keys(structure).length} tables:\n`);

    for (const [tableName, info] of Object.entries(structure)) {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`📋 Table: ${tableName}`);
      console.log(`${'='.repeat(70)}`);
      console.log(`Rows: ${info.rowCount}`);
      console.log(`Columns: ${info.columns.join(', ')}`);

      if (info.sampleData && info.sampleData.length > 0) {
        console.log(`\n📝 Sample Data (first ${info.sampleData.length} rows):`);
        info.sampleData.forEach((row, index) => {
          console.log(`\n  Row ${index + 1}:`);
          for (const [key, value] of Object.entries(row)) {
            console.log(`    ${key}: ${value}`);
          }
        });
      }
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log('✅ Inspection complete!');
    console.log('='.repeat(70));

    console.log('\n💡 NEXT STEPS:');
    console.log('1. Look for the attendance/check-in table above');
    console.log('2. Note the column names (USERID, CHECKTIME, etc.)');
    console.log('3. Run: npm run test:realtime-sync');
    console.log('4. If successful, start auto-sync in your application');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nPossible issues:');
    console.error('- AAS 6.0 software is currently open (close it and try again)');
    console.error('- Database file is locked');
    console.error('- Incorrect database path');
    process.exit(1);
  }
}

// Run inspection
inspectDatabase()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
