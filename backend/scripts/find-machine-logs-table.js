// Script to find which table stores machine logs
const pool = require('../config/db');

async function findMachineLogsTable() {
  console.log('Searching for machine logs tables...\n');

  try {
    // Check all tables in the database
    const result = await pool.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_type = 'BASE TABLE'
        AND table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY table_schema, table_name
    `);

    console.log('All tables in database:');
    console.log('========================\n');
    
    for (const row of result.rows) {
      console.log(`${row.table_schema}.${row.table_name}`);
      
      // Check if table might contain machine logs
      if (row.table_name.toLowerCase().includes('machine') || 
          row.table_name.toLowerCase().includes('ai06') ||
          row.table_name.toLowerCase().includes('device') ||
          row.table_name.toLowerCase().includes('log')) {
        
        // Get column info
        const colResult = await pool.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_schema = $1 AND table_name = $2
          ORDER BY ordinal_position
        `, [row.table_schema, row.table_name]);
        
        console.log(`  📋 Columns:`);
        colResult.rows.forEach(col => {
          console.log(`     - ${col.column_name} (${col.data_type})`);
        });
        console.log('');
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

findMachineLogsTable();
