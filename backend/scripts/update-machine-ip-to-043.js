require('dotenv').config();
const pool = require('../config/db');

async function updateMachineIP() {
  try {
    console.log('🔧 Updating Machine IP Address');
    console.log('='.repeat(70));
    console.log('');
    console.log('   Old IP: 10.22.134.43');
    console.log('   New IP: 10.22.134.43 (confirmed from machine)');
    console.log('');

    const result = await pool.query(
      `UPDATE machine_config 
       SET ip_address = $1, updated_at = NOW() 
       WHERE id = $2
       RETURNING *`,
      ['10.22.134.43', 'machine-001']
    );

    if (result.rows.length > 0) {
      console.log('✅ Machine IP updated successfully!');
      console.log('');
      console.log('   Machine ID:', result.rows[0].id);
      console.log('   Name:', result.rows[0].name);
      console.log('   IP Address:', result.rows[0].ip_address);
      console.log('   Port:', result.rows[0].port);
      console.log('   Enabled:', result.rows[0].enabled);
    } else {
      console.log('⚠️  No machine found with ID: machine-001');
    }

    console.log('');
    console.log('='.repeat(70));

    await pool.end();

  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

updateMachineIP();
