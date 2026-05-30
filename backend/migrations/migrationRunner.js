const fs = require('fs');
const path = require('path');

class MigrationRunner {
  constructor(pool) {
    this.pool = pool;
    this.migrationsDir = __dirname;
  }

  async ensureMigrationsTable() {
    // Create migrations tracking table if it doesn't exist
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async getExecutedMigrations() {
    const result = await this.pool.query(
      'SELECT name FROM schema_migrations ORDER BY name'
    );
    return result.rows.map(row => row.name);
  }

  async getMigrationFiles() {
    const files = fs.readdirSync(this.migrationsDir)
      .filter(file => file.endsWith('.js') && file !== 'migrationRunner.js')
      .sort();
    
    return files;
  }

  async runMigration(migrationFile) {
    const migrationPath = path.join(this.migrationsDir, migrationFile);
    const migration = require(migrationPath);

    console.log(`🔄 Running migration: ${migration.name}`);
    console.log(`   Description: ${migration.description}`);

    try {
      // Execute the migration
      await migration.up(this.pool);

      // Record the migration
      await this.pool.query(
        'INSERT INTO schema_migrations (name, description) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
        [migration.name, migration.description]
      );

      console.log(`✅ Migration ${migration.name} completed successfully`);
      return true;
    } catch (error) {
      console.error(`❌ Migration ${migration.name} failed:`, error.message);
      throw error;
    }
  }

  async runPendingMigrations() {
    console.log('\n📦 Checking for pending database migrations...\n');

    try {
      // Ensure migrations table exists
      await this.ensureMigrationsTable();

      // Get executed and available migrations
      const executedMigrations = await this.getExecutedMigrations();
      const migrationFiles = await this.getMigrationFiles();

      // Find pending migrations
      const pendingMigrations = migrationFiles.filter(file => {
        const migration = require(path.join(this.migrationsDir, file));
        return !executedMigrations.includes(migration.name);
      });

      if (pendingMigrations.length === 0) {
        console.log('✅ All migrations are up to date!\n');
        return;
      }

      console.log(`📋 Found ${pendingMigrations.length} pending migration(s)\n`);

      // Run each pending migration
      for (const migrationFile of pendingMigrations) {
        await this.runMigration(migrationFile);
      }

      console.log('\n✅ All pending migrations completed successfully!\n');
    } catch (error) {
      console.error('\n❌ Migration process failed:', error.message);
      throw error;
    }
  }

  async rollbackLastMigration() {
    console.log('\n🔄 Rolling back last migration...\n');

    try {
      // Get the last executed migration
      const result = await this.pool.query(
        'SELECT name FROM schema_migrations ORDER BY executed_at DESC LIMIT 1'
      );

      if (result.rows.length === 0) {
        console.log('⚠️ No migrations to rollback');
        return;
      }

      const lastMigrationName = result.rows[0].name;
      
      // Find the migration file
      const migrationFiles = await this.getMigrationFiles();
      const migrationFile = migrationFiles.find(file => {
        const migration = require(path.join(this.migrationsDir, file));
        return migration.name === lastMigrationName;
      });

      if (!migrationFile) {
        console.error(`❌ Migration file not found for: ${lastMigrationName}`);
        return;
      }

      const migration = require(path.join(this.migrationsDir, migrationFile));

      console.log(`🔄 Rolling back: ${migration.name}`);

      // Execute rollback
      await migration.down(this.pool);

      // Remove from migrations table
      await this.pool.query(
        'DELETE FROM schema_migrations WHERE name = $1',
        [migration.name]
      );

      console.log(`✅ Rollback completed: ${migration.name}\n`);
    } catch (error) {
      console.error('\n❌ Rollback failed:', error.message);
      throw error;
    }
  }

  async getMigrationStatus() {
    await this.ensureMigrationsTable();
    
    const executedMigrations = await this.getExecutedMigrations();
    const migrationFiles = await this.getMigrationFiles();

    console.log('\n📊 Migration Status:\n');
    console.log('Executed Migrations:');
    
    if (executedMigrations.length === 0) {
      console.log('  (none)');
    } else {
      executedMigrations.forEach(name => {
        console.log(`  ✅ ${name}`);
      });
    }

    console.log('\nPending Migrations:');
    const pendingMigrations = migrationFiles.filter(file => {
      const migration = require(path.join(this.migrationsDir, file));
      return !executedMigrations.includes(migration.name);
    });

    if (pendingMigrations.length === 0) {
      console.log('  (none)');
    } else {
      pendingMigrations.forEach(file => {
        const migration = require(path.join(this.migrationsDir, file));
        console.log(`  ⏳ ${migration.name}`);
      });
    }

    console.log('');
  }
}

module.exports = MigrationRunner;
