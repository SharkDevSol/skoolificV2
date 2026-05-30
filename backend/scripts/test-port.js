const net = require('net');

const host = '10.22.134.43';
const port = 5005;
const timeout = 5000;

console.log(`🔌 Testing TCP connection to ${host}:${port}...\n`);

const socket = new net.Socket();

socket.setTimeout(timeout);

socket.on('connect', () => {
  console.log('✅ SUCCESS! Port 5005 is open and accepting connections!');
  console.log('   The machine is reachable on this port.\n');
  console.log('Next step: npm run diagnose:machine');
  socket.destroy();
  process.exit(0);
});

socket.on('timeout', () => {
  console.log('❌ TIMEOUT: Connection timed out after 5 seconds');
  console.log('   Port 5005 is not responding.\n');
  console.log('Possible issues:');
  console.log('   1. Machine firewall blocking port 5005');
  console.log('   2. TCP/IP service disabled on machine');
  console.log('   3. Wrong port number (check machine settings)');
  socket.destroy();
  process.exit(1);
});

socket.on('error', (err) => {
  console.log('❌ CONNECTION FAILED');
  console.log(`   Error: ${err.message}\n`);
  
  if (err.code === 'ECONNREFUSED') {
    console.log('Connection refused - possible causes:');
    console.log('   1. Machine is not listening on port 5005');
    console.log('   2. TCP/IP service is disabled on machine');
    console.log('   3. Machine firewall blocking the port\n');
    console.log('Fix:');
    console.log('   • On machine: Menu → Comm → TCP/IP → Enable');
    console.log('   • Check port is set to 5005');
    console.log('   • Restart machine after changes');
  } else if (err.code === 'ETIMEDOUT') {
    console.log('Connection timed out - possible causes:');
    console.log('   1. Windows Firewall blocking outgoing connection');
    console.log('   2. Machine not responding on network');
    console.log('   3. Network issue between laptop and machine\n');
    console.log('Fix:');
    console.log('   • Temporarily disable Windows Firewall');
    console.log('   • Or add firewall rule for port 5005');
    console.log('   • See FIREWALL_INSTRUCTIONS.md');
  } else {
    console.log('Unexpected error - check network configuration');
  }
  
  process.exit(1);
});

console.log('Attempting connection...');
socket.connect(port, host);
