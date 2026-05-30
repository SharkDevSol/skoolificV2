const pool = require('../config/db');

async function checkAccountTable() {
  try {
    // Check for account-related tables
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name ILIKE '%account%'
      ORDER BY table_name
    `);
    
    console.log('Account-related tables found:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    if (result.rows.length === 0) {
      console.log('  No account tables found!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkAccountTable();
