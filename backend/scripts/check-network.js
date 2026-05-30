const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function checkNetwork() {
  console.log('🌐 Network Configuration Check\n');
  console.log('='.repeat(50));
  
  try {
    // Get local IP configuration
    console.log('\n1️⃣  Your Computer\'s Network Configuration:\n');
    const { stdout } = await execPromise('ipconfig');
    
    // Parse and display relevant info
    const lines = stdout.split('\n');
    let currentAdapter = '';
    let foundIP = false;
    
    for (const line of lines) {
      if (line.includes('Wireless LAN adapter') || line.includes('Ethernet adapter')) {
        currentAdapter = line.trim();
        console.log(`\n📡 ${currentAdapter}`);
      }
      
      if (line.includes('IPv4 Address')) {
        const ip = line.split(':')[1].trim().replace('(Preferred)', '').trim();
        console.log(`   IP Address: ${ip}`);
        
        // Check if on same subnet as machine
        const machineIP = '10.22.134.43';
        const yourSubnet = ip.split('.').slice(0, 3).join('.');
        const machineSubnet = machineIP.split('.').slice(0, 3).join('.');
        
        if (yourSubnet === machineSubnet) {
          console.log(`   ✅ SAME NETWORK as machine (${machineSubnet}.x)`);
          foundIP = true;
        } else {
          console.log(`   ⚠️  Different network (You: ${yourSubnet}.x, Machine: ${machineSubnet}.x)`);
        }
      }
      
      if (line.includes('Subnet Mask')) {
        console.log(`   Subnet: ${line.split(':')[1].trim()}`);
      }
      
      if (line.includes('Default Gateway') && line.split(':')[1].trim()) {
        console.log(`   Gateway: ${line.split(':')[1].trim()}`);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('\n2️⃣  Machine Configuration:\n');
    console.log(`   IP Address: 10.22.134.43`);
    console.log(`   Port: 4370`);
    console.log(`   Network: 10.22.134.x`);
    
    if (!foundIP) {
      console.log('\n' + '='.repeat(50));
      console.log('\n⚠️  WARNING: You are NOT on the same network as the machine!');
      console.log('\n📝 To fix this:');
      console.log('   1. Connect your laptop to the same WiFi/network as the machine');
      console.log('   2. Or reconnect the machine to your current network');
      console.log('   3. Your laptop IP should be 10.22.134.x to match the machine');
    } else {
      console.log('\n' + '='.repeat(50));
      console.log('\n✅ You are on the same network as the machine!');
      console.log('\n📝 If connection still fails:');
      console.log('   1. Check if machine is powered on');
      console.log('   2. Wake machine from sleep (touch screen)');
      console.log('   3. Temporarily disable Windows Firewall');
      console.log('   4. Try accessing: http://10.22.134.43 in browser');
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('\n3️⃣  Quick Tests:\n');
    console.log('   Run these commands to test:');
    console.log('   • ping 10.22.134.43');
    console.log('   • Open browser: http://10.22.134.43');
    console.log('   • npm run diagnose:machine\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkNetwork();
