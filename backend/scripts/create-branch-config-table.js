/**
 * Create branch_config table
 * This script creates the branch_config table and inserts the default branch
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function createBranchConfigTable() {
  const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'skoolific',
    password: String(process.env.DB_PASSWORD || '12345678'),
    port: process.env.DB_PORT || 5432,
  });

  try {
    console.log('\n🔧 Creating branch_config table...\n');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../database/migrations/001_create_branch_config.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    await pool.query(migrationSQL);

    console.log('✅ branch_config table created successfully!');
    console.log('✅ Default branch "MAI" (Main Branch) inserted\n');

    // Verify the table was created
    const result = await pool.query(`
      SELECT branch_name, branch_code, database_name, is_active 
      FROM branch_config 
      ORDER BY created_at
    `);

    console.log('📋 Current branches:');
    result.rows.forEach((branch, index) => {
      console.log(`   ${index + 1}. ${branch.branch_name} (${branch.branch_code}) → ${branch.database_name} [${branch.is_active ? 'ACTIVE' : 'INACTIVE'}]`);
    });
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

createBranchConfigTable();
