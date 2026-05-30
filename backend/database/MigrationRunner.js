/**
 * Migration Runner for Skoolific V2
 * Handles database schema migrations with up/down support
 * Tracks migration history in migrations table
 */

const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');

class MigrationRunner {
  constructor(dbConfig) {
    this.pool = new Pool(dbConfig);
    this.migrationsDir = path.join(__dirname, 'migrations');
  }

  /**
   * Initialize migrations table if it doesn't exist
   */
  async initializeMigrationsTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        execution_time_ms INTEGER,
        status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'failed', 'rolled_back'))
      );
      
      CREATE INDEX IF NOT EXISTS idx_migrations_name ON migrations(migration_name);
      CREATE INDEX IF NOT EXISTS idx_migrations_executed_at ON migrations(executed_at);
    `;

    try {
      await this.pool.query(query);
      console.log('✓ Migrations table initialized');
    } catch (error) {
      console.error('✗ Failed to initialize migrations table:', error.message);
      throw error;
    }
  }

  /**
   * Get list of executed migrations
   */
  async getExecutedMigrations() {
    const result = await this.pool.query(
      'SELECT migration_name FROM migrations WHERE status = $1 ORDER BY id',
      ['success']
    );
    return result.rows.map(row => row.migration_name);
  }

  /**
   * Get list of pending migrations
   */
  async getPendingMigrations() {
    const allMigrations = await this.getAllMigrationFiles();
    const executedMigrations = await this.getExecutedMigrations();
    
    return allMigrations.filter(
      migration => !executedMigrations.includes(migration)
    );
  }

  /**
   * Get all migration files from migrations directory
   */
  async getAllMigrationFiles() {
    try {
      const files = await fs.readdir(this.migrationsDir);
      return files
        .filter(file => file.endsWith('.sql'))
        .sort(); // Ensures migrations run in order (001, 002, 003, etc.)
    } catch (error) {
      console.error('✗ Failed to read migrations directory:', error.message);
      throw error;
    }
  }

  /**
   * Parse migration file to extract UP and DOWN sections
   */
  async parseMigrationFile(filename) {
    const filePath = path.join(this.migrationsDir, filename);
    const content = await fs.readFile(filePath, 'utf8');

    // Split by -- UP and -- DOWN markers
    const upMatch = content.match(/--\s*UP\s*\n([\s\S]*?)(?=--\s*DOWN|$)/i);
    const downMatch = content.match(/--\s*DOWN\s*\n([\s\S]*?)$/i);

    return {
      up: upMatch ? upMatch[1].trim() : content.trim(),
      down: downMatch ? downMatch[1].trim() : null
    };
  }

  /**
   * Execute a single migration
   */
  async executeMigration(filename) {
    const startTime = Date.now();
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      console.log(`\n→ Running migration: ${filename}`);
      
      const { up } = await this.parseMigrationFile(filename);
      
      if (!up) {
        throw new Error('Migration file has no UP section');
      }

      // Execute migration SQL
      await client.query(up);

      // Record migration
      const executionTime = Date.now() - startTime;
      await client.query(
        'INSERT INTO migrations (migration_name, execution_time_ms, status) VALUES ($1, $2, $3)',
        [filename, executionTime, 'success']
      );

      await client.query('COMMIT');
      
      console.log(`✓ Migration ${filename} completed in ${executionTime}ms`);
      
      return { success: true, executionTime };
    } catch (error) {
      await client.query('ROLLBACK');
      
      console.error(`✗ Migration ${filename} failed:`, error.message);
      
      // Record failed migration
      try {
        await client.query(
          'INSERT INTO migrations (migration_name, status) VALUES ($1, $2) ON CONFLICT (migration_name) DO UPDATE SET status = $2',
          [filename, 'failed']
        );
      } catch (recordError) {
        console.error('Failed to record migration failure:', recordError.message);
      }
      
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Rollback a single migration
   */
  async rollbackMigration(filename) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      console.log(`\n→ Rolling back migration: ${filename}`);
      
      const { down } = await this.parseMigrationFile(filename);
      
      if (!down) {
        throw new Error('Migration file has no DOWN section - cannot rollback');
      }

      // Execute rollback SQL
      await client.query(down);

      // Update migration record
      await client.query(
        'UPDATE migrations SET status = $1 WHERE migration_name = $2',
        ['rolled_back', filename]
      );

      await client.query('COMMIT');
      
      console.log(`✓ Migration ${filename} rolled back successfully`);
      
      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`✗ Rollback of ${filename} failed:`, error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Run all pending migrations
   */
  async runPendingMigrations() {
    console.log('\n=== Starting Database Migrations ===\n');
    
    await this.initializeMigrationsTable();
    
    const pendingMigrations = await this.getPendingMigrations();
    
    if (pendingMigrations.length === 0) {
      console.log('✓ No pending migrations - database is up to date');
      return { success: true, migrationsRun: 0 };
    }

    console.log(`Found ${pendingMigrations.length} pending migration(s):\n`);
    pendingMigrations.forEach(m => console.log(`  - ${m}`));
    console.log('');

    const results = [];
    
    for (const migration of pendingMigrations) {
      try {
        const result = await this.executeMigration(migration);
        results.push({ migration, ...result });
      } catch (error) {
        console.error(`\n✗ Migration process stopped due to error in ${migration}`);
        return {
          success: false,
          migrationsRun: results.length,
          failedMigration: migration,
          error: error.message
        };
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`✓ Successfully executed ${results.length} migration(s)`);
    console.log(`Total execution time: ${results.reduce((sum, r) => sum + r.executionTime, 0)}ms\n`);

    return {
      success: true,
      migrationsRun: results.length,
      results
    };
  }

  /**
   * Rollback the last N migrations
   */
  async rollbackMigrations(count = 1) {
    console.log(`\n=== Rolling Back Last ${count} Migration(s) ===\n`);
    
    const executedMigrations = await this.getExecutedMigrations();
    
    if (executedMigrations.length === 0) {
      console.log('✓ No migrations to rollback');
      return { success: true, rolledBack: 0 };
    }

    const migrationsToRollback = executedMigrations.slice(-count).reverse();
    
    console.log(`Rolling back ${migrationsToRollback.length} migration(s):\n`);
    migrationsToRollback.forEach(m => console.log(`  - ${m}`));
    console.log('');

    const results = [];
    
    for (const migration of migrationsToRollback) {
      try {
        const result = await this.rollbackMigration(migration);
        results.push({ migration, ...result });
      } catch (error) {
        console.error(`\n✗ Rollback process stopped due to error in ${migration}`);
        return {
          success: false,
          rolledBack: results.length,
          failedMigration: migration,
          error: error.message
        };
      }
    }

    console.log('\n=== Rollback Summary ===');
    console.log(`✓ Successfully rolled back ${results.length} migration(s)\n`);

    return {
      success: true,
      rolledBack: results.length,
      results
    };
  }

  /**
   * Get migration status
   */
  async getStatus() {
    await this.initializeMigrationsTable();
    
    const allMigrations = await this.getAllMigrationFiles();
    const executedMigrations = await this.getExecutedMigrations();
    
    console.log('\n=== Migration Status ===\n');
    console.log(`Total migrations: ${allMigrations.length}`);
    console.log(`Executed: ${executedMigrations.length}`);
    console.log(`Pending: ${allMigrations.length - executedMigrations.length}\n`);
    
    if (allMigrations.length > 0) {
      console.log('Migrations:');
      for (const migration of allMigrations) {
        const status = executedMigrations.includes(migration) ? '✓' : '○';
        console.log(`  ${status} ${migration}`);
      }
      console.log('');
    }

    return {
      total: allMigrations.length,
      executed: executedMigrations.length,
      pending: allMigrations.length - executedMigrations.length,
      migrations: allMigrations.map(m => ({
        name: m,
        executed: executedMigrations.includes(m)
      }))
    };
  }

  /**
   * Close database connection
   */
  async close() {
    await this.pool.end();
  }
}

module.exports = MigrationRunner;
