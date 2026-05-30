/**
 * Reset Master Database
 * 
 * This script drops and recreates the master database with the correct schema
 * 
 * Usage:
 *   node backend/database/reset-master-database.js
 */

require('dotenv').config();
const { Client } = require('pg');

async function resetMasterDatabase() {
  console.log('\n🔄 Resetting Master Database...\n');

  // Connect to PostgreSQL
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '12345678'
  });

  await client.connect();

  try {
    // Drop existing database
    console.log('1. Dropping existing master database...');
    await client.query('DROP DATABASE IF EXISTS skoolific_master');
    console.log('   ✓ Database dropped\n');

    // Create new database
    console.log('2. Creating new master database...');
    await client.query('CREATE DATABASE skoolific_master');
    console.log('   ✓ Database created\n');

    await client.end();

    console.log('✅ Master database reset complete!\n');
    console.log('📝 Next Step:');
    console.log('   Run: node backend/database/setup-multi-school-system.js\n');

  } catch (error) {
    console.error('❌ Reset failed:', error.message);
    await client.end();
    process.exit(1);
  }
}

resetMasterDatabase().catch(console.error);
