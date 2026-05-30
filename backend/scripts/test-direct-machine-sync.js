require('dotenv').config();
const directMachineSync = require('../services/directMachineSync');

/**
 * Test direct connection to AI06 machine
 */

async function testDirectSync() {
  console.log('🧪 Testing Direct Machine Connection\n');
  console.log('='.repeat(60));

  try {
    console.log('📊 Current Status:');
    const status = directMachineSync.getStatus();
    console.log(`   Running: ${status.isRunning}`);
    console.log(`   Last Sync: ${status.lastSyncTime || 'Never'}`);
    console.log(`   Machine: ${status.machineIP}:${status.machinePort}`);

    console.log('\n🔄 Running manual sync...\n');
    const result = await directMachineSync.syncNow();

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
        console.log('\n💡 Create user mappings for these IDs');
      } else {
        console.log('\n✅ All User IDs are mapped!');
      }

      if (result.message) {
        console.log(`\n📌 ${result.message}`);
      }
    } else {
      console.log(`❌ Error: ${result.error}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Test completed!');
    console.log('='.repeat(60));

    if (result.success && result.recordsSaved > 0) {
      console.log('\n🎉 SUCCESS! Direct machine connection is working!');
      console.log('\n📌 NEXT STEPS:');
      console.log('1. This bypasses AAS 6.0 completely!');
      console.log('2. Add to server.js to start automatically');
      console.log('3. Check-ins will sync every 2 minutes automatically!');
    } else if (result.success && result.recordsProcessed === 0) {
      console.log('\n✅ Connection works, but no new records found');
      console.log('💡 Try checking in on the machine, then run this test again');
    }

  } catch (error) {
    console.error('\n❌ TEST FAILED:');
    console.error(error);
    process.exit(1);
  }
}

// Run test
testDirectSync()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
