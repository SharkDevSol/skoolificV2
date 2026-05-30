/**
 * V1 to V2 Migration Runner
 * Command-line interface for running data migration from V1 to V2
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
  
  console.log('\nV1 to V2 Migration Tool\n');
  console.log('Database Configuration:');
  console.log(`  Host: ${dbConfig.host}`);
  console.log(`  Port: ${dbConfig.port}`);
  console.log(`  Database: ${dbConfig.database}`);
  console.log(`  User: ${dbConfig.user}\n`);
  
  const migration = new V1toV2Migration(dbConfig);
  
  try {
    switch (command) {
      case 'all':
        await migration.runAllMigrations();
        break;
        
      case 'school-config':
        await migration.migrateSchoolConfig();
        migration.generateReport();
        await migration.saveMigrationLog('school-config-migration.json');
        break;
        
      case 'classes':
        await migration.migrateClasses();
        migration.generateReport();
        await migration.saveMigrationLog('classes-migration.json');
        break;
        
      case 'students':
        await migration.migrateStudents();
        migration.generateReport();
        await migration.saveMigrationLog('students-migration.json');
        break;
        
      case 'staff':
        await migration.migrateStaff();
        migration.generateReport();
        await migration.saveMigrationLog('staff-migration.json');
        break;
        
      case 'guardians':
        await migration.migrateGuardians();
        migration.generateReport();
        await migration.saveMigrationLog('guardians-migration.json');
        break;
        
      case 'subjects':
        await migration.migrateSubjects();
        migration.generateReport();
        await migration.saveMigrationLog('subjects-migration.json');
        break;
        
      case 'attendance':
        await migration.migrateAttendance();
        migration.generateReport();
        await migration.saveMigrationLog('attendance-migration.json');
        break;
        
      case 'marks':
        await migration.migrateMarks();
        migration.generateReport();
        await migration.saveMigrationLog('marks-migration.json');
        break;
        
      case 'financial':
        await migration.migrateFinancialRecords();
        migration.generateReport();
        await migration.saveMigrationLog('financial-migration.json');
        break;
        
      case 'rollback':
        await migration.rollback();
        break;
        
      default:
        console.log('Usage:');
        console.log('  node run-v1-to-v2-migration.js <command>');
        console.log('');
        console.log('Commands:');
        console.log('  all              - Run all migrations in sequence');
        console.log('  school-config    - Migrate school configuration');
        console.log('  classes          - Migrate classes');
        console.log('  students         - Migrate students');
        console.log('  staff            - Migrate staff');
        console.log('  guardians        - Migrate guardians');
        console.log('  subjects         - Migrate subjects');
        console.log('  attendance       - Migrate attendance records');
        console.log('  marks            - Migrate marks/grades');
        console.log('  financial        - Migrate financial records');
        console.log('  rollback         - Rollback all migrations');
        console.log('');
        console.log('Examples:');
        console.log('  node run-v1-to-v2-migration.js all');
        console.log('  node run-v1-to-v2-migration.js students');
        console.log('  node run-v1-to-v2-migration.js rollback');
        console.log('');
    }
    
  } catch (error) {
    console.error('\n✗ Migration error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await migration.close();
  }
}

main();
