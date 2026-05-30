const machineSyncService = require('../services/machineSyncService');
require('dotenv').config();

async function testMachineConnection() {
  console.log('🔌 Testing AI06 Machine Connection...\n');
  
  const machineId = 'machine-001';
  
  try {
    console.log(`Testing connection to machine: ${machineId}`);
    const result = await machineSyncService.testConnection(machineId);
    
    if (result.success) {
      console.log('\n✅ CONNECTION SUCCESSFUL!\n');
      console.log('Machine Information:');
      console.log('-------------------');
      console.log(`Serial Number: ${result.machineInfo.serialNumber}`);
      console.log(`Firmware Version: ${result.machineInfo.firmwareVersion}`);
      console.log('\n🎉 Your machine is ready to sync attendance!');
      console.log('\nNext steps:');
      console.log('1. Map student/staff IDs to machine user IDs');
      console.log('2. Run sync to pull attendance logs');
    } else {
      console.log('\n❌ CONNECTION FAILED\n');
      console.log(`Error: ${result.message}`);
      console.log('\nTroubleshooting:');
      console.log('1. Check if machine is powered on');
      console.log('2. Verify machine is connected to same network');
      console.log('3. Confirm IP address in machine_config table');
      console.log('4. Check if port 4370 is accessible');
    }
    
  } catch (error) {
    console.error('\n❌ TEST FAILED\n');
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

testMachineConnection();
