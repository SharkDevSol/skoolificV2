const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function updatePort() {
  try {
    console.log('🔧 Updating machine port to 5005...\n');
    
    const newPort = 5005;
    
    await pool.query(
      'UPDATE machine_config SET port = $1, updated_at = NOW() WHERE id = $2',
      [newPort, 'machine-001']
    );
    
    console.log(`✅ Port updated to: ${newPort}\n`);
    
    const result = await pool.query('SELECT * FROM machine_config WHERE id = $1', ['machine-001']);
    console.log('Updated configuration:');
    console.log(`  IP: ${result.rows[0].ip_address}`);
    console.log(`  Port: ${result.rows[0].port}\n`);
    
    console.log('Next steps:');
    console.log('  1. On AI06 machine: Menu → Comm → TCP/IP');
    console.log('  2. Set Port to: 5005');
    console.log('  3. Enable TCP/IP and Server');
    console.log('  4. Restart the machine');
    console.log('  5. Run: npm run test:port\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

updatePort();
