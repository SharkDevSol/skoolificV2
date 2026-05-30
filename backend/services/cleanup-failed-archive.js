/**
 * Cleanup Failed Archive Script
 * Removes failed archive records to allow re-running year rollover
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
    console.log('\nCleaning up failed archive records...\n');
    
    // Get the failed archive (the one with 0 archived students)
    const failedArchives = await pool.query(`
      SELECT id, academic_year FROM archived_academic_years
      WHERE id NOT IN (SELECT DISTINCT archive_year_id FROM archived_students)
    `);
    
    if (failedArchives.rows.length === 0) {
      console.log('✓ No failed archives found');
      return;
    }
    
    console.log(`Found ${failedArchives.rows.length} failed archive(s):\n`);
    
    for (const archive of failedArchives.rows) {
      console.log(`  ID: ${archive.id} - Academic Year: ${archive.academic_year}`);
      
      // Delete the failed archive (CASCADE will delete related records)
      await pool.query('DELETE FROM archived_academic_years WHERE id = $1', [archive.id]);
      
      console.log(`  ✓ Deleted archive ID ${archive.id}\n`);
    }
    
    console.log('✓ Cleanup complete!\n');
    
  } catch (error) {
    console.error('\n✗ Cleanup failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
