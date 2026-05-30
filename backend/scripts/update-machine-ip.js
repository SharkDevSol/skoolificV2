const { Pool } = require('pg');
const readline = require('readline');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function updateMachineIP() {
  console.log('🔧 Update Machine IP Address\n');
  
  try {
    // Show current configuration
    const result = await pool.query('SELECT * FROM machine_config WHERE id = $1', ['machine-001']);
    
    if (result.rows.length === 0) {
      console.log('❌ Machine configuration not found!');
      process.exit(1);
    }
    
    const machine = result.rows[0];
    console.log('Current configuration:');
    console.log(`  ID: ${machine.id}`);
    console.log(`  Name: ${machine.name}`);
    console.log(`  IP: ${machine.ip_address}`);
    console.log(`  Port: ${machine.port}\n`);
    
    rl.question('Enter new IP address (or press Enter to cancel): ', async (newIP) => {
      if (!newIP || newIP.trim() === '') {
        console.log('Cancelled.');
        rl.close();
        await pool.end();
        process.exit(0);
      }
      
      // Validate IP format
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!ipRegex.test(newIP.trim())) {
        console.log('❌ Invalid IP address format!');
        rl.close();
        await pool.end();
        process.exit(1);
      }
      
      // Update database
      await pool.query(
        'UPDATE machine_config SET ip_address = $1, updated_at = NOW() WHERE id = $2',
        [newIP.trim(), 'machine-001']
      );
      
      console.log(`\n✅ IP address updated to: ${newIP.trim()}`);
      console.log('\nNext step: Run npm run diagnose:machine to test connection');
      
      rl.close();
      await pool.end();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    rl.close();
    await pool.end();
    process.exit(1);
  }
}

updateMachineIP();
