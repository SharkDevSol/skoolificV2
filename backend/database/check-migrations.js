/**
 * Check and clean migrations table
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'skoolific',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || ''
});

async function checkMigrations() {
  try {
    console.log('\n=== Checking Migrations Table ===\n');
    
    const result = await pool.query('SELECT * FROM migrations ORDER BY id');
    
    if (result.rows.length === 0) {
      console.log('No migrations recorded yet.\n');
    } else {
      console.log(`Found ${result.rows.length} migration(s):\n`);
      result.rows.forEach(row => {
        console.log(`  ${row.id}. ${row.migration_name} - ${row.status} (${row.executed_at})`);
      });
      console.log('');
    }
    
    // Check for failed migrations
    const failed = result.rows.filter(r => r.status === 'failed');
    if (failed.length > 0) {
      console.log(`\n⚠️  Found ${failed.length} failed migration(s):`);
      failed.forEach(row => {
        console.log(`  - ${row.migration_name}`);
      });
      console.log('\nTo clean failed migrations, run:');
      console.log('  node backend/database/check-migrations.js clean\n');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

async function cleanFailedMigrations() {
  try {
    console.log('\n=== Cleaning Failed Migrations ===\n');
    
    const result = await pool.query(
      "DELETE FROM migrations WHERE status = 'failed' RETURNING migration_name"
    );
    
    if (result.rows.length === 0) {
      console.log('No failed migrations to clean.\n');
    } else {
      console.log(`Cleaned ${result.rows.length} failed migration(s):\n`);
      result.rows.forEach(row => {
        console.log(`  - ${row.migration_name}`);
      });
      console.log('\n✓ You can now run migrations again.\n');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

const command = process.argv[2];

if (command === 'clean') {
  cleanFailedMigrations();
} else {
  checkMigrations();
}
