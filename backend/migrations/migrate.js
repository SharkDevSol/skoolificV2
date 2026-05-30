#!/usr/bin/env node

const { Pool } = require('pg');
const MigrationRunner = require('./migrationRunner');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const migrationRunner = new MigrationRunner(pool);

const command = process.argv[2];

async function main() {
  try {
    switch (command) {
      case 'up':
      case 'run':
        await migrationRunner.runPendingMigrations();
        break;
      
      case 'down':
      case 'rollback':
        await migrationRunner.rollbackLastMigration();
        break;
      
      case 'status':
        await migrationRunner.getMigrationStatus();
        break;
      
      default:
        console.log('\n📦 Database Migration Tool\n');
        console.log('Usage:');
        console.log('  node migrate.js up        - Run all pending migrations');
        console.log('  node migrate.js down      - Rollback last migration');
        console.log('  node migrate.js status    - Show migration status');
        console.log('');
        break;
    }
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

main();
