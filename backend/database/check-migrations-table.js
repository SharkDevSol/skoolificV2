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
    const result = await pool.query(`
      SELECT id, migration_name, executed_at, execution_time_ms, status
      FROM migrations
      ORDER BY id
    `);
    
    console.log('\nMigrations table:');
    console.log('ID | Migration Name | Status | Executed At');
    console.log('---|----------------|--------|-------------');
    result.rows.forEach(row => {
      console.log(`${row.id} | ${row.migration_name} | ${row.status} | ${row.executed_at}`);
    });
    console.log('');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkMigrations();
