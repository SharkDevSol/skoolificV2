const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function fixIP() {
  try {
    console.log('🔧 Fixing machine IP address...\n');
    
    // Remove leading zeros from IP
    const correctIP = '10.22.134.43';
    
    await pool.query(
      'UPDATE machine_config SET ip_address = $1 WHERE id = $2',
      [correctIP, 'machine-001']
    );
    
    console.log(`✅ IP address corrected to: ${correctIP}`);
    console.log('   (Removed leading zeros)\n');
    
    const result = await pool.query('SELECT * FROM machine_config WHERE id = $1', ['machine-001']);
    console.log('Updated configuration:');
    console.log(`  IP: ${result.rows[0].ip_address}`);
    console.log(`  Port: ${result.rows[0].port}\n`);
    
    console.log('Next step: npm run diagnose:machine');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixIP();
