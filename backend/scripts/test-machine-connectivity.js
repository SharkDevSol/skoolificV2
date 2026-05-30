const http = require('http');
const { exec } = require('child_process');

console.log('🔍 TESTING MACHINE CONNECTIVITY');
console.log('='.repeat(70));
console.log('');

const machineIP = '10.22.134.43';
const laptopIP = '10.22.134.159';
const serverPort = 5000;

// Test 1: Ping the machine
console.log('📋 Test 1: Can your laptop reach the machine?');
console.log(`   Pinging ${machineIP}...`);

exec(`ping -n 2 ${machineIP}`, (error, stdout, stderr) => {
  if (error) {
    console.log('   ❌ FAIL: Cannot reach machine');
    console.log('   💡 Machine might be off or on different network');
  } else if (stdout.includes('Reply from') || stdout.includes('bytes from')) {
    console.log('   ✅ PASS: Machine is reachable!');
  } else {
    console.log('   ❌ FAIL: No response from machine');
  }
  console.log('');
  
  // Test 2: Check if server is running
  console.log('📋 Test 2: Is your server running?');
  console.log(`   Checking http://localhost:${serverPort}...`);
  
  http.get(`http://localhost:${serverPort}/api/health`, (res) => {
    console.log('   ✅ PASS: Server is running!');
    console.log('');
    
    // Test 3: Check if server is accessible from network
    console.log('📋 Test 3: Can machine reach your server?');
    console.log(`   Checking http://${laptopIP}:${serverPort}...`);
    
    http.get(`http://${laptopIP}:${serverPort}/api/health`, (res) => {
      console.log('   ✅ PASS: Server is accessible from network!');
      console.log('');
      
      printSummary(true, true, true);
    }).on('error', (e) => {
      console.log('   ❌ FAIL: Server not accessible from network');
      console.log('   💡 Check Windows Firewall settings');
      console.log('');
      
      printSummary(true, true, false);
    });
    
  }).on('error', (e) => {
    console.log('   ❌ FAIL: Server is not running');
    console.log('   💡 Start server with: npm start');
    console.log('');
    
    printSummary(true, false, false);
  });
});

function printSummary(canReachMachine, serverRunning, serverAccessible) {
  console.log('📊 SUMMARY');
  console.log('='.repeat(70));
  console.log('');
  
  console.log(`   Machine IP: ${machineIP}`);
  console.log(`   Laptop IP: ${laptopIP}`);
  console.log(`   Server Port: ${serverPort}`);
  console.log('');
  
  console.log('   Status:');
  console.log(`   ${canReachMachine ? '✅' : '❌'} Laptop can reach machine`);
  console.log(`   ${serverRunning ? '✅' : '❌'} Server is running`);
  console.log(`   ${serverAccessible ? '✅' : '❌'} Server accessible from network`);
  console.log('');
  
  if (canReachMachine && serverRunning && serverAccessible) {
    console.log('🎉 ALL TESTS PASSED!');
    console.log('');
    console.log('✅ Your machine and system CAN communicate!');
    console.log('');
    console.log('📌 NEXT STEPS:');
    console.log('   1. Configure machine Server settings:');
    console.log('      Menu → Comm set → Server');
    console.log('      - Server Req: Yes');
    console.log('      - Server IP: 010.022.134.159');
    console.log('      - SerPortNo: 5000');
    console.log('');
    console.log('   2. Do a face check-in on the machine');
    console.log('   3. Watch your server console for data');
  } else {
    console.log('⚠️  SOME TESTS FAILED');
    console.log('');
    console.log('💡 TROUBLESHOOTING:');
    
    if (!canReachMachine) {
      console.log('   - Make sure machine is powered on');
      console.log('   - Check machine is on same network (10.22.134.x)');
      console.log('   - Verify machine IP: Menu → Sys Info');
    }
    
    if (!serverRunning) {
      console.log('   - Start server: npm start');
    }
    
    if (!serverAccessible) {
      console.log('   - Allow port 5000 in Windows Firewall:');
      console.log('     netsh advfirewall firewall add rule name="Node Server" dir=in action=allow protocol=TCP localport=5000');
    }
  }
  
  console.log('');
  console.log('='.repeat(70));
}
