/**
 * Migration Testing Script
 * Tests the V1 to V2 migration with sample data
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const V1toV2Migration = require('./V1toV2Migration');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'skoolific',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || ''
};

async function main() {
  const command = process.argv[2];
  
  console.log('\nMigration Testing Tool\n');
  console.log('Database Configuration:');
  console.log(`  Host: ${dbConfig.host}`);
  console.log(`  Port: ${dbConfig.port}`);
  console.log(`  Database: ${dbConfig.database}`);
  console.log(`  User: ${dbConfig.user}\n`);
  
  const migration = new V1toV2Migration(dbConfig);
  
  try {
    switch (command) {
      case 'generate':
        // Generate sample V1 data
        await migration.generateSampleData();
        break;
        
      case 'migrate':
        // Run migration
        await migration.runAllMigrations();
        break;
        
      case 'validate':
        // Validate migration
        await migration.validateMigration();
        await migration.validateDataIntegrity();
        break;
        
      case 'full-test':
        // Full test: generate → migrate → validate
        console.log('=== Running Full Migration Test ===\n');
        
        console.log('Step 1: Generating sample data...');
        await migration.generateSampleData();
        
        console.log('\nStep 2: Running migration...');
        await migration.runAllMigrations();
        
        console.log('\nStep 3: Validating migration...');
        await migration.validateMigration();
        await migration.validateDataIntegrity();
        
        console.log('\n=== Full Test Completed ===\n');
        break;
        
      case 'dry-run':
        // Dry run: check what would be migrated without actually migrating
        console.log('=== Migration Dry Run ===\n');
        
        const entities = [
          { v1: 'school_config', name: 'School Config' },
          { v1: 'classes', name: 'Classes' },
          { v1: 'students', name: 'Students' },
          { v1: 'staff', name: 'Staff' },
          { v1: 'guardians', name: 'Guardians' },
          { v1: 'subjects', name: 'Subjects' },
          { v1: 'student_attendance', name: 'Attendance' },
          { v1: 'student_marks', name: 'Marks' },
          { v1: 'fee_structures', name: 'Fee Structures' },
          { v1: 'invoices', name: 'Invoices' },
          { v1: 'payments', name: 'Payments' }
        ];
        
        let totalRecords = 0;
        
        for (const entity of entities) {
          const result = await migration.pool.query(`SELECT COUNT(*) as count FROM ${entity.v1}`);
          const count = parseInt(result.rows[0].count);
          totalRecords += count;
          console.log(`${entity.name}: ${count} records`);
        }
        
        console.log(`\nTotal records to migrate: ${totalRecords}\n`);
        break;
        
      case 'clean':
        // Clean V2 data (rollback)
        await migration.rollback();
        break;
        
      default:
        console.log('Usage:');
        console.log('  node test-migration.js <command>');
        console.log('');
        console.log('Commands:');
        console.log('  generate     - Generate sample V1 data for testing');
        console.log('  migrate      - Run migration on existing V1 data');
        console.log('  validate     - Validate migration results');
        console.log('  full-test    - Run complete test (generate → migrate → validate)');
        console.log('  dry-run      - Check what would be migrated (no changes)');
        console.log('  clean        - Clean V2 data (rollback migration)');
        console.log('');
        console.log('Examples:');
        console.log('  node test-migration.js generate');
        console.log('  node test-migration.js full-test');
        console.log('  node test-migration.js validate');
        console.log('');
    }
    
  } catch (error) {
    console.error('\n✗ Test error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await migration.close();
  }
}

main();
