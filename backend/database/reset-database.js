/**
 * Reset Database Script
 * Drops all tables and re-runs migrations from scratch
 * WARNING: This will delete ALL data!
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const MigrationRunner = require('./MigrationRunner');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'skoolific',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || ''
};

async function resetDatabase() {
  const pool = new Pool(dbConfig);
  const client = await pool.connect();
  
  try {
    console.log('\n=== Database Reset ===\n');
    console.log('⚠️  WARNING: This will delete ALL data!\n');
    
    // Step 1: Drop all tables
    console.log('Step 1: Dropping all tables...');
    
    const tables = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `);
    
    for (const row of tables.rows) {
      await client.query(`DROP TABLE IF EXISTS ${row.tablename} CASCADE`);
      console.log(`  ✓ Dropped table: ${row.tablename}`);
    }
    
    // Step 2: Drop all functions
    console.log('\nStep 2: Dropping all functions...');
    
    const functions = await client.query(`
      SELECT proname, oidvectortypes(proargtypes) as argtypes
      FROM pg_proc
      INNER JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
      WHERE pg_namespace.nspname = 'public'
    `);
    
    for (const row of functions.rows) {
      try {
        await client.query(`DROP FUNCTION IF EXISTS ${row.proname}(${row.argtypes}) CASCADE`);
        console.log(`  ✓ Dropped function: ${row.proname}`);
      } catch (error) {
        // Some functions might have dependencies, skip them
      }
    }
    
    console.log('\n✓ Database cleaned\n');
    
  } catch (error) {
    console.error('✗ Reset failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
  
  // Step 3: Re-run all migrations
  console.log('Step 3: Running migrations...\n');
  
  const migrationRunner = new MigrationRunner(dbConfig);
  
  try {
    const result = await migrationRunner.runPendingMigrations();
    
    if (result.success) {
      console.log('✓ Database reset completed successfully\n');
    } else {
      console.error('✗ Migration failed:', result.error);
      process.exit(1);
    }
  } finally {
    await migrationRunner.close();
  }
}

resetDatabase();
