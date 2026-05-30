// Script to show the webhook URL that should be configured on the machine
const os = require('os');

function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({
          name: name,
          address: iface.address
        });
      }
    }
  }

  return addresses;
}

console.log('\n========================================');
console.log('🌐 Webhook Configuration Info');
console.log('========================================\n');

const addresses = getLocalIPAddress();

if (addresses.length === 0) {
  console.log('❌ No network interfaces found');
  console.log('   Make sure you are connected to a network');
} else {
  console.log('📍 Your Server IP Addresses:\n');
  
  addresses.forEach((addr, index) => {
    console.log(`${index + 1}. ${addr.name}: ${addr.address}`);
  });
  
  console.log('\n========================================');
  console.log('⚙️  Machine Configuration');
  console.log('========================================\n');
  
  console.log('Configure your AI06 machine with ONE of these URLs:\n');
  
  addresses.forEach((addr, index) => {
    const url = `http://${addr.address}:5000/api/machine/attendance`;
    console.log(`${index + 1}. ${url}`);
  });
  
  console.log('\n💡 Tips:');
  console.log('   - Use the IP that is on the SAME network as the machine');
  console.log('   - Usually the one that starts with 192.168.x.x or 10.x.x.x');
  console.log('   - If machine is on 10.22.134.x network, use the 10.x.x.x IP');
  console.log('   - Protocol: HTTP (not HTTPS)');
  console.log('   - Method: POST');
  console.log('   - Enable "Real-time Push" on the machine');
}

console.log('\n========================================');
console.log('🧪 Test the Webhook');
console.log('========================================\n');

console.log('Before configuring the machine, test if webhook works:\n');
console.log('   node scripts/test-student-machine-webhook.js\n');

console.log('After configuring the machine, check if it\'s pushing:\n');
console.log('   node scripts/check-webhook-logs.js\n');

console.log('========================================\n');
