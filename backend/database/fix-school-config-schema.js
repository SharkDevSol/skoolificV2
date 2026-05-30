/**
 * Fix school_config schema by dropping and recreating it
 * This resolves duplicate column issues
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'skoolific',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || ''
});

async function fixSchema() {
  const client = await pool.connect();
  
  try {
    console.log('\n=== Fixing school_config Schema ===\n');
    
    // Backup existing data
    console.log('Step 1: Backing up existing data...');
    const backup = await client.query('SELECT * FROM school_config LIMIT 1');
    console.log(`✓ Backed up ${backup.rows.length} record(s)`);
    
    // Drop the table
    console.log('\nStep 2: Dropping school_config table...');
    await client.query('DROP TABLE IF EXISTS school_config CASCADE');
    console.log('✓ Table dropped');
    
    // Recreate with correct schema
    console.log('\nStep 3: Recreating school_config table...');
    await client.query(`
      CREATE TABLE school_config (
        id SERIAL PRIMARY KEY,
        academic_year VARCHAR(20) NOT NULL,
        current_year INTEGER NOT NULL,
        number_of_terms INTEGER NOT NULL DEFAULT 3,
        school_days JSONB NOT NULL DEFAULT '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]'::jsonb,
        shift_count INTEGER NOT NULL DEFAULT 1,
        shift_rotation_enabled BOOLEAN DEFAULT FALSE,
        periods_per_shift INTEGER NOT NULL DEFAULT 8,
        period_duration_minutes INTEGER NOT NULL DEFAULT 45,
        has_kg BOOLEAN DEFAULT FALSE,
        has_evening_class BOOLEAN DEFAULT FALSE,
        additional_languages JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Table recreated with correct schema');
    
    // Recreate trigger
    console.log('\nStep 4: Recreating trigger...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_school_config_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    
    await client.query(`
      CREATE TRIGGER trigger_update_school_config_timestamp
      BEFORE UPDATE ON school_config
      FOR EACH ROW
      EXECUTE FUNCTION update_school_config_timestamp()
    `);
    console.log('✓ Trigger recreated');
    
    // Restore data if any existed
    if (backup.rows.length > 0) {
      console.log('\nStep 5: Restoring data...');
      const row = backup.rows[0];
      
      await client.query(`
        INSERT INTO school_config (
          academic_year, current_year, number_of_terms, school_days,
          shift_count, shift_rotation_enabled, periods_per_shift,
          period_duration_minutes, has_kg, has_evening_class, additional_languages
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        row.academic_year || '2016/2017',
        row.current_year || 2016,
        row.number_of_terms || row.term_count || 3,
        row.school_days || '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]',
        row.shift_count || row.total_shifts || 1,
        row.shift_rotation_enabled || false,
        row.periods_per_shift || 8,
        row.period_duration_minutes || row.period_duration || 45,
        row.has_kg || false,
        row.has_evening_class || false,
        row.additional_languages || '[]'
      ]);
      console.log('✓ Data restored');
    }
    
    // Verify schema
    console.log('\nStep 6: Verifying schema...');
    const schemaCheck = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'school_config'
      ORDER BY ordinal_position
    `);
    
    console.log('\nFinal schema:');
    schemaCheck.rows.forEach(col => {
      console.log(`  ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
    });
    
    console.log('\n✓ Schema fix completed successfully\n');
    
  } catch (error) {
    console.error('\n✗ Schema fix failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

fixSchema();
