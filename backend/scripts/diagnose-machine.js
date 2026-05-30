const { Pool } = require('pg');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function diagnoseMachine() {
  console.log('🔍 AI06 Machine Connection Diagnostics\n');
  console.log('=' .repeat(50));
  
  try {
    // Step 1: Check database connection
    console.log('\n1️⃣  Checking database connection...');
    await pool.query('SELECT 1');
    console.log('   ✅ Database connected');
    
    // Step 2: Get machine configuration
    console.log('\n2️⃣  Checking machine configuration...');
    const result = await pool.query('SELECT * FROM machine_config WHERE id = $1', ['machine-001']);
    
    if (result.rows.length === 0) {
      console.log('   ❌ Machine configuration not found!');
      console.log('   Run: npm run setup:machine-attendance');
      process.exit(1);
    }
    
    const machine = result.rows[0];
    console.log('   ✅ Machine configuration found:');
    console.log(`      ID: ${machine.id}`);
    console.log(`      Name: ${machine.name}`);
    console.log(`      IP: ${machine.ip_address}`);
    console.log(`      Port: ${machine.port}`);
    console.log(`      Enabled: ${machine.enabled}`);
    
    if (!machine.enabled) {
      console.log('   ⚠️  Machine is disabled!');
      process.exit(1);
    }
    
    // Step 3: Check if IP is valid format
    console.log('\n3️⃣  Validating IP address format...');
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(machine.ip_address)) {
      console.log(`   ❌ Invalid IP format: ${machine.ip_address}`);
      process.exit(1);
    }
    console.log('   ✅ IP format is valid');
    
    // Step 4: Try to ping the machine
    console.log('\n4️⃣  Testing network connectivity (ping)...');
    console.log(`   Pinging ${machine.ip_address}...`);
    
    try {
      const { stdout, stderr } = await execPromise(`ping -n 1 -w 2000 ${machine.ip_address}`);
      if (stdout.includes('Reply from') || stdout.includes('bytes from')) {
        console.log('   ✅ Machine is reachable on network');
        console.log('   Response time detected in ping');
      } else {
        console.log('   ⚠️  Ping completed but no clear response');
        console.log('   This might be normal if ICMP is blocked');
      }
    } catch (error) {
      console.log('   ❌ Ping failed - machine not reachable');
      console.log('   Error:', error.message);
      console.log('\n   Possible issues:');
      console.log('   - Machine is powered off');
      console.log('   - Machine is not connected to network');
      console.log('   - Wrong IP address');
      console.log('   - Different network/subnet');
    }
    
    // Step 5: Check node-zklib installation
    console.log('\n5️⃣  Checking node-zklib installation...');
    try {
      const ZKLib = require('node-zklib');
      console.log('   ✅ node-zklib is installed');
      console.log(`   Version: ${require('node-zklib/package.json').version || 'unknown'}`);
    } catch (error) {
      console.log('   ❌ node-zklib not found!');
      console.log('   Run: npm install node-zklib');
      process.exit(1);
    }
    
    // Step 6: Try actual connection
    console.log('\n6️⃣  Attempting ZKTeco device connection...');
    console.log(`   Connecting to ${machine.ip_address}:${machine.port}...`);
    console.log('   (This may take up to 10 seconds)');
    
    const ZKLib = require('node-zklib');
    const zkInstance = new ZKLib(machine.ip_address, machine.port, 10000, 4000);
    
    try {
      await zkInstance.createSocket();
      console.log('   ✅ Socket created successfully!');
      
      console.log('   Getting device information...');
      const deviceInfo = await zkInstance.getInfo();
      console.log('   ✅ Device responded!');
      console.log('\n   📱 Device Information:');
      console.log('   ' + '-'.repeat(40));
      console.log(`   Serial Number: ${deviceInfo.serialNumber || 'N/A'}`);
      console.log(`   Firmware Version: ${deviceInfo.fwVersion || 'N/A'}`);
      console.log(`   Platform: ${deviceInfo.platform || 'N/A'}`);
      console.log(`   Device Name: ${deviceInfo.deviceName || 'N/A'}`);
      
      await zkInstance.disconnect();
      console.log('   ✅ Disconnected cleanly');
      
      console.log('\n' + '='.repeat(50));
      console.log('✨ SUCCESS! Machine is ready to use!');
      console.log('='.repeat(50));
      console.log('\n📝 Next steps:');
      console.log('   1. Map student/staff IDs to machine user IDs');
      console.log('   2. Sync attendance using: POST /api/machine-attendance/sync');
      
    } catch (error) {
      console.log('   ❌ Connection to device failed');
      console.log(`   Error: ${error.message}`);
      console.log(`   Error Code: ${error.code || 'UNKNOWN'}`);
      
      console.log('\n   🔧 Troubleshooting steps:');
      console.log('   1. Verify machine is powered on');
      console.log('   2. Check machine display shows IP address');
      console.log('   3. Ensure machine and server are on same network');
      console.log('   4. Try accessing machine from its web interface');
      console.log(`   5. Verify port ${machine.port} is not blocked by firewall`);
      console.log('   6. Check if machine IP changed (DHCP)');
      console.log('\n   💡 Common issues:');
      console.log('   - Machine on different WiFi/network');
      console.log('   - Firewall blocking port 4370');
      console.log('   - Machine in sleep/standby mode');
      console.log('   - Wrong IP address in configuration');
      
      if (zkInstance) {
        try { await zkInstance.disconnect(); } catch (e) {}
      }
    }
    
  } catch (error) {
    console.error('\n❌ Diagnostic failed:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

diagnoseMachine()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
