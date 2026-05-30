require('dotenv').config();
const aasRealtimeSync = require('../services/aasRealtimeSync');

/**
 * Test real-time sync from AAS 6.0 database
 */

async function testSync() {
  console.log('🧪 Testing AAS 6.0 Real-Time Sync\n');
  console.log('='.repeat(60));

  try {
    console.log('📊 Current Status:');
    const status = aasRealtimeSync.getStatus();
    console.log(`   Running: ${status.isRunning}`);
    console.log(`   Last Sync: ${status.lastSyncTime || 'Never'}`);
    console.log(`   Database: ${status.dbPath}`);

    console.log('\n🔄 Running manual sync...\n');
    const result = await aasRealtimeSync.syncNow();

    console.log('='.repeat(60));
    console.log('📋 SYNC RESULTS:');
    console.log('='.repeat(60));
    console.log(`✅ Success: ${result.success}`);
    
    if (result.success) {
      console.log(`📝 Records Processed: ${result.recordsProcessed}`);
      console.log(`💾 Records Saved: ${result.recordsSaved}`);
      
      if (result.unmappedUserIds && result.unmappedUserIds.length > 0) {
        console.log(`\n⚠️  Unmapped User IDs (${result.unmappedUserIds.length}):`);
        result.unmappedUserIds.forEach(id => {
          console.log(`   - User ID: ${id}`);
        });
        console.log('\n💡 Create user mappings for these IDs to sync their attendance');
      } else {
        console.log('\n✅ All User IDs are mapped!');
      }

      if (result.message) {
        console.log(`\n📌 ${result.message}`);
      }
    } else {
      console.log(`❌ Error: ${result.error}`);
      
      if (result.availableTables) {
        console.log(`\n📊 Available tables in database:`);
        result.availableTables.forEach(table => {
          console.log(`   - ${table}`);
        });
        console.log('\n💡 Run: npm run inspect:aas-database');
        console.log('   to see the full database structure');
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Test completed!');
    console.log('='.repeat(60));

    if (result.success && result.recordsSaved > 0) {
      console.log('\n🎉 SUCCESS! Real-time sync is working!');
      console.log('\n📌 NEXT STEPS:');
      console.log('1. Start automatic sync: POST /api/machine-attendance/realtime-sync/start');
      console.log('2. Or add to server.js to start on server boot');
      console.log('3. Check-ins will now appear automatically within 2 minutes!');
    } else if (result.success && result.recordsProcessed === 0) {
      console.log('\n✅ Sync is working, but no new records found');
      console.log('💡 Try checking in on the AI06 machine, then run this test again');
    }

  } catch (error) {
    console.error('\n❌ TEST FAILED:');
    console.error(error);
    
    console.log('\n🔧 TROUBLESHOOTING:');
    console.log('1. Close AAS 6.0 software if it\'s open');
    console.log('2. Check database path: C:\\AttendanceF\\tmkq.mdb');
    console.log('3. Run: npm run inspect:aas-database');
    console.log('4. Ensure user mappings exist');
    
    process.exit(1);
  }
}

// Run test
testSync()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
