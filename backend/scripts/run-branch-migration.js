// Script to execute branch_config migration
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function runMigration() {
  const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'school_management10',
    password: String(process.env.DB_PASSWORD),
    port: process.env.DB_PORT || 5432,
  });

  try {
    console.log('🔄 Connecting to database...');
    const client = await pool.connect();
    console.log('✅ Connected to database');

    // Read migration SQL file
    const migrationPath = path.join(__dirname, '../database/migrations/001_create_branch_config.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('🔄 Executing migration: 001_create_branch_config.sql');
    await client.query(migrationSQL);
    console.log('✅ Migration executed successfully');

    // Verify table creation
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'branch_config'
    `);

    if (result.rows.length > 0) {
      console.log('✅ branch_config table created successfully');
      
      // Check if default branch exists
      const branchResult = await client.query('SELECT * FROM branch_config WHERE branch_code = $1', ['MAI']);
      if (branchResult.rows.length > 0) {
        console.log('✅ Default branch "MAI" inserted successfully');
        console.log('   Branch details:', branchResult.rows[0]);
      }
    } else {
      console.log('⚠️  branch_config table not found');
    }

    client.release();
    await pool.end();
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('   Details:', error);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
