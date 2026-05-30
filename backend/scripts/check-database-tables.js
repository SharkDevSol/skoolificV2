/**
 * Check Database Tables
 * Lists all tables in the database
 */

require('dotenv').config();
const { Pool } = require('pg');

async function checkTables() {
  const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'skoolific',
    password: String(process.env.DB_PASSWORD || '12345678'),
    port: process.env.DB_PORT || 5432,
  });

  try {
    console.log('\n📋 Checking database tables...\n');

    // List all tables
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    if (result.rows.length === 0) {
      console.log('❌ No tables found in the database!');
      console.log('\nThe database is empty. You need to run migrations to create tables.\n');
    } else {
      console.log(`✅ Found ${result.rows.length} table(s):\n`);
      result.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.table_name}`);
      });
      console.log('');
    }

    // Check for admin_users table specifically
    const adminUsersCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'admin_users'
      ) as exists
    `);

    if (adminUsersCheck.rows[0].exists) {
      console.log('✅ admin_users table exists');
      
      // Count admin users
      const countResult = await pool.query('SELECT COUNT(*) as count FROM admin_users');
      console.log(`   Total admin users: ${countResult.rows[0].count}\n`);
    } else {
      console.log('❌ admin_users table does NOT exist');
      console.log('   This is why login is failing!\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTables();
