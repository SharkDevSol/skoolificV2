const ZKLib = require('node-zklib');

const host = '10.22.134.43';
const port = 5005;

async function testConnection() {
  console.log('🔌 Advanced ZKTeco Connection Test\n');
  console.log(`Target: ${host}:${port}\n`);
  console.log('='.repeat(60));
  
  // Test 1: Standard connection
  console.log('\n📝 Test 1: Standard Connection (timeout: 10s)');
  try {
    const zk1 = new ZKLib(host, port, 10000, 4000);
    console.log('   Creating socket...');
    await zk1.createSocket();
    console.log('   ✅ Socket created!');
    
    console.log('   Getting device info...');
    const info = await zk1.getInfo();
    console.log('   ✅ Device responded!');
    console.log('\n   📱 Device Information:');
    console.log(`   Serial: ${info.serialNumber || 'N/A'}`);
    console.log(`   Firmware: ${info.fwVersion || 'N/A'}`);
    console.log(`   Platform: ${info.platform || 'N/A'}`);
    
    await zk1.disconnect();
    console.log('   ✅ Test 1 PASSED!\n');
    return true;
  } catch (error) {
    console.log(`   ❌ Test 1 FAILED: ${error.message}\n`);
  }
  
  // Test 2: Longer timeout
  console.log('📝 Test 2: Extended Timeout (30s)');
  try {
    const zk2 = new ZKLib(host, port, 30000, 4000);
    console.log('   Creating socket with 30s timeout...');
    await zk2.createSocket();
    console.log('   ✅ Socket created!');
    
    const info = await zk2.getInfo();
    console.log('   ✅ Device responded!');
    console.log(`   Serial: ${info.serialNumber || 'N/A'}`);
    
    await zk2.disconnect();
    console.log('   ✅ Test 2 PASSED!\n');
    return true;
  } catch (error) {
    console.log(`   ❌ Test 2 FAILED: ${error.message}\n`);
  }
  
  // Test 3: Different inport
  console.log('📝 Test 3: Different Inport (5005)');
  try {
    const zk3 = new ZKLib(host, port, 10000, 5005);
    console.log('   Creating socket with inport 5005...');
    await zk3.createSocket();
    console.log('   ✅ Socket created!');
    
    const info = await zk3.getInfo();
    console.log('   ✅ Device responded!');
    console.log(`   Serial: ${info.serialNumber || 'N/A'}`);
    
    await zk3.disconnect();
    console.log('   ✅ Test 3 PASSED!\n');
    return true;
  } catch (error) {
    console.log(`   ❌ Test 3 FAILED: ${error.message}\n`);
  }
  
  // Test 4: Try getting attendances directly
  console.log('📝 Test 4: Direct Attendance Retrieval');
  try {
    const zk4 = new ZKLib(host, port, 10000, 4000);
    await zk4.createSocket();
    console.log('   Socket created, attempting to get attendances...');
    
    const attendances = await zk4.getAttendances();
    console.log(`   ✅ Retrieved ${attendances.data ? attendances.data.length : 0} attendance records!`);
    
    if (attendances.data && attendances.data.length > 0) {
      console.log('\n   Sample record:');
      console.log(`   User ID: ${attendances.data[0].deviceUserId}`);
      console.log(`   Time: ${attendances.data[0].recordTime}`);
    }
    
    await zk4.disconnect();
    console.log('   ✅ Test 4 PASSED!\n');
    return true;
  } catch (error) {
    console.log(`   ❌ Test 4 FAILED: ${error.message}\n`);
  }
  
  console.log('='.repeat(60));
  console.log('\n❌ All tests failed. Possible issues:');
  console.log('   1. Device firmware not compatible with node-zklib');
  console.log('   2. Device using different protocol version');
  console.log('   3. Port 5005 is not the ZKTeco protocol port');
  console.log('   4. Device requires authentication/password');
  console.log('\n💡 Alternative solutions:');
  console.log('   • Try accessing web interface: http://10.22.134.43');
  console.log('   • Check if device has SDK/API documentation');
  console.log('   • Try different ZKTeco library (zklib-js, zkteco-js)');
  console.log('   • Contact device manufacturer for protocol details\n');
  
  return false;
}

testConnection()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
