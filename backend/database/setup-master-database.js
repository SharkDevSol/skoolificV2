/**
 * Setup Master Database for Telegram Bot
 * 
 * This script creates the master database and configures all schools/branches.
 * Run this ONCE to set up the centralized registry.
 * 
 * Usage:
 *   node database/setup-master-database.js
 */

require('dotenv').config();
const { Client } = require('pg');

async function setupMasterDatabase() {
  console.log('\n🏗️  Setting up Master Database for Telegram Bot...\n');

  // Connect to PostgreSQL (default postgres database)
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: 'postgres', // Connect to default database first
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL\n');

    // Check if master database exists
    const dbCheck = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [process.env.MASTER_DB_NAME || 'skoolific_master']
    );

    if (dbCheck.rows.length > 0) {
      console.log(`⚠️  Database '${process.env.MASTER_DB_NAME || 'skoolific_master'}' already exists`);
      console.log('   Skipping database creation...\n');
    } else {
      // Create master database
      console.log(`1. Creating database '${process.env.MASTER_DB_NAME || 'skoolific_master'}'...`);
      await client.query(`CREATE DATABASE ${process.env.MASTER_DB_NAME || 'skoolific_master'}`);
      console.log('   ✓ Database created\n');
    }

    await client.end();

    // Connect to master database
    const masterClient = new Client({
      host: process.env.MASTER_DB_HOST || process.env.DB_HOST || 'localhost',
      port: process.env.MASTER_DB_PORT || process.env.DB_PORT || 5432,
      database: process.env.MASTER_DB_NAME || 'skoolific_master',
      user: process.env.MASTER_DB_USER || process.env.DB_USER || 'postgres',
      password: process.env.MASTER_DB_PASSWORD || process.env.DB_PASSWORD
    });

    await masterClient.connect();
    console.log(`✅ Connected to master database\n`);

    // Create schools table
    console.log('2. Creating schools table...');
    await masterClient.query(`
      CREATE TABLE IF NOT EXISTS schools (
        id SERIAL PRIMARY KEY,
        school_name VARCHAR(100) NOT NULL UNIQUE,
        school_code VARCHAR(20) NOT NULL UNIQUE,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✓ Schools table created\n');

    // Create branches table
    console.log('3. Creating branches table...');
    await masterClient.query(`
      CREATE TABLE IF NOT EXISTS branches (
        id SERIAL PRIMARY KEY,
        school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        branch_name VARCHAR(100) NOT NULL,
        branch_code VARCHAR(20) NOT NULL,
        database_name VARCHAR(100) NOT NULL,
        database_host VARCHAR(100) DEFAULT 'localhost',
        database_port INTEGER DEFAULT 5432,
        database_user VARCHAR(100),
        database_password VARCHAR(255),
        api_url VARCHAR(255),
        api_port INTEGER,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(school_id, branch_code)
      )
    `);
    console.log('   ✓ Branches table created\n');

    // Create indexes
    console.log('4. Creating indexes...');
    await masterClient.query(`
      CREATE INDEX IF NOT EXISTS idx_schools_code ON schools(school_code);
      CREATE INDEX IF NOT EXISTS idx_schools_active ON schools(is_active);
      CREATE INDEX IF NOT EXISTS idx_branches_school ON branches(school_id);
      CREATE INDEX IF NOT EXISTS idx_branches_code ON branches(branch_code);
      CREATE INDEX IF NOT EXISTS idx_branches_active ON branches(is_active);
    `);
    console.log('   ✓ Indexes created\n');

    // Create trigger function
    console.log('5. Creating trigger function...');
    await masterClient.query(`
      CREATE OR REPLACE FUNCTION update_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('   ✓ Trigger function created\n');

    // Create triggers
    console.log('6. Creating triggers...');
    await masterClient.query(`
      DROP TRIGGER IF EXISTS trigger_update_schools_updated_at ON schools;
      CREATE TRIGGER trigger_update_schools_updated_at
        BEFORE UPDATE ON schools
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at();

      DROP TRIGGER IF EXISTS trigger_update_branches_updated_at ON branches;
      CREATE TRIGGER trigger_update_branches_updated_at
        BEFORE UPDATE ON branches
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at();
    `);
    console.log('   ✓ Triggers created\n');

    // Insert schools
    console.log('7. Inserting schools...');
    const schools = [
      { name: 'Iqra School', code: 'IQRA', description: 'Iqra Islamic School' },
      { name: 'Al-Markaz School', code: 'ALMARKAZ', description: 'Al-Markaz Islamic School' },
      { name: 'Al-Khwarizmi School', code: 'ALKHWARIZMI', description: 'Al-Khwarizmi School' }
    ];

    for (const school of schools) {
      const result = await masterClient.query(
        `INSERT INTO schools (school_name, school_code, description) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (school_code) DO NOTHING
         RETURNING id`,
        [school.name, school.code, school.description]
      );
      
      if (result.rows.length > 0) {
        console.log(`   ✓ ${school.name}`);
      } else {
        console.log(`   ⚠️  ${school.name} (already exists)`);
      }
    }
    console.log('');

    // Insert branches
    console.log('8. Inserting branches...');
    const branches = [
      // Iqra branches
      { school: 'IQRA', name: 'Branch 1', code: 'B1', database: 'iqrab1', port: 5050 },
      { school: 'IQRA', name: 'Branch 2', code: 'B2', database: 'iqrab2', port: 5051 },
      { school: 'IQRA', name: 'Branch 3', code: 'B3', database: 'iqrab3', port: 5052 },
      
      // Al-Markaz branches
      { school: 'ALMARKAZ', name: 'Main Campus', code: 'MAIN', database: 'almarkaz_main', port: 5053 },
      { school: 'ALMARKAZ', name: 'Secondary Campus', code: 'SEC', database: 'almarkaz_secondary', port: 5054 },
      
      // Al-Khwarizmi branches
      { school: 'ALKHWARIZMI', name: 'Main Campus', code: 'MAIN', database: 'alkhwarizmi_main', port: 5055 }
    ];

    for (const branch of branches) {
      const schoolResult = await masterClient.query(
        'SELECT id FROM schools WHERE school_code = $1',
        [branch.school]
      );

      if (schoolResult.rows.length > 0) {
        const result = await masterClient.query(
          `INSERT INTO branches (school_id, branch_name, branch_code, database_name, api_port) 
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (school_id, branch_code) DO NOTHING
           RETURNING id`,
          [schoolResult.rows[0].id, branch.name, branch.code, branch.database, branch.port]
        );

        if (result.rows.length > 0) {
          console.log(`   ✓ ${branch.school} - ${branch.name} (${branch.database})`);
        } else {
          console.log(`   ⚠️  ${branch.school} - ${branch.name} (already exists)`);
        }
      }
    }
    console.log('');

    // Display summary
    console.log('9. Configuration Summary:\n');
    
    const summary = await masterClient.query(`
      SELECT 
        s.school_name,
        s.school_code,
        COUNT(b.id) as branch_count
      FROM schools s
      LEFT JOIN branches b ON s.id = b.school_id
      GROUP BY s.id, s.school_name, s.school_code
      ORDER BY s.school_name
    `);

    console.log('   📚 Schools and Branches:');
    for (const row of summary.rows) {
      console.log(`      ${row.school_name} (${row.school_code}): ${row.branch_count} branch(es)`);
    }
    console.log('');

    // Display all branches
    const allBranches = await masterClient.query(`
      SELECT 
        s.school_name,
        b.branch_name,
        b.database_name,
        b.api_port
      FROM branches b
      JOIN schools s ON b.school_id = s.id
      ORDER BY s.school_name, b.branch_name
    `);

    console.log('   📍 Branch Details:');
    for (const branch of allBranches.rows) {
      console.log(`      ${branch.school_name} - ${branch.branch_name}`);
      console.log(`         Database: ${branch.database_name}`);
      console.log(`         Port: ${branch.api_port}`);
    }
    console.log('');

    await masterClient.end();

    console.log('✅ Master database setup complete!\n');
    console.log('📝 Next Steps:');
    console.log('   1. Start the Telegram bot: node services/start-telegram-bot.js');
    console.log('   2. Test the bot: https://t.me/skoolific_credentials_bot');
    console.log('   3. To add new school: Use backend/database/add-school.js\n');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

setupMasterDatabase();
