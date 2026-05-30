/**
 * Reset Year Script
 * Resets the academic year back to 2016/2017 for testing
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'skoolific',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || ''
};

async function main() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('\nResetting academic year to 2016/2017...\n');
    
    // Update school_config
    await pool.query(`
      UPDATE school_config
      SET academic_year = '2016/2017', current_year = 2016, updated_at = CURRENT_TIMESTAMP
    `);
    
    console.log('✓ Academic year reset to 2016/2017');
    
    // Delete all archives
    const result = await pool.query('DELETE FROM archived_academic_years RETURNING id, academic_year');
    
    if (result.rowCount > 0) {
      console.log(`✓ Deleted ${result.rowCount} archive(s):`);
      result.rows.forEach(row => {
        console.log(`  - ID ${row.id}: ${row.academic_year}`);
      });
    } else {
      console.log('✓ No archives to delete');
    }
    
    console.log('\n✓ Reset complete!\n');
    
  } catch (error) {
    console.error('\n✗ Reset failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
