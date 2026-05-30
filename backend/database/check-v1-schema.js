/**
 * Check V1 database schema to understand migration requirements
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

async function checkV1Schema() {
  try {
    console.log('\n=== Checking V1 Database Schema ===\n');
    
    // Get all tables
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    console.log(`Found ${tablesResult.rows.length} tables:\n`);
    
    for (const row of tablesResult.rows) {
      const tableName = row.table_name;
      
      // Get row count
      const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      const count = countResult.rows[0].count;
      
      // Get column info
      const columnsResult = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position;
      `, [tableName]);
      
      console.log(`📊 ${tableName} (${count} rows)`);
      console.log(`   Columns: ${columnsResult.rows.map(c => c.column_name).join(', ')}`);
      console.log('');
    }
    
    // Check for specific V1 tables we need to migrate
    const v1Tables = [
      'school_config',
      'classes',
      'students',
      'staff',
      'guardians',
      'subjects',
      'attendance',
      'marks',
      'payments',
      'invoices',
      'fee_structures'
    ];
    
    console.log('\n=== V1 Tables Status ===\n');
    
    for (const table of v1Tables) {
      const exists = tablesResult.rows.some(r => r.table_name === table);
      if (exists) {
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`✓ ${table} - ${countResult.rows[0].count} records`);
      } else {
        console.log(`✗ ${table} - NOT FOUND`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkV1Schema();
