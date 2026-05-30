const pool = require('../config/db');

async function checkAccount() {
  try {
    const result = await pool.query(`
      SELECT table_name, table_schema
      FROM information_schema.tables 
      WHERE table_schema IN ('public', 'school_comms')
      AND table_name ILIKE '%account%'
      ORDER BY table_schema, table_name
    `);
    
    console.log('Account tables found:');
    result.rows.forEach(row => {
      console.log(`  ${row.table_schema}.${row.table_name}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkAccount();
