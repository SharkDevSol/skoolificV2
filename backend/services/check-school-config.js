/**
 * Check School Config Script
 * Displays current school configuration
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'skoolific',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || ''
};

async function main() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('\nSchool Configuration:\n');
    
    const result = await pool.query('SELECT * FROM school_config LIMIT 1');
    
    if (result.rows.length === 0) {
      console.log('✗ No school configuration found');
      return;
    }
    
    const config = result.rows[0];
    
    console.log(`ID: ${config.id}`);
    console.log(`School Name: ${config.school_name}`);
    console.log(`Academic Year: ${config.academic_year}`);
    console.log(`Current Year (Ethiopian): ${config.current_year}`);
    console.log(`Terms: ${config.terms}`);
    console.log(`School Days: ${config.school_days}`);
    console.log(`Shift Count: ${config.shift_count}`);
    console.log(`Has KG: ${config.has_kg}`);
    console.log(`Has Evening Class: ${config.has_evening_class}`);
    console.log(`Updated At: ${config.updated_at}`);
    console.log('');
    
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
