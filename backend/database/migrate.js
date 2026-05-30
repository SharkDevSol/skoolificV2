#!/usr/bin/env node

/**
 * Migration CLI Command
 * Usage:
 *   node backend/database/migrate.js up          - Run all pending migrations
 *   node backend/database/migrate.js down [n]    - Rollback last n migrations (default: 1)
 *   node backend/database/migrate.js status      - Show migration status
 *   node backend/database/migrate.js create <name> - Create a new migration file
 */

const MigrationRunner = require('./MigrationRunner');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Database configuration from environment variables
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'skoolific',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 10,
  idleTimeoutMillis: 30000
};

async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];

  if (!command) {
    console.log(`
Migration CLI for Skoolific V2

Usage:
  node backend/database/migrate.js up          - Run all pending migrations
  node backend/database/migrate.js down [n]    - Rollback last n migrations (default: 1)
  node backend/database/migrate.js status      - Show migration status
  node backend/database/migrate.js create <name> - Create a new migration file

Examples:
  node backend/database/migrate.js up
  node backend/database/migrate.js down 2
  node backend/database/migrate.js status
  node backend/database/migrate.js create add_users_table
    `);
    process.exit(0);
  }

  const runner = new MigrationRunner(dbConfig);

  try {
    switch (command) {
      case 'up':
        await runMigrations(runner);
        break;

      case 'down':
        const count = parseInt(arg) || 1;
        await rollbackMigrations(runner, count);
        break;

      case 'status':
        await showStatus(runner);
        break;

      case 'create':
        if (!arg) {
          console.error('✗ Error: Migration name is required');
          console.log('Usage: node backend/database/migrate.js create <name>');
          process.exit(1);
        }
        await createMigration(arg);
        break;

      default:
        console.error(`✗ Unknown command: ${command}`);
        console.log('Run without arguments to see usage information');
        process.exit(1);
    }

    await runner.close();
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Migration command failed:', error.message);
    if (process.env.NODE_ENV === 'development') {
      console.error(error.stack);
    }
    await runner.close();
    process.exit(1);
  }
}

async function runMigrations(runner) {
  console.log('Database Configuration:');
  console.log(`  Host: ${dbConfig.host}`);
  console.log(`  Port: ${dbConfig.port}`);
  console.log(`  Database: ${dbConfig.database}`);
  console.log(`  User: ${dbConfig.user}\n`);

  const result = await runner.runPendingMigrations();

  if (result.success) {
    if (result.migrationsRun === 0) {
      console.log('✓ Database is up to date - no migrations needed');
    } else {
      console.log(`✓ Successfully executed ${result.migrationsRun} migration(s)`);
    }
  } else {
    console.error(`✗ Migration failed at: ${result.failedMigration}`);
    console.error(`Error: ${result.error}`);
    process.exit(1);
  }
}

async function rollbackMigrations(runner, count) {
  console.log(`Rolling back last ${count} migration(s)...\n`);

  const result = await runner.rollbackMigrations(count);

  if (result.success) {
    if (result.rolledBack === 0) {
      console.log('✓ No migrations to rollback');
    } else {
      console.log(`✓ Successfully rolled back ${result.rolledBack} migration(s)`);
    }
  } else {
    console.error(`✗ Rollback failed at: ${result.failedMigration}`);
    console.error(`Error: ${result.error}`);
    process.exit(1);
  }
}

async function showStatus(runner) {
  await runner.getStatus();
}

async function createMigration(name) {
  // Get next migration number
  const migrationsDir = path.join(__dirname, 'migrations');
  
  try {
    const files = await fs.readdir(migrationsDir);
    const migrationFiles = files.filter(f => f.endsWith('.sql'));
    
    // Extract numbers and find the highest
    const numbers = migrationFiles.map(f => {
      const match = f.match(/^(\d+)_/);
      return match ? parseInt(match[1]) : 0;
    });
    
    const nextNumber = Math.max(...numbers, 0) + 1;
    const paddedNumber = String(nextNumber).padStart(3, '0');
    
    // Create filename
    const filename = `${paddedNumber}_${name.replace(/\s+/g, '_')}.sql`;
    const filepath = path.join(migrationsDir, filename);
    
    // Create migration template
    const template = `-- Migration ${paddedNumber}: ${name}
-- Description: Add description here

-- UP


-- DOWN

`;
    
    await fs.writeFile(filepath, template);
    
    console.log(`✓ Created migration file: ${filename}`);
    console.log(`  Path: ${filepath}`);
    console.log('\nNext steps:');
    console.log('  1. Edit the migration file and add your SQL');
    console.log('  2. Run: node backend/database/migrate.js up');
    
  } catch (error) {
    console.error('✗ Failed to create migration:', error.message);
    process.exit(1);
  }
}

// Run main function
main();
