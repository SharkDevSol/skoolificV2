/**
 * Test Script for Database Migrations
 * Tests schema creation on a fresh database
 * 
 * Usage: node backend/database/test-migrations.js
 */

const { Pool } = require('pg');
const MigrationRunner = require('./MigrationRunner');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Test database configuration
const testDbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.TEST_DB_NAME || process.env.DB_NAME || 'skoolific_test',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 10,
  idleTimeoutMillis: 30000
};

async function testMigrations() {
  console.log('\n=== Testing Database Migrations ===\n');
  console.log('Test Database Configuration:');
  console.log(`  Host: ${testDbConfig.host}`);
  console.log(`  Port: ${testDbConfig.port}`);
  console.log(`  Database: ${testDbConfig.database}`);
  console.log(`  User: ${testDbConfig.user}\n`);

  const runner = new MigrationRunner(testDbConfig);
  const pool = new Pool(testDbConfig);

  try {
    // Step 1: Run all migrations
    console.log('Step 1: Running all migrations...\n');
    const migrateResult = await runner.runPendingMigrations();
    
    if (!migrateResult.success) {
      throw new Error(`Migration failed: ${migrateResult.error}`);
    }

    console.log(`\n✓ All migrations completed successfully\n`);

    // Step 2: Verify tables were created
    console.log('Step 2: Verifying table creation...\n');
    const tables = await verifyTables(pool);
    
    console.log(`✓ Found ${tables.length} tables:\n`);
    tables.forEach(table => console.log(`  - ${table}`));

    // Step 3: Verify indexes were created
    console.log('\n\nStep 3: Verifying indexes...\n');
    const indexes = await verifyIndexes(pool);
    
    console.log(`✓ Found ${indexes.length} indexes\n`);

    // Step 4: Verify foreign key constraints
    console.log('Step 4: Verifying foreign key constraints...\n');
    const foreignKeys = await verifyForeignKeys(pool);
    
    console.log(`✓ Found ${foreignKeys.length} foreign key constraints\n`);

    // Step 5: Test rollback functionality
    console.log('Step 5: Testing rollback functionality...\n');
    const rollbackResult = await runner.rollbackMigrations(2);
    
    if (!rollbackResult.success) {
      throw new Error(`Rollback failed: ${rollbackResult.error}`);
    }

    console.log(`✓ Successfully rolled back ${rollbackResult.rolledBack} migration(s)\n`);

    // Step 6: Re-run migrations
    console.log('Step 6: Re-running migrations...\n');
    const rerunResult = await runner.runPendingMigrations();
    
    if (!rerunResult.success) {
      throw new Error(`Re-run failed: ${rerunResult.error}`);
    }

    console.log(`✓ Successfully re-ran ${rerunResult.migrationsRun} migration(s)\n`);

    // Step 7: Final status check
    console.log('Step 7: Final migration status...\n');
    await runner.getStatus();

    console.log('\n=== All Tests Passed ✓ ===\n');

  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    if (process.env.NODE_ENV === 'development') {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await runner.close();
    await pool.end();
  }
}

async function verifyTables(pool) {
  const result = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  
  return result.rows.map(row => row.table_name);
}

async function verifyIndexes(pool) {
  const result = await pool.query(`
    SELECT indexname 
    FROM pg_indexes 
    WHERE schemaname = 'public'
    ORDER BY indexname
  `);
  
  return result.rows.map(row => row.indexname);
}

async function verifyForeignKeys(pool) {
  const result = await pool.query(`
    SELECT
      tc.constraint_name,
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    ORDER BY tc.table_name, tc.constraint_name
  `);
  
  return result.rows;
}

// Run tests
testMigrations();
