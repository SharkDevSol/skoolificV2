require('dotenv').config();
const pool = require('../config/db');

async function listMappings() {
  try {
    console.log('📋 USER MACHINE MAPPINGS');
    console.log('='.repeat(70));
    console.log('');

    const result = await pool.query(`
      SELECT 
        machine_user_id,
        person_id,
        person_type,
        created_at,
        updated_at
      FROM user_machine_mapping
      ORDER BY machine_user_id
    `);

    if (result.rows.length === 0) {
      console.log('   No mappings found');
      console.log('');
      console.log('💡 To add a mapping, run:');
      console.log('   node scripts/add-mapping.js <machineUserId> <personType> <personId>');
      console.log('');
      console.log('   Example:');
      console.log('   node scripts/add-mapping.js 1 staff khalid');
    } else {
      console.log('   Machine ID → Person ID (Type)');
      console.log('   ' + '-'.repeat(50));
      result.rows.forEach(row => {
        console.log(`   ${row.machine_user_id} → ${row.person_id} (${row.person_type})`);
      });
      console.log('');
      console.log(`   Total: ${result.rows.length} mapping(s)`);
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

listMappings();
