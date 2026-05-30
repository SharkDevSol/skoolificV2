const net = require('net');

const host = '10.22.134.43';
const ports = [4370, 5005];

async function testPort(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(3000);

    socket.on('connect', () => {
      socket.destroy();
      resolve({ port, status: 'OPEN', message: 'Port is accepting connections' });
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({ port, status: 'TIMEOUT', message: 'Connection timed out' });
    });

    socket.on('error', (err) => {
      socket.destroy();
      resolve({ port, status: 'CLOSED', message: err.message });
    });

    socket.connect(port, host);
  });
}

async function testAllPorts() {
  console.log(`🔌 Testing multiple ports on ${host}...\n`);
  console.log('='.repeat(60));
  
  for (const port of ports) {
    console.log(`\nTesting port ${port}...`);
    const result = await testPort(port);
    
    if (result.status === 'OPEN') {
      console.log(`✅ Port ${port}: ${result.status} - ${result.message}`);
    } else if (result.status === 'TIMEOUT') {
      console.log(`⏱️  Port ${port}: ${result.status} - ${result.message}`);
    } else {
      console.log(`❌ Port ${port}: ${result.status} - ${result.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📝 Recommendations:\n');
  console.log('Standard ZKTeco ports:');
  console.log('  • 4370 - ZKTeco protocol (most common)');
  console.log('  • 5005 - May be HTTP/admin interface');
  console.log('  • 80   - Web interface\n');
  console.log('Check machine settings:');
  console.log('  Menu → Comm → TCP/IP → Port Number\n');
}

testAllPorts();
