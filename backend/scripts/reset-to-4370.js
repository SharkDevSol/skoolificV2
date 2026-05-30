const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function resetPort() {
  try {
    console.log('🔧 Resetting machine port to 4370 (ZKTeco standard)...\n');
    
    await pool.query(
      'UPDATE machine_config SET port = 4370, updated_at = NOW() WHERE id = $1',
      ['machine-001']
    );
    
    const result = await pool.query('SELECT * FROM machine_config WHERE id = $1', ['machine-001']);
    
    console.log('✅ Port reset to 4370\n');
    console.log('Current configuration:');
    console.log(`  IP: ${result.rows[0].ip_address}`);
    console.log(`  Port: ${result.rows[0].port}\n`);
    
    console.log('⚠️  IMPORTANT: On the AI06 machine:');
    console.log('  1. Menu → Comm → TCP/IP');
    console.log('  2. Enable TCP/IP: ON');
    console.log('  3. Enable Server: ON');
    console.log('  4. Set Port: 4370');
    console.log('  5. Save and RESTART machine\n');
    console.log('After restart, run: npm run diagnose:machine\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

resetPort();
