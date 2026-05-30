const axios = require('axios');

/**
 * Complete test for AI06 machine connection
 * Tests if machine can reach your server
 */

const LAPTOP_IP = '10.22.134.159';
const SERVER_PORT = '5000';
const MACHINE_IP = '10.22.134.43';

console.log('🧪 AI06 Machine Connection Test\n');
console.log('='.repeat(70));
console.log(`Laptop IP: ${LAPTOP_IP}`);
console.log(`Server Port: ${SERVER_PORT}`);
console.log(`Machine IP: ${MACHINE_IP}`);
console.log('='.repeat(70));

async function runTests() {
  let allPassed = true;

  // Test 1: Check if server is running
  console.log('\n📋 Test 1: Check if your server is running...');
  try {
    const response = await axios.get(`http://localhost:${SERVER_PORT}/api/health`, {
      timeout: 3000
    });
    console.log('✅ PASS: Server is running');
    console.log(`   Response: ${response.data.message}`);
  } catch (error) {
    console.log('❌ FAIL: Server is not running');
    console.log(`   Error: ${error.message}`);
    console.log('\n💡 Solution: Run "npm start" in backend folder');
    allPassed = false;
    return;
  }

  // Test 2: Check webhook endpoint
  console.log('\n📋 Test 2: Check webhook endpoint...');
  try {
    const response = await axios.get(`http://localhost:${SERVER_PORT}/api/machine-webhook/health`, {
      timeout: 3000
    });
    console.log('✅ PASS: Webhook endpoint is ready');
    console.log(`   Response: ${response.data.message}`);
  } catch (error) {
    console.log('❌ FAIL: Webhook endpoint not accessible');
    console.log(`   Error: ${error.message}`);
    allPassed = false;
  }

  // Test 3: Check if server is accessible from network (not just localhost)
  console.log('\n📋 Test 3: Check if server is accessible from network...');
  try {
    const response = await axios.get(`http://${LAPTOP_IP}:${SERVER_PORT}/api/machine-webhook/health`, {
      timeout: 3000
    });
    console.log('✅ PASS: Server is accessible from network');
    console.log(`   Machine can reach: http://${LAPTOP_IP}:${SERVER_PORT}`);
  } catch (error) {
    console.log('❌ FAIL: Server not accessible from network');
    console.log(`   Error: ${error.message}`);
    console.log('\n💡 Possible issues:');
    console.log('   - Windows Firewall blocking port 5000');
    console.log('   - Server only listening on localhost');
    console.log('\n💡 Solutions:');
    console.log('   1. Allow port 5000 in Windows Firewall');
    console.log('   2. Run: npm run allow:firewall (if script exists)');
    console.log('   3. Or manually: netsh advfirewall firewall add rule name="Node.js Server" dir=in action=allow protocol=TCP localport=5000');
    allPassed = false;
  }

  // Test 4: Check if machine is reachable
  console.log('\n📋 Test 4: Check if machine is reachable...');
  try {
    const response = await axios.get(`http://${MACHINE_IP}`, {
      timeout: 3000,
      validateStatus: () => true
    });
    console.log('✅ PASS: Machine is reachable');
    console.log(`   Machine web interface: http://${MACHINE_IP}`);
  } catch (error) {
    console.log('⚠️  WARNING: Cannot reach machine');
    console.log(`   Error: ${error.message}`);
    console.log('   Make sure machine is powered on and connected to network');
  }

  // Test 5: Simulate machine sending data
  console.log('\n📋 Test 5: Simulate machine sending data...');
  try {
    const testData = {
      userId: 1,
      timestamp: new Date().toISOString(),
      type: 'check-in',
      test: true
    };

    const response = await axios.post(
      `http://localhost:${SERVER_PORT}/api/machine-webhook/test`,
      testData,
      { timeout: 3000 }
    );

    console.log('✅ PASS: Server can receive data');
    console.log(`   Response: ${JSON.stringify(response.data)}`);
  } catch (error) {
    console.log('❌ FAIL: Server cannot receive data');
    console.log(`   Error: ${error.message}`);
    allPassed = false;
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(70));

  if (allPassed) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('\n✅ Your server is ready to receive data from the machine!');
    console.log('\n📌 NEXT STEPS:');
    console.log('1. Configure the machine:');
    console.log('   - Go to: Menu → Comm set → Server');
    console.log('   - Server Req: Yes');
    console.log('   - Use domainNm: No');
    console.log(`   - Server IP: ${LAPTOP_IP.replace(/\./g, '.')}`);
    console.log(`   - SerPortNo: ${SERVER_PORT}`);
    console.log('   - Save settings');
    console.log('\n2. Do a face recognition check-in on the machine');
    console.log('\n3. Watch your server console for incoming data');
    console.log('\n4. Check the log file: machine-webhook-log.txt');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED');
    console.log('\n📌 FIX THE ISSUES ABOVE BEFORE CONFIGURING THE MACHINE');
    console.log('\nMost common issue: Windows Firewall blocking port 5000');
    console.log('\nTo fix, run this command as Administrator:');
    console.log(`netsh advfirewall firewall add rule name="Node.js Server" dir=in action=allow protocol=TCP localport=${SERVER_PORT}`);
  }

  console.log('\n' + '='.repeat(70));
}

// Run tests
runTests()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
